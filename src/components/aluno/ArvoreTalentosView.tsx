import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate as fmAnimate } from 'framer-motion';
import { X, Info, ArrowLeft } from 'lucide-react';

// ═══════════════════════════════════════
// TYPES
// ═══════════════════════════════════════

interface ArvoreTalentosViewProps {
  alunoNome: string;
  alunoInfo?: string;
  avatarUrl?: string | null;
  dadosPorInteligencia?: Record<string, Record<string, string>>;
  brasoes?: Record<string, string>; // codigo -> brasao_url
}

// ═══════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════

const INTELLIGENCES: Record<string, { hex: string; glow: string; name: string; glyph: string }> = {
  corporal:     { hex: '#E8734A', glow: '#FFA37A', name: 'Corporal-Cinestésica', glyph: '◈' },
  musical:      { hex: '#E84A8B', glow: '#FF7AB0', name: 'Musical',              glyph: '♪' },
  espacial:     { hex: '#8B4AE8', glow: '#B07AFF', name: 'Espacial',             glyph: '◇' },
  naturalista:  { hex: '#4AA76B', glow: '#7ADB99', name: 'Naturalista',          glyph: '❋' },
  linguistica:  { hex: '#D4A24C', glow: '#FFD07A', name: 'Linguística',          glyph: '§' },
  logica:       { hex: '#4A6FE8', glow: '#7A9AFF', name: 'Lógico-Matemática',    glyph: '∑' },
  interpessoal: { hex: '#4AC4D4', glow: '#7AE4F0', name: 'Interpessoal',         glyph: '◉' },
  intrapessoal: { hex: '#6B4AE8', glow: '#9A7AFF', name: 'Intrapessoal',         glyph: '☽' },
};

const PHASE_ORDER = ['corporal','musical','espacial','naturalista','linguistica','logica','interpessoal','intrapessoal'];

const SKILL_NAMES: Record<string, string> = {
  C01:'Atenção sustentada', C02:'Discriminação auditiva', C04:'Memória de trabalho verbal',
  C05:'Raciocínio dedutivo', C06:'Vocabulário ativo', C07:'Observação sistemática',
  C08:'Categorização', C09:'Comparação contextual', C10:'Abstração simbólica',
  C11:'Metacognição', C12:'Coordenação visomotora', C13:'Equilíbrio dinâmico',
  C14:'Reconhecimento de padrões', C15:'Análise de evidências',
  A01:'Inibição de impulso', A02:'Tolerância à frustração', A03:'Reciprocidade',
  A04:'Coordenação rítmica', A06:'Escuta dialógica', A07:'Persistência em tarefa',
  A08:'Planejamento motor', A09:'Sincronia corporal', A10:'Autoavaliação', A11:'Cuidado com o entorno',
  S01:'Negociação', S02:'Cooperação em campo', S03:'Argumentação', S04:'Imitação intencional',
  S05:'Mediação de conflito', S06:'Coordenação coletiva', S07:'Construção de acordo',
  S08:'Liderança situacional', S09:'Stewardship ambiental', S10:'Resolução cooperativa',
  S11:'Sincronia interpessoal', S13:'Empatia situada',
  E01:'Nomeação de afeto', E02:'Modulação de intensidade', E03:'Expressão regulada',
  E04:'Curiosidade ativa', E05:'Conexão de pertencimento', E06:'Sensibilidade estética',
  E07:'Acolhimento de erro', E08:'Coragem deliberada', E10:'Presença sensorial',
  E12:'Maravilhamento', E13:'Aceitação de limite',
};

const TYPE_BY_PREFIX: Record<string, { type: string; dim: string }> = {
  C: { type: 'nucleo', dim: 'Cognitiva' },
  A: { type: 'suporte', dim: 'Autorregulatória' },
  S: { type: 'suporte', dim: 'Social' },
  E: { type: 'suporte', dim: 'Emocional' },
};

const STATE_LABEL: Record<string, string> = {
  nao_observado: 'Não Observado', exposicao: 'Exposição', contato: 'Contato',
  desenvolvimento: 'Desenvolvimento', consolidacao: 'Consolidação',
};

const STATE_INDEX: Record<string, number> = {
  nao_observado: 0, exposicao: 1, contato: 2, desenvolvimento: 3, consolidacao: 4,
};

const DIM_DESCRIPTIONS: Record<string, string> = {
  Cognitiva: 'Mecanismo cognitivo que opera quando a criança precisa processar informação complexa ou nova.',
  Autorregulatória: 'Capacidade de regular a própria ação; pausar, ajustar ou sustentar conforme a situação pede.',
  Social: 'Dimensão relacional, como a criança se coordena, comunica e colabora com outros.',
  Emocional: 'Acesso e manejo do próprio estado emocional; perceber, nomear, regular.',
};

const FALLBACK_DATA: Record<string, Record<string, string>> = {
  naturalista: { C07:'consolidacao', C15:'consolidacao', A11:'desenvolvimento', S02:'desenvolvimento', E04:'desenvolvimento', C08:'desenvolvimento', C14:'contato', S09:'desenvolvimento', E12:'contato' },
  linguistica: { C11:'desenvolvimento', C09:'contato', A01:'contato', S03:'desenvolvimento', E01:'contato', C04:'contato', C06:'exposicao', A04:'contato', S05:'desenvolvimento', E03:'contato' },
  interpessoal: { S01:'contato', A06:'contato', S02:'desenvolvimento', S05:'contato', E02:'exposicao', S07:'exposicao', S08:'exposicao', S13:'nao_observado', A03:'contato', E05:'exposicao' },
  intrapessoal: { C11:'contato', A06:'contato', A02:'exposicao', S01:'contato', E01:'contato', E03:'exposicao', C15:'desenvolvimento', A10:'exposicao', E07:'exposicao', E08:'nao_observado', E13:'nao_observado' },
  espacial: { C09:'exposicao', C12:'contato', A07:'exposicao', S03:'exposicao', E10:'contato', C05:'nao_observado', C13:'exposicao', A11:'exposicao', S02:'exposicao' },
  musical: { C01:'contato', C02:'exposicao', A04:'exposicao', A09:'exposicao', S06:'contato', E02:'nao_observado', C11:'exposicao', A01:'nao_observado', S11:'nao_observado', E06:'nao_observado' },
  corporal: { C12:'exposicao', C13:'exposicao', A04:'exposicao', A08:'nao_observado', S04:'exposicao', E10:'contato', C01:'nao_observado', A01:'nao_observado', A09:'nao_observado', E07:'nao_observado' },
  logica: { C05:'nao_observado', C08:'exposicao', A07:'nao_observado', S10:'nao_observado', E04:'exposicao', C10:'nao_observado', C11:'nao_observado', A10:'nao_observado', S01:'exposicao' },
};

// ═══════════════════════════════════════
// GEOMETRY
// ═══════════════════════════════════════

function mulberry32(seed: number) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function strSeed(str: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

const CENTER = 375;
const RING_R = 150;

function crestAngleDeg(phaseIndex: number) { return -90 + phaseIndex * 45; }
function deg2rad(d: number) { return (d * Math.PI) / 180; }
function crestPos(phaseIndex: number) {
  const a = deg2rad(crestAngleDeg(phaseIndex));
  return { x: CENTER + RING_R * Math.cos(a), y: CENTER + RING_R * Math.sin(a) };
}

function getNodePosition(intelligenceKey: string, nodeIndex: number, isNuclear: boolean, totalNodes: number) {
  const phaseIndex = PHASE_ORDER.indexOf(intelligenceKey);
  const baseAngle = crestAngleDeg(phaseIndex);
  const rng = mulberry32(strSeed(intelligenceKey) + nodeIndex * 9173);
  const rMin = isNuclear ? 190 : 245;
  const rMax = isNuclear ? 235 : 315;
  const radius = rMin + rng() * (rMax - rMin);
  const spread = 36;
  const t = totalNodes > 1 ? (nodeIndex / (totalNodes - 1)) - 0.5 : 0;
  const baseOffset = t * spread;
  const jitter = (rng() - 0.5) * 8;
  const angleDeg = baseAngle + baseOffset + jitter;
  const a = deg2rad(angleDeg);
  const x = CENTER + radius * Math.cos(a);
  const y2 = CENTER + radius * Math.sin(a);
  const crest = crestPos(phaseIndex);
  const mx = (crest.x + x) / 2;
  const my = (crest.y + y2) / 2;
  const dx = x - crest.x;
  const dy = y2 - crest.y;
  const len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
  const px = -dy / len;
  const py = dx / len;
  const sign = rng() > 0.5 ? 1 : -1;
  const ctrl = { x: mx + px * 8 * sign, y: my + py * 8 * sign };
  return { x, y: y2, ctrl, angleDeg };
}

// ═══════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════

function TreeBackground() {
  const stars = useMemo(() => {
    const rng = mulberry32(987654321);
    return Array.from({ length: 80 }, () => ({
      cx: rng() * 750, cy: rng() * 750, r: 0.5 + rng() * 1.0,
      op: 0.2 + rng() * 0.4, twinkle: rng() > 0.5, dur: 3 + rng() * 5, offset: -rng() * 5,
    }));
  }, []);

  return (
    <g pointerEvents="none">
      <defs>
        <radialGradient id="bgRadial" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#0A0E1A" />
          <stop offset="60%" stopColor="#050811" />
          <stop offset="100%" stopColor="#020309" />
        </radialGradient>
        <radialGradient id="vignette" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="rgba(0,0,0,0)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.5)" />
        </radialGradient>
        <filter id="nebulaBlur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="40" />
        </filter>
      </defs>
      <rect width="750" height="750" fill="url(#bgRadial)" />
      <g style={{ mixBlendMode: 'screen' }} opacity={0.15}>
        <ellipse cx={225} cy={300} rx={300} ry={300} fill="#1A2847" filter="url(#nebulaBlur)" />
        <ellipse cx={525} cy={488} rx={250} ry={250} fill="#2A1A47" filter="url(#nebulaBlur)" />
      </g>
      <g>
        {stars.map((s, i) => (
          <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill="#FFFFFF" opacity={s.op}>
            {s.twinkle && (
              <animate attributeName="opacity" values={`${s.op};${Math.max(0.05, s.op - 0.4)};${s.op}`}
                dur={`${s.dur}s`} begin={`${s.offset}s`} repeatCount="indefinite" />
            )}
          </circle>
        ))}
      </g>
      <rect width="750" height="750" fill="url(#vignette)" />
    </g>
  );
}

function TreeAvatar() {
  return (
    <g>
      <defs>
        <clipPath id="avatarClip"><circle cx="375" cy="375" r="80" /></clipPath>
        <radialGradient id="avatarBg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#2A3555" />
          <stop offset="100%" stopColor="#0A0E1A" />
        </radialGradient>
      </defs>
      <g clipPath="url(#avatarClip)">
        <rect x="295" y="295" width="160" height="160" fill="url(#avatarBg)" />
        <g transform="translate(375 405)" stroke="#D4A24C" strokeWidth={2.2} fill="none" strokeLinecap="round">
          <circle cx={0} cy={22} r={2.2} fill="#D4A24C" stroke="none" />
          <path d="M0 20 C 0 6, 0 -6, 0 -34" />
          <path d="M0 14 C -8 6, -18 -2, -26 -18" />
          <path d="M0 14 C 8 6, 18 -2, 26 -18" />
          <circle cx={0} cy={-36} r={2.6} fill="#D4A24C" stroke="none" />
          <circle cx={-26} cy={-20} r={2} fill="#D4A24C" stroke="none" />
          <circle cx={26} cy={-20} r={2} fill="#D4A24C" stroke="none" />
          <animateTransform attributeName="transform" type="scale" values="0.98;1.02;0.98" dur="4s" repeatCount="indefinite" additive="sum" />
        </g>
      </g>
    </g>
  );
}

function TreeMoldura() {
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const a = (i * 30 - 90) * Math.PI / 180;
    return <line key={i} x1={375 + 90 * Math.cos(a)} y1={375 + 90 * Math.sin(a)} x2={375 + 96 * Math.cos(a)} y2={375 + 96 * Math.sin(a)} stroke="#D4A24C" strokeOpacity={0.8} strokeWidth={1.2} />;
  });
  const dots = Array.from({ length: 8 }, (_, i) => {
    const a = (i * 45 - 90) * Math.PI / 180;
    return <circle key={i} cx={375 + 100 * Math.cos(a)} cy={375 + 100 * Math.sin(a)} r={2} fill="#D4A24C" opacity={0.7} />;
  });
  return (
    <g>
      <circle cx={375} cy={375} r={88} fill="none" stroke="#D4A24C" strokeWidth={1.5} opacity={0.8} />
      {ticks}
      <circle cx={375} cy={375} r={100} fill="none" stroke="#D4A24C" strokeWidth={0.5} opacity={0.4} />
      {dots}
    </g>
  );
}

function TreeCrest({ intelligenceKey, phaseIndex, dimmed, focused, onTap, brasaoUrl }: {
  intelligenceKey: string; phaseIndex: number; dimmed: boolean; focused: boolean; onTap: (k: string) => void; brasaoUrl?: string;
}) {
  const ints = INTELLIGENCES[intelligenceKey];
  const pos = crestPos(phaseIndex);
  return (
    <g transform={`translate(${pos.x} ${pos.y})`} style={{ cursor: 'pointer', opacity: dimmed ? 0.15 : 1, transition: 'opacity 300ms' }}
      onClick={(e) => { e.stopPropagation(); onTap(intelligenceKey); }}>
      <g>
        <circle r={28} fill="#0A0E1A" stroke={ints.hex} strokeWidth={2} />
        <circle r={22} fill={ints.hex} fillOpacity={0.15} />
        {focused && (
          <circle r={34} fill="none" stroke={ints.glow} strokeWidth={1} opacity={0.5}>
            <animate attributeName="opacity" values="0.3;0.7;0.3" dur="2s" repeatCount="indefinite" />
          </circle>
        )}
        {brasaoUrl ? (
          <image href={brasaoUrl} x={-18} y={-18} width={36} height={36} style={{ userSelect: 'none' }} />
        ) : (
          <text textAnchor="middle" dominantBaseline="central" fill={ints.hex} fontSize={20} fontWeight={600}
            fontFamily="'JetBrains Mono', monospace" style={{ userSelect: 'none' }} y={1}>{ints.glyph}</text>
        )}
        {!focused && (
          <animateTransform attributeName="transform" type="scale" values="1;1.05;1" dur="5s"
            begin={`${-(phaseIndex * 0.6)}s`} repeatCount="indefinite" additive="sum" />
        )}
      </g>
    </g>
  );
}

function ConnectorLine({ from, to, ctrl, state, glow }: {
  from: { x: number; y: number }; to: { x: number; y: number }; ctrl: { x: number; y: number }; state: string; glow: string;
}) {
  const opMap: Record<string, number> = { nao_observado: 0.1, exposicao: 0.1, contato: 0.3, desenvolvimento: 0.6, consolidacao: 0.9 };
  const op = opMap[state] ?? 0.1;
  const filter = state === 'desenvolvimento' ? `drop-shadow(0 0 2px ${glow})` : state === 'consolidacao' ? `drop-shadow(0 0 4px ${glow})` : 'none';
  return <path d={`M ${from.x} ${from.y} Q ${ctrl.x} ${ctrl.y} ${to.x} ${to.y}`} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={1.5} strokeOpacity={op} style={{ filter, transition: 'stroke-opacity 300ms' }} />;
}

function TreeNode({ x, y, isNuclear, state, hex, glow, onTap, instanceKey }: {
  x: number; y: number; isNuclear: boolean; state: string; hex: string; glow: string; onTap: () => void; instanceKey: string;
}) {
  const r = isNuclear ? 10 : 6;
  const offset = -((strSeed(instanceKey) % 1000) / 1000) * 4;
  const [tapping, setTapping] = useState(false);

  let inner = null;
  if (state === 'nao_observado') {
    inner = <circle r={r} fill="transparent" stroke={hex} strokeOpacity={0.15} strokeWidth={1} strokeDasharray="2 3" />;
  } else if (state === 'exposicao') {
    inner = <circle r={r} fill={hex} fillOpacity={0.25} stroke={hex} strokeOpacity={0.4} strokeWidth={1}>
      <animate attributeName="fill-opacity" values="0.2;0.35;0.2" dur="4s" begin={`${offset}s`} repeatCount="indefinite" />
    </circle>;
  } else if (state === 'contato') {
    inner = <circle r={r} fill={hex} fillOpacity={0.6} stroke={hex} strokeOpacity={0.8} strokeWidth={1.5}>
      <animate attributeName="fill-opacity" values="0.5;0.7;0.5" dur="3s" begin={`${offset}s`} repeatCount="indefinite" />
    </circle>;
  } else if (state === 'desenvolvimento') {
    inner = <g>
      <circle r={r + 3} fill={glow} opacity={0.3} style={{ filter: 'blur(4px)' }}>
        <animate attributeName="opacity" values="0.2;0.45;0.2" dur="2.5s" begin={`${offset}s`} repeatCount="indefinite" />
      </circle>
      <circle r={r} fill={hex} stroke={glow} strokeOpacity={0.9} strokeWidth={1.5} />
    </g>;
  } else if (state === 'consolidacao') {
    const particles = Array.from({ length: 4 }, (_, i) => {
      const ang = (i * 90) * Math.PI / 180;
      return <circle key={i} cx={12 * Math.cos(ang)} cy={12 * Math.sin(ang)} r={1} fill={glow} opacity={0.9} />;
    });
    inner = <g>
      <circle r={r + 16} fill={glow} opacity={0.2} style={{ filter: 'blur(16px)' }} />
      <circle r={r + 8} fill={glow} opacity={0.5} style={{ filter: 'blur(8px)' }}>
        <animate attributeName="opacity" values="0.4;0.7;0.4" dur="2s" begin={`${offset}s`} repeatCount="indefinite" />
      </circle>
      <circle r={r} fill={hex} stroke={glow} strokeWidth={2} />
      <g>{particles}<animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="6s" repeatCount="indefinite" /></g>
    </g>;
  }

  return (
    <g transform={`translate(${x} ${y}) scale(${tapping ? 1.3 : 1})`}
      style={{ cursor: 'pointer', transition: 'transform 200ms cubic-bezier(0.2,0.8,0.2,1)' }}
      onClick={(e) => { e.stopPropagation(); setTapping(true); setTimeout(() => setTapping(false), 300); onTap(); }}>
      <circle r={Math.max(r + 12, 18)} fill="rgba(0,0,0,0.001)" />
      {inner}
    </g>
  );
}

function TreeBottomSheet({ open, skill, onClose }: { open: boolean; skill: any; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && skill && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
            onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 30 }} />
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '46%', background: '#0F1525',
              borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTop: '1px solid rgba(255,255,255,0.08)',
              zIndex: 31, padding: 24, color: '#F0E6D2', display: 'flex', flexDirection: 'column', gap: 14,
              fontFamily: "'Inter', system-ui, sans-serif", boxSizing: 'border-box' }}>
            <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'transparent', border: 'none', color: 'rgba(240,230,210,0.6)', cursor: 'pointer', padding: 6 }}>
              <X size={20} />
            </button>
            <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 500, fontSize: 14, color: skill.hex, letterSpacing: '0.05em' }}>{skill.code}</span>
              <span style={{ border: `1px solid ${skill.hex}`, color: skill.hex, fontSize: 10, padding: '4px 10px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{skill.type === 'nucleo' ? 'Núcleo' : 'Suporte'}</span>
            </div>
            <div style={{ fontWeight: 500, fontSize: 22, color: '#F0E6D2', letterSpacing: '0.02em', lineHeight: 1.2 }}>{skill.name}</div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
              <span style={{ fontSize: 10, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Dimensão</span>
              <span style={{ fontSize: 14 }}>{skill.dim}</span>
            </div>
            <div>
              <div style={{ display: 'flex', gap: 4 }}>
                {[0,1,2,3,4].map(i => {
                  const reached = i <= STATE_INDEX[skill.state];
                  return <div key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: reached ? skill.hex : 'rgba(255,255,255,0.08)',
                    boxShadow: reached && i === STATE_INDEX[skill.state] ? `0 0 8px ${skill.glow}` : 'none' }} />;
                })}
              </div>
              <div style={{ marginTop: 6, fontStyle: 'italic', fontSize: 14, color: skill.glow }}>{STATE_LABEL[skill.state]}</div>
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.6, opacity: 0.85 }}>{DIM_DESCRIPTIONS[skill.dim]}</div>
            <div style={{ marginTop: 'auto', fontStyle: 'italic', fontSize: 12, opacity: 0.5 }}>Serve a inteligência {skill.intelligenceName}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function MiniNode({ state }: { state: string }) {
  const hex = '#D4A24C', glow = '#FFD07A', r = 5;
  let inner;
  if (state === 'nao_observado') inner = <circle cx={12} cy={12} r={r} fill="transparent" stroke={hex} strokeOpacity={0.4} strokeWidth={1} strokeDasharray="2 3" />;
  else if (state === 'exposicao') inner = <circle cx={12} cy={12} r={r} fill={hex} fillOpacity={0.3} stroke={hex} strokeOpacity={0.5} strokeWidth={1} />;
  else if (state === 'contato') inner = <circle cx={12} cy={12} r={r} fill={hex} fillOpacity={0.7} stroke={hex} strokeOpacity={0.9} strokeWidth={1.2} />;
  else if (state === 'desenvolvimento') inner = <g transform="translate(12 12)"><circle r={r+3} fill={glow} opacity={0.4} style={{filter:'blur(3px)'}} /><circle r={r} fill={hex} stroke={glow} strokeWidth={1.2} /></g>;
  else inner = <g transform="translate(12 12)"><circle r={r+6} fill={glow} opacity={0.25} style={{filter:'blur(5px)'}} /><circle r={r+3} fill={glow} opacity={0.6} style={{filter:'blur(3px)'}} /><circle r={r} fill={hex} stroke={glow} strokeWidth={1.5} /></g>;
  return <svg width={24} height={24} viewBox="0 0 24 24">{inner}</svg>;
}

function TreeLegendPanel({ open, onClose, onToggle }: { open: boolean; onClose: () => void; onToggle: () => void }) {
  const items = [
    { k: 'nao_observado', label: 'Não Observado', desc: 'Fora do horizonte, sem registro.' },
    { k: 'exposicao', label: 'Exposição', desc: 'Esteve no contexto.' },
    { k: 'contato', label: 'Contato', desc: 'Engajou ativamente.' },
    { k: 'desenvolvimento', label: 'Desenvolvimento', desc: 'Uso intencional, recorrente.' },
    { k: 'consolidacao', label: 'Consolidação', desc: 'Generaliza sem prompt.' },
  ];
  return (
    <>
      <button onClick={onToggle} style={{ position: 'absolute', right: 14, bottom: 18, zIndex: 25, width: 40, height: 40, borderRadius: 9999,
        background: 'rgba(15,21,37,0.8)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(240,230,210,0.7)', cursor: 'pointer', padding: 0 }}>
        <Info size={18} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.2 }}
            onClick={onClose} style={{ position: 'absolute', right: 14, bottom: 68, zIndex: 26, width: 280, padding: 20,
              background: '#0F1525', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, color: '#F0E6D2', fontFamily: "'Inter', system-ui, sans-serif" }}>
            <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 12, letterSpacing: '0.02em' }}>Estados</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {items.map(it => (
                <div key={it.k} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ flexShrink: 0, marginTop: 1 }}><MiniNode state={it.k} /></div>
                  <div>
                    <div style={{ fontStyle: 'italic', fontSize: 13, color: '#F0E6D2' }}>{it.label}</div>
                    <div style={{ fontSize: 11, opacity: 0.7, lineHeight: 1.4 }}>{it.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ═══════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════

export default function ArvoreTalentosView({ alunoNome, alunoInfo, avatarUrl, dadosPorInteligencia, brasoes = {} }: ArvoreTalentosViewProps) {
  const studentData = dadosPorInteligencia && Object.keys(dadosPorInteligencia).length > 0 ? dadosPorInteligencia : FALLBACK_DATA;

  // Mapear códigos da árvore para códigos do banco (para brasões)
  const CODIGO_MAP: Record<string, string> = {
    corporal: 'corporal_cinestesica',
    musical: 'musical',
    espacial: 'espacial',
    naturalista: 'naturalista',
    linguistica: 'linguistica',
    logica: 'logico_matematica',
    interpessoal: 'interpessoal',
    intrapessoal: 'intrapessoal',
  };
  const getBrasaoUrl = (intKey: string) => brasoes[CODIGO_MAP[intKey] || intKey] || brasoes[intKey] || '';

  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 375, h: 720 });
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => { for (const e of entries) { const r = e.contentRect; setSize({ w: r.width, h: r.height }); } });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scale = useMotionValue(1);
  const rotation = useMotionValue(0);

  const [selectedSkill, setSelectedSkill] = useState<any>(null);
  const [focusedCrest, setFocusedCrest] = useState<string | null>(null);
  const [legendOpen, setLegendOpen] = useState(false);

  const idleRef = useRef({ rafId: 0, last: 0, paused: false, resumeTimeout: null as any });
  useEffect(() => {
    const tick = (now: number) => {
      const st = idleRef.current;
      if (!st.last) st.last = now;
      const dt = (now - st.last) / 1000;
      st.last = now;
      if (!st.paused) rotation.set((rotation.get() + dt * 0.5) % 360);
      st.rafId = requestAnimationFrame(tick);
    };
    idleRef.current.rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(idleRef.current.rafId);
  }, []);

  const pauseIdle = useCallback(() => {
    const st = idleRef.current;
    st.paused = true;
    if (st.resumeTimeout) clearTimeout(st.resumeTimeout);
    st.resumeTimeout = setTimeout(() => { st.paused = false; }, 3000);
  }, []);

  useEffect(() => {
    if (selectedSkill || focusedCrest) idleRef.current.paused = true;
    else pauseIdle();
  }, [selectedSkill, focusedCrest, pauseIdle]);

  const intelligencesData = useMemo(() => {
    return PHASE_ORDER.map((intKey, phaseIdx) => {
      const data = studentData[intKey] || {};
      const codes = Object.keys(data);
      const cores = codes.filter(c => c.startsWith('C'));
      const sups = codes.filter(c => !c.startsWith('C'));
      const all = [...cores.map(c => ({ code: c, isNuclear: true })), ...sups.map(c => ({ code: c, isNuclear: false }))];
      const total = all.length;
      const nodes = all.map((n, i) => {
        const pos = getNodePosition(intKey, i, n.isNuclear, total);
        const state = data[n.code] || 'nao_observado';
        const dim = TYPE_BY_PREFIX[n.code[0]]?.dim || 'Cognitiva';
        return { ...n, ...pos, state, dim, instanceKey: `${intKey}-${n.code}-${i}` };
      });
      return { intKey, phaseIdx, nodes };
    });
  }, [studentData]);

  useEffect(() => {
    if (focusedCrest) {
      const phaseIdx = PHASE_ORDER.indexOf(focusedCrest);
      const cp = crestPos(phaseIdx);
      const newScale = 1.8;
      fmAnimate(scale, newScale, { duration: 0.6, ease: [0.32, 0.72, 0, 1] });
      fmAnimate(x, (375 - cp.x) * newScale, { duration: 0.6, ease: [0.32, 0.72, 0, 1] });
      fmAnimate(y, (375 - cp.y) * newScale, { duration: 0.6, ease: [0.32, 0.72, 0, 1] });
    } else {
      fmAnimate(scale, 1, { duration: 0.5, ease: [0.32, 0.72, 0, 1] });
      fmAnimate(x, 0, { duration: 0.5, ease: [0.32, 0.72, 0, 1] });
      fmAnimate(y, 0, { duration: 0.5, ease: [0.32, 0.72, 0, 1] });
    }
  }, [focusedCrest]);

  const dragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('[data-node-tap]') || (e.target as HTMLElement).closest('[data-crest-tap]')) return;
    pauseIdle();
    // Clicar no background deseleciona tudo
    if (focusedCrest) setFocusedCrest(null);
    if (selectedSkill) setSelectedSkill(null);
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, baseX: x.get(), baseY: y.get() };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    x.set(dragRef.current.baseX + e.clientX - dragRef.current.startX);
    y.set(dragRef.current.baseY + e.clientY - dragRef.current.startY);
  };
  const onPointerUp = () => { dragRef.current = null; };

  const transform = useTransform([x, y, scale, rotation], ([tx, ty, s, rot]) =>
    `translate(${tx} ${ty}) translate(375 375) scale(${s}) rotate(${rot}) translate(-375 -375)`
  );

  const sectorOpacity = (intKey: string) => {
    if (focusedCrest) return intKey === focusedCrest ? 1 : 0.15;
    if (selectedSkill) return intKey === selectedSkill.intelligenceKey ? 1 : 0.3;
    return 1;
  };

  const handleNodeTap = (intKey: string, node: any) => {
    pauseIdle();
    const intl = INTELLIGENCES[intKey];
    const tinfo = TYPE_BY_PREFIX[node.code[0]];
    setSelectedSkill({ code: node.code, name: SKILL_NAMES[node.code] || node.code, type: node.isNuclear ? 'nucleo' : 'suporte',
      dim: tinfo?.dim || 'Cognitiva', state: node.state, hex: intl.hex, glow: intl.glow, intelligenceKey: intKey, intelligenceName: intl.name });
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%', minHeight: 500, overflow: 'hidden', background: '#020309', touchAction: 'none' }}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
      <svg width={size.w} height={size.h} viewBox="0 0 750 750" preserveAspectRatio="xMidYMid meet" style={{ display: 'block', userSelect: 'none' }}>
        <TreeBackground />
        <motion.g style={{ transform }}>
          {intelligencesData.map(({ intKey, phaseIdx, nodes }) => {
            const intl = INTELLIGENCES[intKey]; const cp = crestPos(phaseIdx);
            return <g key={`sec-${intKey}`} style={{ opacity: sectorOpacity(intKey), transition: 'opacity 300ms' }}>
              {nodes.map(n => <ConnectorLine key={`l-${n.instanceKey}`} from={cp} to={{ x: n.x, y: n.y }} ctrl={n.ctrl} state={n.state} glow={intl.glow} />)}
            </g>;
          })}
          <TreeAvatar />
          <TreeMoldura />
          {PHASE_ORDER.map((intKey, idx) => (
            <g key={`c-${intKey}`} data-crest-tap>
              <TreeCrest intelligenceKey={intKey} phaseIndex={idx} dimmed={!!focusedCrest && focusedCrest !== intKey}
                focused={focusedCrest === intKey} onTap={(k) => { pauseIdle(); setFocusedCrest(prev => prev === k ? null : k); }}
                brasaoUrl={getBrasaoUrl(intKey)} />
            </g>
          ))}
          {intelligencesData.map(({ intKey, nodes }) => {
            const intl = INTELLIGENCES[intKey];
            return <g key={`n-${intKey}`} style={{ opacity: sectorOpacity(intKey), transition: 'opacity 300ms' }}>
              {nodes.map(n => <g key={`g-${n.instanceKey}`} data-node-tap>
                <TreeNode x={n.x} y={n.y} isNuclear={n.isNuclear} state={n.state} hex={intl.hex} glow={intl.glow}
                  instanceKey={n.instanceKey} onTap={() => handleNodeTap(intKey, n)} />
              </g>)}
            </g>;
          })}
        </motion.g>
      </svg>

      {/* Header */}
      <div style={{ position: 'absolute', top: 16, left: 16, right: 16, zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', pointerEvents: 'none' }}>
        <div style={{ pointerEvents: 'auto' }}>
          {focusedCrest ? (
            <button onClick={() => setFocusedCrest(null)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(15,21,37,0.7)',
              backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 999, padding: '8px 14px',
              color: '#F0E6D2', cursor: 'pointer', fontSize: 14, letterSpacing: '0.02em' }}>
              <ArrowLeft size={16} /> Voltar
            </button>
          ) : (
            <div>
              <div style={{ fontWeight: 500, fontSize: 18, color: '#F0E6D2', letterSpacing: '0.04em', lineHeight: 1.1 }}>{alunoNome}</div>
              {alunoInfo && <div style={{ fontSize: 10, color: 'rgba(240,230,210,0.55)', letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 2 }}>{alunoInfo}</div>}
            </div>
          )}
        </div>
        {focusedCrest && (
          <div style={{ fontSize: 16, color: INTELLIGENCES[focusedCrest].glow, letterSpacing: '0.02em', textAlign: 'right',
            textShadow: `0 0 12px ${INTELLIGENCES[focusedCrest].hex}`, fontStyle: 'italic' }}>{INTELLIGENCES[focusedCrest].name}</div>
        )}
      </div>

      <TreeLegendPanel open={legendOpen} onToggle={() => setLegendOpen(v => !v)} onClose={() => setLegendOpen(false)} />
      <TreeBottomSheet open={!!selectedSkill} skill={selectedSkill} onClose={() => setSelectedSkill(null)} />
    </div>
  );
}
