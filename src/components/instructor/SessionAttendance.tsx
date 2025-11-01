import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Users } from 'lucide-react';

interface AttendanceData {
  student_id: string;
  checked_in_at: string;
  profiles: {
    name: string;
    email: string;
  } | null;
}

interface EnrolledStudent {
  student_id: string;
  profiles: {
    name: string;
    email: string;
  } | null;
}

interface SessionAttendanceProps {
  sessionId: string;
  courseId: string;
}

export function SessionAttendance({ sessionId, courseId }: SessionAttendanceProps) {
  const [attendance, setAttendance] = useState<AttendanceData[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [sessionId, courseId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch attendance records
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('student_id, checked_in_at')
        .eq('session_id', sessionId);

      if (attendanceError) throw attendanceError;

      // Fetch enrolled students
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from('enrollments')
        .select('student_id')
        .eq('course_id', courseId);

      if (enrollmentError) throw enrollmentError;

      // Fetch profiles for attendance
      const attendanceWithProfiles = await Promise.all(
        (attendanceData || []).map(async (record) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name, email')
            .eq('id', record.student_id)
            .single();

          return {
            ...record,
            profiles: profile
          };
        })
      );

      // Fetch profiles for enrolled students
      const enrolledWithProfiles = await Promise.all(
        (enrollmentData || []).map(async (enrollment) => {
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

      setAttendance(attendanceWithProfiles);
      setEnrolledStudents(enrolledWithProfiles);
    } catch (error) {
      console.error('Error fetching attendance data:', error);
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

  const attendedStudentIds = new Set(attendance.map(a => a.student_id));
  const attendanceRate = enrolledStudents.length > 0 
    ? Math.round((attendance.length / enrolledStudents.length) * 100) 
    : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Session Attendance
            </CardTitle>
            <CardDescription>
              {attendance.length} of {enrolledStudents.length} students attended
            </CardDescription>
          </div>
          <Badge variant={attendanceRate > 75 ? "default" : attendanceRate > 50 ? "secondary" : "destructive"}>
            {attendanceRate}% attendance
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {enrolledStudents.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            No students enrolled in this course
          </p>
        ) : (
          <div className="space-y-2">
            {enrolledStudents.map((student) => {
              const attended = attendedStudentIds.has(student.student_id);
              const attendanceRecord = attendance.find(a => a.student_id === student.student_id);

              return (
                <div
                  key={student.student_id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    {attended ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-medium">
                        {student.profiles?.name || 'Unknown'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {student.profiles?.email || 'No email'}
                      </p>
                    </div>
                  </div>
                  {attended && attendanceRecord && (
                    <p className="text-sm text-muted-foreground">
                      {new Date(attendanceRecord.checked_in_at).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
