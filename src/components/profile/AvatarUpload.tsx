
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Upload } from 'lucide-react';

interface AvatarUploadProps {
  userId: string;
  currentAvatarUrl?: string;
  userName?: string;
  onAvatarUpdate: (url: string) => void;
}

export default function AvatarUpload({ 
  userId, 
  currentAvatarUrl, 
  userName, 
  onAvatarUpdate 
}: AvatarUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log('File selected:', file.name, file.size, file.type);
      setSelectedFile(file);
    }
  };

  const uploadAvatar = async () => {
    if (!selectedFile || !userId) {
      toast({
        title: "Erro",
        description: "Nenhum arquivo selecionado",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    console.log('Starting upload for user:', userId);

    try {
      // Generate unique filename
      const fileExtension = selectedFile.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExtension}`;
      
      console.log('Uploading file:', fileName);

      // Upload file directly to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatar')
        .upload(fileName, selectedFile, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`Erro no upload: ${uploadError.message}`);
      }

      console.log('Upload successful:', uploadData);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatar')
        .getPublicUrl(fileName);

      console.log('Public URL generated:', publicUrl);

      // Update user profile with new avatar URL
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);

      if (updateError) {
        console.error('Profile update error:', updateError);
        throw new Error(`Erro ao atualizar perfil: ${updateError.message}`);
      }

      console.log('Profile updated successfully');

      // Clear file selection and notify parent
      setSelectedFile(null);
      onAvatarUpdate(publicUrl);
      
      // Clear file input
      const fileInput = document.getElementById('avatar-upload') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }

      toast({
        title: "Sucesso",
        description: "Avatar atualizado com sucesso!",
      });

    } catch (error: any) {
      console.error('Avatar upload failed:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao fazer upload do avatar",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <Avatar className="h-24 w-24">
        <AvatarImage src={currentAvatarUrl} />
        <AvatarFallback className="text-lg">
          {userName?.split(' ').map(n => n[0]).join('') || 'U'}
        </AvatarFallback>
      </Avatar>
      
      <div className="space-y-2">
        <input 
          type="file" 
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          id="avatar-upload"
        />
        <label htmlFor="avatar-upload">
          <Button variant="outline" size="sm" className="cursor-pointer" type="button" asChild>
            <span>
              <Upload className="h-4 w-4 mr-2" />
              Escolher Foto
            </span>
          </Button>
        </label>
        
        {selectedFile && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-gray-600">
              Arquivo: {selectedFile.name}
            </p>
            <Button 
              onClick={uploadAvatar} 
              disabled={uploading}
              size="sm"
              className="bg-green-600 hover:bg-green-700"
            >
              {uploading ? 'Salvando...' : 'Salvar Avatar'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
