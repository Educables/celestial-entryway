import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Upload, FileCheck, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

interface ValidationRequest {
  id: string;
  task_submission_id: string;
  student_id: string;
  ta_id: string;
  request_message: string;
  status: string;
  created_at: string;
  task_title: string;
  course_name: string;
  ta_name: string;
  materials: {
    id: string;
    file_path: string;
    notes: string;
    uploaded_at: string;
    ai_validation_status: string;
    ai_validation_result: string | null;
    ai_validated_at: string | null;
  }[];
}

export default function ValidationRequests() {
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [requests, setRequests] = useState<ValidationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/auth');
      } else if (role !== 'student') {
        navigate('/');
      } else {
        fetchValidationRequests();
      }
    }
  }, [user, role, authLoading, navigate]);

  const fetchValidationRequests = async () => {
    try {
      setLoading(true);
      
      // Get validation requests for this student
      const { data: requestsData, error: requestsError } = await supabase
        .from('validation_requests')
        .select('*')
        .eq('student_id', user?.id)
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;

      if (!requestsData || requestsData.length === 0) {
        setRequests([]);
        return;
      }

      // Get task and course details
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

      // Get TA profiles
      const taIds = requestsData.map(r => r.ta_id);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', taIds);

      // Get validation materials
      const requestIds = requestsData.map(r => r.id);
      const { data: materialsData } = await supabase
        .from('validation_materials')
        .select('*')
        .in('validation_request_id', requestIds);

      // Combine all data
      const enrichedRequests = requestsData.map(request => {
        const submission = submissionsData?.find(s => s.id === request.task_submission_id);
        const task = tasksData?.find(t => t.id === submission?.task_id);
        const session = sessionsData?.find(s => s.id === task?.session_id);
        const course = coursesData?.find(c => c.id === session?.course_id);
        const taProfile = profilesData?.find(p => p.id === request.ta_id);
        const materials = materialsData?.filter(m => m.validation_request_id === request.id) || [];

        return {
          ...request,
          task_title: task?.title || 'Unknown Task',
          course_name: course?.name || 'Unknown Course',
          ta_name: taProfile?.name || 'Unknown TA',
          materials,
        };
      });

      setRequests(enrichedRequests);
    } catch (error) {
      console.error('Error fetching validation requests:', error);
      toast({
        title: "Error",
        description: "Failed to load validation requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async (requestId: string) => {
    if (!selectedFile) {
      toast({
        title: "Error",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }

    setUploadingFor(requestId);
    try {
      // Upload file to storage
      const fileName = `${user?.id}/${requestId}/${Date.now()}_${selectedFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('validation-materials')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Create validation material record
      const { data: materialData, error: insertError } = await supabase
        .from('validation_materials')
        .insert({
          validation_request_id: requestId,
          file_path: fileName,
          notes: notes || null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Update request status to submitted
      const { error: updateError } = await supabase
        .from('validation_requests')
        .update({ status: 'submitted' })
        .eq('id', requestId);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Material uploaded successfully. AI validation in progress...",
      });

      // Trigger AI validation
      const { error: functionError } = await supabase.functions.invoke('validate-document', {
        body: { materialId: materialData.id }
      });

      if (functionError) {
        console.error('AI validation error:', functionError);
        toast({
          title: "Warning",
          description: "Material uploaded but AI validation failed to start. Please contact support.",
          variant: "destructive",
        });
      }

      setSelectedFile(null);
      setNotes('');
      setUploadingFor(null);
      fetchValidationRequests();
    } catch (error: any) {
      console.error('Error uploading validation material:', error);
      toast({
        title: "Error",
        description: "Failed to upload validation material",
        variant: "destructive",
      });
    } finally {
      setUploadingFor(null);
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

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => navigate('/student')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="flex items-center gap-2">
              <FileCheck className="h-6 w-6 text-primary" />
              <h1 className="text-3xl font-bold">Validation Requests</h1>
              {pendingCount > 0 && (
                <Badge variant="destructive">{pendingCount} Pending</Badge>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {requests.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground text-center py-8">
                  No validation requests yet
                </p>
              </CardContent>
            </Card>
          ) : (
            requests.map((request) => (
              <Card key={request.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle>{request.task_title}</CardTitle>
                      <CardDescription>
                        <Badge variant="outline" className="mr-2">
                          {request.course_name}
                        </Badge>
                        <span className="text-sm">Requested by: {request.ta_name}</span>
                      </CardDescription>
                    </div>
                    <Badge 
                      variant={
                        request.status === 'pending' ? 'destructive' :
                        request.status === 'submitted' ? 'default' :
                        request.status === 'approved' ? 'default' : 'secondary'
                      }
                    >
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2">Request Message:</p>
                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                      {request.request_message}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Requested: {format(new Date(request.created_at), 'MMM d, yyyy h:mm a')}</span>
                  </div>

                  {request.materials.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Uploaded Materials:</p>
                      <div className="space-y-2">
                        {request.materials.map((material) => (
                          <div key={material.id} className="border rounded-md p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium">{material.file_path.split('/').pop()}</p>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(material.uploaded_at), 'MMM d, h:mm a')}
                              </span>
                            </div>
                            {material.notes && (
                              <p className="text-xs text-muted-foreground">{material.notes}</p>
                            )}
                            <div className="border-t pt-2 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium">AI Validation:</span>
                                <Badge 
                                  variant={
                                    material.ai_validation_status === 'approved' ? 'default' :
                                    material.ai_validation_status === 'rejected' ? 'destructive' :
                                    material.ai_validation_status === 'validating' ? 'secondary' :
                                    material.ai_validation_status === 'error' ? 'destructive' :
                                    'outline'
                                  }
                                  className="text-xs"
                                >
                                  {material.ai_validation_status}
                                </Badge>
                              </div>
                              {material.ai_validation_result && (
                                <p className="text-xs text-muted-foreground">
                                  {material.ai_validation_result}
                                </p>
                              )}
                              {material.ai_validated_at && (
                                <p className="text-xs text-muted-foreground">
                                  Validated: {format(new Date(material.ai_validated_at), 'MMM d, h:mm a')}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {request.status === 'pending' && (
                    <div className="border-t pt-4 space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor={`file-${request.id}`}>Upload Proof of Work</Label>
                        <Input
                          id={`file-${request.id}`}
                          type="file"
                          onChange={handleFileSelect}
                          disabled={uploadingFor === request.id}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`notes-${request.id}`}>Notes (Optional)</Label>
                        <Textarea
                          id={`notes-${request.id}`}
                          placeholder="Add any notes about your submission..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          rows={3}
                          disabled={uploadingFor === request.id}
                        />
                      </div>
                      <Button
                        onClick={() => handleUpload(request.id)}
                        disabled={!selectedFile || uploadingFor === request.id}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {uploadingFor === request.id ? 'Uploading...' : 'Upload Material'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
