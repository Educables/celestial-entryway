import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface Submission {
  id: string;
  student_id: string;
  answers: Record<number, string[]>;
  submitted_at: string;
  student_name: string;
  student_email: string;
}

interface Question {
  question_number: number;
  options: string[];
}

interface TaskSubmissionsDialogProps {
  taskId: string;
  taskTitle: string;
  questions: Question[];
}

export default function TaskSubmissionsDialog({
  taskId,
  taskTitle,
  questions,
}: TaskSubmissionsDialogProps) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      fetchSubmissions();
    }
  }, [open, taskId]);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      // First get all submissions
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('task_submissions')
        .select('id, student_id, answers, submitted_at')
        .eq('task_id', taskId)
        .order('submitted_at', { ascending: false });

      if (submissionsError) throw submissionsError;

      if (!submissionsData || submissionsData.length === 0) {
        setSubmissions([]);
        return;
      }

      // Get unique student IDs
      const studentIds = [...new Set(submissionsData.map(s => s.student_id))];

      // Fetch student profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', studentIds);

      if (profilesError) throw profilesError;

      // Create a map of student profiles
      const profilesMap = new Map(
        (profilesData || []).map(p => [p.id, p])
      );

      // Combine submissions with student info
      const formattedSubmissions = submissionsData.map(sub => {
        // Convert answer format from array to object for easier lookup
        const answersObject: Record<number, string[]> = {};
        const answerArray = sub.answers as any;
        
        if (Array.isArray(answerArray)) {
          answerArray.forEach((item: any) => {
            if (item.question && item.options) {
              answersObject[item.question] = item.options;
            }
          });
        }
        
        return {
          id: sub.id,
          student_id: sub.student_id,
          answers: answersObject,
          submitted_at: sub.submitted_at,
          student_name: profilesMap.get(sub.student_id)?.name || 'Unknown',
          student_email: profilesMap.get(sub.student_id)?.email || '',
        };
      });

      setSubmissions(formattedSubmissions);
    } catch (error: any) {
      console.error('Error fetching submissions:', error);
      toast.error('Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Eye className="h-4 w-4 mr-2" />
          View Submissions
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Student Submissions: {taskTitle}</DialogTitle>
          <DialogDescription>
            {submissions.length} submission{submissions.length !== 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading submissions...</div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No submissions yet
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.map((submission) => (
              <Card key={submission.id}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{submission.student_name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{submission.student_email}</p>
                    </div>
                    <Badge variant="outline">
                      {format(new Date(submission.submitted_at), 'MMM d, yyyy h:mm a')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {questions.map((question) => {
                      const rawAnswers = submission.answers[question.question_number];
                      const studentAnswers = Array.isArray(rawAnswers) ? rawAnswers : [];
                      
                      if (studentAnswers.length === 0) {
                        return (
                          <div key={question.question_number} className="border-l-2 border-muted pl-3">
                            <p className="font-medium text-sm mb-1">
                              Question {question.question_number}
                            </p>
                            <p className="text-sm text-muted-foreground italic">Skipped</p>
                          </div>
                        );
                      }
                      
                      return (
                        <div key={question.question_number} className="border-l-2 border-primary/20 pl-3">
                          <p className="font-medium text-sm mb-1">
                            Question {question.question_number}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {studentAnswers.map((answer) => (
                              <Badge key={answer} variant="default">
                                {answer}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
