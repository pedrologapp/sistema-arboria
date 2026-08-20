-- ============================================================
-- O ARBORIA PASSA A PODER PUXAR CONVERSA
--
-- Ate agora a conversa so' nascia quando o aluno escrevia. O Fundador pediu em
-- 20/08 para mandar uma mensagem ao Theo perguntando se ele conseguiu enviar
-- tudo, e nao havia por onde: sem relato dele, nao existia thread.
--
-- 'iniciado_por' resolve, e resolve principalmente uma questao de honestidade
-- na tela: quando quem comeca e' o Arboria, a linha de abertura NAO pode ser
-- desenhada como se o aluno tivesse escrito. O campo texto passa a valer como
-- assunto da conversa, e nao como fala de ninguem.
-- ============================================================

alter table public.problemas_alunos
  add column if not exists iniciado_por text not null default 'aluno';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'problemas_alunos_iniciado_por_check'
  ) then
    alter table public.problemas_alunos
      add constraint problemas_alunos_iniciado_por_check
      check (iniciado_por in ('aluno', 'arboria'));
  end if;
end $$;

-- O aluno continua so' conseguindo gravar relato assinado por ele mesmo, e
-- agora tambem so' como 'aluno': senao daria para forjar uma conversa que
-- parece ter partido do Arboria.
drop policy if exists "Aluno insere problema" on public.problemas_alunos;
create policy "Aluno insere problema"
on public.problemas_alunos for insert to authenticated
with check (aluno_id = auth.uid() and iniciado_por = 'aluno');

drop policy if exists "Admin puxa conversa" on public.problemas_alunos;
create policy "Admin puxa conversa"
on public.problemas_alunos for insert to authenticated
with check (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  or public.has_role(auth.uid(), 'super_admin'::public.app_role)
);

-- ------------------------------------------------------- a conversa com o Theo
with nova as (
  insert into public.problemas_alunos (aluno_id, institution_id, texto, iniciado_por, contexto)
  select '53d55517-d271-495f-9ef5-0d55aece105b', p.institution_id,
         'Arena Arboria: 2ª fase', 'arboria',
         jsonb_build_object('assunto', 'arena_2fase', 'aberto_por', 'fundador')
    from public.profiles p where p.id = '53d55517-d271-495f-9ef5-0d55aece105b'
  returning id
)
insert into public.problema_mensagens (problema_id, de, texto)
select id, 'arboria', $t$Théo, tudo bem?

Queria saber se você e o João Lucas conseguiram enviar tudo do EmpireOS, ou se ficou alguma coisa para trás.

Se travou em alguma parte, me conta o que aconteceu. Duas coisas estavam quebradas no envio até hoje: o campo do vídeo abria só a câmera e escondia a galeria, e as fotos do portfólio subiam e sumiam da tela. As duas já foram consertadas, então se você tentou antes e não deu, tenta de novo agora.

O prazo foi para domingo, 23/08.$t$
  from nova;

select p.full_name, pa.iniciado_por, m.texto
  from public.problema_mensagens m
  join public.problemas_alunos pa on pa.id = m.problema_id
  join public.profiles p on p.id = pa.aluno_id
 where pa.aluno_id = '53d55517-d271-495f-9ef5-0d55aece105b';
