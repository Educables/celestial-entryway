import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Shield, UserPlus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

type UserRole = 'student' | 'ta' | 'instructor' | 'admin';

interface UserWithRoles {
  id: string;
  name: string;
  email: string;
  roles: Array<{
    role: UserRole;
    course_id: string | null;
    course_name?: string;
  }>;
}

interface Course {
  id: string;
  name: string;
}

export default function AdminDashboard() {
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<'ta' | 'instructor' | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/auth');
      } else if (role !== 'admin') {
        navigate('/');
      } else {
        fetchUsers();
      }
    }
  }, [user, role, authLoading, navigate]);

  const fetchUsers = async () => {
    try {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, email');

      if (profilesError) throw profilesError;

      // Fetch all user roles with course info
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select(`
          user_id, 
          role, 
          course_id,
          courses:course_id(name)
        `);

      if (rolesError) throw rolesError;

      // Fetch all courses
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('id, name')
        .order('name');

      if (coursesError) throw coursesError;
      setCourses(coursesData || []);

      // Combine profiles with their roles
      const usersWithRoles: UserWithRoles[] = profiles?.map(profile => {
        const userRolesList = userRoles?.filter(ur => ur.user_id === profile.id) || [];
        return {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          roles: userRolesList.map(ur => ({
            role: ur.role as UserRole,
            course_id: ur.course_id,
            course_name: ur.courses?.name,
          })),
        };
      }) || [];

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const assignCourseRole = async () => {
    if (!selectedUser || !selectedRole || !selectedCourse) {
      toast({
        title: "Error",
        description: "Please select a role and course",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: selectedUser,
          role: selectedRole,
          course_id: selectedCourse,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: `${selectedRole === 'instructor' ? 'Teacher' : 'TA'} role assigned successfully`,
      });

      setDialogOpen(false);
      setSelectedUser(null);
      setSelectedRole(null);
      setSelectedCourse(null);
      fetchUsers();
    } catch (error: any) {
      console.error('Error assigning role:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to assign role",
        variant: "destructive",
      });
    }
  };

  const removeRole = async (userId: string, role: UserRole, courseId: string | null) => {
    try {
      let query = supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);

      if (courseId) {
        query = query.eq('course_id', courseId);
      } else {
        query = query.is('course_id', null);
      }

      const { error } = await query;

      if (error) throw error;

      toast({
        title: "Success",
        description: "Role removed successfully",
      });

      fetchUsers();
    } catch (error) {
      console.error('Error removing role:', error);
      toast({
        title: "Error",
        description: "Failed to remove role",
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
            <Button variant="outline" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>User Role Management</CardTitle>
            <CardDescription>
              Assign Teacher and TA roles to students for specific courses. Admin roles are limited to 4 accounts with emails starting with "boss".
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roles.map((roleInfo, idx) => (
                          <Badge 
                            key={idx} 
                            variant={roleInfo.role === 'admin' ? 'default' : 'secondary'}
                            className="gap-1"
                          >
                            <span className="capitalize">
                              {roleInfo.role === 'instructor' ? 'Teacher' : roleInfo.role}
                            </span>
                            {roleInfo.course_name && (
                              <span className="text-xs">({roleInfo.course_name})</span>
                            )}
                            {roleInfo.role !== 'admin' && (
                              <button
                                onClick={() => removeRole(user.id, roleInfo.role, roleInfo.course_id)}
                                className="ml-1 hover:text-destructive"
                              >
                                ×
                              </button>
                            )}
                          </Badge>
                        ))}
                        {user.roles.length === 0 && (
                          <Badge variant="outline">No roles assigned</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Dialog open={dialogOpen && selectedUser === user.id} onOpenChange={(open) => {
                        setDialogOpen(open);
                        if (!open) {
                          setSelectedUser(null);
                          setSelectedRole(null);
                          setSelectedCourse(null);
                        }
                      }}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user.id);
                              setDialogOpen(true);
                            }}
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Assign Role
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Assign Role to {user.name}</DialogTitle>
                            <DialogDescription>
                              Select a role and course to assign to this user.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Role</label>
                              <Select value={selectedRole || ''} onValueChange={(value: 'ta' | 'instructor') => setSelectedRole(value)}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="instructor">Teacher (Instructor)</SelectItem>
                                  <SelectItem value="ta">Teaching Assistant</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Course</label>
                              <Select value={selectedCourse || ''} onValueChange={setSelectedCourse}>
                                <SelectTrigger>
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
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              onClick={assignCourseRole}
                              disabled={!selectedRole || !selectedCourse}
                            >
                              Assign Role
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
