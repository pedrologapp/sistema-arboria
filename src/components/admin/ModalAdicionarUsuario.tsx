import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { X, Loader2, Check, Copy, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface ModalAdicionarUsuarioProps {
  tipo: 'aluno' | 'professor' | 'admin';
  institutionId: string;
  onClose: () => void;
}

const ModalAdicionarUsuario = ({ tipo, institutionId, onClose }: ModalAdicionarUsuarioProps) => {
  const queryClient = useQueryClient();
  const [nome, setNome] = useState('');
  const [sobrenome, setSobrenome] = useState('');
  const [email, setEmail] = useState('');
  const [serie, setSerie] = useState('');
  const [turma, setTurma] = useState('');
  const [casaId, setCasaId] = useState('');
  const [senhaGerada, setSenhaGerada] = useState<string | null>(null);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [criando, setCriando] = useState(false);

  // Buscar casas
  const { data: casas } = useQuery({
    queryKey: ['inteligencias'],
    queryFn: async () => {
      const { data } = await supabase
        .from('inteligencias')
        .select('id, nome, codigo')
        .order('id');
      return data || [];
    }
  });

  // Séries disponíveis
  const series = ['6º ano', '7º ano', '8º ano', '9º ano'];
  const turmas = ['A', 'B', 'C', 'D'];

  // Gerar senha baseada no sobrenome
  const gerarSenha = (sobrenome: string): string => {
    const sobrenomeNormalizado = sobrenome
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z]/g, '')
      .toLowerCase();
    return sobrenomeNormalizado + '123';
  };

  const criarMutation = useMutation({
    mutationFn: async () => {
      setCriando(true);
      
      const senha = gerarSenha(sobrenome);
      
      // Determinar qual edge function usar
      const functionName = tipo === 'professor' ? 'create-professor' : 'create-user';
      
      const body: any = {
        email,
        nome,
        sobrenome,
        password: senha,
        institution_id: institutionId
      };

      if (tipo === 'aluno') {
        body.serie = serie;
        body.turma = turma;
        body.casa_id = parseInt(casaId);
        body.role = 'user';
      } else if (tipo === 'professor') {
        body.casa_id = casaId ? parseInt(casaId) : null;
      } else if (tipo === 'admin') {
        body.role = 'admin';
      }

      const { data, error } = await supabase.functions.invoke(functionName, {
        body
      });

      if (error) throw error;
      
      return { ...data, senha };
    },
    onSuccess: (data) => {
      setSenhaGerada(data.senha);
      toast.success(`${tipo === 'aluno' ? 'Aluno' : tipo === 'professor' ? 'Professor' : 'Admin'} criado com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ['admin-alunos'] });
      queryClient.invalidateQueries({ queryKey: ['admin-professores'] });
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar usuário: ' + error.message);
    },
    onSettled: () => {
      setCriando(false);
    }
  });

  const copiarSenha = () => {
    if (senhaGerada) {
      navigator.clipboard.writeText(senhaGerada);
      toast.success('Senha copiada!');
    }
  };

  const isFormValid = () => {
    if (!nome.trim() || !sobrenome.trim() || !email.trim()) return false;
    if (tipo === 'aluno' && (!serie || !turma || !casaId)) return false;
    return true;
  };

  // Tela de sucesso com senha
  if (senhaGerada) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
        <div className="w-full max-w-md bg-[#0A0A0A] border border-white/10 rounded-2xl overflow-hidden">
          <div className="p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
              <Check className="w-8 h-8 text-green-400" />
            </div>
            
            <h2 className="text-xl font-semibold text-white mb-2">
              {tipo === 'aluno' ? 'Aluno' : tipo === 'professor' ? 'Professor' : 'Admin'} criado!
            </h2>
            
            <p className="text-white/60 text-sm mb-6">
              Compartilhe os dados de acesso abaixo com o usuário.
            </p>

            <div className="space-y-3 mb-6">
              <div className="p-3 bg-white/5 rounded-lg text-left">
                <p className="text-xs text-white/40 mb-1">Email</p>
                <p className="text-white">{email}</p>
              </div>
              
              <div className="p-3 bg-white/5 rounded-lg">
                <p className="text-xs text-white/40 mb-1">Senha temporária</p>
                <div className="flex items-center gap-2">
                  <p className="flex-1 text-white font-mono">
                    {mostrarSenha ? senhaGerada : '••••••••'}
                  </p>
                  <button
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="p-1.5 hover:bg-white/10 rounded"
                  >
                    {mostrarSenha ? (
                      <EyeOff className="w-4 h-4 text-white/40" />
                    ) : (
                      <Eye className="w-4 h-4 text-white/40" />
                    )}
                  </button>
                  <button
                    onClick={copiarSenha}
                    className="p-1.5 hover:bg-white/10 rounded"
                  >
                    <Copy className="w-4 h-4 text-white/40" />
                  </button>
                </div>
              </div>
            </div>

            <p className="text-xs text-amber-400/80 mb-6">
              O usuário deverá alterar a senha no primeiro acesso.
            </p>

            <button
              onClick={onClose}
              className="w-full p-3 bg-white text-black font-medium rounded-xl"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-md bg-[#0A0A0A] border border-white/10 rounded-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">
            Adicionar {tipo === 'aluno' ? 'Aluno' : tipo === 'professor' ? 'Professor' : 'Admin'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        {/* Formulário */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-white/60 mb-1.5">Nome</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="João"
                className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30"
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1.5">Sobrenome</label>
              <input
                type="text"
                value={sobrenome}
                onChange={(e) => setSobrenome(e.target.value)}
                placeholder="Silva"
                className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="joao@escola.com"
              className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30"
            />
          </div>

          {tipo === 'aluno' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-white/60 mb-1.5">Série</label>
                  <select
                    value={serie}
                    onChange={(e) => setSerie(e.target.value)}
                    className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white"
                  >
                    <option value="">Selecione</option>
                    {series.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-1.5">Turma</label>
                  <select
                    value={turma}
                    onChange={(e) => setTurma(e.target.value)}
                    className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white"
                  >
                    <option value="">Selecione</option>
                    {turmas.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-white/60 mb-1.5">Casa</label>
                <select
                  value={casaId}
                  onChange={(e) => setCasaId(e.target.value)}
                  className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white"
                >
                  <option value="">Selecione a casa</option>
                  {casas?.map(c => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {tipo === 'professor' && (
            <div>
              <label className="block text-sm text-white/60 mb-1.5">Casa (opcional)</label>
              <select
                value={casaId}
                onChange={(e) => setCasaId(e.target.value)}
                className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white"
              >
                <option value="">Sem casa atribuída</option>
                {casas?.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
          )}

          {sobrenome && (
            <div className="p-3 bg-white/5 rounded-lg">
              <p className="text-xs text-white/40 mb-1">Senha que será gerada:</p>
              <p className="text-white font-mono">{gerarSenha(sobrenome)}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 p-3 bg-white/5 text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => criarMutation.mutate()}
            disabled={!isFormValid() || criando}
            className="flex-1 p-3 bg-white text-black font-medium rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {criando ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Criando...
              </>
            ) : (
              'Criar'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalAdicionarUsuario;
