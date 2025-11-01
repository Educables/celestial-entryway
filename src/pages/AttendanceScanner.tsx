import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import QrScanner from 'react-qr-scanner';

interface Session {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  course_id: string;
  courses: {
    name: string;
  };
}

interface AttendanceRecord {
  student_id: string;
  checked_in_at: string;
  profiles: {
    name: string;
    email: string;
  };
}

export default function AttendanceScanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [lastScannedId, setLastScannedId] = useState<string>('');

  useEffect(() => {
    if (user) {
      fetchSessions();
    }
  }, [user]);

  useEffect(() => {
    if (selectedSessionId) {
      fetchAttendance();
    }
  }, [selectedSessionId]);

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          id,
          name,
          start_time,
          end_time,
          course_id,
          courses (name)
        `)
        .order('start_time', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast.error('Failed to load sessions');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAttendance = async () => {
    if (!selectedSessionId) return;
    
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('student_id, checked_in_at')
        .eq('session_id', selectedSessionId);

      if (error) throw error;

      // Fetch profile data separately for each student
      const recordsWithProfiles = await Promise.all(
        (data || []).map(async (record) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name, email')
            .eq('id', record.student_id)
            .single();

          return {
            ...record,
            profiles: profile || { name: 'Unknown', email: 'Unknown' }
          };
        })
      );

      setAttendanceRecords(recordsWithProfiles);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      toast.error('Failed to load attendance records');
    }
  };

  const handleScan = async (data: any) => {
    if (!data || !selectedSessionId) return;
    
    const studentId = data.text;
    
    // Prevent duplicate scans within 3 seconds
    if (studentId === lastScannedId) {
      return;
    }
    
    setLastScannedId(studentId);
    setTimeout(() => setLastScannedId(''), 3000);

    try {
      // Check if already checked in
      const isAlreadyCheckedIn = attendanceRecords.some(
        record => record.student_id === studentId
      );

      if (isAlreadyCheckedIn) {
        toast.error('Student already checked in!');
        return;
      }

      const { error } = await supabase
        .from('attendance')
        .insert({
          session_id: selectedSessionId,
          student_id: studentId
        });

      if (error) throw error;

      toast.success('Student checked in successfully!');
      await fetchAttendance();
    } catch (error: any) {
      console.error('Error marking attendance:', error);
      toast.error(error.message || 'Failed to mark attendance');
    }
  };

  const handleError = (error: any) => {
    console.error('QR Scanner error:', error);
  };

  const toggleCamera = () => {
    if (!selectedSessionId) {
      toast.error('Please select a session first');
      return;
    }
    setIsCameraActive(!isCameraActive);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <Button onClick={() => navigate('/instructor')} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <UserCheck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Attendance Scanner</CardTitle>
                <CardDescription>Scan student QR codes to mark attendance</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Session</label>
              <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a session" />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map((session) => (
                    <SelectItem key={session.id} value={session.id}>
                      {session.courses.name} - {session.name} ({new Date(session.start_time).toLocaleDateString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={toggleCamera}
              disabled={!selectedSessionId}
              className="w-full"
              size="lg"
            >
              {isCameraActive ? 'Stop Scanner' : 'Start Scanner'}
            </Button>
          </CardContent>
        </Card>

        {isCameraActive && (
          <Card>
            <CardContent className="pt-6">
              <div className="aspect-square max-w-md mx-auto bg-black rounded-lg overflow-hidden">
                <QrScanner
                  delay={300}
                  onError={handleError}
                  onScan={handleScan}
                  style={{ width: '100%' }}
                  constraints={{
                    video: { facingMode: 'environment' }
                  }}
                />
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Attendance Records ({attendanceRecords.length})</CardTitle>
            <CardDescription>
              {selectedSessionId ? 'Students checked in to this session' : 'Select a session to view attendance'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {attendanceRecords.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No students checked in yet
              </p>
            ) : (
              <div className="space-y-2">
                {attendanceRecords.map((record) => (
                  <div
                    key={record.student_id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="font-medium">{record.profiles.name}</p>
                        <p className="text-sm text-muted-foreground">{record.profiles.email}</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(record.checked_in_at).toLocaleTimeString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
