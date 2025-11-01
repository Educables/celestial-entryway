import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ClipboardList } from 'lucide-react';

interface CreateTaskDialogProps {
  sessionId: string;
  courseMaterials: string[];
  onTaskCreated: () => void;
}

export default function CreateTaskDialog({ sessionId, courseMaterials, onTaskCreated }: CreateTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [materialReference, setMaterialReference] = useState('');
  const [numQuestions, setNumQuestions] = useState(5);
  const [questionOptions, setQuestionOptions] = useState<Record<number, string>>({});
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error('Please enter a task title');
      return;
    }

    if (numQuestions < 1) {
      toast.error('Number of questions must be at least 1');
      return;
    }

    // Validate all questions have options
    const questions = [];
    for (let i = 1; i <= numQuestions; i++) {
      const optionsStr = questionOptions[i] || '';
      const options = optionsStr.split(',').map(opt => opt.trim()).filter(opt => opt);
      
      if (options.length < 1) {
        toast.error(`Please provide at least 1 option for question ${i}`);
        return;
      }
      
      questions.push({
        question_number: i,
        options
      });
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('tasks')
        .insert({
          session_id: sessionId,
          title: title.trim(),
          description: description.trim() || null,
          material_reference: materialReference || null,
          num_questions: numQuestions,
          questions,
          due_date: dueDate ? new Date(dueDate).toISOString() : null,
        });

      if (error) throw error;

      toast.success('Task created successfully');
      setOpen(false);
      setTitle('');
      setDescription('');
      setMaterialReference('');
      setNumQuestions(5);
      setQuestionOptions({});
      setDueDate('');
      onTaskCreated();
    } catch (error: any) {
      console.error('Error creating task:', error);
      toast.error(error.message || 'Failed to create task');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ClipboardList className="h-4 w-4 mr-2" />
          Create Task
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Homework Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Task Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Chapter 3 Homework"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Task instructions..."
              rows={3}
            />
          </div>

          {courseMaterials.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="material">Reference Material (Optional)</Label>
              <select
                id="material"
                value={materialReference}
                onChange={(e) => setMaterialReference(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">No material selected</option>
                {courseMaterials.map((material) => (
                  <option key={material} value={material}>
                    {material}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="numQuestions">Number of Questions</Label>
            <Input
              id="numQuestions"
              type="number"
              min="1"
              value={numQuestions}
              onChange={(e) => setNumQuestions(parseInt(e.target.value) || 1)}
              required
            />
          </div>

          <div className="space-y-3">
            <Label>Options for Each Question (comma-separated)</Label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {Array.from({ length: numQuestions }, (_, i) => i + 1).map((qNum) => (
                <div key={qNum} className="space-y-1">
                  <Label htmlFor={`q${qNum}-options`} className="text-sm font-normal">
                    Question {qNum} options:
                  </Label>
                  <Input
                    id={`q${qNum}-options`}
                    value={questionOptions[qNum] || ''}
                    onChange={(e) => setQuestionOptions(prev => ({ ...prev, [qNum]: e.target.value }))}
                    placeholder="A,B,C,D"
                    required
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Students can select multiple options per question
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date (Optional)</Label>
            <Input
              id="dueDate"
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
