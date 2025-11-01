import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';
import TaskSubmissionsDialog from '@/components/instructor/TaskSubmissionsDialog';

interface Task {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  num_questions: number;
  session_id: string;
  session_name: string;
  questions: { question_number: number; options: { text: string; points: number }[] }[];
  submissionCount: number;
}

interface CourseTasksViewProps {
  courseId: string;
}

export function CourseTasksView({ courseId }: CourseTasksViewProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, [courseId]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('id, name')
        .eq('course_id', courseId)
        .order('start_time', { ascending: true });

      if (sessionsError) throw sessionsError;

      if (sessionsData && sessionsData.length > 0) {
        const sessionIds = sessionsData.map(s => s.id);
        
        const { data: tasksData, error: tasksError } = await supabase
          .from('tasks')
          .select('*')
          .in('session_id', sessionIds)
          .order('created_at', { ascending: false });

        if (tasksError) throw tasksError;

        // Fetch submission counts for each task
        const tasksWithDetails = await Promise.all(
          (tasksData || []).map(async (task) => {
            const session = sessionsData.find(s => s.id === task.session_id);
            
            // Get submission count
            const { count } = await supabase
              .from('task_submissions')
              .select('*', { count: 'exact', head: true })
              .eq('task_id', task.id);

            // Parse questions from jsonb
            const questions = Array.isArray(task.questions) 
              ? task.questions as { question_number: number; options: { text: string; points: number }[] }[]
              : [];

            return {
              id: task.id,
              title: task.title,
              description: task.description,
              due_date: task.due_date,
              num_questions: task.num_questions,
              session_id: task.session_id,
              session_name: session?.name || 'Unknown Session',
              questions,
              submissionCount: count || 0,
            };
          })
        );

        setTasks(tasksWithDetails);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center py-8">
            No tasks have been created for this course yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Course Tasks ({tasks.length})</h3>
      </div>
      <div className="grid gap-4">
        {tasks.map((task) => (
          <Card key={task.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <CardTitle className="text-lg">{task.title}</CardTitle>
                  <CardDescription>
                    <Badge variant="outline" className="mr-2">
                      {task.session_name}
                    </Badge>
                    <span className="text-sm">{task.num_questions} question{task.num_questions !== 1 ? 's' : ''}</span>
                    <span className="text-sm ml-2">• {task.submissionCount} submission{task.submissionCount !== 1 ? 's' : ''}</span>
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  {task.due_date && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Due: {format(new Date(task.due_date), 'MMM d, yyyy')}</span>
                    </div>
                  )}
                  <TaskSubmissionsDialog
                    taskId={task.id}
                    taskTitle={task.title}
                    questions={task.questions}
                  />
                </div>
              </div>
            </CardHeader>
            {task.description && (
              <CardContent>
                <p className="text-sm text-muted-foreground">{task.description}</p>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
