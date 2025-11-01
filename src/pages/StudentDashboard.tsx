import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function StudentDashboard() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold">Hi Student! 👋</h1>
          <Button onClick={signOut} variant="outline">
            Sign Out
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Welcome to Your Dashboard</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              You're logged in as: <span className="font-semibold text-foreground">{user?.email}</span>
            </p>
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                This is your student dashboard. Here you'll be able to:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-muted-foreground">
                <li>View your courses and exercise sets</li>
                <li>Submit homework and track progress</li>
                <li>Register for sessions and view attendance</li>
                <li>Access course materials</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
