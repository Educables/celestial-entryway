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
  const [optionsInput, setOptionsInput] = useState('A,B,C,D');
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

    const options = optionsInput.split(',').map(opt => opt.trim()).filter(opt => opt);
    if (options.length < 2) {
      toast.error('Please provide at least 2 options');
      return;
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
          options,
          due_date: dueDate ? new Date(dueDate).toISOString() : null,
        });

      if (error) throw error;

      toast.success('Task created successfully');
      setOpen(false);
      setTitle('');
      setDescription('');
      setMaterialReference('');
      setNumQuestions(5);
      setOptionsInput('A,B,C,D');
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

          <div className="space-y-2">
            <Label htmlFor="options">Answer Options (comma-separated)</Label>
            <Input
              id="options"
              value={optionsInput}
              onChange={(e) => setOptionsInput(e.target.value)}
              placeholder="A,B,C,D"
              required
            />
            <p className="text-xs text-muted-foreground">
              Students will select one of these options for each question
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
