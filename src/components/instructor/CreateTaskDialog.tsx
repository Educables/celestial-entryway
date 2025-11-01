import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ClipboardList, Plus, Trash2 } from 'lucide-react';

interface CreateTaskDialogProps {
  sessionId: string;
  courseMaterials: string[];
  onTaskCreated: () => void;
}

interface Question {
  questionNumber: number;
  options: { text: string; points: number }[];
}

export default function CreateTaskDialog({ sessionId, courseMaterials, onTaskCreated }: CreateTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [materialReference, setMaterialReference] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([
    { questionNumber: 1, options: [{ text: 'A', points: 0 }] }
  ]);

  const addQuestion = () => {
    setQuestions(prev => [
      ...prev,
      { questionNumber: prev.length + 1, options: [{ text: 'A', points: 0 }] }
    ]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      setQuestions(prev => prev.filter((_, i) => i !== index).map((q, i) => ({ ...q, questionNumber: i + 1 })));
    }
  };

  const addOption = (questionIndex: number) => {
    setQuestions(prev => {
      const updated = [...prev];
      const nextLetter = String.fromCharCode(65 + updated[questionIndex].options.length);
      updated[questionIndex].options.push({ text: nextLetter, points: 0 });
      return updated;
    });
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    setQuestions(prev => {
      const updated = [...prev];
      if (updated[questionIndex].options.length > 1) {
        updated[questionIndex].options.splice(optionIndex, 1);
      }
      return updated;
    });
  };

  const updateOptionText = (questionIndex: number, optionIndex: number, text: string) => {
    setQuestions(prev => {
      const updated = [...prev];
      updated[questionIndex].options[optionIndex].text = text;
      return updated;
    });
  };

  const updateOptionPoints = (questionIndex: number, optionIndex: number, points: number) => {
    setQuestions(prev => {
      const updated = [...prev];
      updated[questionIndex].options[optionIndex].points = points;
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error('Please enter a task title');
      return;
    }

    // Validate all questions have at least one option
    for (let i = 0; i < questions.length; i++) {
      if (questions[i].options.length < 1) {
        toast.error(`Question ${i + 1} must have at least one option`);
        return;
      }
      
      // Check if all options have text
      const emptyOption = questions[i].options.find(opt => !opt.text.trim());
      if (emptyOption) {
        toast.error(`All options in Question ${i + 1} must have text`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const formattedQuestions = questions.map(q => ({
        question_number: q.questionNumber,
        options: q.options
      }));

      const { error } = await supabase
        .from('tasks')
        .insert({
          session_id: sessionId,
          title: title.trim(),
          description: description.trim() || null,
          material_reference: materialReference || null,
          num_questions: questions.length,
          questions: formattedQuestions,
          due_date: dueDate ? new Date(dueDate).toISOString() : null,
        });

      if (error) throw error;

      toast.success('Task created successfully');
      setTitle('');
      setDescription('');
      setMaterialReference('');
      setDueDate('');
      setQuestions([{ questionNumber: 1, options: [{ text: 'A', points: 0 }] }]);
      setOpen(false);
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
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
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

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label>Questions ({questions.length})</Label>
              <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
                <Plus className="h-4 w-4 mr-1" />
                Add Question
              </Button>
            </div>
            
            <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
              {questions.map((question, qIndex) => (
                <div key={qIndex} className="space-y-3 border-l-2 border-primary/20 pl-3">
                  <div className="flex justify-between items-center">
                    <Label>Question {question.questionNumber}</Label>
                    {questions.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeQuestion(qIndex)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm">Options</Label>
                    {question.options.map((option, oIndex) => (
                      <div key={oIndex} className="flex gap-2 items-center">
                        <Input
                          placeholder={`Option ${option.text}`}
                          value={option.text}
                          onChange={(e) => updateOptionText(qIndex, oIndex, e.target.value)}
                          className="flex-1"
                        />
                        <Input
                          type="number"
                          placeholder="Points"
                          value={option.points}
                          onChange={(e) => updateOptionPoints(qIndex, oIndex, parseInt(e.target.value) || 0)}
                          className="w-24"
                          min="0"
                        />
                        {question.options.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeOption(qIndex, oIndex)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addOption(qIndex)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Option
                    </Button>
                  </div>
                </div>
              ))}
            </div>
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
