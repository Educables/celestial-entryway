import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

type UserRole = 'student' | 'ta' | 'instructor' | 'admin';

interface Course {
  id: string;
  name: string;
}

interface AssignRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  currentRole: UserRole;
  onRoleUpdated: () => void;
}

export default function AssignRoleDialog({
  open,
  onOpenChange,
  userId,
  userName,
  currentRole,
  onRoleUpdated,
}: AssignRoleDialogProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>(currentRole);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchCourses();
      setSelectedRole(currentRole);
      setSelectedCourse('');
    }
  }, [open, currentRole]);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast({
        title: "Error",
        description: "Failed to load courses",
        variant: "destructive",
      });
    }
  };

  const handleAssignRole = async () => {
    if (selectedRole === 'ta' && !selectedCourse) {
      toast({
        title: "Course Required",
        description: "Please select a course for the TA role",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // First, remove all existing role entries for this user
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      // Insert new role
      const roleData: any = {
        user_id: userId,
        role: selectedRole,
      };

      // Add course_id for TA role
      if (selectedRole === 'ta' && selectedCourse) {
        roleData.course_id = selectedCourse;
      }

      const { error: insertError } = await supabase
        .from('user_roles')
        .insert(roleData);

      if (insertError) throw insertError;

      toast({
        title: "Success",
        description: `${userName} has been assigned the ${selectedRole} role${
          selectedRole === 'ta' ? ' for the selected course' : ''
        }`,
      });

      onRoleUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error assigning role:', error);
      toast({
        title: "Error",
        description: "Failed to assign role",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Role to {userName}</DialogTitle>
          <DialogDescription>
            Select a role and course (if applicable) to assign to this user.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select
              value={selectedRole}
              onValueChange={(value: UserRole) => setSelectedRole(value)}
            >
              <SelectTrigger id="role">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="ta">Teaching Assistant</SelectItem>
                <SelectItem value="instructor">Instructor</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedRole === 'ta' && (
            <div className="space-y-2">
              <Label htmlFor="course">Course *</Label>
              <Select
                value={selectedCourse}
                onValueChange={setSelectedCourse}
              >
                <SelectTrigger id="course">
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                TAs must be assigned to a specific course
              </p>
            </div>
          )}

          {selectedRole === 'instructor' && (
            <p className="text-sm text-muted-foreground">
              Instructors can create and manage their own courses
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAssignRole} disabled={loading}>
            {loading ? 'Assigning...' : 'Assign Role'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
