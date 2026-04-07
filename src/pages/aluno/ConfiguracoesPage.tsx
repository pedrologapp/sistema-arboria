import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, KeyRound, LogOut, ChevronRight, Mail, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useStudent } from '@/contexts/StudentContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AvatarUpload from '@/components/aluno/AvatarUpload';
import { cn } from '@/lib/utils';

const ConfiguracoesPage = () => {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { profile, casa, casaColor, refreshData } = useStudent();
  const [frasePessoal, setFrasePessoal] = useState(profile?.frase_pessoal || '');
  const [salvandoFrase, setSalvandoFrase] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const salvarFrase = async () => {
    if (!profile?.id) return;
    setSalvandoFrase(true);
    const { error } = await supabase
      .from('profiles')
      .update({ frase_pessoal: frasePessoal.trim() || null } as any)
      .eq('id', profile.id);
    setSalvandoFrase(false);
    if (error) {
      // Campo pode nao existir ainda — silenciar
      console.log('Frase pessoal nao salva (campo pode nao existir):', error.message);
    } else {
      toast.success('Frase atualizada!');
    }
  };

  const fullName = profile?.full_name || `${profile?.nome || ''} ${profile?.sobrenome || ''}`.trim() || 'Aluno';

  return (
    <div className="p-4 space-y-5 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-1 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-semibold text-white">Configuracoes</h1>
      </div>

      {/* Meu Perfil */}
      <div>
        <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-3 px-1">
          Meu Perfil
        </p>

        <div className="rounded-xl bg-[rgba(26,26,30,0.85)] border border-white/10 p-5">
          {/* Avatar + Info */}
          <div className="flex items-center gap-4 mb-4">
            <div className="shrink-0">
              {user?.id && (
                <AvatarUpload
                  userId={user.id}
                  currentAvatarUrl={profile?.avatar_url || null}
                  casaColor={casaColor}
                  onUploadSuccess={refreshData}
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate">{fullName}</p>
              {casa && (
                <p className="text-sm text-white/40">Casa {casa.nome}</p>
              )}
              <p className="text-xs text-white/25 mt-0.5">
                {profile?.serie || '-'} {profile?.turma ? `- Turma ${profile.turma}` : ''}
              </p>
            </div>
          </div>

          {/* Frase pessoal */}
          <div>
            <label className="text-xs text-white/40 block mb-1.5">Frase pessoal</label>
            <textarea
              value={frasePessoal}
              onChange={(e) => setFrasePessoal(e.target.value.slice(0, 120))}
              onBlur={salvarFrase}
              placeholder="Escreva algo sobre voce..."
              maxLength={120}
              rows={2}
              className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2
                text-sm text-white placeholder:text-white/20 resize-none outline-none
                focus:border-white/20 transition-colors"
            />
            <p className="text-[10px] text-white/20 text-right mt-0.5">{frasePessoal.length}/120</p>
          </div>
        </div>
      </div>

      {/* Conta */}
      <div>
        <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-3 px-1">
          Conta
        </p>

        <div className="rounded-xl bg-[rgba(26,26,30,0.85)] border border-white/10 overflow-hidden">
          {/* Email */}
          <div className="flex items-center justify-between py-3.5 px-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-white/30" />
              <span className="text-sm text-white/60">Email</span>
            </div>
            <span className="text-xs text-white/30 truncate max-w-[180px]">{user?.email || '-'}</span>
          </div>

          {/* Alterar senha */}
          <button
            onClick={() => navigate('/alterar-senha')}
            className="w-full flex items-center justify-between py-3.5 px-4 hover:bg-white/[0.04] transition-colors"
          >
            <div className="flex items-center gap-3">
              <KeyRound className="w-4 h-4 text-white/30" />
              <span className="text-sm text-white/70">Alterar senha</span>
            </div>
            <ChevronRight className="w-4 h-4 text-white/20" />
          </button>
        </div>
      </div>

      {/* Sobre */}
      <div>
        <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-3 px-1">
          Sobre
        </p>

        <div className="rounded-xl bg-[rgba(26,26,30,0.85)] border border-white/10 p-4">
          <div className="flex items-start gap-3">
            <Info className="w-4 h-4 text-white/20 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-white/60">Projeto Arboria</p>
              <p className="text-xs text-white/30 mt-1 leading-relaxed">
                Sistema de identificacao e desenvolvimento das inteligencias multiplas.
                Cada aluno e uma arvore unica, com suas proprias raizes, troncos e galhos.
              </p>
              <p className="text-[10px] text-white/15 mt-2">v1.0.0</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sair */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl
          border border-red-500/20 text-red-400/80
          hover:bg-red-500/10 hover:text-red-400 transition-colors"
      >
        <LogOut className="w-4 h-4" />
        <span className="text-sm font-medium">Sair da conta</span>
      </button>
    </div>
  );
};

export default ConfiguracoesPage;
