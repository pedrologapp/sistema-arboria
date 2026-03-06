import { useState, useRef } from 'react';
import { Camera, Loader2, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AvatarUploadProps {
  userId: string;
  currentAvatarUrl: string | null;
  casaColor: string;
  onUploadSuccess: () => void;
}

const AvatarUpload = ({ userId, currentAvatarUrl, casaColor, onUploadSuccess }: AvatarUploadProps) => {
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

      // Log activity
      import('@/utils/logActivity').then(({ logActivity }) =>
        logActivity(userId, 'perfil_atualizado', { campo_alterado: 'avatar' })
      );

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
    <div className="flex flex-col items-center gap-3">
      {/* Avatar Circle */}
      <div
        className="relative w-24 h-24 rounded-full overflow-hidden cursor-pointer group"
        style={{ backgroundColor: `${casaColor}20` }}
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
            <User className="w-12 h-12" style={{ color: casaColor }} />
          </div>
        )}

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          {isUploading ? (
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          ) : (
            <Camera className="w-6 h-6 text-white" />
          )}
        </div>

        {/* Loading overlay */}
        {isUploading && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        )}
      </div>

      {/* Button */}
      <button
        onClick={handleClick}
        disabled={isUploading}
        className="flex items-center gap-2 text-sm px-4 py-2 rounded-full transition-colors disabled:opacity-50"
        style={{ 
          backgroundColor: `${casaColor}20`,
          color: casaColor 
        }}
      >
        {isUploading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Enviando...
          </>
        ) : (
          <>
            <Camera className="w-4 h-4" />
            Alterar Foto
          </>
        )}
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

      <p className="text-xs text-white/40">JPG, PNG ou WebP • Máx 2MB</p>
    </div>
  );
};

export default AvatarUpload;
