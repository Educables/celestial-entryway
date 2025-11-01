import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Users } from 'lucide-react';
import { format } from 'date-fns';
import TaskSubmissionsDialog from './TaskSubmissionsDialog';

interface Task {
  id: string;
  title: string;
  description: string | null;
  material_reference: string | null;
  num_questions: number;
  questions: { question_number: number; options: { text: string; points: number }[] }[];
  due_date: string | null;
  created_at: string;
  submission_count?: number;
}

interface SessionTasksProps {
  sessionId: string;
  onRefresh?: number;
}

export default function SessionTasks({ sessionId, onRefresh }: SessionTasksProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, [sessionId, onRefresh]);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch submission counts for each task
      const tasksWithCounts = await Promise.all(
        (data || []).map(async (task) => {
          const { count } = await supabase
            .from('task_submissions')
            .select('*', { count: 'exact', head: true })
            .eq('task_id', task.id);

          return { 
            ...task, 
            questions: task.questions as { question_number: number; options: { text: string; points: number }[] }[],
            submission_count: count || 0 
          };
        })
      );

      setTasks(tasksWithCounts);
    } catch (error: any) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task? This will also delete all student submissions.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      toast.success('Task deleted successfully');
      fetchTasks();
    } catch (error: any) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading tasks...</div>;
  }

  if (tasks.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        No tasks created for this session yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <Card key={task.id}>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">{task.title}</CardTitle>
                {task.description && (
                  <CardDescription className="mt-1">{task.description}</CardDescription>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(task.id)}
                className="h-8 w-8 p-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {task.material_reference && (
              <div>
                <span className="font-medium">Material:</span> {task.material_reference}
              </div>
            )}
            <div>
              <span className="font-medium">Questions:</span> {task.num_questions}
            </div>
            <div>
              <span className="font-medium">Options per question:</span> {
                task.questions.map(q => 
                  `Q${q.question_number}: ${q.options.map(opt => `${opt.text}(${opt.points}pts)`).join(',')}`
                ).join(' | ')
              }
            </div>
            {task.due_date && (
              <div>
                <span className="font-medium">Due:</span>{' '}
                {format(new Date(task.due_date), 'MMM d, yyyy h:mm a')}
              </div>
            )}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{task.submission_count} submission{task.submission_count !== 1 ? 's' : ''}</span>
              </div>
              <TaskSubmissionsDialog
                taskId={task.id}
                taskTitle={task.title}
                questions={task.questions}
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
