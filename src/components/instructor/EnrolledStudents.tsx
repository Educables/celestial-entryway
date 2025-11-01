import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Mail } from 'lucide-react';

interface Student {
  student_id: string;
  enrolled_at: string;
  profiles: {
    name: string;
    email: string;
  } | null;
}

interface EnrolledStudentsProps {
  courseId: string;
}

export function EnrolledStudents({ courseId }: EnrolledStudentsProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchEnrolledStudents();
  }, [courseId]);

  const fetchEnrolledStudents = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('enrollments')
        .select('student_id, enrolled_at')
        .eq('course_id', courseId);

      if (error) throw error;

      // Fetch profile data for each student
      const studentsWithProfiles = await Promise.all(
        (data || []).map(async (enrollment) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name, email')
            .eq('id', enrollment.student_id)
            .single();

          return {
            ...enrollment,
            profiles: profile
          };
        })
      );

      setStudents(studentsWithProfiles);
    } catch (error) {
      console.error('Error fetching enrolled students:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            No students enrolled yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Enrolled Students ({students.length})
        </CardTitle>
        <CardDescription>Students registered for this course</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {students.map((student) => (
            <div
              key={student.student_id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">
                    {student.profiles?.name || 'Unknown'}
                  </p>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    {student.profiles?.email || 'No email'}
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Enrolled: {new Date(student.enrolled_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
