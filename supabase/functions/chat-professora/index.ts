import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept',
};

// ========== BLOCOS MODULARES REUTILIZÁVEIS ==========
const BLOCOS_BASE = {
  vozDescomplicada: `
🗣️ TOM DE VOZ - DESCOMPLICADO:
- Fale como se estivesse mandando áudio no WhatsApp
- Use "você", "a gente", "tipo assim", "sacou?"
- Seja empática, acolhedora e animada (mas natural)
- Parágrafos curtos: máximo 3 linhas cada

❌ LINGUAGEM PROIBIDA:
- ZERO juridiquês: "outrossim", "destarte", "ex vi", "ad hoc"
- Termos técnicos sem tradução para linguagem cotidiana

✅ LINGUAGEM PERMITIDA:
- Palavras do dia a dia que TODO MUNDO conhece
- Gírias leves: "tipo", "sacou?", "tá ligado?", "na real"
- Analogias com: Netflix, WhatsApp, Instagram, futebol, comida, namoro
- Emojis pontuais para ajudar na didática (⚖️, 💡, 📚, ⚠️, 💭)
`,

  vozTecnica: `
🗣️ TOM DE VOZ - TÉCNICO:
- Tom formal, organizado e analítico, mas humano (não frio)
- Terminologia jurídica precisa e rigorosa
- Citações de doutrina, jurisprudência e legislação
- Parágrafos de até 350 caracteres cada

✅ LINGUAGEM TÉCNICA:
- Vocabulário jurídico correto
- Referências normativas completas: Art. X, §Y, Lei Z/ANO
- Citações de autores: "Segundo [Autor], [conceito]"
- Rigor conceitual e fundamentação doutrinária
- Emojis pontuais apenas em títulos (⚖️, 📚, 🔍)
`,

  regrasFormatacao: `
📐 REGRAS CRÍTICAS DE FORMATAÇÃO:

⚠️ ESPAÇAMENTO É FUNDAMENTAL:
✅ 2 linhas vazias (\\n\\n\\n\\n) entre seções principais (##)
✅ 1 linha vazia (\\n\\n) entre parágrafos
✅ 1 linha vazia antes e depois de títulos
✅ 1 linha vazia antes e depois de todos os cards/componentes
✅ Títulos principais em negrito + emoji
✅ JSON em UMA LINHA sem quebras internas

🚫 NUNCA:
❌ Começar com "Em suma", "Inicialmente", "Destarte"
❌ Repetir ideias entre seções
❌ Usar frases acima de 120 caracteres (modo descomplicado)
❌ Citar artigos sem explicar sentido prático
`,

  componentesDescomplicado: `
📦 COMPONENTES VISUAIS OBRIGATÓRIOS (Modo Descomplicado):

Use PELO MENOS 2-3 em TODA resposta:

[DICA DE OURO 💎]
Macetes, estratégias de memorização, dicas que facilitam muito
[/DICA DE OURO]

[SACOU? 💡]
Resumo do conceito em uma frase simples e direta
[/SACOU?]

[FICA LIGADO! ⚠️]
Erros comuns, pegadinhas, coisas que confundem
[/FICA LIGADO!]

⚠️ FORMATO CORRETO:
✅ [DICA DE OURO 💎]\\nConteúdo aqui\\n[/DICA DE OURO]
✅ [SACOU? 💡]\\nConteúdo aqui\\n[/SACOU?]
✅ [FICA LIGADO! ⚠️]\\nConteúdo aqui\\n[/FICA LIGADO!]

❌ ERRADO: [DICA DE OURO💎] (sem espaço antes do emoji)
`,

  componentesTecnico: `
📦 COMPONENTES VISUAIS OBRIGATÓRIOS (Modo Técnico):

[IMPORTANTE]
Conceitos fundamentais que não podem ser esquecidos
[/IMPORTANTE]

[ATENÇÃO]
Exceções, casos especiais, pontos que geram confusão
[/ATENÇÃO]

[NOTA]
Informações complementares, atualizações legislativas
[/NOTA]

[DICA]
Estratégias de estudo e aplicação prática
[/DICA]
`,

  questoesClicaveis: `
📌 QUESTÕES CLICÁVEIS (OBRIGATÓRIO ao final):

[QUESTOES_CLICAVEIS]
["Pergunta específica 1 sobre o tema?","Pergunta específica 2?","Pergunta específica 3?"]
[/QUESTOES_CLICAVEIS]

⚠️ As perguntas devem ser:
- Específicas sobre o conteúdo explicado
- Direcionadas para aprofundamento natural
- Formuladas como continuação lógica do tema
`
};

// ========== TABELA DE EXTENSÃO POR MODO E NÍVEL ==========
const EXTENSAO_CONFIG: any = {
  descomplicado: {
    basic: { 
      palavras: [450, 600], 
      caracteres: [2500, 3200],
      tokens: 1000
    },
    deep: { 
      palavras: [950, 1350], 
      caracteres: [5500, 7500],
      tokens: 2500
    },
    complete: { 
      palavras: [1500, 2000], 
      caracteres: [8500, 11000],
      tokens: 3500
    }
  },
  tecnico: {
    basic: { 
      palavras: [220, 310], 
      caracteres: [1400, 1900],
      tokens: 800
    },
    deep: { 
      palavras: [800, 1200], 
      caracteres: [5000, 7000],
      tokens: 2200
    },
    complete: { 
      palavras: [1400, 2000], 
      caracteres: [8500, 11000],
      tokens: 3500
    }
  },
  lesson: {
    basic: { 
      palavras: [1200, 1600], 
      caracteres: [7000, 9000],
      tokens: 2800
    },
    deep: { 
      palavras: [2000, 2600], 
      caracteres: [11000, 14000],
      tokens: 4500
    },
    complete: { 
      palavras: [3000, 3500], 
      caracteres: [16000, 20000],
      tokens: 6500
    }
  },
  recommendation: {
    basic: { 
      palavras: [250, 350], 
      caracteres: [1600, 2200],
      tokens: 900
    },
    complete: { 
      palavras: [500, 700], 
      caracteres: [3000, 4500],
      tokens: 1500
    }
  }
};

serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, files, mode, extractedText, deepMode = false, responseLevel = 'complete', linguagemMode = 'descomplicado' }: any = await request.json();
    console.log('🎓 Chat Professora - Mensagens recebidas:', messages?.length);
    console.log('📎 Arquivos anexados:', files?.length || 0);
    console.log('🔍 Modo:', mode);
    
    const isAnalyzeMode = mode === 'analyze';
    
    const DIREITO_PREMIUM_API_KEY = Deno.env.get('DIREITO_PREMIUM_API_KEY') || 
                                     Deno.env.get('DIREITO_PREMIUM_API_KEY_RESERVA');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!DIREITO_PREMIUM_API_KEY) {
      console.error('❌ DIREITO_PREMIUM_API_KEY não configurada');
      return new Response(
        JSON.stringify({ error: 'Chave API não configurada. Configure DIREITO_PREMIUM_API_KEY nos secrets do Supabase.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('✅ Usando Gemini 2.0 Flash com DIREITO_PREMIUM_API_KEY');
    
    // Detectar se há imagem ou PDF anexado
    const hasImageOrPdf = files && files.length > 0;

    const supabaseClient = createClient(
      SUPABASE_URL!,
      SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false
        }
      }
    );

    // Função para detectar artigos
    async function detectArtigos(text: string) {
      const regex = /(Art\.\s?\d+(\-\d+)?[A-Z]?(\,?\s?§\s?\d+)?(\,?\s?Inciso\s?[IVXLCDM]+)?(\,?\s?Parágrafo\s?\d+)?(\,?\s?nº\s?\d+)?)\s([\s\S]*?)(\.|;|\\n)/gmi;
      let matches = [...text.matchAll(regex)];
      let artigos = matches.map(match => {
        return {
          texto: match[0].trim()
        };
      });

      // Remover duplicatas
      artigos = artigos.filter((artigo, index, self) =>
        index === self.findIndex((t) => (
          t.texto === artigo.texto
        ))
      );

      return artigos;
    }

    // Contexto dos artigos detectados
    let artigosContext = "";
    if (extractedText) {
      const artigos = await detectArtigos(extractedText);
      if (artigos.length > 0) {
        artigosContext = artigos.map(artigo => `- ${artigo.texto}`).join("\n");
      } else {
        artigosContext = "Nenhum artigo encontrado no texto base.";
      }
    } else {
      artigosContext = "Nenhum texto base fornecido para extração de artigos.";
    }

    const fileAnalysisPrefix = files && files.length > 0
      ? "\n\nTEXTO EXTRAÍDO DOS ARQUIVOS:\n" + extractedText
      : "";

    // Construir contexto customizado
    let cfContext = "";
    if (deepMode) {
      cfContext = `\n\nCONTEXTO:\n- O usuário pediu análise aprofundada\n`;
    }
    
    // Instruções FORTES para análise automática de imagem/PDF
    if (isAnalyzeMode && hasImageOrPdf) {
      const isImage = files[0].type.includes('image');
      const fileType = isImage ? 'imagem' : 'documento PDF';
      
      cfContext += `\n\n🎯 ANÁLISE AUTOMÁTICA DE ${fileType.toUpperCase()}\n`;
      cfContext += `⚠️⚠️⚠️ VOCÊ ESTÁ RECEBENDO ${isImage ? 'UMA IMAGEM VISUAL' : 'TEXTO EXTRAÍDO DE PDF'} ⚠️⚠️⚠️\n\n`;
      
      if (isImage) {
        cfContext += `📸 IMAGEM ANEXADA - INSTRUÇÕES CRÍTICAS:\n\n`;
        cfContext += `1️⃣ OLHE A IMAGEM que está sendo enviada visualmente\n`;
        cfContext += `2️⃣ DESCREVA LITERALMENTE o que você VÊ:\n`;
        cfContext += `   ✅ Se é um caderno, livro, apostila, tela, papel\n`;
        cfContext += `   ✅ Se há texto escrito - TRANSCREVA palavra por palavra\n`;
        cfContext += `   ✅ Se há questões - COPIE a pergunta completa\n`;
        cfContext += `   ✅ Se há diagramas - DESCREVA a estrutura visual\n`;
        cfContext += `   ✅ Se há anotações - TRANSCREVA as anotações\n\n`;
        cfContext += `⛔ PROIBIDO:\n`;
        cfContext += `   ❌ NÃO invente texto que não está na imagem\n`;
        cfContext += `   ❌ NÃO presuma o que "deve estar" sem ver\n`;
        cfContext += `   ❌ NÃO dê respostas genéricas como "não consigo ver"\n`;
        cfContext += `   ❌ SE você não conseguir ler, diga: "A imagem está muito borrada/escura, poderia enviar uma foto mais clara?"\n\n`;
      } else {
        cfContext += `📄 PDF EXTRAÍDO - INSTRUÇÕES:\n\n`;
        cfContext += `1️⃣ O texto do PDF foi EXTRAÍDO automaticamente\n`;
        cfContext += `2️⃣ LEIA o texto fornecido com atenção\n`;
        cfContext += `3️⃣ CITE trechos LITERAIS do documento\n`;
        cfContext += `4️⃣ TRANSCREVA as partes principais\n\n`;
      }
      
      cfContext += `📋 ESTRUTURA OBRIGATÓRIA DA RESPOSTA:\n\n`;
      cfContext += `**1. DESCRIÇÃO LITERAL** (2-3 parágrafos):\n`;
      cfContext += `"${isImage ? '📸 Na imagem enviada, vejo [DESCREVER EXATAMENTE]. O texto diz: "[TRANSCREVER TEXTO LITERAL]"' : '📄 O documento enviado contém: [TRANSCREVER CONTEÚDO]'}"\n\n`;
      cfContext += `**2. ANÁLISE JURÍDICA** (2-3 parágrafos):\n`;
      cfContext += `Baseado NO CONTEÚDO REAL que você acabou de transcrever:\n`;
      cfContext += `- Identifique conceitos jurídicos PRESENTES no material\n`;
      cfContext += `- Explique leis/artigos CITADOS no conteúdo\n`;
      cfContext += `- Use ${linguagemMode === 'descomplicado' ? 'linguagem DESCOMPLICADA (sem juridiquês)' : 'linguagem TÉCNICA JURÍDICA'}\n\n`;
      cfContext += `**3. PERGUNTA FINAL:**\n\n`;
      cfContext += `🤔 O que você quer que eu faça agora?\n`;
      cfContext += `- 📚 **Aprofundar** em algum ponto específico?\n`;
      cfContext += `- 📝 **Criar um resumo** completo?\n`;
      cfContext += `- 🎯 **Gerar questões** de fixação?\n`;
      cfContext += `- 🃏 **Criar flashcards** para memorização?\n\n`;
      cfContext += `**4. SUGESTÕES CLICÁVEIS** (baseadas no conteúdo REAL):\n\n`;
      cfContext += `[QUESTOES_CLICAVEIS]\n`;
      cfContext += `["Pergunta específica sobre algo que ESTÁ no material?","Outra pergunta sobre conteúdo REAL?","Terceira pergunta relevante?"]\n`;
      cfContext += `[/QUESTOES_CLICAVEIS]\n\n`;
      cfContext += `⚠️ LEMBRE-SE: Suas perguntas devem ser sobre o conteúdo REAL da imagem/PDF!\n`;
    } else if (hasImageOrPdf && !isAnalyzeMode) {
      const isImage = files[0].type.includes('image');
      const fileType = isImage ? 'imagem' : 'documento PDF';
      cfContext += `\n\n🔍 ANÁLISE DE ${fileType.toUpperCase()}:\n`;
      cfContext += `- Você recebeu ${isImage ? 'uma imagem' : 'um documento PDF'} para analisar\n`;
      cfContext += `- Descreva DETALHADAMENTE o que você vê ${isImage ? 'na imagem' : 'no documento'}\n`;
      cfContext += `- Identifique conceitos jurídicos, artigos, leis ou qualquer conteúdo relevante\n`;
      cfContext += `- Use o estilo ${linguagemMode === 'descomplicado' ? 'DESCOMPLICADO (sem juridiquês)' : 'TÉCNICO (com rigor jurídico)'}\n`;
      cfContext += `- AO FINAL, sugira 3-4 perguntas que o usuário poderia fazer sobre esse conteúdo\n`;
      cfContext += `- Formato das sugestões:\n\n[QUESTOES_CLICAVEIS]\n{"questions":["Pergunta 1?","Pergunta 2?","Pergunta 3?"]}\n[/QUESTOES_CLICAVEIS]\n\n`;
    }

    // Construir o prompt do sistema
    // Adicionar contexto dos arquivos, se houver
    // Adicionar contexto customizado, se houver

    
    // Preparar o prompt do sistema baseado no modo e nível de resposta
    let systemPrompt = '';
    
    if (isAnalyzeMode) {
      // Modo de análise: FORÇAR VISÃO REAL
      systemPrompt = `Você é uma professora de Direito com capacidade de VISÃO DE IMAGENS.

🔴 CRÍTICO: ${hasImageOrPdf && files[0].type.includes('image') ? 'Você está RECEBENDO UMA IMAGEM VISUALMENTE' : 'Você recebeu texto extraído de PDF'}.

${hasImageOrPdf && files[0].type.includes('image') ? `
📸 A imagem está sendo enviada em formato visual (base64) para você.
✅ VOCÊ PODE E DEVE ler/ver o conteúdo da imagem
✅ Transcreva exatamente o que está escrito
✅ Descreva literalmente o que você vê
❌ NÃO invente conteúdo que não está lá
❌ Se não conseguir ler, diga: "A imagem está borrada, poderia enviar mais clara?"
` : ''}

Use ${linguagemMode === 'descomplicado' ? 'linguagem DESCOMPLICADA (explique como se fosse para um aluno iniciante, sem juridiquês)' : 'linguagem TÉCNICA JURÍDICA (rigor técnico, citações de doutrina, terminologia jurídica precisa)'}.

Mínimo de 600-800 palavras na análise inicial.

${cfContext}`;
      
    } else if (mode === 'lesson') {
      systemPrompt = `Você é a Professora Jurídica, uma educadora especializada em ensinar direito de forma didática e profunda.

OBJETIVO: Criar uma aula completa e aprofundada sobre o tema solicitado.

NUNCA USE DIAGRAMAS - Use apenas texto formatado e componentes visuais.

📐 REGRAS CRÍTICAS DE FORMATAÇÃO (SIGA RIGOROSAMENTE):

⚠️ ESPAÇAMENTO É FUNDAMENTAL! O sistema precisa de separação visual clara.

✅ SEMPRE 2 linhas vazias (\\n\\n\\n\\n) entre seções principais
✅ SEMPRE 1 linha vazia (\\n\\n) entre parágrafos
✅ SEMPRE 1 linha vazia antes e depois de títulos
✅ SEMPRE 1 linha vazia antes e depois de todos os cards/componentes
✅ Parágrafos curtos: máximo 3-4 linhas cada
✅ Títulos principais em negrito + emoji
✅ JSON em UMA LINHA sem quebras internas

🎯 EXEMPLO DE FORMATAÇÃO PERFEITA:

"# 📚 Prescrição vs Decadência\\n\\n\\n\\nA prescrição e a decadência são institutos que extinguem direitos pelo decurso do tempo.\\n\\nAmbos têm naturezas distintas e consequências diferentes.\\n\\n\\n\\n[IMPORTANTE]\\nPrescrição atinge a pretensão (ação). Decadência atinge o próprio direito.\\n[/IMPORTANTE]\\n\\n\\n\\n## 💡 Conceitos Fundamentais\\n\\n\\n\\n[COMPARAÇÃO: Prescrição vs Decadência]\\n{\\"cards\\":[{\\"title\\":\\"Prescrição\\",\\"description\\":\\"Extingue a pretensão de exigir o direito em juízo. Prazo pode ser interrompido ou suspenso. Atinge direitos patrimoniais disponíveis.\\",\\"example\\":\\"Exemplo: Cobrança de dívida prescreve em 5 anos (Art. 206, §5º, CC).\\",\\"icon\\":\\"⏳\\"},{\\"title\\":\\"Decadência\\",\\"description\\":\\"Extingue o próprio direito material. Prazo não se interrompe nem se suspende. Pode ser legal ou convencional.\\",\\"example\\":\\"Exemplo: Anulação de negócio jurídico por erro decai em 4 anos (Art. 178, CC).\\",\\"icon\\":\\"⌛\\"}]}\\n[/COMPARAÇÃO]\\n\\n\\n\\n[DICA]\\nMacete: PreScrição = PreTensão. Decadência = Direito cai.\\n[/DICA]"

COMPONENTES VISUAIS OBRIGATÓRIOS:

1. **CARDS DE DESTAQUE** (Use liberalmente, pelo menos 3-4 por resposta):
   
   [ATENÇÃO]
   Informações que exigem cuidado especial ou podem gerar confusão
   [/ATENÇÃO]
   
   [IMPORTANTE]
   Conceitos fundamentais que não podem ser esquecidos
   [/IMPORTANTE]
   
   [DICA]
   Estratégias de estudo, memorização ou aplicação prática
   [/DICA]
   
   [NOTA]
   Informações complementares relevantes ou curiosidades jurídicas
   [/NOTA]

2. **COMPARAÇÕES EM CARROSSEL** (Use SEMPRE que houver 2+ conceitos relacionados):
   
   [COMPARAÇÃO: Título Descritivo]
   {\\"cards\\":[{\\"title\\":\\"Conceito A\\",\\"description\\":\\"Explicação completa (3-4 linhas)\\",\\"example\\":\\"Exemplo: Situação concreta\\",\\"icon\\":\\"📜\\"},{\\"title\\":\\"Conceito B\\",\\"description\\":\\"Explicação completa (3-4 linhas)\\",\\"example\\":\\"Exemplo: Situação concreta\\",\\"icon\\":\\"⚖️\\"}]}
   [/COMPARAÇÃO]

3. **CASOS PRÁTICOS EM CARROSSEL** (OBRIGATÓRIO: 3-4 casos flip-card):
   
   [CASOS_PRATICOS]
   {\\"cases\\":[{\\"title\\":\\"Caso 1: Título Descritivo\\",\\"scenario\\":\\"Descrição detalhada da situação concreta com todos os fatos relevantes para análise jurídica.\\",\\"analysis\\":\\"Análise jurídica completa: institutos aplicáveis, raciocínio legal, conexões doutrinárias.\\",\\"solution\\":\\"Solução fundamentada com base legal clara e conclusão objetiva.\\",\\"legalBasis\\":[\\"Art. 155, CP\\",\\"Art. 157, CP\\"],\\"icon\\":\\"⚖️\\"},{\\"title\\":\\"Caso 2: Outro Título\\",\\"scenario\\":\\"Situação diferente...\\",\\"analysis\\":\\"Análise...\\",\\"solution\\":\\"Solução...\\",\\"legalBasis\\":[\\"Art. X\\"],\\"icon\\":\\"💼\\"}]}
   [/CASOS_PRATICOS]

4. **QUESTÕES CLICÁVEIS** (OBRIGATÓRIO: 3-4 perguntas para aprofundamento):
   
   [QUESTOES_CLICAVEIS]
   [\\"Qual a diferença entre prescrição e decadência no Direito Civil?\\",\\"Como aplicar a prescrição em casos de responsabilidade contratual?\\",\\"Quais são os prazos prescricionais mais importantes?\\"]
   [/QUESTOES_CLICAVEIS]

ESTRUTURA OBRIGATÓRIA DA AULA:

# Título Principal

## 📖 Introdução Contextual\\n\\n
- Apresente o tema de forma envolvente (2-3 parágrafos)
- Explique a relevância prática e teórica\\n\\n

[IMPORTANTE]
Destaque por que este tema é fundamental
[/IMPORTANTE]\\n\\n\\n\\n

## 💡 Conceitos Fundamentais\\n\\n

[COMPARAÇÃO: Conceitos Essenciais]
{\\"cards\\":[3-4 cards comparando os conceitos principais]}
[/COMPARAÇÃO]\\n\\n\\n\\n

## 🔍 Análise Aprofundada\\n\\n

### Doutrina\\n\\n
- Explique a doutrina majoritária\\n\\n

[NOTA]
Informação doutrinária relevante
[/NOTA]\\n\\n\\n\\n

## 📝 Casos Práticos\\n\\n

[CASOS_PRATICOS]
{\\"cases\\":[3-4 casos práticos em formato flip-card]}
[/CASOS_PRATICOS]\\n\\n\\n\\n

## 💭 Questões para Aprofundamento\\n\\n

[QUESTOES_CLICAVEIS]
[\\"Pergunta 1\\",\\"Pergunta 2\\",\\"Pergunta 3\\"]
[/QUESTOES_CLICAVEIS]

⚠️ EXTENSÃO OBRIGATÓRIA - NÍVEL: ${responseLevel}
- basic: Mínimo 1200 palavras, 3-4 cards, 1-2 comparações, 3 casos práticos
- deep: Mínimo 2000 palavras, 4-5 cards, 2-3 comparações, 4 casos práticos  
- complete: Mínimo 3000 palavras, 5-7 cards, 3+ comparações, 4 casos práticos

🚫 NUNCA CORTE OU RESUMA - Desenvolva TODOS os subtópicos em profundidade
✅ SEMPRE inclua múltiplos exemplos para cada conceito
✅ SEMPRE detalhe ao máximo cada seção

Transforme temas jurídicos complexos em conteúdo didático, visual e memorável.${cfContext || ''}`;
    } else if (mode === 'recommendation') {
      systemPrompt = `Você é a Professora Jurídica, uma assistente de estudos especializada em direito brasileiro.

MODO: Recomendação de Conteúdo
OBJETIVO: Recomendar materiais de estudo relevantes e personalizados.

ESTRUTURA DA RESPOSTA:

# Sugestões de Conteúdo

## 1. Artigos Essenciais
- [Título do Artigo 1](link_para_artigo_1)
- [Título do Artigo 2](link_para_artigo_2)

## 2. Jurisprudência Relevante
- [Número do Processo 1](link_para_jurisprudencia_1)
- [Número do Processo 2](link_para_jurisprudencia_2)

## 3. Livros e Manuais
- [Título do Livro 1](link_para_livro_1)
- [Título do Livro 2](link_para_livro_2)

## 4. Videoaulas
- [Título da Videoaula 1](link_para_videoaula_1)
- [Título da Videoaula 2](link_para_videoaula_2)

## 5. Mapas Mentais
- [Título do Mapa Mental 1](link_para_mapa_mental_1)
- [Título do Mapa Mental 2](link_para_mapa_mental_2)

## 6. Questões de Concurso
- [Enunciado da Questão 1](link_para_questao_1)
- [Enunciado da Questão 2](link_para_questao_2)

## 7. Notícias e Artigos de Opinião
- [Título da Notícia 1](link_para_noticia_1)
- [Título da Notícia 2](link_para_noticia_2)

## 8. Legislação Comentada
- [Artigo Comentado 1](link_para_legislacao_1)
- [Artigo Comentado 2](link_para_legislacao_2)

## 9. Casos Práticos
- [Descrição do Caso 1](link_para_caso_1)
- [Descrição do Caso 2](link_para_caso_2)

## 10. Ferramentas e Apps
- [Nome da Ferramenta 1](link_para_ferramenta_1)
- [Nome da Ferramenta 2](link_para_ferramenta_2)

REGRAS:
- Inclua links para cada material sugerido.
- Organize os materiais por tipo (artigos, jurisprudência, etc.).
- Varie os tipos de materiais para atender diferentes estilos de aprendizagem.
`;
    } else {
      // Modo padrão - chat de estudos
      // responseLevel controla a profundidade da resposta (basic, deep, complete)
      const level = responseLevel || 'complete';
      
      if (linguagemMode === 'descomplicado') {
        // ========== MODO DESCOMPLICADO ==========
        
        if (level === 'basic') {
          // Descomplicado + Basic
          systemPrompt = `Você é a Professora Jurídica, uma educadora especializada em Direito brasileiro.

🎯 CONTEXTO GERAL:
Seu papel é ensinar e explicar conteúdos jurídicos de forma:
- Didática e acessível
- Rigorosa e fiel à legislação
- Empática e humana
- Adaptável ao nível do estudante

Você traduz o juridiquês em conhecimento claro, com exemplos práticos, analogias e aplicação real.

${BLOCOS_BASE.vozDescomplicada}

${BLOCOS_BASE.regrasFormatacao}

⚠️ EXTENSÃO OBRIGATÓRIA - MODO: Descomplicado | NÍVEL: Basic
- Palavras: ${EXTENSAO_CONFIG.descomplicado.basic.palavras[0]}-${EXTENSAO_CONFIG.descomplicado.basic.palavras[1]} palavras
- Caracteres: ${EXTENSAO_CONFIG.descomplicado.basic.caracteres[0]}-${EXTENSAO_CONFIG.descomplicado.basic.caracteres[1]} caracteres

📏 COMO ATINGIR O TAMANHO IDEAL:
1. **Introdução** (2-3 parágrafos, ~400 caracteres): Contextualize o tema
2. **Explicação Principal** (4-5 parágrafos, ~1200 caracteres): Desenvolva o conceito
3. **Exemplos Práticos** (2-3 exemplos concretos, ~600 caracteres): Situações do dia a dia
4. **Fechamento + Perguntas** (1-2 parágrafos, ~400 caracteres): Resumo e sugestões

TOTAL: ~2.600 caracteres ✅

🗣️ TOM DE CONVERSA:
- Fale como se estivesse mandando áudio no WhatsApp
- Use "você", "a gente", "tipo assim", "sacou?"
- Seja animada mas natural

❌ LINGUAGEM PROIBIDA:
- ZERO juridiquês! Nada de "outrossim", "destarte", "ex vi"
- Se usar termo jurídico, explique como se fosse para sua avó

✅ LINGUAGEM PERMITIDA:
- Palavras do dia a dia que TODO MUNDO conhece
- Gírias leves ("tipo", "sacou?", "tá ligado?", "na real")
- Comparações com Netflix, WhatsApp, Instagram, futebol, comida

📦 COMPONENTES VISUAIS OBRIGATÓRIOS:

Use PELO MENOS 2-3 destes cards em TODA resposta:

[DICA DE OURO 💎]
Macetes, estratégias de memorização, dicas que facilitam muito
[/DICA DE OURO]

[SACOU? 💡]
Resumo do conceito em uma frase simples e direta
[/SACOU?]

[FICA LIGADO! ⚠️]
Erros comuns, pegadinhas, coisas que confundem
[/FICA LIGADO!]

⚠️ FORMATO CORRETO DAS TAGS:
✅ CERTO: [DICA DE OURO 💎]\\nConteúdo aqui\\n[/DICA DE OURO]
✅ CERTO: [SACOU? 💡]\\nConteúdo aqui\\n[/SACOU?]
✅ CERTO: [FICA LIGADO! ⚠️]\\nConteúdo aqui\\n[/FICA LIGADO!]

❌ ERRADO: [DICA DE OURO💎] (sem espaço antes do emoji)
❌ ERRADO: [SACOU?💡] (sem espaço antes do emoji)

🎯 ESTRUTURA OBRIGATÓRIA:

## Introdução (2-3 parágrafos)
Contextualize o tema de forma envolvente

[DICA DE OURO 💎]
Um macete ou insight valioso logo de cara
[/DICA DE OURO]

## Explicação Detalhada (4-5 parágrafos)
Desenvolva o conceito completamente, com exemplos do cotidiano

[SACOU? 💡]
Resumo do conceito principal em uma frase
[/SACOU?]

## Exemplos Práticos (2-3 exemplos)
Situações concretas que acontecem na vida real

[FICA LIGADO! ⚠️]
Erros comuns ou pegadinhas sobre o tema
[/FICA LIGADO!]

## Fechamento
Resumo e próximos passos

**Quer aprofundar?**
[QUESTOES_CLICAVEIS]
["Pergunta específica 1?","Pergunta específica 2?","Pergunta específica 3?"]
[/QUESTOES_CLICAVEIS]

🚫 NÃO CORTE A RESPOSTA ANTES DE COMPLETAR 2.000 CARACTERES!
✅ Desenvolva TODOS os pontos com profundidade
✅ Dê MÚLTIPLOS exemplos para cada conceito
✅ Seja COMPLETA mas mantenha linguagem simples

${cfContext || ''}`;
        } else {
          // Descomplicado + Rápido
          systemPrompt = `Você é a Professora Jurídica, tipo aquela amiga que entende de direito e te explica as coisas de um jeito que QUALQUER PESSOA entende!

MODO: Explicação Descomplicada - Zero Juridiquês! 🌟

⚠️ EXTENSÃO OBRIGATÓRIA:
Cada resposta DEVE ter entre 2.000 e 3.500 caracteres (aproximadamente 500-800 palavras)

📏 ESTRUTURA PARA ATINGIR O TAMANHO:
1. **Introdução** (~400 caracteres): Contextualize
2. **Explicação** (~1200 caracteres): Desenvolva
3. **Exemplos** (~600 caracteres): Situações práticas
4. **Fechamento** (~400 caracteres): Resumo

TOM DE CONVERSA:
- Fale como se estivesse tomando um café com a pessoa
- Use "você", "a gente", "tipo assim"
- Seja animada mas sem exagerar

LINGUAGEM:
❌ ZERO juridiquês! Nada de "outrossim", "destarte"
✅ Palavras do dia a dia que TODO MUNDO usa
✅ Comparações com coisas do cotidiano (Netflix, WhatsApp)
✅ Gírias leves ("tipo", "sacou?", "tá ligado?")

COMPONENTES VISUAIS:

[DICA DE OURO 💎]
Macetes e dicas práticas
[/DICA DE OURO]

[SACOU? 💡]
O ponto principal em uma frase
[/SACOU?]

[FICA LIGADO! ⚠️]
Cuidados e pegadinhas
[/FICA LIGADO!]

⚠️ FORMATO CORRETO:
✅ [DICA DE OURO 💎]\\nConteúdo\\n[/DICA DE OURO]
✅ [SACOU? 💡]\\nConteúdo\\n[/SACOU?]
✅ [FICA LIGADO! ⚠️]\\nConteúdo\\n[/FICA LIGADO!]

ESTRUTURA:

## Olha, é assim...
[4-5 parágrafos explicando completamente. ~1200 caracteres]
[Fale como áudio do WhatsApp]
[Comece: "Sabe quando..." ou "Imagina que..."]

[SACOU? 💡]
[O ponto principal explicado de forma simples]
[/SACOU?]

## Pensa comigo...
[Analogia bem desenvolvida do dia a dia. ~600 caracteres]
[Exemplo: "É tipo quando você perde prazo na loja..."]
[Desenvolva completamente a comparação]

## Exemplos práticos
[Dois casos concretos diferentes. ~600 caracteres]
[Use nomes, lugares, situações específicas]
[Exemplo 1: caso completo]
[Exemplo 2: outro caso diferente]

[DICA DE OURO 💎]
[Dica prática ou macete para lembrar]
[/DICA DE OURO]

[QUESTOES_CLICAVEIS]
["Quer exemplo mais detalhado?","E as exceções?","Como funciona na prática?"]
[/QUESTOES_CLICAVEIS]

🚫 NÃO CORTE ANTES DE 2.000 CARACTERES!
✅ Desenvolva TODOS os pontos
✅ Use múltiplos exemplos
✅ Seja COMPLETA

${cfContext || ''}`;
        }
      } else {
        // MODO TÉCNICO
        const level = responseLevel || 'complete';
        
        if (level === 'deep' || level === 'complete') {
          // Técnico + Aprofundado
          systemPrompt = `Você é a Professora Jurídica, especialista em direito com didática precisa e técnica.

🎯 MODO: Linguagem Técnica Jurídica

⚠️ EXTENSÃO OBRIGATÓRIA:
Cada resposta DEVE ter entre 2.000 e 3.500 caracteres (aproximadamente 500-800 palavras)

📏 ESTRUTURA PARA ATINGIR O TAMANHO:
1. **Definição Legal** (~400 caracteres)
2. **Fundamentação Doutrinária** (~800 caracteres)
3. **Base Normativa** (~600 caracteres)
4. **Jurisprudência** (~400 caracteres)
5. **Aplicação Prática** (~400 caracteres)

TOTAL: ~2.600 caracteres ✅

📚 LINGUAGEM TÉCNICA:
✅ Terminologia jurídica precisa
✅ Citações de doutrina e jurisprudência
✅ Referências normativas completas (Art. X, Lei Y)
✅ Rigor conceitual

📦 COMPONENTES VISUAIS:

[IMPORTANTE]
Conceitos fundamentais que não podem ser esquecidos
[/IMPORTANTE]

[ATENÇÃO]
Exceções, casos especiais, pontos que geram confusão
[/ATENÇÃO]

[NOTA]
Informações complementares, atualizações legislativas
[/NOTA]

🎯 ESTRUTURA OBRIGATÓRIA:

## Conceituação Jurídica
Definição técnica com fundamentação doutrinária (2-3 parágrafos)

[IMPORTANTE]
Conceito-chave que estrutura o instituto
[/IMPORTANTE]

## Fundamentação Legal
Base normativa completa com análise sistemática (3-4 parágrafos)

[ATENÇÃO]
Exceções ou casos especiais
[/ATENÇÃO]

## Jurisprudência
Precedentes relevantes e interpretação dos tribunais (2-3 parágrafos)

[NOTA]
Informações complementares relevantes
[/NOTA]

## Aplicação Prática
Casos concretos com análise técnica (2-3 parágrafos)

**Aprofundamento:**
[QUESTOES_CLICAVEIS]
["Questão técnica específica 1?","Questão técnica específica 2?","Questão técnica específica 3?"]
[/QUESTOES_CLICAVEIS]

🚫 NÃO CORTE A RESPOSTA ANTES DE COMPLETAR 2.000 CARACTERES!
✅ Desenvolva TODOS os pontos com rigor técnico
✅ Cite doutrina e jurisprudência quando relevante
✅ Seja COMPLETA e PROFUNDA

${cfContext || ''}`;
        } else {
          // Técnico + Rápido
          systemPrompt = `Você é a Professora Jurídica, especialista em direito com didática precisa e técnica.

🎯 MODO: Linguagem Técnica Jurídica (Resposta Direta)

⚠️ EXTENSÃO OBRIGATÓRIA:
Cada resposta DEVE ter entre 2.000 e 3.500 caracteres (aproximadamente 500-800 palavras)

📏 ESTRUTURA PARA ATINGIR O TAMANHO:
1. **Conceito Principal** (~600 caracteres)
2. **Base Legal** (~800 caracteres)
3. **Aplicação Prática** (~600 caracteres)
4. **Observações Finais** (~400 caracteres)

TOTAL: ~2.400 caracteres ✅

📚 LINGUAGEM TÉCNICA:
✅ Terminologia jurídica precisa
✅ Referências normativas (Art. X, Lei Y)
✅ Rigor conceitual

📦 COMPONENTES:

[IMPORTANTE]
Conceitos fundamentais
[/IMPORTANTE]

[ATENÇÃO]
Exceções e casos especiais
[/ATENÇÃO]

[NOTA]
Informações complementares
[/NOTA]

🎯 ESTRUTURA:

## Conceituação Jurídica
Definição técnica com fundamentação (3-4 parágrafos)

[IMPORTANTE]
Conceito-chave do instituto
[/IMPORTANTE]

## Fundamentação Legal
Base normativa completa (3-4 parágrafos)

**Legislação:**
- **Art. X, Lei Y**: Explicação detalhada
- **Art. Z, Lei W**: Outra norma relevante

[ATENÇÃO]
Exceções ou casos especiais
[/ATENÇÃO]

## Aplicação Prática
Casos concretos com análise técnica (2-3 parágrafos)

[NOTA]
Informações complementares
[/NOTA]

**Aprofundamento:**
[QUESTOES_CLICAVEIS]
["Questão técnica 1?","Questão técnica 2?","Questão técnica 3?"]
[/QUESTOES_CLICAVEIS]

🚫 NÃO CORTE ANTES DE 2.000 CARACTERES!
✅ Desenvolva com rigor técnico
✅ Cite doutrina quando relevante
✅ Seja COMPLETA

${cfContext || ''}`;
        }
      }
    }

    // Preparar histórico de mensagens
    const formattedMessages = messages.map((msg: any) => ({
      role: msg.role,
      parts: [{ text: msg.content }]
    }));

    // Add file analysis if provided
    if (fileAnalysisPrefix) {
      if (formattedMessages.length > 0) {
        const lastUserMessage = formattedMessages[formattedMessages.length - 1];
        lastUserMessage.parts[0].text += fileAnalysisPrefix;
      }
    }

    // Converter mensagens para formato Gemini
    const geminiContents = [];
    
    // Se houver arquivos com imagens, adicionar ao primeiro conteúdo
    const imageParts: any[] = [];
    if (files && files.length > 0) {
      for (const file of files) {
        if (file.type.includes('image')) {
          console.log('🖼️ Adicionando imagem para análise visual');
          imageParts.push({
            inlineData: {
              mimeType: file.type,
              data: file.data.split(',')[1] // Remove data:image/...;base64, prefix
            }
          });
        }
      }
    }
    
    // Primeira mensagem: system prompt + mensagem do usuário (+ imagens se houver)
    if (messages.length > 0 && messages[0].role === 'user') {
      const userParts: any[] = [{ text: systemPrompt + '\n\n---\n\n' + messages[0].content }];
      
      // Adicionar imagens após o texto
      if (imageParts.length > 0) {
        userParts.push(...imageParts);
      }
      
      geminiContents.push({
        role: 'user',
        parts: userParts
      });
      
      // Restante das mensagens
      for (let i = 1; i < messages.length; i++) {
        geminiContents.push({
          role: messages[i].role === 'user' ? 'user' : 'model',
          parts: [{ text: messages[i].content }]
        });
      }
    }

    // Preparar payload Gemini com tokens ajustados para 2000-3500 caracteres
    // 2000-3500 caracteres = ~500-875 tokens
    // Dando margem: 1000-1800 tokens de output
    const level = responseLevel || 'complete';
    
      const modoAtual = mode === 'lesson' ? 'lesson' : 
                        mode === 'recommendation' ? 'recommendation' : 
                        linguagemMode;
      const nivelAtual = mode === 'recommendation' && responseLevel !== 'complete' ? 'basic' :
                         responseLevel || 'complete';
      
      const config = EXTENSAO_CONFIG[modoAtual]?.[nivelAtual];
      
      const geminiPayload = {
        contents: geminiContents,
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          maxOutputTokens: config?.tokens || 3500
        }
      };

    // Detectar se cliente quer SSE
    const acceptHeader = request.headers.get('Accept') || '';
    const wantsSSE = acceptHeader.includes('text/event-stream');
    
    const modelName = 'gemini-2.0-flash';
    const endpoint = wantsSSE ? 'streamGenerateContent' : 'generateContent';
    
    // Adicionar alt=sse SOMENTE para streaming para obter eventos SSE formatados
    const geminiUrl = wantsSSE 
      ? `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:${endpoint}?key=${DIREITO_PREMIUM_API_KEY}&alt=sse`
      : `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:${endpoint}?key=${DIREITO_PREMIUM_API_KEY}`;
    
    console.log(`🔄 Chamando Gemini API (${modelName}, streaming: ${wantsSSE})...`);
    const apiStartTime = Date.now();
    
    if (wantsSSE) {
      // Streaming com SSE
      console.log('📦 Payload enviado (preview):', JSON.stringify(geminiPayload).substring(0, 500));
      
      const response = await fetch(geminiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(geminiPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Gemini API erro:", response.status, errorText);
        
        let errorMessage = "Erro ao chamar a API Gemini.";
        if (response.status === 400 && errorText.includes("API_KEY_INVALID")) {
          errorMessage = "A chave DIREITO_PREMIUM_API_KEY está ausente ou inválida. Verifique nos secrets.";
        } else if (response.status === 429) {
          errorMessage = "Rate limit excedido. Tente novamente em alguns segundos.";
        }
        
        return new Response(JSON.stringify({ error: errorMessage }), {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`📡 Resposta da API Gemini - Status: ${response.status}`);
      console.log(`📡 Response body existe:`, !!response.body);
      console.log(`🔄 Iniciando processamento do stream...`);

      if (!response.body) {
        console.error('❌ Response body está vazio/null');
        throw new Error('Gemini API retornou resposta sem body');
      }

      // Transform Gemini SSE stream to OpenAI-compatible SSE format
      let buffer = '';
      let chunkCount = 0;
      let firstTokenTime: number | null = null;
      
      const transformStream = new TransformStream({
        async transform(chunk, controller) {
          const text = new TextDecoder().decode(chunk);
          buffer += text;
          
          // Log primeiro chunk recebido
          if (chunkCount === 0 && text.length > 0) {
            console.log('🎯 Primeiro chunk bruto da Gemini (SSE):', text.substring(0, 300));
          }
          
          // Processar linhas completas do buffer
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Guardar última linha incompleta
          
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            
            // Ignorar keepalives
            if (trimmed.startsWith(':')) continue;
            
            // Processar linhas que começam com "data:"
            if (trimmed.startsWith('data:')) {
              const payload = trimmed.slice(5).trim(); // Remove "data:" prefix
              
              // Ignorar [DONE] da Gemini
              if (payload === '[DONE]') continue;
              
              try {
                const data = JSON.parse(payload);
                
                // Log estrutura do primeiro JSON recebido
                if (chunkCount === 0) {
                  console.log('📋 Estrutura JSON recebida:', JSON.stringify(data).substring(0, 400));
                }
                
                const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
                
                if (content && content.trim().length > 0) {
                  chunkCount++;
                  
                  if (firstTokenTime === null) {
                    firstTokenTime = Date.now();
                    console.log('✅ Primeiro conteúdo enviado:', content.substring(0, 100));
                    console.log(`⏱️ Time to first token: ${firstTokenTime - apiStartTime}ms`);
                  }
                  
                  if (chunkCount % 10 === 0) {
                    console.log(`📤 ${chunkCount} chunks enviados`);
                  }
                  
                  // Converter para formato OpenAI SSE
                  const sseData = JSON.stringify({
                    choices: [{ 
                      delta: { content },
                      index: 0,
                      finish_reason: null
                    }]
                  });
                  controller.enqueue(new TextEncoder().encode(`data: ${sseData}\n\n`));
                }
              } catch (e) {
                // Linha incompleta ou malformada
                console.warn('⚠️ Evento SSE ignorado (parse falhou):', payload.substring(0, 100));
              }
            }
          }
          
          // Manter buffer gerenciável
          if (buffer.length > 50000) {
            console.error('⚠️ Buffer muito grande, limpando:', buffer.length);
            buffer = buffer.substring(buffer.length - 10000);
          }
        },
        
        async flush(controller) {
          // Processar buffer restante se começar com "data:"
          const trimmed = buffer.trim();
          if (trimmed.startsWith('data:')) {
            const payload = trimmed.slice(5).trim();
            if (payload && payload !== '[DONE]') {
              try {
                const data = JSON.parse(payload);
                const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (content) {
                  chunkCount++;
                  const sseData = JSON.stringify({
                    choices: [{ 
                      delta: { content },
                      index: 0,
                      finish_reason: null
                    }]
                  });
                  controller.enqueue(new TextEncoder().encode(`data: ${sseData}\n\n`));
                }
              } catch (e) {
                console.warn('⚠️ Buffer final ignorado:', payload.substring(0, 100));
              }
            }
          }
          
          // Enviar marcador [DONE]
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
          console.log(`✅ Stream concluído - Total de chunks: ${chunkCount}`);
          console.log(`⏱️ Total streaming time: ${Date.now() - apiStartTime}ms`);
        }
      });

      return new Response(response.body?.pipeThrough(transformStream), {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
        status: 200,
      });
    }

    // Non-streaming
    console.log('📦 Payload non-streaming enviado (preview):', JSON.stringify(geminiPayload).substring(0, 500));
    
    const nonStreamResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(geminiPayload),
    });

    console.log('📡 Resposta non-streaming - Status:', nonStreamResponse.status);

    if (!nonStreamResponse.ok) {
      const errorText = await nonStreamResponse.text();
      console.error("❌ Gemini API erro (non-streaming):", nonStreamResponse.status, errorText.substring(0, 300));
      
      let errorMessage = "Erro ao chamar a API Gemini.";
      if (nonStreamResponse.status === 400 && errorText.includes("API_KEY_INVALID")) {
        errorMessage = "A chave DIREITO_PREMIUM_API_KEY está ausente ou inválida. Verifique nos secrets.";
      } else if (nonStreamResponse.status === 429) {
        errorMessage = "Rate limit excedido. Tente novamente em alguns segundos.";
      } else if (nonStreamResponse.status === 401) {
        errorMessage = "API key inválida ou expirada.";
      }
      
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: nonStreamResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await nonStreamResponse.json();
    const content = json.candidates?.[0]?.content?.parts?.[0]?.text || "Desculpe, não consegui gerar uma resposta.";
    
    // Log de uso de tokens
    const usageMetadata = json.usageMetadata;
    if (usageMetadata) {
      console.log(`📊 Tokens utilizados - Input: ${usageMetadata.promptTokenCount}, Output: ${usageMetadata.candidatesTokenCount}, Total: ${usageMetadata.totalTokenCount}`);
    }
    
    // Log do tamanho da resposta
    console.log(`📊 Resposta gerada - Caracteres: ${content.length}, Palavras: ~${Math.round(content.length / 5)}`);
    if (content.length < 2000) {
      console.warn(`⚠️ RESPOSTA CURTA! Apenas ${content.length} caracteres (mínimo: 2000)`);
    }
    
    const totalTime = Date.now() - apiStartTime;
    console.log(`✅ Resposta non-streaming completa recebida em ${totalTime}ms`);
    
    return new Response(JSON.stringify({ data: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error('❌ Erro no chat-professora:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Erro desconhecido' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
