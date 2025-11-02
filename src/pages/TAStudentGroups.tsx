import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface Task {
  id: string;
  title: string;
  num_questions: number;
  session: {
    name: string;
    course: {
      name: string;
    };
  };
}

interface Submission {
  id: string;
  student_id: string;
  answers: any[];
  profiles: {
    name: string;
    email: string;
  };
}

interface StudentGroup {
  questionNumber: number;
  students: {
    id: string;
    name: string;
    email: string;
    submissionId: string;
  }[];
}

export default function TAStudentGroups() {
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [studentGroups, setStudentGroups] = useState<StudentGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/auth');
      } else if (role !== 'ta') {
        navigate('/');
      } else {
        fetchTATasks();
      }
    }
  }, [user, role, authLoading, navigate]);

  const fetchTATasks = async () => {
    try {
      // Get TA's assigned courses
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('course_id')
        .eq('user_id', user?.id)
        .eq('role', 'ta');

      if (rolesError) throw rolesError;

      const courseIds = userRoles
        ?.map((ur) => ur.course_id)
        .filter((id): id is string => id !== null && id !== undefined) || [];

      if (courseIds.length === 0) {
        setLoading(false);
        return;
      }

      // Get sessions for these courses
      const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select('id')
        .in('course_id', courseIds);

      if (sessionsError) throw sessionsError;

      const sessionIds = sessions?.map((s) => s.id) || [];

      if (sessionIds.length === 0) {
        setLoading(false);
        return;
      }

      // Get tasks for these sessions
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          num_questions,
          session:sessions!inner(
            name,
            course:courses!inner(name)
          )
        `)
        .in('session_id', sessionIds)
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;

      setTasks(tasksData || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast({
        title: "Error",
        description: "Failed to load tasks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStudentGroups = async (taskId: string) => {
    try {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      // Get all submissions for this task
      const { data: submissions, error: submissionsError } = await supabase
        .from('task_submissions')
        .select('id, student_id, answers')
        .eq('task_id', taskId);

      if (submissionsError) throw submissionsError;

      if (!submissions || submissions.length === 0) {
        setStudentGroups([]);
        setSelectedTask(taskId);
        return;
      }

      // Get student profiles
      const studentIds = [...new Set(submissions.map(s => s.student_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', studentIds);

      if (profilesError) throw profilesError;

      // Create a map of student profiles
      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const studentsWithSubmissions = submissions.map((sub) => {
        const profile = profilesMap.get(sub.student_id);
        return {
          id: sub.student_id,
          name: profile?.name || 'Unknown',
          email: profile?.email || '',
          submissionId: sub.id,
        };
      });

      // Group students evenly across questions
      const groups: StudentGroup[] = [];
      const numQuestions = task.num_questions;
      const studentsPerQuestion = Math.floor(studentsWithSubmissions.length / numQuestions);
      const remainder = studentsWithSubmissions.length % numQuestions;

      let studentIndex = 0;

      for (let q = 1; q <= numQuestions; q++) {
        const groupSize = studentsPerQuestion + (q <= remainder ? 1 : 0);
        const groupStudents = studentsWithSubmissions.slice(studentIndex, studentIndex + groupSize);
        
        groups.push({
          questionNumber: q,
          students: groupStudents,
        });

        studentIndex += groupSize;
      }

      setStudentGroups(groups);
      setSelectedTask(taskId);
    } catch (error) {
      console.error('Error loading student groups:', error);
      toast({
        title: "Error",
        description: "Failed to load student groups",
        variant: "destructive",
      });
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-8 space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => navigate('/ta')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              <h1 className="text-3xl font-bold">Student Groups by Question</h1>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Task Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Task</CardTitle>
              <CardDescription>
                Choose a task to view student groups
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No tasks available
                </p>
              ) : (
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <Card
                      key={task.id}
                      className={`cursor-pointer transition-all hover:border-primary ${
                        selectedTask === task.id ? 'border-primary bg-primary/5' : ''
                      }`}
                      onClick={() => loadStudentGroups(task.id)}
                    >
                      <CardHeader className="py-3">
                        <CardTitle className="text-base">{task.title}</CardTitle>
                        <CardDescription className="text-xs">
                          {task.session.course.name} - {task.session.name}
                        </CardDescription>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline">
                            {task.num_questions} questions
                          </Badge>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Student Groups Display */}
          <Card>
            <CardHeader>
              <CardTitle>Question Groups</CardTitle>
              <CardDescription>
                {selectedTask
                  ? 'Students assigned to each question'
                  : 'Select a task to view groups'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedTask ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a task from the left to view student groups</p>
                </div>
              ) : studentGroups.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No submissions yet for this task</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {studentGroups.map((group) => (
                    <Card key={group.questionNumber}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center justify-between">
                          <span>Question {group.questionNumber}</span>
                          <Badge variant="secondary">
                            {group.students.length} {group.students.length === 1 ? 'student' : 'students'}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        {group.students.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No students assigned</p>
                        ) : (
                          <div className="space-y-2">
                            {group.students.map((student) => (
                              <div
                                key={student.id}
                                className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-xs"
                              >
                                <div>
                                  <p className="font-medium">{student.name}</p>
                                  <p className="text-muted-foreground text-xs">{student.email}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
