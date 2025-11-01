import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Upload, FileText, Trash2, Download } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface CourseMaterialsProps {
  courseId: string;
  courseName: string;
}

interface Material {
  name: string;
  id: string;
  created_at: string;
}

export function CourseMaterials({ courseId, courseName }: CourseMaterialsProps) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchMaterials();
  }, [courseId]);

  const fetchMaterials = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.storage
      .from('course-materials')
      .list(courseId, {
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (!error && data) {
      setMaterials(data);
    }
    setIsLoading(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${courseId}/${fileName}`;

    const { error } = await supabase.storage
      .from('course-materials')
      .upload(filePath, file);

    if (error) {
      toast.error('Failed to upload file');
      console.error(error);
    } else {
      toast.success('File uploaded successfully');
      fetchMaterials();
    }
    
    setIsUploading(false);
    event.target.value = '';
  };

  const handleDelete = async (fileName: string) => {
    const filePath = `${courseId}/${fileName}`;
    
    const { error } = await supabase.storage
      .from('course-materials')
      .remove([filePath]);

    if (error) {
      toast.error('Failed to delete file');
    } else {
      toast.success('File deleted successfully');
      fetchMaterials();
    }
  };

  const handleDownload = async (fileName: string) => {
    const filePath = `${courseId}/${fileName}`;
    
    const { data, error } = await supabase.storage
      .from('course-materials')
      .download(filePath);

    if (error) {
      toast.error('Failed to download file');
    } else {
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Input
          type="file"
          onChange={handleFileUpload}
          disabled={isUploading}
          className="flex-1"
          id={`file-upload-${courseId}`}
        />
        <label htmlFor={`file-upload-${courseId}`}>
          <Button disabled={isUploading} asChild>
            <span>
              <Upload className="w-4 h-4 mr-2" />
              {isUploading ? 'Uploading...' : 'Upload'}
            </span>
          </Button>
        </label>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : materials.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No materials uploaded yet
        </p>
      ) : (
        <div className="space-y-2">
          {materials.map((material) => (
            <div
              key={material.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{material.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(material.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownload(material.name)}
                >
                  <Download className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(material.name)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
