# A IA de fim de fase, cruzando casa e escola

Definido pelo Fundador em 21/08/2026, para construir DEPOIS. Este documento
existe para a ideia não se perder e para as decisões difíceis já estarem
mapeadas quando a construção começar.

## A ideia, nas palavras dele

Quando a fase fecha, a IA lê as observações daquela fase e devolve para o
diário da criança **duas coisas juntas**: um resumo das atividades que
aconteceram na fase, e uma análise das observações. E, agora que existe o
questionário dos pais, ela cruza também o que a família contou de casa.

É o fechamento do loop que o projeto persegue desde o começo. Ver
`empresa/registros/visao_ia_investigadora.md` (a matriz 8x8 de contexto por
expresso) e o direcionamento do Acreditar.

## Por que isto vale mais agora do que valia em julho

Até 21/08 o Arboria só tinha o eixo **escola**. O questionário dos pais abriu o
eixo **casa**, que é justamente onde a doutrina diz que o mecanismo aparece mais
limpo: em casa ninguém manda a criança fazer nada, então o que ela faz sozinha
não está contaminado por tarefa.

No primeiro dia já apareceu material que a escola nunca teria visto sozinha:
uma criança de 4 anos que reproduz um rótulo de memória num desenho, e cuja mãe
só descobriu isso PELO desenho; um menino que treina o gesto do bafo no vazio,
sem objeto nenhum; um menino cuja fala mudou depois de uma repreensão na escola.

## As cinco coisas que podem estragar isto

Estão aqui porque nenhuma delas se resolve depois de pronto.

### 1. A assimetria de volume

Uma criança tem 7 relatos dos pais (uma rodada) e pode ter dezenas de
observações da escola numa fase. Num prompt único, o relato da família vira 5%
do texto e desaparece na média. **O eixo casa precisa entrar com peso próprio,
em bloco separado, e não diluído na pilha.**

### 2. A tentação de conciliar

Se a mãe descreve uma coisa e a professora vê outra, o modelo tende a
harmonizar: "tanto em casa quanto na escola ele demonstra...". Isso destrói
exatamente o dado. Uma criança que organiza em casa e não organiza na escola não
é contradição a suavizar, é **hipótese sobre contexto**, e é o ouro da matriz
fora da diagonal. O contrato da IA precisa PROIBIR a conciliação e obrigar a
nomear a divergência quando ela existir.

### 3. O tempo das duas fontes é diferente

O relato dos pais é um retrato de agosto. A fase pode fechar em outubro. Cruzar
os dois sem marcar a data induz conclusão errada sobre uma criança que mudou no
meio. **Cada fonte entra datada, e a IA diz quando o dado de casa já está velho.**

### 4. O que o pai escreveu não volta para o pai

A mãe de uma criança contou, no questionário, que a fala do filho mudou depois
de uma repreensão de uma professora. Se isso voltar num diário como
"canal linguístico bloqueado", a escola devolve à família uma versão
institucional do que ela contou em confiança, e nenhuma família escreve de novo.
**O relato da família alimenta a hipótese e nunca é citado de volta para ela.**

### 5. Duas vozes não se somam

Já há crianças com mãe e avó, mãe e pai, respondendo separado. São duas fontes,
e às vezes convergem (Miguel Aquiles: as duas descreveram o bafo sem combinar) e
às vezes veem metades diferentes (Luiz Miguel: a mãe viu a narração, o pai viu a
memória). A IA trata cada voz como fonte própria, com nome do papel, e nunca
funde as duas numa média.

## Uma decisão de formato

O **resumo das atividades** é trabalho factual. A **análise das observações** é
trabalho interpretativo. Sair no mesmo bloco faz a análise herdar o tom de
certeza do resumo, e o professor lê hipótese como se fosse fato. Devem sair
separados, com vozes visivelmente diferentes.

## O passo que eu faria antes de tudo

Rodar a IA sobre **só os relatos dos pais de uma turma**, sem observação
nenhuma, e ver se ela produz hipótese que se sustenta. Se o instrumento sozinho
não produz leitura, misturar com as observações não vai revelar isso: vai
esconder.

---

# O caminho combinado (21/08, decisão do Fundador)

Não se constrói pipeline antes de saber o que ele tem que devolver. Então:

**Pega UM aluno e fecha a fase dele como teste.** Uma vez só, à mão, com os dois
lados: as observações da escola e o que os pais responderam. Vê o que a IA
devolveria, compara com o que a gente esperava, e vai alinhando. Só depois disso
o fluxo vira código.

## As três camadas, para não confundir de novo

O incômodo do Fundador com o diário vinha de uma palavra fazendo três trabalhos:

1. **REGISTRO** (não perder nada). Já existe e já está resolvido: 361 observações
   arboria, 266 observações, 356 respostas dos pais, 176 entregas. Falta só a
   visão única por criança, datada e com a fonte marcada. Ninguém lê inteiro.
2. **DESTILADO** (a IA não perder o fio). É o que falta. Um bloco curto por fase,
   escrito pela IA a partir do registro DAQUELA fase. Na fase seguinte ela lê o
   registro novo mais os destilados anteriores, nunca o arquivo inteiro. Não é
   guardar tudo para a IA: é ela ir deixando marcos.
3. **DIÁRIO** (o que a criança e a família leem). Escrito a partir do destilado,
   nunca do registro. Curto, narrativo, seletivo. Vira SAÍDA, e não repositório.

## O que vai dentro de um destilado

- o que se viu, com a cena concreta e a fonte
- em que contexto (aula, casa, sozinho, com plateia)
- a hipótese que aquilo sustenta
- a hipótese RIVAL
- o que ainda não se sabe, que vira sondagem da fase seguinte
- **o que foi DERRUBADO**: hipótese anterior que não se sustentou, e por quê

A última linha é a mais importante e a mais fácil de esquecer. Sem ela, a IA lê
o destilado antigo, acha qualquer semelhança no novo, e confirma para sempre.
Registrar o que caiu é o que impede o sistema de virar profecia que se cumpre.

**Fato sem hipótese envelhece.** "Elise desenhou um rótulo de shampoo igualzinho"
daqui a dois anos, solto, não diz nada. "Hipótese: a percepção dela sai pelo
desenho e não pela fala; rival: é memória visual" continua valendo e pode ser
derrubada. O destilado é o que faz a informação sobreviver ao tempo.

## Candidatos ao teste

Os dois com material mais rico dos dois lados em 21/08:
- **Elise Pinheiro de Oliveira**, Grupo IV B (o rótulo de shampoo no desenho)
- **Miguel Aquiles da Costa Chagas**, 5º Ano A (duas vozes que convergiram, o
  gesto do bafo sem objeto)

Nada precisa ser construído para esse teste. Os dados já estão no banco.
