import { X, HelpCircle, Check, Star, Sparkles } from 'lucide-react';

interface ModalInstrucoesImportacaoProps {
  tipo: 'alunos' | 'professores';
  onClose: () => void;
}

const ModalInstrucoesImportacao = ({ tipo, onClose }: ModalInstrucoesImportacaoProps) => {
  const colunasAlunos = [
    { num: 1, nome: 'matricula', obrig: true, desc: 'Matrícula do aluno (ID externo)' },
    { num: 2, nome: 'nome', obrig: true, desc: 'Primeiro nome' },
    { num: 3, nome: 'sobrenome', obrig: true, desc: 'Sobrenome' },
    { num: 4, nome: 'serie', obrig: true, desc: '"Maternalzinho(2)" ou "6º ano"' },
    { num: 5, nome: 'turma', obrig: true, desc: '"A", "B" ou "C"' },
    { num: 6, nome: 'segmento', obrig: true, desc: 'infantil, fundamental1, fundamental2' },
    { num: 7, nome: 'casa_id', obrig: false, desc: 'Número de 1 a 8 (opcional)' },
    { num: 8, nome: 'int_intrapessoal', obrig: false, desc: '0-100' },
    { num: 9, nome: 'int_interpessoal', obrig: false, desc: '0-100' },
    { num: 10, nome: 'int_naturalista', obrig: false, desc: '0-100' },
    { num: 11, nome: 'int_logico', obrig: false, desc: '0-100' },
    { num: 12, nome: 'int_linguistica', obrig: false, desc: '0-100' },
    { num: 13, nome: 'int_espacial', obrig: false, desc: '0-100' },
    { num: 14, nome: 'int_corporal', obrig: false, desc: '0-100' },
    { num: 15, nome: 'int_musical', obrig: false, desc: '0-100' },
  ];

  const colunasProfessores = [
    { num: 1, nome: 'nome', obrig: true, desc: 'Primeiro nome' },
    { num: 2, nome: 'sobrenome', obrig: true, desc: 'Sobrenome' },
    { num: 3, nome: 'email', obrig: true, desc: 'Email único' },
    { num: 4, nome: 'casa_id', obrig: false, desc: 'Número de 1 a 8' },
  ];

  const colunas = tipo === 'alunos' ? colunasAlunos : colunasProfessores;

  const casas = [
    { id: 1, nome: 'Linguística' },
    { id: 2, nome: 'Lógico-Matemática' },
    { id: 3, nome: 'Espacial' },
    { id: 4, nome: 'Musical' },
    { id: 5, nome: 'Corporal-Cinestésica' },
    { id: 6, nome: 'Naturalista' },
    { id: 7, nome: 'Interpessoal' },
    { id: 8, nome: 'Intrapessoal' },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4">
      <div className="w-full max-w-lg bg-[#1A1A2E] border border-violet-500/10 rounded-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-violet-500/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
              <HelpCircle className="w-4 h-4 text-indigo-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">
              Instruções de Importação
            </h2>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Banner: Geração automática (apenas para alunos) */}
          {tipo === 'alunos' && (
            <div className="p-4 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border-2 border-emerald-500/30 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wide">
                  Email e Senha Gerados Automaticamente!
                </h3>
              </div>
              <div className="space-y-2 text-sm text-emerald-300/90">
                <p>• <strong>Email:</strong> nome.sobrenome@aluno.arboria.com</p>
                <p>• <strong>Senha:</strong> sobrenome + 123 (sem acentos)</p>
              </div>
              <div className="mt-3 p-2 bg-black/30 rounded-lg">
                <p className="text-xs text-emerald-400/80 font-medium">Exemplo:</p>
                <p className="text-xs text-white/70">Alice Barros Gomes</p>
                <p className="text-xs text-emerald-300">→ alice.barros@aluno.arboria.com</p>
                <p className="text-xs text-emerald-300">→ barrosgomes123</p>
              </div>
            </div>
          )}

          {/* Passo a Passo */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-white/80 uppercase tracking-wide">
              Passo a Passo
            </h3>
            <div className="space-y-2">
              {[
                'Baixe o modelo Excel clicando em "Baixar modelo Excel"',
                'Abra o arquivo no Excel ou Google Sheets',
                'Preencha os dados seguindo a ordem das colunas',
                'Salve como CSV (separado por vírgulas)',
                'Faça o upload do arquivo aqui'
              ].map((passo, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs text-white/60">{i + 1}</span>
                  </div>
                  <p className="text-sm text-white/70">{passo}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Sequência das Colunas */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-white/80 uppercase tracking-wide">
              Sequência das Colunas
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-violet-500/10">
                    <th className="text-left p-2 text-white/40 font-medium">#</th>
                    <th className="text-left p-2 text-white/40 font-medium">Coluna</th>
                    <th className="text-left p-2 text-white/40 font-medium">Obrig.</th>
                  </tr>
                </thead>
                <tbody>
                  {colunas.map((col) => (
                    <tr key={col.num} className="border-b border-violet-500/5">
                      <td className="p-2 text-white/40">{col.num}</td>
                      <td className="p-2">
                        <span className="text-white font-mono text-xs">{col.nome}</span>
                        <p className="text-white/40 text-xs mt-0.5">{col.desc}</p>
                      </td>
                      <td className="p-2">
                        {col.obrig ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <span className="text-white/30 text-xs">Não</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tabela de IDs das Casas - DESTACADA */}
          <div className="p-4 bg-amber-500/10 border-2 border-amber-500/30 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
              <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wide">
                Tabela de IDs das Casas (Referência)
              </h3>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mb-3">
              {casas.map((casa) => (
                <div key={casa.id} className="flex items-center gap-2 bg-black/30 rounded-lg px-3 py-2">
                  <span className="w-7 h-7 rounded-full bg-amber-500 text-black font-bold text-sm flex items-center justify-center flex-shrink-0">
                    {casa.id}
                  </span>
                  <span className="text-white font-medium text-sm">{casa.nome}</span>
                </div>
              ))}
            </div>
            
            <p className="text-xs text-amber-400/70 text-center">
              {tipo === 'alunos' 
                ? 'A coluna casa_id é opcional - deixe vazio se ainda não definiu'
                : 'Use estes números na coluna "casa_id" do arquivo'
              }
            </p>
          </div>

          {/* Exemplo Visual */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-white/80 uppercase tracking-wide">
              Exemplo no Excel/Sheets
            </h3>
            <div className="overflow-x-auto">
              <table className="text-xs border border-violet-500/10 rounded">
                <thead>
                  <tr className="bg-white/5">
                    <th className="p-1.5 text-white/40 border border-violet-500/10">A</th>
                    <th className="p-1.5 text-white/40 border border-violet-500/10">B</th>
                    <th className="p-1.5 text-white/40 border border-violet-500/10">C</th>
                    <th className="p-1.5 text-white/40 border border-violet-500/10">D</th>
                    <th className="p-1.5 text-white/40 border border-violet-500/10">E</th>
                    <th className="p-1.5 text-white/40 border border-violet-500/10">F</th>
                  </tr>
                </thead>
                <tbody>
                  {tipo === 'alunos' ? (
                    <>
                      <tr>
                        <td className="p-1.5 text-white/60 border border-violet-500/10 font-medium">matricula</td>
                        <td className="p-1.5 text-white/60 border border-violet-500/10 font-medium">nome</td>
                        <td className="p-1.5 text-white/60 border border-violet-500/10 font-medium">sobrenome</td>
                        <td className="p-1.5 text-white/60 border border-violet-500/10 font-medium">serie</td>
                        <td className="p-1.5 text-white/60 border border-violet-500/10 font-medium">turma</td>
                        <td className="p-1.5 text-white/60 border border-violet-500/10 font-medium">segmento</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 text-white border border-violet-500/10">2267.2026</td>
                        <td className="p-1.5 text-white border border-violet-500/10">Alice</td>
                        <td className="p-1.5 text-white border border-violet-500/10">Barros</td>
                        <td className="p-1.5 text-white border border-violet-500/10">Maternal</td>
                        <td className="p-1.5 text-white border border-violet-500/10">B</td>
                        <td className="p-1.5 text-white border border-violet-500/10">infantil</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 text-white border border-violet-500/10">2268.2026</td>
                        <td className="p-1.5 text-white border border-violet-500/10">João</td>
                        <td className="p-1.5 text-white border border-violet-500/10">Silva</td>
                        <td className="p-1.5 text-white border border-violet-500/10">1º ano</td>
                        <td className="p-1.5 text-white border border-violet-500/10">A</td>
                        <td className="p-1.5 text-white border border-violet-500/10">fund1</td>
                      </tr>
                    </>
                  ) : (
                    <>
                      <tr>
                        <td className="p-1.5 text-white/60 border border-violet-500/10 font-medium">nome</td>
                        <td className="p-1.5 text-white/60 border border-violet-500/10 font-medium">sobrenome</td>
                        <td className="p-1.5 text-white/60 border border-violet-500/10 font-medium">email</td>
                        <td className="p-1.5 text-white/60 border border-violet-500/10 font-medium">casa_id</td>
                        <td className="p-1.5 text-white/10 border border-violet-500/10">-</td>
                        <td className="p-1.5 text-white/10 border border-violet-500/10">-</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 text-white border border-violet-500/10">Ana</td>
                        <td className="p-1.5 text-white border border-violet-500/10">Paula</td>
                        <td className="p-1.5 text-white border border-violet-500/10">ana@...</td>
                        <td className="p-1.5 text-white border border-violet-500/10">1</td>
                        <td className="p-1.5 text-white/10 border border-violet-500/10">-</td>
                        <td className="p-1.5 text-white/10 border border-violet-500/10">-</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
              {tipo === 'alunos' && (
                <p className="text-xs text-white/40 mt-2">
                  (continua com colunas G-O para casa_id e inteligências - opcionais)
                </p>
              )}
            </div>
          </div>

          {/* Dicas */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <p className="text-sm text-amber-400 font-medium mb-2">Dicas Importantes</p>
            <div className="space-y-1">
              <p className="text-xs text-amber-400/80">• Não altere a ordem das colunas</p>
              <p className="text-xs text-amber-400/80">• Não adicione colunas extras</p>
              <p className="text-xs text-amber-400/80">• Mantenha os nomes exatamente como no modelo</p>
              {tipo === 'alunos' && (
                <>
                  <p className="text-xs text-amber-400/80">• A matrícula deve ser única para cada aluno</p>
                  <p className="text-xs text-amber-400/80">• As colunas de casa e inteligências são opcionais</p>
                </>
              )}
              {tipo === 'professores' && (
                <p className="text-xs text-amber-400/80">• Verifique se os emails são únicos</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-violet-500/10">
          <button
            onClick={onClose}
            className="w-full p-3 bg-white text-black font-medium rounded-xl"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalInstrucoesImportacao;
