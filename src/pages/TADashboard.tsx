import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QrCode, LogOut, Users, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';

interface Course {
  id: string;
  name: string;
  description: string | null;
}

export default function TADashboard() {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (role && role !== 'ta') {
      if (role === 'student') {
        navigate('/student');
      } else if (role === 'instructor') {
        navigate('/instructor');
      } else if (role === 'admin') {
        navigate('/admin');
      }
    }
  }, [role, navigate]);

  useEffect(() => {
    if (user && role === 'ta') {
      fetchAssignedCourses();
    }
  }, [user, role]);

  const fetchAssignedCourses = async () => {
    try {
      setLoading(true);
      // Get courses where the user is assigned as TA
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('course_id')
        .eq('user_id', user?.id)
        .eq('role', 'ta')
        .not('course_id', 'is', null);

      if (rolesError) throw rolesError;

      if (userRoles && userRoles.length > 0) {
        const courseIds = userRoles.map(ur => ur.course_id);
        const { data: coursesData, error: coursesError } = await supabase
          .from('courses')
          .select('*')
          .in('id', courseIds);

        if (coursesError) throw coursesError;
        setCourses(coursesData || []);
      } else {
        setCourses([]);
      }
    } catch (error: any) {
      toast.error('Failed to fetch assigned courses');
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">TA Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {user?.email}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate('/scanner')}
            >
              <QrCode className="mr-2 h-4 w-4" />
              Scanner
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/profile')}
            >
              Profile
            </Button>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>

        <Tabs defaultValue="courses" className="space-y-4">
          <TabsList>
            <TabsTrigger value="courses">Assigned Courses</TabsTrigger>
            <TabsTrigger value="tasks">Tasks & Submissions</TabsTrigger>
          </TabsList>

          <TabsContent value="courses" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Your Assigned Courses</CardTitle>
                <CardDescription>
                  Courses where you are assigned as a Teaching Assistant
                </CardDescription>
              </CardHeader>
              <CardContent>
                {courses.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>You are not assigned to any courses yet.</p>
                    <p className="text-sm mt-2">Contact an instructor or admin to get assigned.</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {courses.map((course) => (
                      <Card key={course.id}>
                        <CardHeader>
                          <CardTitle className="text-lg">{course.name}</CardTitle>
                          {course.description && (
                            <CardDescription>{course.description}</CardDescription>
                          )}
                        </CardHeader>
                        <CardContent>
                          <Button
                            className="w-full"
                            onClick={() => navigate(`/course/${course.id}`)}
                          >
                            View Course
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Tasks & Submissions</CardTitle>
                <CardDescription>
                  Manage tasks and review student submissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <ClipboardList className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>Select a course to view and manage tasks</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
