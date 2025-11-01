import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Check, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

interface Course {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export default function StudentDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [enrollingCourseId, setEnrollingCourseId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [coursesResult, enrollmentsResult] = await Promise.all([
        supabase.from('courses').select('*').order('created_at', { ascending: false }),
        supabase.from('enrollments').select('course_id').eq('student_id', user!.id)
      ]);

      if (coursesResult.error) throw coursesResult.error;
      if (enrollmentsResult.error) throw enrollmentsResult.error;

      setCourses(coursesResult.data || []);
      setEnrolledCourseIds(new Set(enrollmentsResult.data?.map(e => e.course_id) || []));
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load courses');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnroll = async (courseId: string) => {
    if (!user) return;
    
    setEnrollingCourseId(courseId);
    try {
      const { error } = await supabase
        .from('enrollments')
        .insert({ student_id: user.id, course_id: courseId });

      if (error) throw error;

      setEnrolledCourseIds(prev => new Set([...prev, courseId]));
      toast.success('Successfully enrolled in course!');
    } catch (error) {
      console.error('Error enrolling:', error);
      toast.error('Failed to enroll in course');
    } finally {
      setEnrollingCourseId(null);
    }
  };

  const handleUnenroll = async (courseId: string) => {
    if (!user) return;
    
    setEnrollingCourseId(courseId);
    try {
      const { error } = await supabase
        .from('enrollments')
        .delete()
        .eq('student_id', user.id)
        .eq('course_id', courseId);

      if (error) throw error;

      setEnrolledCourseIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(courseId);
        return newSet;
      });
      toast.success('Successfully unenrolled from course');
    } catch (error) {
      console.error('Error unenrolling:', error);
      toast.error('Failed to unenroll from course');
    } finally {
      setEnrollingCourseId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold">Available Courses</h1>
          <Button onClick={signOut} variant="outline">
            Sign Out
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Welcome, {user?.email}</CardTitle>
            <CardDescription>Browse and enroll in available courses</CardDescription>
          </CardHeader>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            <>
              <Skeleton className="h-40" />
              <Skeleton className="h-40" />
              <Skeleton className="h-40" />
            </>
          ) : courses.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">No courses available yet.</p>
              </CardContent>
            </Card>
          ) : (
            courses.map((course) => {
              const isEnrolled = enrolledCourseIds.has(course.id);
              const isProcessing = enrollingCourseId === course.id;
              
              return (
                <Card key={course.id} className="hover:shadow-lg transition-shadow flex flex-col">
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <BookOpen className="h-5 w-5 text-primary mt-1" />
                      <div className="flex-1">
                        <CardTitle className="text-lg">{course.name}</CardTitle>
                        <CardDescription className="mt-2">
                          {course.description || 'No description available'}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardFooter className="mt-auto flex gap-2">
                    {isEnrolled ? (
                      <>
                        <Button
                          onClick={() => navigate(`/course/${course.id}`)}
                          className="flex-1"
                        >
                          View Sessions
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                        <Button
                          onClick={() => handleUnenroll(course.id)}
                          disabled={isProcessing}
                          variant="outline"
                          size="icon"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        onClick={() => handleEnroll(course.id)}
                        disabled={isProcessing}
                        className="w-full"
                      >
                        {isProcessing ? 'Enrolling...' : 'Enroll'}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
