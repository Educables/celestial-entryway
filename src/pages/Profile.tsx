import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, Download, User, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function Profile() {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [totalPoints, setTotalPoints] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id && role === 'student') {
      fetchTotalPoints();
    }
  }, [user?.id, role]);

  const fetchTotalPoints = async () => {
    try {
      const { data, error } = await supabase
        .from('task_submissions')
        .select('grade')
        .eq('student_id', user?.id);

      if (error) throw error;

      const total = (data || []).reduce((sum, submission) => sum + (submission.grade || 0), 0);
      setTotalPoints(total);
    } catch (error) {
      console.error('Error fetching total points:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadQR = () => {
    const svg = document.getElementById('student-qr-code');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');

      const downloadLink = document.createElement('a');
      downloadLink.download = `student-id-${user?.id}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const handleGoBack = () => {
    if (role === 'student') {
      navigate('/student');
    } else if (role === 'instructor' || role === 'ta' || role === 'admin') {
      navigate('/instructor');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10 p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <Button onClick={handleGoBack} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <Button onClick={signOut} variant="outline">
            Sign Out
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Student Profile</CardTitle>
                <CardDescription>{user?.email}</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Student ID QR Code</CardTitle>
            <CardDescription>
              This is your permanent student identification QR code. Use it for attendance and verification.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6">
            <div className="p-6 bg-white rounded-lg shadow-md">
              <QRCodeSVG
                id="student-qr-code"
                value={user?.id || ''}
                size={256}
                level="H"
                includeMargin
              />
            </div>
            
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">Student ID</p>
              <p className="font-mono text-xs bg-muted px-3 py-2 rounded">
                {user?.id}
              </p>
            </div>

            <Button onClick={handleDownloadQR} className="w-full max-w-xs">
              <Download className="h-4 w-4 mr-2" />
              Download QR Code
            </Button>
          </CardContent>
        </Card>

        {role === 'student' && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Trophy className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Academic Performance</CardTitle>
                  <CardDescription>Your total points from all tasks</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-6">
                {loading ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : (
                  <>
                    <div className="text-5xl font-bold text-primary mb-2">{totalPoints}</div>
                    <p className="text-lg text-muted-foreground">Total Points</p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{user?.email}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Role</span>
              <span className="font-medium capitalize">{role}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Account Created</span>
              <span className="font-medium">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
