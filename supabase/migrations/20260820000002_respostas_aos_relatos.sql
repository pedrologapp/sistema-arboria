-- ============================================================
-- AS RESPOSTAS AOS QUINZE RELATOS
--
-- Ordem do Fundador em 20/08, depois de ler o painel pela primeira vez:
-- responder todo mundo que escreveu, pedir que verifiquem se o problema saiu, e
-- perguntar a uma aluna do 7o ano o que estava acontecendo com ela.
--
-- Regras que valem para todas: falar do que a pessoa escreveu, e nao mandar
-- texto pronto; assumir que o defeito era do app quando era; pedir desculpa
-- pela demora sem enfeitar; e nao prometer conserto do que ainda nao foi
-- consertado. O anexo do fluxo antigo de missao, que derrubou sete alunos em
-- abril, continua em pe, e as respostas dizem isso.
-- ============================================================

insert into public.problema_mensagens (problema_id, de, texto) values

-- Ana Clara, 9o A, 19/08. Ela achou que o problema era o celular dela.
('50a4e580-ead0-4fa2-8f15-d4bdade4557c', 'arboria', $t$Ana Clara, li tudo o que você escreveu, e o problema não era o seu celular. Era meu.

Eram duas coisas. As fotos do portfólio subiam e sumiam da tela, então parecia que nada tinha acontecido. E o campo do vídeo abria direto a câmera e escondia a galeria, então não dava para escolher um vídeo que você já tinha gravado.

As duas já foram consertadas. Quando puder, entra de novo e tenta. Se der errado outra vez, agora aparece na tela, em vermelho, o motivo do erro. Me manda o que estiver escrito ali.

Foi pelo detalhe do que você escreveu que eu achei os dois. Obrigado.$t$),

-- Sophia Leticia, 9o A, 07/08. Era o grupo_ref sem a turma.
('31c657af-ea30-42ed-894f-b091917fc286', 'arboria', $t$Sophia, você tinha razão, e não era você. O envio do trabalho do grupo estava travado por um erro meu no jeito de identificar quem era do time.

Isso já foi consertado e o prazo foi reaberto. Quando entrar, confere se o trabalho do seu grupo aparece como enviado. Se ainda não conseguir, me escreve aqui.

Desculpa pela demora em responder.$t$),

-- Sara Eduarda, 6o A, 01/06. Ela escreveu quatro vezes, tres delas pelos outros.
('bc021dc5-e388-4119-b01b-200f91c560cc', 'arboria', $t$Sara, eu vi que você escreveu aqui quatro vezes, e em três delas era para ajudar outra pessoa: a Nicole com a senha, e os colegas que não estavam achando o site. Isso não passou batido, e eu queria que você soubesse.

Peço desculpa por você não ter tido resposta. A autorização de recuperação de senha por um colega não estava funcionando como devia.

Se acontecer de novo com alguém, fala direto com a coordenação, que a senha é redefinida na hora. E se ainda tiver gente da sua turma sem conseguir entrar, me manda o nome aqui que eu resolvo.$t$),

('646e1141-62c3-41af-bdfd-b3eb1abc06ef', 'arboria', $t$É o mesmo caso do outro relato seu sobre a senha da Nicole: a autorização por um colega não estava funcionando. Respondi com mais detalhe no relato mais recente.$t$),

-- Ana Carolina, 7o A, 20/05. Nao e' problema tecnico. Tres meses sem resposta.
('d0caa9c4-baa5-4902-9a59-4b2da3db5376', 'arboria', $t$Ana Carolina, você escreveu aqui em maio que estava com estresse demais e tentando se controlar. Eu demorei três meses para responder, e isso não devia ter acontecido. Peço desculpa.

Queria saber como você está agora, e se aquilo continua.

Se quiser me contar o que estava pegando, pode escrever aqui. Isso não aparece para professor nem para ninguém da sua turma.

E se for uma coisa em que você precise de alguém por perto, me diz também, que eu te ajudo a achar com quem falar.$t$),

('5c50c1e5-70c2-42d7-830c-674dd23cfefc', 'arboria', $t$Sara, obrigado por ter avisado sobre os colegas que não estavam conseguindo achar o site. Se ainda tiver alguém do 6º A sem conseguir entrar, me manda o nome aqui.$t$),

-- O bloco de abril: sete alunos, o mesmo defeito de anexo, quatro meses sem
-- resposta. O texto e' quase igual de proposito, porque cada um le' so' o seu, e
-- porque a verdade e' a mesma para todos.
('8d6940b3-2680-4087-8010-331f5ce15c74', 'arboria', $t$Marillia, em abril você escreveu aqui que tentava anexar o arquivo e ele não aparecia. Você tinha razão, e o problema era do app, não do seu celular.

Peço desculpa por só responder agora. Esses relatos ficaram sem ninguém olhar, e você não foi a única: naqueles dois dias, sete alunos escreveram exatamente a mesma coisa.

Estou consertando o envio de arquivo. Se ainda acontecer com você em alguma missão, escreve aqui de novo, que agora eu leio e respondo.$t$),

('cfb35240-9ad0-427c-a4d4-dea93c87078e', 'arboria', $t$Sara, esse aqui é de abril e ficou sem resposta. O problema do anexo era do app, e não seu. Você não foi a única: naqueles dois dias sete alunos escreveram a mesma coisa. Estou consertando. Desculpa pela demora.$t$),

('fdfbd205-666f-40a3-b17a-2c688a005354', 'arboria', $t$Maria Julia, em abril você escreveu aqui que não conseguia enviar a missão. Você tinha razão, e o problema era do app, não do seu celular.

Peço desculpa por só responder agora. Esses relatos ficaram sem ninguém olhar, e você não foi a única: naqueles dois dias, sete alunos escreveram a mesma coisa.

Estou consertando o envio de arquivo. Se ainda acontecer com você, escreve aqui de novo, que agora eu leio e respondo.$t$),

('bfac2f56-0d03-40f5-ad27-814a1f982c80', 'arboria', $t$Kaio, em abril você escreveu aqui que não estava conseguindo enviar a missão. Você tinha razão, e o problema era do app.

Peço desculpa por só responder agora. Esses relatos ficaram sem ninguém olhar, e você não foi o único: naqueles dois dias, sete alunos escreveram a mesma coisa.

Estou consertando o envio de arquivo. Se ainda acontecer com você, escreve aqui de novo, que agora eu leio e respondo.$t$),

('30c5989b-f14e-42f8-b794-8cfffecf2863', 'arboria', $t$Sara, você descreveu exatamente o que estava acontecendo: você colocava o arquivo, clicava em enviar, e o app dizia que você não tinha colocado nada. Era um defeito do app, e a sua descrição foi a mais clara de todas.

Desculpa por só responder agora. Estou consertando.$t$),

('828276fc-4629-48f3-94c9-46fb81b1d7bc', 'arboria', $t$Layla, em abril você escreveu aqui que não estava conseguindo colocar o arquivo. Você tinha razão, e o problema era do app, não do seu celular.

Peço desculpa por só responder agora. Esses relatos ficaram sem ninguém olhar, e você não foi a única: naqueles dois dias, sete alunos escreveram a mesma coisa.

Estou consertando o envio de arquivo. Se ainda acontecer com você, escreve aqui de novo, que agora eu leio e respondo.$t$),

('4bb69703-0e9c-46df-9b29-d67f880e32f5', 'arboria', $t$Milena, em abril você escreveu aqui que o app pedia para colocar um arquivo e você não conseguia colocar. Você tinha razão, e o problema era do app.

Peço desculpa por só responder agora. Esses relatos ficaram sem ninguém olhar, e você não foi a única: naqueles dois dias, sete alunos escreveram a mesma coisa.

Estou consertando o envio de arquivo. Se ainda acontecer com você, escreve aqui de novo, que agora eu leio e respondo.$t$),

('e67f2528-eaa1-4a3c-8f30-8fb74a46f5f1', 'arboria', $t$Lucas, em abril você escreveu aqui que não dava para enviar o trabalho. Você tinha razão, e o problema era do app.

Peço desculpa por só responder agora. Esses relatos ficaram sem ninguém olhar, e você não foi o único: naqueles dois dias, sete alunos escreveram a mesma coisa.

Estou consertando o envio de arquivo. Se ainda acontecer com você, escreve aqui de novo, que agora eu leio e respondo.$t$),

('b9f5384d-1e44-4f29-9e4b-2db312e0bbf3', 'arboria', $t$Sophia, esse aqui é de abril e ficou sem resposta. Era o mesmo problema de anexo que outros seis alunos relataram naqueles dias, e era do app. Desculpa pela demora.$t$);

select p.full_name, count(m.id) as respostas
  from public.problema_mensagens m
  join public.problemas_alunos pa on pa.id = m.problema_id
  left join public.profiles p on p.id = pa.aluno_id
 where m.de = 'arboria'
 group by p.full_name order by 1;
