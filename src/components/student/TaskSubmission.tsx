import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { CheckCircle2, Clock } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string | null;
  material_reference: string | null;
  num_questions: number;
  questions: { question_number: number; options: string[] }[];
  due_date: string | null;
  created_at: string;
}

interface Submission {
  id: string;
  answers: { question: number; options: string[] }[];
  submitted_at: string;
}

interface TaskSubmissionProps {
  sessionId: string;
  studentId: string;
}

export default function TaskSubmission({ sessionId, studentId }: TaskSubmissionProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, Submission>>({});
  const [answers, setAnswers] = useState<Record<string, Record<number, string[]>>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    fetchTasksAndSubmissions();
  }, [sessionId, studentId]);

  const fetchTasksAndSubmissions = async () => {
    try {
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;

      const { data: submissionsData, error: submissionsError } = await supabase
        .from('task_submissions')
        .select('*')
        .eq('student_id', studentId)
        .in('task_id', (tasksData || []).map(t => t.id));

      if (submissionsError) throw submissionsError;

      const submissionsMap: Record<string, Submission> = {};
      (submissionsData || []).forEach(sub => {
        submissionsMap[sub.task_id] = {
          id: sub.id,
          answers: sub.answers as { question: number; options: string[] }[],
          submitted_at: sub.submitted_at
        };
      });

      setTasks((tasksData || []).map(task => ({
        ...task,
        questions: task.questions as { question_number: number; options: string[] }[]
      })));
      setSubmissions(submissionsMap);

      // Initialize answers from existing submissions
      const initialAnswers: Record<string, Record<number, string[]>> = {};
      (submissionsData || []).forEach(sub => {
        const answerMap: Record<number, string[]> = {};
        (sub.answers as any[]).forEach((ans: any) => {
          answerMap[ans.question] = ans.options || [];
        });
        initialAnswers[sub.task_id] = answerMap;
      });
      setAnswers(initialAnswers);
    } catch (error: any) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (taskId: string, questionNum: number, option: string, checked: boolean) => {
    setAnswers(prev => {
      const taskAnswers = prev[taskId] || {};
      const currentOptions = taskAnswers[questionNum] || [];
      
      const newOptions = checked
        ? [...currentOptions, option]
        : currentOptions.filter(opt => opt !== option);
      
      return {
        ...prev,
        [taskId]: {
          ...taskAnswers,
          [questionNum]: newOptions
        }
      };
    });
  };

  const handleSubmit = async (task: Task) => {
    const taskAnswers = answers[task.id] || {};
    const answerArray = [];

    for (let i = 1; i <= task.num_questions; i++) {
      if (!taskAnswers[i] || taskAnswers[i].length === 0) {
        toast.error(`Please select at least one option for question ${i}`);
        return;
      }
      answerArray.push({ question: i, options: taskAnswers[i] });
    }

    setSubmitting(task.id);

    try {
      const existingSubmission = submissions[task.id];

      if (existingSubmission) {
        // Update existing submission
        const { error } = await supabase
          .from('task_submissions')
          .update({ answers: answerArray, submitted_at: new Date().toISOString() })
          .eq('id', existingSubmission.id);

        if (error) throw error;
        toast.success('Task updated successfully');
      } else {
        // Create new submission
        const { error } = await supabase
          .from('task_submissions')
          .insert({
            task_id: task.id,
            student_id: studentId,
            answers: answerArray
          });

        if (error) throw error;
        toast.success('Task submitted successfully');
      }

      fetchTasksAndSubmissions();
    } catch (error: any) {
      console.error('Error submitting task:', error);
      toast.error('Failed to submit task');
    } finally {
      setSubmitting(null);
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading tasks...</div>;
  }

  if (tasks.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        No tasks assigned for this session
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tasks.map((task) => {
        const submission = submissions[task.id];
        const isSubmitted = !!submission;
        const taskAnswers = answers[task.id] || {};

        return (
          <Card key={task.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    {task.title}
                    {isSubmitted && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                  </CardTitle>
                  {task.description && (
                    <CardDescription className="mt-1">{task.description}</CardDescription>
                  )}
                </div>
              </div>
              {task.due_date && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2">
                  <Clock className="h-4 w-4" />
                  Due: {format(new Date(task.due_date), 'MMM d, yyyy h:mm a')}
                </div>
              )}
              {task.material_reference && (
                <div className="text-sm text-muted-foreground">
                  Reference: {task.material_reference}
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {task.questions.map((q) => {
                const selectedOptions = taskAnswers[q.question_number] || [];
                
                return (
                  <div key={q.question_number} className="space-y-2">
                    <Label className="text-base">Question {q.question_number}</Label>
                    <div className="flex flex-wrap gap-4">
                      {q.options.map((option) => (
                        <div key={option} className="flex items-center space-x-2">
                          <Checkbox
                            id={`${task.id}-q${q.question_number}-${option}`}
                            checked={selectedOptions.includes(option)}
                            onCheckedChange={(checked) => 
                              handleAnswerChange(task.id, q.question_number, option, checked as boolean)
                            }
                          />
                          <Label htmlFor={`${task.id}-q${q.question_number}-${option}`} className="font-normal">
                            {option}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {isSubmitted && (
                <div className="text-sm text-muted-foreground pt-2">
                  Last submitted: {format(new Date(submission.submitted_at), 'MMM d, yyyy h:mm a')}
                </div>
              )}

              <Button
                onClick={() => handleSubmit(task)}
                disabled={submitting === task.id}
                className="w-full"
              >
                {submitting === task.id
                  ? 'Submitting...'
                  : isSubmitted
                  ? 'Update Submission'
                  : 'Submit Task'}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
