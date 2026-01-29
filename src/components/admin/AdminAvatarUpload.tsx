import { useState, useRef } from 'react';
import { Camera, Loader2, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AdminAvatarUploadProps {
  userId: string;
  currentAvatarUrl: string | null;
  onUploadSuccess: () => void;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'w-16 h-16',
  md: 'w-20 h-20',
  lg: 'w-24 h-24'
};

const iconSizes = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12'
};

const AdminAvatarUpload = ({ 
  userId, 
  currentAvatarUrl, 
  onUploadSuccess,
  size = 'md'
}: AdminAvatarUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validação de tamanho (máx 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 2MB.');
      return;
    }

    // Validação de tipo
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Formato inválido. Use JPG, PNG ou WebP.');
      return;
    }

    setIsUploading(true);

    try {
      // Criar preview local
      const localPreview = URL.createObjectURL(file);
      setPreviewUrl(localPreview);

      // Gerar nome do arquivo
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const filePath = `${userId}/avatar.${ext}`;

      // Tentar remover arquivo antigo (ignorar erro se não existir)
      await supabase.storage.from('avatars').remove([filePath]);

      // Upload do novo arquivo
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Adicionar timestamp para invalidar cache
      const urlWithCache = `${publicUrl}?t=${Date.now()}`;

      // Atualizar profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlWithCache })
        .eq('id', userId);

      if (updateError) throw updateError;

      toast.success('Foto atualizada com sucesso!');
      onUploadSuccess();

    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao atualizar foto. Tente novamente.');
      // Reverter preview
      setPreviewUrl(currentAvatarUrl);
    } finally {
      setIsUploading(false);
      // Limpar input para permitir reselecionar o mesmo arquivo
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="relative">
      {/* Avatar Circle */}
      <div
        className={`relative ${sizeClasses[size]} rounded-full overflow-hidden cursor-pointer group bg-white/10`}
        onClick={handleClick}
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Avatar"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <User className={`${iconSizes[size]} text-white/40`} />
          </div>
        )}

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          {isUploading ? (
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          ) : (
            <Camera className="w-5 h-5 text-white" />
          )}
        </div>

        {/* Loading overlay */}
        {isUploading && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          </div>
        )}
      </div>

      {/* Camera badge */}
      <button
        onClick={handleClick}
        disabled={isUploading}
        className="absolute -bottom-1 -right-1 p-1.5 bg-white/20 rounded-full hover:bg-white/30 transition-colors disabled:opacity-50"
        title="Alterar foto"
      >
        <Camera className="w-3.5 h-3.5 text-white" />
      </button>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
        disabled={isUploading}
      />
    </div>
  );
};

export default AdminAvatarUpload;
