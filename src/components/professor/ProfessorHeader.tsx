import { useState } from 'react';
import { Bell, Check } from 'lucide-react';
import { useProfessor } from '@/contexts/ProfessorContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const ProfessorHeader = () => {
  const { faseAtual, institutionName, profile, isLoading } = useProfessor();
  const { user } = useAuth();
  const [editandoNome, setEditandoNome] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [salvando, setSalvando] = useState(false);

  const nomeVazio = !profile?.full_name || profile.full_name.trim() === '';

  const salvarNome = async () => {
    if (!novoNome.trim() || !user?.id || salvando) return;
    setSalvando(true);
    const partes = novoNome.trim().split(' ');
    const nome = partes[0];
    const sobrenome = partes.slice(1).join(' ');
    await supabase.from('profiles').update({
      full_name: novoNome.trim(),
      nome,
      sobrenome,
    }).eq('id', user.id);
    setSalvando(false);
    setEditandoNome(false);
    window.location.reload();
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#1A1A2E] border-b border-violet-500/10" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="flex flex-col px-4 py-2 max-w-lg mx-auto">
        {/* Banner: coloque seu nome */}
        {nomeVazio && !editandoNome && (
          <button
            onClick={() => setEditandoNome(true)}
            className="mb-1.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-left transition-colors hover:bg-amber-500/15"
          >
            <p className="text-xs text-amber-400">Coloque seu nome aqui...</p>
          </button>
        )}
        {editandoNome && (
          <div className="mb-1.5 flex gap-2">
            <input
              value={novoNome}
              onChange={e => setNovoNome(e.target.value)}
              placeholder="Seu nome completo"
              autoFocus
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-white/20"
              onKeyDown={e => e.key === 'Enter' && salvarNome()}
            />
            <button
              onClick={salvarNome}
              disabled={!novoNome.trim() || salvando}
              className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-medium disabled:opacity-30"
            >
              <Check className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Linha 1: Logo + Fase + Notificações */}
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white text-sm">
              {nomeVazio ? 'Projeto Arboria' : `Prof. ${profile?.nome || profile?.full_name}`}
            </span>
          </div>

          {/* Fase + Notificações */}
          <div className="flex items-center gap-3">
            {isLoading ? (
              <div className="h-4 w-20 bg-white/10 rounded animate-pulse" />
            ) : faseAtual?.inteligencia ? (
              <span
                className="text-sm font-medium"
                style={{ color: faseAtual.inteligencia.cor_hex || '#fff' }}
              >
                Fase {faseAtual.inteligencia.nome}
              </span>
            ) : null}

            <button className="relative p-1 text-white/60 hover:text-white transition-colors">
              <Bell className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Linha 2: Nome da instituição */}
        {institutionName && (
          <p className="text-xs text-white/40 -mt-0.5">
            {institutionName}
          </p>
        )}
      </div>
    </header>
  );
};

export default ProfessorHeader;
