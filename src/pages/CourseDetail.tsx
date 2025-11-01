import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Clock, ArrowLeft, Check, Download, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import TaskSubmission from '@/components/student/TaskSubmission';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Course {
  id: string;
  name: string;
  description: string | null;
}

interface Session {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  course_id: string;
}

interface Material {
  name: string;
  id: string;
  created_at: string;
}

export default function CourseDetail() {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [registeredSessionIds, setRegisteredSessionIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [registeringSessionId, setRegisteringSessionId] = useState<string | null>(null);
  const [downloadingMaterial, setDownloadingMaterial] = useState<string | null>(null);

  useEffect(() => {
    if (user && courseId) {
      checkEnrollmentAndFetchData();
    }
  }, [user, courseId]);

  const checkEnrollmentAndFetchData = async () => {
    try {
      // Check if student is enrolled in this course
      const { data: enrollment, error: enrollmentError } = await supabase
        .from('enrollments')
        .select('id')
        .eq('student_id', user!.id)
        .eq('course_id', courseId!)
        .maybeSingle();

      if (enrollmentError) throw enrollmentError;
      
      if (!enrollment) {
        toast.error('You must be enrolled in this course to view sessions');
        navigate('/student');
        return;
      }

      // Fetch course details, sessions, registrations, and materials
      const [courseResult, sessionsResult, registrationsResult, materialsResult] = await Promise.all([
        supabase.from('courses').select('*').eq('id', courseId!).single(),
        supabase.from('sessions').select('*').eq('course_id', courseId!).order('start_time', { ascending: true }),
        supabase.from('session_registrations').select('session_id').eq('student_id', user!.id),
        supabase.storage.from('course-materials').list(courseId!, { sortBy: { column: 'created_at', order: 'desc' } })
      ]);

      if (courseResult.error) throw courseResult.error;
      if (sessionsResult.error) throw sessionsResult.error;
      if (registrationsResult.error) throw registrationsResult.error;
      if (materialsResult.error) throw materialsResult.error;

      setCourse(courseResult.data);
      setSessions(sessionsResult.data || []);
      setMaterials(materialsResult.data || []);
      setRegisteredSessionIds(new Set(registrationsResult.data?.map(r => r.session_id) || []));
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load course details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (sessionId: string) => {
    if (!user) return;
    
    setRegisteringSessionId(sessionId);
    try {
      const { error } = await supabase
        .from('session_registrations')
        .insert({ student_id: user.id, session_id: sessionId });

      if (error) throw error;

      setRegisteredSessionIds(prev => new Set([...prev, sessionId]));
      toast.success('Successfully registered for session!');
    } catch (error) {
      console.error('Error registering:', error);
      toast.error('Failed to register for session');
    } finally {
      setRegisteringSessionId(null);
    }
  };

  const handleUnregister = async (sessionId: string) => {
    if (!user) return;
    
    setRegisteringSessionId(sessionId);
    try {
      const { error } = await supabase
        .from('session_registrations')
        .delete()
        .eq('student_id', user.id)
        .eq('session_id', sessionId);

      if (error) throw error;

      setRegisteredSessionIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(sessionId);
        return newSet;
      });
      toast.success('Successfully unregistered from session');
    } catch (error) {
      console.error('Error unregistering:', error);
      toast.error('Failed to unregister from session');
    } finally {
      setRegisteringSessionId(null);
    }
  };

  const handleDownloadMaterial = async (fileName: string) => {
    if (!courseId) return;

    setDownloadingMaterial(fileName);
    try {
      const { data, error } = await supabase.storage
        .from('course-materials')
        .download(`${courseId}/${fileName}`);

      if (error) throw error;

      // Create a download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Material downloaded successfully');
    } catch (error) {
      console.error('Error downloading material:', error);
      toast.error('Failed to download material');
    } finally {
      setDownloadingMaterial(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10 p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-32" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        </div>
      </div>
    );
  }

  if (!course) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <Button onClick={() => navigate('/student')} variant="ghost" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Courses
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">{course.name}</CardTitle>
            <CardDescription className="text-base">
              {course.description || 'No description available'}
            </CardDescription>
          </CardHeader>
        </Card>

        <div>
          <h2 className="text-2xl font-bold mb-4">Course Materials</h2>
          {materials.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">No materials available yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {materials.map((material) => {
                const isDownloading = downloadingMaterial === material.name;
                
                return (
                  <Card key={material.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start gap-3">
                        <FileText className="h-5 w-5 text-primary mt-1" />
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base truncate">{material.name}</CardTitle>
                          <CardDescription className="text-xs mt-1">
                            Added {format(new Date(material.created_at), 'PP')}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardFooter>
                      <Button
                        onClick={() => handleDownloadMaterial(material.name)}
                        disabled={isDownloading}
                        variant="outline"
                        className="w-full"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        {isDownloading ? 'Downloading...' : 'Download'}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4">Sessions</h2>
          {sessions.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">No sessions available for this course yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {sessions.map((session) => {
                const isRegistered = registeredSessionIds.has(session.id);
                const isProcessing = registeringSessionId === session.id;
                
                return (
                  <Card key={session.id} className="flex flex-col">
                    <CardHeader>
                      <CardTitle className="text-lg">{session.name}</CardTitle>
                      <CardDescription className="space-y-2 mt-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>{format(new Date(session.start_time), 'PPP')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>
                            {format(new Date(session.start_time), 'p')} - {format(new Date(session.end_time), 'p')}
                          </span>
                        </div>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {isRegistered ? (
                        <Collapsible>
                          <CollapsibleTrigger asChild>
                            <Button variant="outline" className="w-full">
                              View Tasks & Homework
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="mt-4">
                            <TaskSubmission sessionId={session.id} studentId={user!.id} />
                          </CollapsibleContent>
                        </Collapsible>
                      ) : null}
                    </CardContent>
                    <CardFooter className="mt-auto">
                      {isRegistered ? (
                        <Button
                          onClick={() => handleUnregister(session.id)}
                          disabled={isProcessing}
                          variant="outline"
                          className="w-full"
                        >
                          <Check className="h-4 w-4 mr-2" />
                          {isProcessing ? 'Processing...' : 'Registered'}
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleRegister(session.id)}
                          disabled={isProcessing}
                          className="w-full"
                        >
                          {isProcessing ? 'Registering...' : 'Register'}
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
