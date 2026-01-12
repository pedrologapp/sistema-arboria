import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { X, Upload, Download, FileText, Loader2, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';

interface ModalImportarCSVProps {
  tipo: 'alunos' | 'professores';
  institutionId: string;
  onClose: () => void;
}

interface AlunoCSV {
  nome: string;
  sobrenome: string;
  email: string;
  serie: string;
  turma: string;
  casa_id: string;
}

interface ProfessorCSV {
  nome: string;
  sobrenome: string;
  email: string;
  casa_id: string;
}

const ModalImportarCSV = ({ tipo, institutionId, onClose }: ModalImportarCSVProps) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [dados, setDados] = useState<(AlunoCSV | ProfessorCSV)[]>([]);
  const [erros, setErros] = useState<string[]>([]);
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState<{ sucesso: number; erros: string[] } | null>(null);

  const colunasAlunos = ['nome', 'sobrenome', 'email', 'serie', 'turma', 'casa_id'];
  const colunasProfessores = ['nome', 'sobrenome', 'email', 'casa_id'];
  const colunas = tipo === 'alunos' ? colunasAlunos : colunasProfessores;

  const baixarModelo = () => {
    const header = colunas.join(',');
    const exemplo = tipo === 'alunos'
      ? 'João,Silva,joao@escola.com,6º ano,A,1\nMaria,Santos,maria@escola.com,7º ano,B,2'
      : 'Ana,Paula,ana@escola.com,1\nCarlos,Santos,carlos@escola.com,2';
    
    const csv = `${header}\n${exemplo}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `modelo_${tipo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setArquivo(file);
    setErros([]);
    setResultado(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const dadosValidos: (AlunoCSV | ProfessorCSV)[] = [];
        const errosEncontrados: string[] = [];

        results.data.forEach((row: any, index) => {
          const camposFaltando = colunas.filter(col => !row[col]?.toString().trim());
          
          if (camposFaltando.length > 0) {
            errosEncontrados.push(`Linha ${index + 2}: falta ${camposFaltando.join(', ')}`);
          } else {
            dadosValidos.push(row as AlunoCSV | ProfessorCSV);
          }
        });

        setDados(dadosValidos);
        setErros(errosEncontrados);
      },
      error: (error) => {
        toast.error('Erro ao ler arquivo: ' + error.message);
      }
    });
  };

  const importarMutation = useMutation({
    mutationFn: async () => {
      setImportando(true);
      
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      
      if (!token) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      // Preparar dados para a edge function
      const users = dados.map((item) => {
        if (tipo === 'alunos') {
          const aluno = item as AlunoCSV;
          return {
            email: aluno.email,
            nome: aluno.nome,
            sobrenome: aluno.sobrenome,
            serie: aluno.serie,
            turma: aluno.turma,
            casa_id: parseInt(aluno.casa_id),
            instituicao: institutionId
          };
        } else {
          const prof = item as ProfessorCSV;
          return {
            email: prof.email,
            nome: prof.nome,
            sobrenome: prof.sobrenome,
            casa_id: parseInt(prof.casa_id),
            instituicao: institutionId
          };
        }
      });

      // Chamar edge function import-users
      const { data, error } = await supabase.functions.invoke('import-users', {
        body: { users, tipo }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const sucessos = data?.success_count || dados.length;
      const errosImport = data?.errors || [];
      
      setResultado({ sucesso: sucessos, erros: errosImport });
      
      if (errosImport.length === 0) {
        toast.success(`${sucessos} ${tipo} importados com sucesso!`);
        queryClient.invalidateQueries({ queryKey: ['admin-alunos'] });
        queryClient.invalidateQueries({ queryKey: ['admin-professores'] });
        onClose();
      } else {
        toast.warning(`${sucessos} importados, ${errosImport.length} erros`);
      }
    },
    onError: (error: Error) => {
      toast.error('Erro na importação: ' + error.message);
    },
    onSettled: () => {
      setImportando(false);
    }
  });

  const limparArquivo = () => {
    setArquivo(null);
    setDados([]);
    setErros([]);
    setResultado(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-lg bg-[#0A0A0A] border border-white/10 rounded-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">
            Importar {tipo === 'alunos' ? 'Alunos' : 'Professores'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Formato */}
          <div className="p-3 bg-white/5 rounded-lg">
            <p className="text-sm text-white/80 font-medium mb-1">Colunas obrigatórias:</p>
            <p className="text-sm text-white/50">{colunas.join(', ')}</p>
          </div>

          {/* Baixar modelo */}
          <button
            onClick={baixarModelo}
            className="w-full p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors flex items-center justify-center gap-2 text-white"
          >
            <Download className="w-4 h-4" />
            Baixar modelo CSV
          </button>

          {/* Upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />

          {arquivo ? (
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-indigo-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{arquivo.name}</p>
                  <p className="text-sm text-white/50">
                    {dados.length} registros válidos
                  </p>
                </div>
                <button 
                  onClick={limparArquivo}
                  className="p-1 hover:bg-white/10 rounded"
                >
                  <X className="w-4 h-4 text-white/40" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full p-8 border border-dashed border-white/20 rounded-xl hover:border-white/40 transition-colors flex flex-col items-center gap-2"
            >
              <Upload className="w-8 h-8 text-white/40" />
              <p className="text-sm text-white/60">Selecionar arquivo CSV</p>
            </button>
          )}

          {/* Erros de validação */}
          {erros.length > 0 && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <p className="text-sm text-red-400 font-medium">
                  {erros.length} erro(s) encontrado(s)
                </p>
              </div>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {erros.slice(0, 5).map((e, i) => (
                  <p key={i} className="text-xs text-red-400/80">{e}</p>
                ))}
                {erros.length > 5 && (
                  <p className="text-xs text-red-400/60">... e mais {erros.length - 5} erros</p>
                )}
              </div>
            </div>
          )}

          {/* Erros de importação */}
          {resultado?.erros && resultado.erros.length > 0 && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <p className="text-sm text-amber-400 font-medium">
                  Erros durante importação
                </p>
              </div>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {resultado.erros.slice(0, 5).map((e, i) => (
                  <p key={i} className="text-xs text-amber-400/80">{e}</p>
                ))}
              </div>
            </div>
          )}

          {/* Pré-visualização */}
          {dados.length > 0 && (
            <div>
              <p className="text-sm text-white/60 mb-2">Pré-visualização:</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      {colunas.map(col => (
                        <th key={col} className="text-left p-2 text-white/60 font-medium">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dados.slice(0, 3).map((row, i) => (
                      <tr key={i} className="border-b border-white/5">
                        {colunas.map(col => (
                          <td key={col} className="p-2 text-white/80">
                            {(row as any)[col]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {dados.length > 3 && (
                <p className="text-xs text-white/40 mt-2">
                  ... e mais {dados.length - 3} registros
                </p>
              )}
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
            onClick={() => importarMutation.mutate()}
            disabled={dados.length === 0 || importando}
            className="flex-1 p-3 bg-white text-black font-medium rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {importando ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Importar {dados.length}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalImportarCSV;
