import { useState } from 'react';
import { ChevronDown, ChevronUp, Target, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SugestaoN8NCardProps } from '@/types/sugestaoN8N';

export function SugestaoN8NCard({
  tipoRecomendacao,
  nomeRecomendacao,
  prioridade = 'normal',
  elementoPonte,
  padraoIdentificado,
  porQueEsteTipo,
  oQueFazerAgora,
  useAForca,
  comoReagir,
  oQueNaoFazer,
  mensagemProfessor,
  onRegistrarAcao
}: SugestaoN8NCardProps) {
  // Estados para colapsáveis
  const [justificativaAberta, setJustificativaAberta] = useState(false);
  const [opcaoAAberta, setOpcaoAAberta] = useState(false);
  const [opcaoBAberta, setOpcaoBAberta] = useState(false);
  
  // Cor do badge de prioridade
  const prioridadeConfig = {
    urgente: { bg: 'bg-red-500', text: 'text-white', label: 'URGENTE' },
    importante: { bg: 'bg-amber-500', text: 'text-black', label: 'IMPORTANTE' },
    normal: { bg: 'bg-blue-500', text: 'text-white', label: 'NORMAL' }
  };
  
  const config = prioridadeConfig[prioridade] || prioridadeConfig.normal;

  // Verificar se há conteúdo para elemento de ponte
  const temElementoPonte = elementoPonte && elementoPonte.forcas && elementoPonte.areaDificuldade;
  
  // Verificar se há conteúdo para padrão
  const temPadrao = padraoIdentificado && padraoIdentificado.nome;
  
  // Verificar se há conteúdo para ação principal
  const temAcaoPrincipal = oQueFazerAgora && (oQueFazerAgora.objetivo || oQueFazerAgora.scriptPrincipal);
  
  // Verificar se há opções A/B
  const temOpcaoA = useAForca?.opcaoA && useAForca.opcaoA.nome;
  const temOpcaoB = useAForca?.opcaoB && useAForca.opcaoB.nome;
  
  // Verificar se há como reagir
  const temComoReagir = comoReagir && (comoReagir.seAceitar || comoReagir.seRecusar);
  
  // Verificar se há o que não fazer
  const temOQueNaoFazer = oQueNaoFazer && oQueNaoFazer.length > 0;

  return (
    <div className="rounded-xl border-2 border-red-600 bg-[#7F1D1D] overflow-hidden">
      {/* SLOT: HEADER */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-5 h-5 text-red-300" />
          <span className="text-xs font-semibold uppercase tracking-wider text-white">
            ALERTA ATIVO
          </span>
          <span className={cn(
            'ml-auto text-xs font-semibold px-2 py-0.5 rounded',
            config.bg,
            config.text
          )}>
            {config.label}
          </span>
        </div>
        
        {/* Tipo + Nome da Recomendação */}
        {tipoRecomendacao && (
          <div className="mb-4 p-3 bg-amber-900/30 rounded-lg border border-amber-500/30">
            <p className="text-amber-400 text-xs uppercase tracking-wide font-semibold">
              🎯 {tipoRecomendacao}
            </p>
            {nomeRecomendacao && (
              <p className="text-white font-medium mt-1">
                {nomeRecomendacao}
              </p>
            )}
          </div>
        )}
        
        {/* SLOT: ELEMENTO DE PONTE */}
        {temElementoPonte && (
          <div className="mb-4 p-3 bg-purple-900/20 rounded-lg border border-purple-500/20">
            <p className="text-purple-400 text-xs font-semibold uppercase tracking-wide mb-2">
              🔗 PONTE
            </p>
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <span className="text-white font-medium">
                {elementoPonte!.forcas}
              </span>
              <span className="text-purple-400">→</span>
              <span className="text-white/80">
                {elementoPonte!.areaDificuldade}
              </span>
            </div>
          </div>
        )}
        
        {/* SLOT: PADRÃO DETECTADO */}
        {temPadrao && (
          <div className="mb-4 p-3 bg-black/30 rounded-lg border border-white/10">
            <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide mb-1">
              📊 Padrão Detectado
            </p>
            <p className="text-white text-sm font-medium">
              {padraoIdentificado!.nome}
            </p>
            {padraoIdentificado!.significado && (
              <p className="text-white/60 text-xs mt-1">
                {padraoIdentificado!.significado}
              </p>
            )}
          </div>
        )}
        
        {/* SLOT: JUSTIFICATIVA (Colapsável) */}
        {porQueEsteTipo && (
          <div className="mb-4">
            <button
              onClick={() => setJustificativaAberta(!justificativaAberta)}
              className="w-full p-3 bg-black/20 rounded-lg flex items-center justify-between hover:bg-black/30 transition-colors"
            >
              <span className="text-white/60 text-xs font-semibold uppercase">
                💡 Por que este tipo
              </span>
              {justificativaAberta ? (
                <ChevronUp className="w-4 h-4 text-white/40" />
              ) : (
                <ChevronDown className="w-4 h-4 text-white/40" />
              )}
            </button>
            {justificativaAberta && (
              <div className="mt-2 p-3 bg-black/10 rounded-lg">
                <p className="text-white/80 text-sm leading-relaxed">
                  {porQueEsteTipo}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* SLOT: AÇÃO PRINCIPAL (Sempre aberto) */}
      {temAcaoPrincipal && (
        <div className="px-4 pb-4">
          <div className="p-4 bg-black/30 rounded-lg border border-white/20">
            <h4 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
              📌 O QUE FAZER AGORA
            </h4>
            
            {oQueFazerAgora!.objetivo && (
              <p className="text-white/80 text-sm mb-2">
                <strong>Objetivo:</strong> {oQueFazerAgora!.objetivo}
              </p>
            )}
            
            {oQueFazerAgora!.contexto && (
              <p className="text-white/60 text-sm mb-3">
                <strong>Contexto:</strong> {oQueFazerAgora!.contexto}
              </p>
            )}
            
            {/* SCRIPT EM DESTAQUE */}
            {oQueFazerAgora!.scriptPrincipal && (
              <div className="p-3 bg-blue-900/40 rounded-lg border border-blue-500/30 mb-3">
                <p className="text-blue-400 text-xs font-semibold mb-1">💬 DIGA:</p>
                <p className="text-white text-sm leading-relaxed italic">
                  "{oQueFazerAgora!.scriptPrincipal}"
                </p>
              </div>
            )}
            
            {oQueFazerAgora!.comoEscutar && (
              <p className="text-white/70 text-sm">
                <span className="text-amber-400">👂</span> {oQueFazerAgora!.comoEscutar}
              </p>
            )}
          </div>
        </div>
      )}
      
      {/* SLOT: OPÇÃO A (Colapsável) */}
      {temOpcaoA && (
        <div className="px-4 pb-2">
          <div className="rounded-lg border border-amber-500/30 bg-amber-900/20 overflow-hidden">
            <button
              onClick={() => setOpcaoAAberta(!opcaoAAberta)}
              className="w-full p-3 flex items-center justify-between hover:bg-white/5"
            >
              <span className="text-white text-sm font-medium">
                🅰️ {useAForca!.opcaoA!.nome}
              </span>
              {opcaoAAberta ? (
                <ChevronUp className="w-4 h-4 text-white/40" />
              ) : (
                <ChevronDown className="w-4 h-4 text-white/40" />
              )}
            </button>
            {opcaoAAberta && (
              <div className="px-3 pb-3 space-y-2 border-t border-white/10">
                {useAForca!.opcaoA!.script && (
                  <div className="p-3 bg-blue-900/40 rounded-lg border border-blue-500/30 mt-3">
                    <p className="text-blue-400 text-xs font-semibold mb-1">💬 SCRIPT:</p>
                    <p className="text-white text-sm leading-relaxed italic">
                      "{useAForca!.opcaoA!.script}"
                    </p>
                  </div>
                )}
                {useAForca!.opcaoA!.porQueFunciona && (
                  <p className="text-green-400/80 text-sm">
                    <span className="text-green-400">✓</span> {useAForca!.opcaoA!.porQueFunciona}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* SLOT: OPÇÃO B (Colapsável) */}
      {temOpcaoB && (
        <div className="px-4 pb-4">
          <div className="rounded-lg border border-amber-500/30 bg-amber-900/20 overflow-hidden">
            <button
              onClick={() => setOpcaoBAberta(!opcaoBAberta)}
              className="w-full p-3 flex items-center justify-between hover:bg-white/5"
            >
              <span className="text-white text-sm font-medium">
                🅱️ {useAForca!.opcaoB!.nome}
              </span>
              {opcaoBAberta ? (
                <ChevronUp className="w-4 h-4 text-white/40" />
              ) : (
                <ChevronDown className="w-4 h-4 text-white/40" />
              )}
            </button>
            {opcaoBAberta && (
              <div className="px-3 pb-3 space-y-2 border-t border-white/10">
                {useAForca!.opcaoB!.script && (
                  <div className="p-3 bg-blue-900/40 rounded-lg border border-blue-500/30 mt-3">
                    <p className="text-blue-400 text-xs font-semibold mb-1">💬 SCRIPT:</p>
                    <p className="text-white text-sm leading-relaxed italic">
                      "{useAForca!.opcaoB!.script}"
                    </p>
                  </div>
                )}
                {useAForca!.opcaoB!.porQueFunciona && (
                  <p className="text-green-400/80 text-sm">
                    <span className="text-green-400">✓</span> {useAForca!.opcaoB!.porQueFunciona}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* SLOT: COMO REAGIR */}
      {temComoReagir && (
        <div className="px-4 pb-4">
          <div className="p-3 bg-emerald-900/20 rounded-lg border border-emerald-500/20">
            <h4 className="text-sm font-semibold mb-3 text-emerald-400">
              🔄 COMO REAGIR
            </h4>
            <div className="space-y-2">
              {comoReagir!.seAceitar && (
                <p className="text-sm text-white/90">
                  <span className="text-green-400 mr-2">✅</span>
                  <strong>Se aceitar:</strong> "{comoReagir!.seAceitar}"
                </p>
              )}
              {comoReagir!.seRecusar && (
                <p className="text-sm text-white/90">
                  <span className="text-red-400 mr-2">❌</span>
                  <strong>Se recusar:</strong> "{comoReagir!.seRecusar}"
                </p>
              )}
              {comoReagir!.alerta && (
                <p className="text-sm text-amber-400 font-semibold mt-2">
                  ⚠️ {comoReagir!.alerta}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* SLOT: O QUE NÃO FAZER */}
      {temOQueNaoFazer && (
        <div className="px-4 pb-4">
          <div className="p-3 bg-red-900/20 rounded-lg border border-red-500/20">
            <h4 className="text-sm font-semibold mb-2 text-red-400">
              ⚠️ O QUE NÃO FAZER
            </h4>
            <ul className="space-y-1">
              {oQueNaoFazer!.map((item, i) => (
                <li key={i} className="text-sm text-white/80 flex items-start gap-2">
                  <span className="text-red-400 flex-shrink-0">✗</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      
      {/* SLOT: MENSAGEM PROFESSOR */}
      {mensagemProfessor && (
        <div className="px-4 pb-4">
          <div className="p-3 bg-blue-900/20 rounded-lg border border-blue-500/20">
            <h4 className="text-sm font-semibold mb-2 text-blue-400">
              💬 MENSAGEM PARA VOCÊ
            </h4>
            <p className="text-sm text-white/90 leading-relaxed italic">
              "{mensagemProfessor}"
            </p>
          </div>
        </div>
      )}
      
      {/* SLOT: BOTÃO AÇÃO */}
      {onRegistrarAcao && (
        <div className="px-4 pb-4">
          <button
            onClick={onRegistrarAcao}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 
                       hover:from-blue-500 hover:to-blue-400 transition-all duration-200
                       flex items-center justify-center gap-2 shadow-lg border border-blue-400/30"
          >
            <Target className="w-4 h-4 text-white" />
            <span className="text-white font-semibold">Registrar minha ação</span>
          </button>
        </div>
      )}
    </div>
  );
}
