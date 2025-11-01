import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function InstructorDashboard() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold">Hi Teacher! 📚</h1>
          <Button onClick={signOut} variant="outline">
            Sign Out
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Instructor Dashboard</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              You're logged in as: <span className="font-semibold text-foreground">{user?.email}</span>
            </p>
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                This is your instructor dashboard. Here you can:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-muted-foreground">
                <li>Create and manage courses</li>
                <li>Create exercise sets and assignments</li>
                <li>Review student submissions</li>
                <li>Manage sessions and attendance</li>
                <li>Upload course materials</li>
                <li>View student progress and analytics</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
