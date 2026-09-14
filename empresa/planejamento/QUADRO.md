# QUADRO DE DEMANDAS — Arboria Tech

Área de planejamento do Fundador. Um lugar só para o que precisa ser feito.

**Como funciona.** O CEO (Claude) atualiza no começo e no fim de cada sessão.
Quando o Fundador pedir "o que eu tenho pra fazer", a resposta sai daqui.

**A forma do quadro.** Organizado por TEMPO, e cada linha é uma FRASE COM SUJEITO
E VERBO. O tempo do verbo diz se a coisa existe:

> "O painel **mostra** quem respondeu" → já existe
> "O painel **vai mostrar** quem respondeu" → ainda não existe

Última atualização: **25/08/2026**, depois de dois dias sem sessão.

---

## O QUE MUDOU ENQUANTO O FUNDADOR ESTEVE FORA (22 a 25/08)

**A Arena da 2ª fase fechou em 23/08 e ficou pela metade.** Nove dos dezoito
projetos entregaram. Vinte e nove alunos, em nove projetos, não mandaram nada.

**O questionário das famílias triplicou sozinho.** Eram 55 concluídos em 21/08.
Hoje são **130 concluídos** e 173 famílias que abriram. Ainda entrava resposta
hoje às 13h. Quarenta e três pararam no meio e ninguém falou com elas.

**Os oito casos ficaram prontos.** Todos têm leitura datada, sondagem e folha de
duas páginas. **Nenhum foi entregue a professora nenhuma.**

**O caso #0 ganhou a estrutura completa** em 23/08: dezessete cenas, seis
mecanismos com evidência, leitura, o que não fecha, próxima peça e sondagem.

**O Théo continua esperando resposta desde 20/08.** Cinco dias.

---

---

## O SITE DA ARENA, 10/09/2026

**O site existe e roda no localhost, em `/arenaarboria`.** Galeria dos onze
projetos em faixas iguais, ordem embaralhada a cada visita, e uma página por
projeto com vídeo, texto da equipe e portfólio. Sem login e sem papel: a página
pede os projetos prontos a um servidor e não fala com o banco.

**São onze projetos, não catorze.** As catorze entregas da 2ª fase incluem um
grupo do 8º A que enviou quatro vezes. O site junta por grupo e fica com o envio
mais completo.

**Riscos suspendeu a publicação**, e a arquitetura passou com três correções.
Parecer inteiro em `empresa/registros/riscos.md`, entrada de 10/09. Três coisas
travam o push:

| O que falta | De quem depende |
|---|---|
| Termo de autorização dos responsáveis, por integrante | Advogado, depois as famílias |
| Autorização escrita da direção do Amadeus | O Fundador |
| Conferência de cada foto e cada vídeo, um a um | O Fundador, com um segundo par de olhos |

**A função pública nasce travada.** Ela só responde com o segredo `ARENA_NO_AR`
ligado. Ligar esse interruptor em produção é o ato de publicar.

**O Fundador decide dois nomes de projeto.** O 06 e o 08 não dizem o próprio
nome no texto. Estão como "O Caso do Policial Billy" e "Pistas em Código", os
dois deduzidos pelo CEO.

**O Fundador troca a chave secreta do Supabase.** Ela passou pela conversa em
10/09. A chave antiga marcada como vazada desde julho continua sem rotação.

**A conferência precisa olhar as fotos do Decoder.** Várias parecem geradas por
IA e não fotografadas. Se for, o site mostraria imagem gerada como se fosse o
projeto.


## AGORA · o que trava outra coisa

**O Fundador responde ao Théo.** Ele perguntou no chat privado às 2h54 da manhã
de 20/08 se podia ir adicionando um arquivo de cada vez. É a primeira vez que um
aluno usa o canal, ele entregou completo, e está sem resposta há cinco dias. É a
tarefa mais barata do quadro inteiro e a que mais custa se ficar parada.

**O Fundador decide o rumo da Arena.** Quatro pontos, levantados em 24/08 e sem
resposta. Enquanto não decidir, o CEO não sabe se cobra ou se fecha:

| Ponto | Situação |
|---|---|
| Prazo | Fechou em 23/08 às 23h59, mas a tela não tem trava. A Ana Júlia subiu seis arquivos em 24/08 às 14h19 e o app aceitou |
| Sara Eduarda, 6º A | Entregou tudo **menos o vídeo**. Cobrar ou aceitar? |
| `entregue_no_prazo` | Está fixo em `true` no código. Quem entregar atrasado fica gravado como no prazo |
| 17 arquivos órfãos | Sobras do bug antigo, uns 28 MB, todos de alunos que já entregaram. Limpar ou deixar? |

**O Fundador entrega as sete folhas às professoras.** Era para ter ido segunda,
24/08. Cada folha pede que a professora repare em alguma coisa **nas próximas
semanas**, então a folha perde valor a cada dia que espera: entregue tarde, a
janela de observação não cabe mais na fase.

Duas merecem palavra na mão:

- **Joshua (3º A):** a professora não pode mudar o público e a exigência de ordem
  na mesma vez, senão a volta não diz nada.
- **Gael (Maternal 3 A):** o caso inteiro se apoia num relato de memória. O
  primeiro pedido é escrever **um episódio, com data**.

---

## ESTA SEMANA

**O Fundador escreve a data limite** no convite das famílias. O convite está
pronto em tudo o mais e não imprime sem ela.

**O Fundador decide o que fazer com os nove projetos que não entregaram.**
O buraco tem forma de turma, não de aluno:

| Turma | Projetos | Entregaram |
|---|---|---|
| 7º A | 3 | **nenhum** |
| 9º A | 6 | 1 |
| 7º B | 4 | 3 |
| 8º A | 3 | 3 |
| 6º A e 6º B | 2 | 2 |

Vinte e nove crianças não decidem a mesma coisa por acaso. Quando o buraco tem
forma de turma, a causa costuma estar antes delas. A checagem barata é perguntar
aos mentores do 7º A e do 9º A se a 2ª fase chegou às turmas deles.

**O Fundador manda a mensagem individual** aos responsáveis do Infantil e do F1.
*O CEO pode gerar a planilha dos 338 com nome do responsável, telefone e a
mensagem já montada. Ofereceu em 21/08, sem resposta.*

**O CEO vai falar com as 43 famílias que pararam no meio.** Elas abriram e não
terminaram. O painel já sabe quem são e em qual pergunta pararam.
*Proposto, não pedido ainda.*

**O Fundador aplica o tempo verbal no quadro do Miro.** Meia hora.

---

## DEPOIS · decidido, sem data

**O Fundador e o CEO vão desenhar o fluxo da IA.** Pedido dele em 21/08.

Sai no formato que ele enxerga: raias de TEMPO, cada caixa uma FRASE com sujeito
e verbo, a seta levando a PERGUNTA que o passo seguinte quer responder, e o tempo
do verbo dizendo o que existe. Glossário fixo de seis palavras ao lado, e nenhuma
caixa pode usar palavra de fora dele: **acervo, ficha, aposta, bilhete, volta,
destilado.**

E se monta DE TRÁS PRA FRENTE, começando no bilhete da segunda-feira de manhã e
perguntando o que precisava existir para ele existir.

**O Fundador e o CEO vão fechar a fase de um aluno à mão**, como teste, com as
observações da escola e o que os pais responderam lado a lado.
Candidatos: **Miguel Aquiles** (5º A, duas vozes que convergiram), **Elise**
(Grupo IV B, o rótulo de shampoo), **Ayrton** (5º A, caso #1).
Contrato em `empresa/registros/contrato_ia_fim_de_fase_casa_escola.md`.

**O CEO vai montar o diário do próprio Fundador**, a partir do caso #0, para
testar o formato em alguém que sabe dizer se acertou.

**O Fundador vai dar a palestra às professoras** sobre como o Arboria se aplica
nele. Estrutura: explicar uma coisa duas vezes, pela porta que não funciona e
pela que funciona, deixar elas sentirem o vão, e só então nomear.
A virada: *"isso acontece na sua sala todo dia, e quando acontece com uma
criança a gente chama de não prestou atenção"*.

**O Fundador vai começar o Instagram.** Formato dele: cena, virada, nome, com o
gráfico entrando como prova no fim e nunca como abertura.

**O CEO vai construir o "não consegui entrar"** na porta das famílias. Registra o
nome digitado e a data tentada, e cada travamento vira correção de cadastro.

**O questionário vai ganhar iscas intrapessoais na próxima rodada.** Faltam três
que o pai consegue ver: a criança que anuncia o plano antes de fazer, a que se
corrige sozinha no meio, e a que explica por que errou.

**O bilhete ao professor vai ter mais de uma voz.** Quem processa por cena
precisa da segunda-feira de manhã; quem processa por regra precisa do "quando
acontecer X, faça Y".

---

## O TRABALHO DO FUNDADOR

Isto não é do CEO. É o que só ele faz, e é o maior bloco aberto do Arboria hoje.

### As aulas, nos três segmentos

**O Fundador vai criar as aulas da fase Linguística do F2** (consciência mais
prática, do 6º ao 9º, núcleo mais habilidades de suporte).
*No quadro desde 12/08 esperando data de início.*

**O Fundador vai criar as aulas da próxima fase do F1.**

**O Fundador vai criar as aulas do Infantil**, ainda este ano.

*Três segmentos, o mesmo verbo. É o item mais pesado do quadro e o único sem data
nenhuma. Vale escolher por onde começa antes de escolher quando.*

### A dependência que não pode ser invertida

**O Fundador vai analisar as observações da última fase do F1.**

**Isto vem ANTES de criar as aulas da próxima fase do F1.** Se as aulas novas
nascerem sem a leitura da fase que acabou, o ciclo não fecha e a fase seguinte
não aprende nada com a anterior. É a única ordem obrigatória do quadro inteiro.

E é a mesma coisa que fechar a fase de um aluno à mão: **o teste não é desvio, é
a primeira fatia de uma demanda que já existe.**

### F2

**O Fundador vai fechar a Jornada** (dois caminhos, Casa conquistada até três com
migração, a Jornada não é instrumento de leitura). Em amadurecimento desde 18/08,
ata em `empresa/reunioes/2026-08-18/`.

**O Fundador vai fazer a Competição e o site de votação.** Galeria anônima, voto
por e-mail, cinco por IP. Definido em 28/07.
*Agora tem material real: nove projetos com capa, fotos, vídeo e descrição. O
site não tem mais o que esperar, tirando a decisão sobre os nove que faltam.*

**O Fundador vai falar com o Théo** para ele ajudar no protótipo do próximo app.

**O F2 vai ganhar questionário dos pais.** As 160 famílias do 6º ao 9º ficaram de
fora desta rodada e o convite promete "em breve".

### Arboria

**O Fundador vai criar e pegar os casos de cada turma.** Hoje existem oito, e
doze das dezenove turmas ainda não têm caso nenhum.
Faltam candidatos de dois mecanismos: **naturalista**, que não tem isca no
questionário, e um **intrapessoal** no 1º ano (ele precisa dizer qual Miguel).

---

## INCOMODA HÁ TEMPO

**A `SUPABASE_SERVICE_ROLE_KEY` está vazada desde 15/07 e não foi rotacionada.**
Quarenta e um dias. É a maior dívida de segurança aberta.

**Os tipos gerados do Supabase estão desatualizados**, e por isso o projeto tem
~670 erros de tipo. A rede de segurança do TypeScript está desligada em boa parte
do app.
*E `tsc -p tsconfig.json` neste projeto não verifica NADA: o arquivo tem
`"files": []`. A checagem que vale é `-p tsconfig.app.json`.*

**Remover arquivo na Arena apaga do bucket para sempre.** Devia só desamarrar e
guardar.

**Três vetos suspensivos do setor de Riscos seguem de pé**, e travam o caminho
para fora da escola:
- Nenhum caso novo e nada de caso em papel até existir rotina de retenção e
  exclusão.
- Nenhuma segunda instituição nem demonstração a terceiro até haver escopo por
  instituição e registro de acesso.
- **Nenhum texto de caso pode ir para IA externa** até o termo declarar
  subprocessador de IA. É o que bloqueia as caixas de análise do desenho do
  Fundador.

---

## A VARREDURA DA PASTA · pedida em 25/08

**O Fundador e o CEO vão varrer a pasta `Projeto Arboria/`.** Duas coisas ao
mesmo tempo, e nenhuma agora: organizar os documentos, e revisar a literatura.

Motivo, nas palavras dele: *"tem muita coisa que esse ProjetoArboriaCompleto tem
que já não estamos mais usando. Os sistemas de observação mudaram."*

O que a leitura de 25/08 já achou e que a varredura vai ter que resolver:

- O mestre se contradiz sobre atividade diagnóstica. A PARTE VI manda abrir os
  canais, a PARTE VIII manda fechar. As duas usam a expressão "múltiplos filtros".
- A palavra **galho** tem três referentes dentro do próprio mestre, e um quarto
  nos Mapas de mecanismo.
- A palavra **Talento** significa uma coisa no mestre (talento = habilidade) e
  outra nos Mapas (talento é alimentado por habilidades).
- A árvore é **estrutura** no mestre e **linha do tempo** nos Mapas. Os dois
  sistemas de coordenadas não convivem.
- A apostila do F1 está mais correta que o mestre em pelo menos um ponto
  (*"uma cena isolada não conclui nada"* contra *"4 pontos de Consolidação:
  sinal forte de predominância"*). Onde o material novo já corrigiu o mestre
  sem que ninguém registrasse, a varredura precisa achar.
- O Mapa Interpessoal v1 tem o campo `operacao_nuclear` em 21 talentos. O Mapa
  Corporal v5 tem zero, e por isso não pode ser auditado pelo teste do canal.

*Levantamento completo no fim da sessão de 25/08.*

---

## A VIAGEM E O CADERNO · trazidos em 25/08

Vieram de uma conversa longa no celular, em 23 a 25/08, que também produziu os
oito refinamentos conceituais.

**O Fundador vai viajar para observar mecanismo**, com parada em Iwama (Japão,
aikido). O critério da imersão foi validado nessa conversa e é este: **ele mesmo
é o instrumento mais confiável da viagem**, porque em cada parada é o iniciante
absoluto, sem repertório nenhum.

Onde olhar, decidido: nos primeiros segundos, nos outros iniciantes, e no
momento em que o mestre é obrigado a improvisar. **Nunca no mestre em
repertório**, porque décadas de treino apagaram o rastro.

*Sem data no quadro. É a demanda mais antiga sem prazo depois das aulas.*

**O Fundador vai manter um caderno de campo pessoal.** Não é banco de dados da
escola e não é por aluno. É organizado por ENTENDIMENTO, com três campos:

1. O que eu entendi (uma frase dele)
2. O que me fez entender (a cena, curta)
3. Onde isso muda alguma coisa (ou nada, e tudo bem)

E guarda também **as ideias abandonadas e o motivo**. A primeira já existe: o
repositório de vídeos do Instagram, descartado em 25/08 porque vídeo editado não
tem "antes do primeiro movimento", e sem o antes não há mecanismo para ler.

*Os oito refinamentos são as primeiras entradas desse caderno.*

**Uma regra que saiu dessa conversa e vale para os casos:** arquive por
atividade, nunca por mecanismo. Pasta com nome de mecanismo obriga a julgar na
hora de guardar. **O mecanismo é conclusão, não etiqueta de entrada.**

---

## OS CASOS · estado em 25/08, fim da sessão

**São dezoito casos.** Sete existiam, onze nasceram hoje, um por turma que não
tinha. Cada um carrega série, turma e ano **congelados na abertura**, porque um
caso é documento sobre um momento e a criança muda de turma no ano que vem.

**Os onze novos não têm mecanismo, nem leitura, nem sondagem.** Não é trabalho
pela metade: cada um tem uma voz só, a da família. Nomear mecanismo com uma
fonte seria a conclusão apressada que a doutrina proíbe. Todos entram marcados
como `fonte_unica`.

**O Fundador fecha as sondagens depois de dar aula nas turmas nesta semana.**
Ele decidiu usar a aula da semana para investigar a criança de cada caso, sem
que a turma saiba que a atividade foi pensada para ela.

| Turma | Caso | Tem atrito? |
|---|---|---|
| 1º A | #8 Ariel Lima | sim |
| 1º B | #9 Arthur Josué | sim, a mãe nomeia: o banho |
| 2º B | #10 Antony Gael | sim |
| 3º B | #11 Luiz Davi | sim |
| 4º B | #12 Maria Clara | sim, três marcações na mesma pergunta |
| 5º B | #13 Antônio Lucas | não |
| 5º C | #14 Sávia Raquel | sim |
| Grupo IV B | #15 Antônio Valentim | não |
| Grupo V A | #16 Sarah Valentina | sim |
| Maternal 2 B | #17 Ana Laura | não |
| Maternal 3 B | #18 Ricardo Arthur | não, e é o par do #6 |

**Maternal 2 A continua sem caso.** Nenhuma família daquela turma respondeu o
questionário. Se o Fundador quiser caso ali, ele nasce só do relato da
professora, com uma perna só.

**Dois casos antigos mudaram na varredura de hoje:**

- **#4 Maria Helena** ganhou seis cenas do PAI, que respondeu em 25/08 sem ver o
  que a mãe escreveu em 21/08. As duas vozes convergiram na mesma pergunta, e a
  leitura nova está registrada. É o primeiro caso do acervo com duas vozes
  independentes.
- **#7 Thalles** pode estar mal enquadrado. Foi aberto no corporal, e a mãe
  relatou **duas vezes, em dias diferentes**, que ele pergunta se ela está com
  raiva quando ela chega calada. A sondagem que está na folha dele não captura
  isso. *Decidir antes de entregar a folha.*

**Fica escrito para não se perder:** a mãe do Thalles marcou "um bicho, uma
planta, alguma coisa viva" e escreveu que ele vê insetos pela casa. **Isso não é
naturalista.** Reparar num inseto é detecção, não classificação.
