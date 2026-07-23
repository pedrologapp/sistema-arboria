-- ============================================================
-- arboria_tarefas: o quadro de tarefas do DONO (tipo Trello) no painel /arboria.
-- Pedido do Fundador 23/07: acompanhar as demandas dele em checklist por colunas
-- (a_fazer / fazendo / feito). So super_admin (e' o quadro pessoal do dono).
-- Nao e' dado de crianca; sem doutrina envolvida.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.arboria_tarefas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo      text NOT NULL,
  descricao   text,
  status      text NOT NULL DEFAULT 'a_fazer' CHECK (status IN ('a_fazer','fazendo','feito')),
  ordem       int  NOT NULL DEFAULT 0,
  criado_por  uuid,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.arboria_tarefas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS arboria_tarefas_super ON public.arboria_tarefas;
CREATE POLICY arboria_tarefas_super ON public.arboria_tarefas
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Semeia as 6 demandas do Fundador (23/07), na coluna "a fazer".
INSERT INTO public.arboria_tarefas (titulo, descricao, status, ordem)
SELECT * FROM (VALUES
  ('Definir a IA de análise', 'Contrato de fim de fase: voz detetive+parceira, tom, caso 0-obs, limiar. Depois pipeline (1a rodada supervisionada na Linguistica).', 'fazendo', 1),
  ('Aulas do F1', 'Repensar como serao as aulas/fases do F1: ensinar o movimento (nao o rotulo), aula multi-caminho, atividade que nomeia a habilidade. Pede mesa Pesquisa Pedagogica.', 'a_fazer', 2),
  ('F2: observar na apresentacao', 'No administrar capitulo do F2, ao clicar no grupo ou aluno, registrar observacao ali mesmo enquanto apresentam (analisar na hora).', 'a_fazer', 3),
  ('Site de amostra + votacao dos projetos', 'Expor os trabalhos pra pais/filhos/amigos votarem no melhor projeto. Toca Riscos (exposicao + votacao).', 'a_fazer', 4),
  ('Nota no projeto', 'Forma de dar nota ao projeto de cada um. CUIDADO doutrina: nota de entrega concreta OK, score de inteligencia PROIBIDO. Desenhar com Pedagogica + Riscos.', 'a_fazer', 5),
  ('Criar as missoes', 'Gerar missoes por atividade + casa + fase, pros alunos entregarem. Conecta ao sistema de missoes (entrega -> analise IA -> pontos).', 'a_fazer', 6)
) AS v(titulo, descricao, status, ordem)
WHERE NOT EXISTS (SELECT 1 FROM public.arboria_tarefas);
