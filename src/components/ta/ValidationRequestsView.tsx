import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { FileCheck, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ValidationMaterial {
  id: string;
  file_path: string;
  notes: string | null;
  uploaded_at: string;
  ai_validation_status: string;
  ai_validation_result: string | null;
  ai_validated_at: string | null;
}

interface ValidationRequestDetails {
  id: string;
  student_name: string;
  task_title: string;
  course_name: string;
  request_message: string;
  status: string;
  created_at: string;
  materials: ValidationMaterial[];
}

export default function ValidationRequestsView() {
  const [requests, setRequests] = useState<ValidationRequestDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchValidationRequests();
  }, []);

  const fetchValidationRequests = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get validation requests created by this TA
      const { data: requestsData, error: requestsError } = await supabase
        .from('validation_requests')
        .select('*')
        .eq('ta_id', user.id)
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;

      if (!requestsData || requestsData.length === 0) {
        setRequests([]);
        return;
      }

      // Get student profiles
      const studentIds = [...new Set(requestsData.map(r => r.student_id))];
      const { data: studentsData } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', studentIds);

      // Get task submission details
      const submissionIds = requestsData.map(r => r.task_submission_id);
      const { data: submissionsData } = await supabase
        .from('task_submissions')
        .select('id, task_id')
        .in('id', submissionIds);

      const taskIds = submissionsData?.map(s => s.task_id) || [];
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('id, title, session_id')
        .in('id', taskIds);

      const sessionIds = tasksData?.map(t => t.session_id) || [];
      const { data: sessionsData } = await supabase
        .from('sessions')
        .select('id, course_id')
        .in('id', sessionIds);

      const courseIds = sessionsData?.map(s => s.course_id) || [];
      const { data: coursesData } = await supabase
        .from('courses')
        .select('id, name')
        .in('id', courseIds);

      // Get validation materials
      const requestIds = requestsData.map(r => r.id);
      const { data: materialsData } = await supabase
        .from('validation_materials')
        .select('*')
        .in('validation_request_id', requestIds);

      // Create maps for easy lookup
      const studentsMap = new Map(studentsData?.map(s => [s.id, s]) || []);
      const submissionsMap = new Map(submissionsData?.map(s => [s.id, s]) || []);
      const tasksMap = new Map(tasksData?.map(t => [t.id, t]) || []);
      const sessionsMap = new Map(sessionsData?.map(s => [s.id, s]) || []);
      const coursesMap = new Map(coursesData?.map(c => [c.id, c]) || []);

      // Enrich requests
      const enrichedRequests: ValidationRequestDetails[] = requestsData.map(req => {
        const student = studentsMap.get(req.student_id);
        const submission = submissionsMap.get(req.task_submission_id);
        const task = submission ? tasksMap.get(submission.task_id) : null;
        const session = task ? sessionsMap.get(task.session_id) : null;
        const course = session ? coursesMap.get(session.course_id) : null;
        const materials = materialsData?.filter(m => m.validation_request_id === req.id) || [];

        return {
          id: req.id,
          student_name: student?.name || 'Unknown Student',
          task_title: task?.title || 'Unknown Task',
          course_name: course?.name || 'Unknown Course',
          request_message: req.request_message,
          status: req.status,
          created_at: req.created_at,
          materials,
        };
      });

      setRequests(enrichedRequests);
    } catch (error) {
      console.error('Error fetching validation requests:', error);
      toast.error('Failed to load validation requests');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'validating':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <FileCheck className="h-12 w-12 mb-2 opacity-50" />
            <p>No validation requests yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <FileCheck className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Validation Requests</h2>
        <Badge variant="secondary">{requests.length} Total</Badge>
      </div>

      {requests.map((request) => (
        <Card key={request.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg">{request.student_name}</CardTitle>
                <CardDescription>
                  <Badge variant="outline" className="mr-2">
                    {request.course_name}
                  </Badge>
                  <span className="text-sm">{request.task_title}</span>
                </CardDescription>
              </div>
              <Badge 
                variant={
                  request.status === 'pending' ? 'destructive' :
                  request.status === 'submitted' ? 'default' :
                  'secondary'
                }
              >
                {request.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-1">Your Request:</p>
              <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                {request.request_message}
              </p>
            </div>

            <div className="text-xs text-muted-foreground">
              Requested: {format(new Date(request.created_at), 'MMM d, yyyy h:mm a')}
            </div>

            {request.materials.length > 0 && (
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-3">Submitted Materials:</p>
                <div className="space-y-3">
                  {request.materials.map((material) => (
                    <div key={material.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{material.file_path.split('/').pop()}</p>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(material.uploaded_at), 'MMM d, h:mm a')}
                        </span>
                      </div>

                      {material.notes && (
                        <div className="text-sm">
                          <span className="font-medium">Student Notes:</span>
                          <p className="text-muted-foreground mt-1">{material.notes}</p>
                        </div>
                      )}

                      <div className="border-t pt-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(material.ai_validation_status)}
                            <span className="text-sm font-medium">AI Validation:</span>
                          </div>
                          <Badge 
                            variant={
                              material.ai_validation_status === 'approved' ? 'default' :
                              material.ai_validation_status === 'rejected' ? 'destructive' :
                              material.ai_validation_status === 'validating' ? 'secondary' :
                              material.ai_validation_status === 'error' ? 'destructive' :
                              'outline'
                            }
                          >
                            {material.ai_validation_status}
                          </Badge>
                        </div>

                        {material.ai_validation_result && (
                          <div className="bg-muted p-3 rounded-md">
                            <p className="text-sm text-muted-foreground">
                              {material.ai_validation_result}
                            </p>
                          </div>
                        )}

                        {material.ai_validated_at && (
                          <p className="text-xs text-muted-foreground">
                            Validated: {format(new Date(material.ai_validated_at), 'MMM d, yyyy h:mm a')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {request.materials.length === 0 && request.status === 'pending' && (
              <div className="text-sm text-muted-foreground italic">
                Waiting for student to upload materials...
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
