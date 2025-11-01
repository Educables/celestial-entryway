import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, ChevronDown } from 'lucide-react';
import { SessionAttendance } from './SessionAttendance';
import CreateTaskDialog from './CreateTaskDialog';
import SessionTasks from './SessionTasks';

interface Session {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  course_id: string;
  courses: {
    name: string;
  };
}

export function SessionsList() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [materials, setMaterials] = useState<Record<string, string[]>>({});
  const [taskRefresh, setTaskRefresh] = useState(0);

  useEffect(() => {
    if (user) {
      fetchSessions();
    }
  }, [user]);

  const fetchCourseMaterials = async (courseId: string) => {
    const { data, error } = await supabase.storage
      .from('course-materials')
      .list(courseId);
    
    if (error) {
      console.error('Error fetching materials:', error);
      return [];
    }
    
    return data?.map(file => file.name) || [];
  };

  const fetchSessions = async () => {
    if (!user) return;

    setIsLoading(true);
    const { data, error } = await supabase
      .from('sessions')
      .select(`
        *,
        courses(name)
      `)
      .order('start_time', { ascending: false });

    if (!error && data) {
      setSessions(data as Session[]);
      
      // Fetch materials for each course
      const materialsMap: Record<string, string[]> = {};
      for (const session of data) {
        if (!materialsMap[session.course_id]) {
          materialsMap[session.course_id] = await fetchCourseMaterials(session.course_id);
        }
      }
      setMaterials(materialsMap);
    }
    setIsLoading(false);
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-4 w-2/3" />
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            No sessions yet. Create your first session to get started!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {sessions.map((session) => (
        <Card key={session.id}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {session.name}
            </CardTitle>
            <CardDescription>{session.courses.name}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Start:</span>
                <span>{formatDateTime(session.start_time)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">End:</span>
                <span>{formatDateTime(session.end_time)}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex gap-2">
                <CreateTaskDialog 
                  sessionId={session.id} 
                  courseMaterials={materials[session.course_id] || []}
                  onTaskCreated={() => setTaskRefresh(prev => prev + 1)}
                />
              </div>

              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <ChevronDown className="w-4 h-4 mr-2" />
                    View Tasks
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4">
                  <SessionTasks sessionId={session.id} onRefresh={taskRefresh} />
                </CollapsibleContent>
              </Collapsible>

              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <ChevronDown className="w-4 h-4 mr-2" />
                    View Attendance
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4">
                  <SessionAttendance sessionId={session.id} courseId={session.course_id} />
                </CollapsibleContent>
              </Collapsible>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
