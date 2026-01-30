import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import ModalSincronizarScores from '@/components/admin/ModalSincronizarScores';

const MonitorPage = () => {
  const { user } = useAuth();
  const [showSyncModal, setShowSyncModal] = useState(false);

  // Fetch institution ID for the current admin
  const { data: adminProfile, isLoading } = useQuery({
    queryKey: ['admin-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('institution_id')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const institutionId = adminProfile?.institution_id;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] px-4 py-6">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Monitoramento</h1>
              <p className="text-sm text-white/50">Dashboard e sincronização</p>
            </div>
          </div>

          <Button
            onClick={() => setShowSyncModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
            disabled={!institutionId}
          >
            <RefreshCw className="w-4 h-4" />
            Sincronizar Scores
          </Button>
        </div>
      </div>

      {/* Main content - placeholder for future features */}
      <div className="max-w-4xl mx-auto">
        <div className="grid gap-4">
          {/* Sync section */}
          <div className="p-6 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                <RefreshCw className="w-6 h-6 text-indigo-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-white mb-1">
                  Sincronização de Scores
                </h2>
                <p className="text-sm text-white/60 mb-4">
                  Sincronize os scores de inteligência dos alunos com o sistema externo N8N. 
                  Você pode sincronizar um aluno específico, uma turma, uma série ou todos os alunos.
                </p>
                <Button
                  onClick={() => setShowSyncModal(true)}
                  variant="outline"
                  className="border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300"
                  disabled={!institutionId}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Abrir Sincronização
                </Button>
              </div>
            </div>
          </div>

          {/* Future features placeholder */}
          <div className="p-6 rounded-xl bg-white/5 border border-white/10 border-dashed">
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                <Activity className="w-8 h-8 text-white/20" />
              </div>
              <h3 className="text-white/40 font-medium mb-2">Mais recursos em breve</h3>
              <p className="text-sm text-white/30 max-w-md mx-auto">
                Dashboard em tempo real com visão geral de alunos, engajamento, alertas e atividades.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sync Modal */}
      {institutionId && (
        <ModalSincronizarScores
          open={showSyncModal}
          onOpenChange={setShowSyncModal}
          institutionId={institutionId}
        />
      )}
    </div>
  );
};

export default MonitorPage;
