import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { X, Upload, Download, FileText, Loader2, Check, AlertCircle, HelpCircle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import ModalInstrucoesImportacao from './ModalInstrucoesImportacao';

interface ModalImportarCSVProps {
  tipo: 'alunos' | 'professores';
  institutionId: string;
  onClose: () => void;
}

interface AlunoCSV {
  matricula: string;
  nome: string;
  sobrenome: string;
  serie: string;
  turma: string;
  segmento: string;
  casa_id?: string;
  // Colunas opcionais de inteligências
  int_intrapessoal?: string;
  int_interpessoal?: string;
  int_naturalista?: string;
  int_logico?: string;
  int_linguistica?: string;
  int_espacial?: string;
  int_corporal?: string;
  int_musical?: string;
}

interface ProfessorCSV {
  nome: string;
  sobrenome: string;
  email: string;
  casa_id?: string;
}

const ModalImportarCSV = ({ tipo, institutionId, onClose }: ModalImportarCSVProps) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [dados, setDados] = useState<(AlunoCSV | ProfessorCSV)[]>([]);
  const [erros, setErros] = useState<string[]>([]);
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState<{ sucesso: number; erros: string[] } | null>(null);
  const [mostrarInstrucoes, setMostrarInstrucoes] = useState(false);

  // Colunas obrigatórias (email/senha são gerados automaticamente para alunos)
  const colunasObrigatoriasAlunos = ['matricula', 'nome', 'sobrenome', 'serie', 'turma', 'segmento'];
  const colunasOpcionaisAlunos = ['casa_id', 'int_intrapessoal', 'int_interpessoal', 'int_naturalista', 'int_logico', 'int_linguistica', 'int_espacial', 'int_corporal', 'int_musical'];
  const colunasAlunos = [...colunasObrigatoriasAlunos, ...colunasOpcionaisAlunos];
  const colunasProfessores = ['nome', 'sobrenome', 'email', 'casa_id'];
  
  const colunas = tipo === 'alunos' ? colunasAlunos : colunasProfessores;
  const colunasObrigatorias = tipo === 'alunos' ? colunasObrigatoriasAlunos : ['nome', 'sobrenome', 'email'];

  // Verificar se tem inteligências nos dados
  const temInteligencias = tipo === 'alunos' && dados.length > 0 && dados.some((item) => {
    const aluno = item as AlunoCSV;
    return ['int_intrapessoal', 'int_interpessoal', 'int_naturalista', 'int_logico', 'int_linguistica', 'int_espacial', 'int_corporal', 'int_musical'].some(col => {
      const valor = parseInt((aluno as any)[col]) || 0;
      return valor > 0;
    });
  });

  const baixarModeloExcel = () => {
    const wb = XLSX.utils.book_new();
    
    if (tipo === 'alunos') {
      // === ABA 1: DADOS ===
      const dadosHeader = [
        'matricula', 'nome', 'sobrenome', 'serie', 'turma', 'segmento', 'casa_id',
        'int_intrapessoal', 'int_interpessoal', 'int_naturalista',
        'int_logico', 'int_linguistica', 'int_espacial', 
        'int_corporal', 'int_musical'
      ];
      
      const dadosExemplo = [
        ['2267.2026', 'Alice', 'Barros Gomes', 'Maternalzinho(2)', 'B', 'infantil', '', '', '', '', '', '', '', '', ''],
        ['2268.2026', 'João', 'Silva Santos', '1º ano', 'A', 'fundamental1', 1, 60, 70, 40, 85, 75, 50, 55, 30],
      ];
      
      const wsDados = XLSX.utils.aoa_to_sheet([dadosHeader, ...dadosExemplo]);
      wsDados['!cols'] = [
        { wch: 14 }, { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 8 }, { wch: 14 }, { wch: 10 },
        { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }
      ];
      XLSX.utils.book_append_sheet(wb, wsDados, 'Dados');
      
      // === ABA 2: INSTRUÇÕES ===
      const instrucoes = [
        ['INSTRUÇÕES DE IMPORTAÇÃO - PROJETO ARBORIA'],
        [''],
        ['⚡ EMAIL E SENHA SÃO GERADOS AUTOMATICAMENTE!'],
        [''],
        ['O sistema gera automaticamente:'],
        ['• Email: nome.sobrenome@aluno.arboria.com'],
        ['• Senha: sobrenome + 123 (sem acentos, minúsculas)'],
        [''],
        ['Exemplo: Alice Barros Gomes'],
        ['→ Email: alice.barros@aluno.arboria.com'],
        ['→ Senha: barrosgomes123'],
        [''],
        ['═══════════════════════════════════════════════════'],
        [''],
        ['PASSO A PASSO'],
        ['1. Vá para a aba "Dados"'],
        ['2. Preencha os dados dos alunos a partir da linha 2'],
        ['3. NÃO altere a linha 1 (cabeçalho)'],
        ['4. Salve como CSV: Arquivo > Salvar como > CSV UTF-8'],
        ['5. Faça upload do arquivo no sistema'],
        [''],
        ['═══════════════════════════════════════════════════'],
        [''],
        ['⭐ TABELA DE IDs DAS CASAS (OPCIONAL)'],
        [''],
        ['ID', 'NOME DA CASA'],
        ['1', 'Linguística'],
        ['2', 'Lógico-Matemática'],
        ['3', 'Espacial'],
        ['4', 'Musical'],
        ['5', 'Corporal-Cinestésica'],
        ['6', 'Naturalista'],
        ['7', 'Interpessoal'],
        ['8', 'Intrapessoal'],
        [''],
        ['Deixe vazio se o aluno ainda não tem casa atribuída'],
        [''],
        ['═══════════════════════════════════════════════════'],
        [''],
        ['COLUNAS OBRIGATÓRIAS'],
        [''],
        ['Coluna', 'Descrição', 'Exemplo'],
        ['matricula', 'Matrícula do aluno (ID externo)', '2267.2026'],
        ['nome', 'Primeiro nome do aluno', 'Alice'],
        ['sobrenome', 'Sobrenome do aluno', 'Barros Gomes'],
        ['serie', 'Série do aluno', 'Maternalzinho(2)'],
        ['turma', 'Turma (A, B, C...)', 'B'],
        ['segmento', 'Segmento educacional', 'infantil'],
        [''],
        ['Segmentos aceitos: infantil, fundamental1, fundamental2'],
        [''],
        ['═══════════════════════════════════════════════════'],
        [''],
        ['COLUNAS OPCIONAIS'],
        [''],
        ['casa_id: ID da casa (1 a 8) - deixe vazio se não souber'],
        [''],
        ['Inteligências (% de 0 a 100):'],
        ['int_intrapessoal, int_interpessoal, int_naturalista'],
        ['int_logico, int_linguistica, int_espacial'],
        ['int_corporal, int_musical'],
        [''],
        ['Deixe vazio ou 0 se não souber os valores'],
        [''],
        ['═══════════════════════════════════════════════════'],
        [''],
        ['⚠️ DICAS IMPORTANTES'],
        [''],
        ['• NÃO altere a ordem das colunas'],
        ['• NÃO adicione colunas extras'],
        ['• NÃO altere os nomes das colunas'],
        ['• Cada matrícula deve ser única'],
        ['• Apague as linhas de exemplo antes de importar'],
      ];
      
      const wsInstrucoes = XLSX.utils.aoa_to_sheet(instrucoes);
      wsInstrucoes['!cols'] = [{ wch: 20 }, { wch: 30 }, { wch: 25 }];
      XLSX.utils.book_append_sheet(wb, wsInstrucoes, 'Instruções');
      
      XLSX.writeFile(wb, 'modelo_alunos.xlsx');
    } else {
      // === PROFESSORES (mantém email obrigatório) ===
      const dadosHeader = ['nome', 'sobrenome', 'email', 'casa_id'];
      const dadosExemplo = [
        ['Ana', 'Paula', 'ana@escola.com', 1],
        ['Carlos', 'Santos', 'carlos@escola.com', 2],
      ];
      
      const wsDados = XLSX.utils.aoa_to_sheet([dadosHeader, ...dadosExemplo]);
      wsDados['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 10 }];
      XLSX.utils.book_append_sheet(wb, wsDados, 'Dados');
      
      const instrucoes = [
        ['INSTRUÇÕES DE IMPORTAÇÃO - PROFESSORES'],
        [''],
        ['⭐ TABELA DE IDs DAS CASAS'],
        [''],
        ['ID', 'NOME DA CASA'],
        ['1', 'Linguística'],
        ['2', 'Lógico-Matemática'],
        ['3', 'Espacial'],
        ['4', 'Musical'],
        ['5', 'Corporal-Cinestésica'],
        ['6', 'Naturalista'],
        ['7', 'Interpessoal'],
        ['8', 'Intrapessoal'],
        [''],
        ['A coluna casa_id é opcional (pode deixar vazio)'],
        ['Senha padrão será: sobrenome + 123'],
      ];
      
      const wsInstrucoes = XLSX.utils.aoa_to_sheet(instrucoes);
      wsInstrucoes['!cols'] = [{ wch: 20 }, { wch: 25 }];
      XLSX.utils.book_append_sheet(wb, wsInstrucoes, 'Instruções');
      
      XLSX.writeFile(wb, 'modelo_professores.xlsx');
    }
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
          // Apenas validar colunas obrigatórias
          const camposFaltando = colunasObrigatorias.filter(col => !row[col]?.toString().trim());
          
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
            matricula: aluno.matricula,
            nome: aluno.nome,
            sobrenome: aluno.sobrenome,
            serie: aluno.serie,
            turma: aluno.turma,
            segmento: aluno.segmento,
            casa_id: aluno.casa_id ? parseInt(aluno.casa_id) : null,
            instituicao: institutionId,
            // Incluir inteligências se existirem
            int_intrapessoal: parseInt(aluno.int_intrapessoal || '0') || 0,
            int_interpessoal: parseInt(aluno.int_interpessoal || '0') || 0,
            int_naturalista: parseInt(aluno.int_naturalista || '0') || 0,
            int_logico: parseInt(aluno.int_logico || '0') || 0,
            int_linguistica: parseInt(aluno.int_linguistica || '0') || 0,
            int_espacial: parseInt(aluno.int_espacial || '0') || 0,
            int_corporal: parseInt(aluno.int_corporal || '0') || 0,
            int_musical: parseInt(aluno.int_musical || '0') || 0,
          };
        } else {
          const prof = item as ProfessorCSV;
          return {
            email: prof.email,
            nome: prof.nome,
            sobrenome: prof.sobrenome,
            casa_id: prof.casa_id ? parseInt(prof.casa_id) : null,
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

  // Colunas a mostrar na pré-visualização (apenas obrigatórias)
  const colunasPreview = colunasObrigatorias;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-lg bg-[#0A0A0A] border border-white/10 rounded-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">
            Importar {tipo === 'alunos' ? 'Alunos' : 'Professores'}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMostrarInstrucoes(true)}
              className="flex items-center gap-1 px-2 py-1 text-indigo-400 text-sm hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
              Instruções
            </button>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <X className="w-5 h-5 text-white/60" />
            </button>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Banner: Email/senha gerados automaticamente */}
          {tipo === 'alunos' && (
            <div className="p-3 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 rounded-xl">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <p className="text-sm font-medium text-emerald-400">Geração Automática</p>
              </div>
              <p className="text-xs text-emerald-300/80">
                Email e senha são gerados automaticamente a partir do nome/sobrenome
              </p>
            </div>
          )}

          {/* Formato */}
          <div className="p-3 bg-white/5 rounded-lg">
            <p className="text-sm text-white/80 font-medium mb-1">Colunas obrigatórias:</p>
            <p className="text-sm text-white/50">{colunasObrigatorias.join(', ')}</p>
            {tipo === 'alunos' && (
              <>
                <p className="text-sm text-white/80 font-medium mt-2 mb-1">Colunas opcionais:</p>
                <p className="text-sm text-white/50">{colunasOpcionaisAlunos.join(', ')}</p>
              </>
            )}
          </div>

          {/* Baixar modelo */}
          <button
            onClick={baixarModeloExcel}
            className="w-full p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors flex items-center justify-center gap-2 text-white"
          >
            <Download className="w-4 h-4" />
            Baixar modelo Excel
          </button>

          {/* Upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
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
                    {temInteligencias && (
                      <span className="ml-2 px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded">
                        Inclui estatísticas
                      </span>
                    )}
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
              <p className="text-sm text-white/60">Selecionar arquivo CSV ou Excel</p>
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
                      {colunasPreview.map(col => (
                        <th key={col} className="text-left p-2 text-white/60 font-medium">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dados.slice(0, 3).map((row, i) => (
                      <tr key={i} className="border-b border-white/5">
                        {colunasPreview.map(col => (
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

      {/* Modal de Instruções */}
      {mostrarInstrucoes && (
        <ModalInstrucoesImportacao
          tipo={tipo}
          onClose={() => setMostrarInstrucoes(false)}
        />
      )}
    </div>
  );
};

export default ModalImportarCSV;
