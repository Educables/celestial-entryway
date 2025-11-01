import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, User, LogOut, GraduationCap, ChevronDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { EnrolledStudents } from '@/components/instructor/EnrolledStudents';

interface Course {
  id: string;
  name: string;
  description: string;
}

export default function TADashboard() {
  const { user, role, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCourses, setOpenCourses] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/auth');
      } else if (role !== 'ta') {
        navigate('/');
      } else {
        fetchAssignedCourses();
      }
    }
  }, [user, role, authLoading, navigate]);

  const fetchAssignedCourses = async () => {
    try {
      // Fetch courses where user is assigned as TA using raw query
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user?.id)
        .eq('role', 'ta') as any;

      if (rolesError) throw rolesError;

      if (userRoles && userRoles.length > 0) {
        const courseIds = userRoles
          .map((ur: any) => ur.course_id)
          .filter((id: any): id is string => id !== null && id !== undefined);
        
        if (courseIds.length > 0) {
          const { data: coursesData, error: coursesError } = await supabase
            .from('courses')
            .select('id, name, description')
            .in('id', courseIds);

          if (coursesError) throw coursesError;
          setCourses(coursesData || []);
        }
      }
    } catch (error) {
      console.error('Error fetching assigned courses:', error);
      toast({
        title: "Error",
        description: "Failed to load assigned courses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
              <GraduationCap className="h-6 w-6 text-primary" />
              <h1 className="text-3xl font-bold">Teaching Assistant Dashboard</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/profile')}>
              <User className="h-4 w-4 mr-2" />
              Profile
            </Button>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Assigned Courses</CardTitle>
              <CardDescription>
                Courses where you are assigned as a Teaching Assistant
              </CardDescription>
            </CardHeader>
            <CardContent>
              {courses.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  You are not currently assigned to any courses.
                </p>
              ) : (
                <div className="space-y-4">
                  {courses.map((course) => (
                    <Collapsible
                      key={course.id}
                      open={openCourses.has(course.id)}
                      onOpenChange={(isOpen) => {
                        setOpenCourses(prev => {
                          const newSet = new Set(prev);
                          if (isOpen) {
                            newSet.add(course.id);
                          } else {
                            newSet.delete(course.id);
                          }
                          return newSet;
                        });
                      }}
                    >
                      <Card className="hover:border-primary transition-colors">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-lg">{course.name}</CardTitle>
                              <CardDescription>{course.description}</CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => navigate(`/course/${course.id}`)}
                              >
                                View Course
                              </Button>
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <ChevronDown className={`h-4 w-4 transition-transform ${openCourses.has(course.id) ? 'rotate-180' : ''}`} />
                                </Button>
                              </CollapsibleTrigger>
                            </div>
                          </div>
                        </CardHeader>
                        <CollapsibleContent>
                          <CardContent>
                            <EnrolledStudents courseId={course.id} courseName={course.name} />
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>TA Responsibilities</CardTitle>
              <CardDescription>
                Your role as a Teaching Assistant
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  Check attendance with QR scanner
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  Review and grade student submissions
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  Assist students during sessions
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  Monitor course progress
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
