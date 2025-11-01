import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, ScanLine } from 'lucide-react';
import { CreateCourseDialog } from '@/components/instructor/CreateCourseDialog';
import { CreateSessionDialog } from '@/components/instructor/CreateSessionDialog';
import { CoursesList } from '@/components/instructor/CoursesList';
import { SessionsList } from '@/components/instructor/SessionsList';
import { useNavigate } from 'react-router-dom';

export default function InstructorDashboard() {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Additional security check
  if (role && !['instructor', 'ta', 'admin'].includes(role)) {
    navigate('/student');
    return null;
  }

  const handleCourseCreated = () => {
    setShowCreateCourse(false);
    setRefreshKey(prev => prev + 1);
  };

  const handleSessionCreated = () => {
    setShowCreateSession(false);
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold">Hi Teacher! 📚</h1>
          <div className="flex gap-2">
            <Button onClick={() => navigate('/scanner')} variant="default">
              <ScanLine className="h-4 w-4 mr-2" />
              Scanner
            </Button>
            <Button onClick={signOut} variant="outline">
              Sign Out
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Instructor Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              You're logged in as: <span className="font-semibold text-foreground">{user?.email}</span>
            </p>
          </CardContent>
        </Card>

        <Tabs defaultValue="courses" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="courses">Courses</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
          </TabsList>

          <TabsContent value="courses" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setShowCreateCourse(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Course
              </Button>
            </div>
            <CoursesList key={`courses-${refreshKey}`} />
          </TabsContent>

          <TabsContent value="sessions" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setShowCreateSession(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Session
              </Button>
            </div>
            <SessionsList key={`sessions-${refreshKey}`} />
          </TabsContent>
        </Tabs>

        <CreateCourseDialog 
          open={showCreateCourse} 
          onOpenChange={setShowCreateCourse}
          onSuccess={handleCourseCreated}
        />
        
        <CreateSessionDialog 
          open={showCreateSession} 
          onOpenChange={setShowCreateSession}
          onSuccess={handleSessionCreated}
        />
      </div>
    </div>
  );
}
