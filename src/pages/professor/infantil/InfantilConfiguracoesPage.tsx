import { useState } from 'react';
import { ArrowLeft, Lock, LogOut, PenLine, Check, Loader2, BookOpen, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProfessor } from '@/contexts/ProfessorContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AvatarUpload from '@/components/aluno/AvatarUpload';
import { abrirTutorialInfantil } from '@/components/professor/infantil/TutorialInfantil';
import { infantilTheme as t } from '@/styles/infantilTheme';

/**
 * Configurações do professor. INFANTIL (pele do caderno claro).
 * A versão compartilhada era do tema escuro do F2 e ficava branca/ilegível
 * dentro do layout claro. Sem Casa/mentor (Infantil não tem Casas).
 */
const InfantilConfiguracoesPage = () => {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { profile, refreshData } = useProfessor();

  const fullName =
    profile?.full_name || `${profile?.nome || ''} ${profile?.sobrenome || ''}`.trim() || 'Professora';
  const [editandoNome, setEditandoNome] = useState(false);
  const [novoNome, setNovoNome] = useState(fullName);
  const [salvandoNome, setSalvandoNome] = useState(false);

  const salvarNome = async () => {
    if (!user?.id || !novoNome.trim()) return;
    setSalvandoNome(true);
    const nome = novoNome.trim().split(' ')[0];
    const sobrenome = novoNome.trim().split(' ').slice(1).join(' ');
    const { error } = await supabase
      .from('profiles')
      .update({ nome, sobrenome, full_name: novoNome.trim() })
      .eq('id', user.id);
    if (!error) {
      toast.success('Nome atualizado!');
      setEditandoNome(false);
      refreshData();
    } else {
      toast.error('Erro ao salvar nome');
    }
    setSalvandoNome(false);
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch {
      toast.error('Erro ao sair da conta');
    }
  };

  const Secao = ({ titulo, children }: { titulo: string; children: React.ReactNode }) => (
    <div className="space-y-2">
      <h2 className="text-[11px] uppercase tracking-wide font-semibold" style={{ color: t.textFaint }}>
        {titulo}
      </h2>
      {children}
    </div>
  );

  const Item = ({
    icone,
    titulo,
    sub,
    onClick,
  }: {
    icone: React.ReactNode;
    titulo: string;
    sub: string;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-4 rounded-2xl text-left active:scale-[0.99] transition-transform"
      style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadowSm }}
    >
      <span
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: t.accentSoft, color: t.accent }}
      >
        {icone}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold" style={{ color: t.text }}>
          {titulo}
        </span>
        <span className="block text-xs mt-0.5" style={{ color: t.textFaint }}>
          {sub}
        </span>
      </span>
      <ChevronRight size={16} style={{ color: t.textFaint }} />
    </button>
  );

  return (
    <div className="pt-4 space-y-5">
      {/* Topo */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/professor')}
          className="p-2 -ml-2 rounded-full active:scale-95"
          style={{ color: t.textMuted }}
          aria-label="Voltar"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold" style={{ color: t.text }}>
          Configurações
        </h1>
      </div>

      {/* Perfil */}
      <div
        className="rounded-2xl p-5 flex flex-col items-center gap-3"
        style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadowSm }}
      >
        {user?.id && (
          <AvatarUpload
            userId={user.id}
            currentAvatarUrl={profile?.avatar_url || null}
            casaColor={t.accent}
            onUploadSuccess={refreshData}
          />
        )}
        {editandoNome ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              className="rounded-xl px-3 py-2 text-center text-base font-semibold focus:outline-none focus-visible:ring-2"
              style={{
                backgroundColor: t.surfaceSunken,
                border: `1px solid ${t.border}`,
                color: t.text,
                ['--tw-ring-color' as string]: t.accent,
              }}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && salvarNome()}
            />
            <button
              onClick={salvarNome}
              disabled={salvandoNome}
              className="p-2.5 rounded-xl"
              style={{ backgroundColor: t.accent, color: '#FFFFFF' }}
              aria-label="Salvar nome"
            >
              {salvandoNome ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              setNovoNome(fullName);
              setEditandoNome(true);
            }}
            className="flex items-center gap-2"
          >
            <span className="text-lg font-semibold" style={{ color: t.text }}>
              {fullName}
            </span>
            <PenLine size={14} style={{ color: t.textFaint }} />
          </button>
        )}
        <p className="text-xs" style={{ color: t.textFaint }}>
          Professora · Educação Infantil
        </p>
      </div>

      {/* Ajuda */}
      <Secao titulo="Ajuda">
        <Item
          icone={<BookOpen size={19} strokeWidth={1.75} />}
          titulo="Como usar o Arboria"
          sub="O tutorial aba por aba: releia quando quiser"
          onClick={abrirTutorialInfantil}
        />
      </Secao>

      {/* Segurança */}
      <Secao titulo="Segurança">
        <Item
          icone={<Lock size={19} strokeWidth={1.75} />}
          titulo="Alterar senha"
          sub="Atualize sua senha de acesso"
          onClick={() => navigate('/alterar-senha')}
        />
      </Secao>

      {/* Sair */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 p-3.5 rounded-2xl text-sm font-semibold"
        style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, color: '#B4231F' }}
      >
        <LogOut size={16} /> Sair da conta
      </button>

      <p className="text-center text-xs pb-6" style={{ color: t.textFaint }}>
        v1.0.0 · Projeto Arboria
      </p>
    </div>
  );
};

export default InfantilConfiguracoesPage;
