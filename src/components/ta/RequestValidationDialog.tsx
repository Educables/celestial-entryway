import { useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FileQuestion } from 'lucide-react';

interface RequestValidationDialogProps {
  submissionId: string;
  studentId: string;
  studentName: string;
}

export function RequestValidationDialog({
  submissionId,
  studentId,
  studentName,
}: RequestValidationDialogProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) {
      toast.error('Please enter a validation request message');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('validation_requests')
        .insert({
          task_submission_id: submissionId,
          student_id: studentId,
          ta_id: user.id,
          request_message: message,
          status: 'pending',
        });

      if (error) throw error;

      toast.success('Validation request sent to student');
      setMessage('');
      setOpen(false);
    } catch (error: any) {
      console.error('Error creating validation request:', error);
      toast.error('Failed to send validation request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileQuestion className="h-4 w-4 mr-2" />
          Request Validation
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Work Validation</DialogTitle>
          <DialogDescription>
            Ask {studentName} to upload proof of their work
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="message">Validation Request Message</Label>
            <Textarea
              id="message"
              placeholder="Please upload screenshots or documentation proving you completed this work..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Sending...' : 'Send Request'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
