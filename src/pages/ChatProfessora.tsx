import { useState, useRef, useEffect } from "react";
import { Send, X, Brain, ArrowLeft, Image, FileText, BookOpen, Scale, GraduationCap, MessageCircle, Lightbulb, Video, Book, ExternalLink, Play, ArrowDown, Trash2 } from "lucide-react";
import { VLibrasButton } from "@/components/VLibrasButton";
import { HighlightedBox } from "@/components/chat/HighlightedBox";
import { ComparisonCarousel } from "@/components/chat/ComparisonCarousel";
import { PracticalCasesCarousel } from "@/components/chat/PracticalCasesCarousel";
import { InfographicTimeline } from "@/components/chat/InfographicTimeline";
import { StatisticsCard } from "@/components/chat/StatisticsCard";
import { LegalStatistics } from "@/components/chat/LegalStatistics";
import { ProcessFlow } from "@/components/chat/ProcessFlow";
import { MarkdownTabs } from "@/components/chat/MarkdownTabs";
import { MarkdownAccordion } from "@/components/chat/MarkdownAccordion";
import { MarkdownSlides } from "@/components/chat/MarkdownSlides";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useNavigate, useSearchParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast as sonnerToast } from "sonner";
import { MessageActionsChat } from "@/components/MessageActionsChat";
import ChatFlashcardsModal from "@/components/ChatFlashcardsModal";
import ChatQuestoesModal from "@/components/ChatQuestoesModal";
import { ThinkingIndicator } from "@/components/chat/ThinkingIndicator";
import { getDocument, GlobalWorkerOptions, version as pdfjsVersion } from "pdfjs-dist";
import { motion } from "framer-motion";
import { SmartLoadingIndicator } from "@/components/chat/SmartLoadingIndicator";
interface Message {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}
interface UploadedFile {
  name: string;
  type: string;
  data: string;
}
type ChatMode = "study" | "realcase" | "recommendation" | "psychologist" | "tcc" | "refutacao";
const ChatProfessora = () => {
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get("mode") as ChatMode || "study";
  const [mode, setMode] = useState<ChatMode>(initialMode);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingLesson, setIsCreatingLesson] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [showFlashcardsModal, setShowFlashcardsModal] = useState(false);
  const [showQuestoesModal, setShowQuestoesModal] = useState(false);
  const [currentContent, setCurrentContent] = useState("");
  const [responseLevel, setResponseLevel] = useState<'basic' | 'complete' | 'deep'>('deep');
  const [fastMode, setFastMode] = useState(false); // Modo aprofundado por padrão
  const [linguagemMode, setLinguagemMode] = useState<'descomplicado' | 'tecnico'>('descomplicado');
  const [thinkingStartTime, setThinkingStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [displayedContent, setDisplayedContent] = useState<Record<number, string>>({});

  // Configurar worker do PDF.js uma vez
  useEffect(() => {
    try {
      // Usa CDN confiável para o worker do pdfjs
      // Evita erros de worker no Vite
      // @ts-ignore
      GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsVersion}/pdf.worker.min.js`;
    } catch (e) {
      console.warn("Falha ao configurar worker do PDF.js", e);
    }
  }, []);
  const [userScrolledUp, setUserScrolledUp] = useState(false);

  // Timer para elapsed time do thinking indicator
  useEffect(() => {
    if (!thinkingStartTime || !isLoading) {
      setElapsedTime(0);
      return;
    }
    const interval = setInterval(() => {
      setElapsedTime(Date.now() - thinkingStartTime);
    }, 100);
    return () => clearInterval(interval);
  }, [thinkingStartTime, isLoading]);

  // Detectar se usuário rolou para cima
  useEffect(() => {
    const scrollElement = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollElement) return;
    const handleScroll = () => {
      const {
        scrollTop,
        scrollHeight,
        clientHeight
      } = scrollElement;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setUserScrolledUp(!isNearBottom);
    };
    scrollElement.addEventListener('scroll', handleScroll);
    return () => scrollElement.removeEventListener('scroll', handleScroll);
  }, [messages]);

  // Auto-scroll APENAS quando usuário ENVIA mensagem
  // Não fazer scroll quando resposta termina - deixar usuário onde está
  const scrollToBottom = () => {
    if (scrollRef.current) {
      const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTo({
          top: scrollElement.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
    setUserScrolledUp(false);
  };
  const handleModeChange = (newMode: ChatMode) => {
    setMode(newMode);
    setMessages([]);
    setInput("");
    setUploadedFiles([]);
  };
  const handleFileSelect = async (file: File, expectedType: "image" | "pdf") => {
    if (expectedType === "image" && !file.type.includes("image/")) {
      toast({
        title: "Tipo de arquivo incorreto",
        description: "Por favor, envie apenas imagens",
        variant: "destructive"
      });
      return;
    }
    if (expectedType === "pdf" && file.type !== "application/pdf") {
      toast({
        title: "Tipo de arquivo incorreto",
        description: "Por favor, envie apenas PDFs",
        variant: "destructive"
      });
      return;
    }
    try {
      // Converter para base64 e manter na UI
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = event => resolve(event.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const uploaded: UploadedFile = {
        name: file.name,
        type: file.type,
        data: base64
      };
      
      // Adicionar mensagem visual do usuário no chat
      const userMessage: Message = {
        role: "user",
        content: `📎 ${expectedType === "image" ? "Imagem" : "PDF"} anexada: ${file.name}`
      };
      setMessages(prev => [...prev, userMessage]);
      setUploadedFiles(prev => [...prev, uploaded]);

      // Toast informando que está analisando
      const fileType = expectedType === "image" ? "imagem" : "documento";
      sonnerToast.info(`Analisando ${fileType}...`, {
        description: "A Professora está lendo o conteúdo"
      });

      // Para PDFs, extrair texto
      let extractedPdfText = "";
      if (expectedType === "pdf") {
        extractedPdfText = await extractPdfText(file);
      }

      // Enviar automaticamente com modo 'analyze'
      setTimeout(() => {
        streamResponse("", 'analyze', [uploaded], extractedPdfText);
      }, 500);
      
    } catch (e) {
      console.error('Falha ao processar arquivo', e);
      toast({
        title: 'Erro ao processar arquivo',
        description: 'Tente novamente com outro arquivo.',
        variant: 'destructive'
      });
    }
  };
  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Extrair texto de um PDF usando pdfjs-dist
  const extractPdfText = async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await getDocument({
        data: arrayBuffer
      }).promise;
      const maxPages = Math.min(pdf.numPages, 50); // Aumentado para 50 páginas
      let fullText = '';
      console.log(`📄 Extraindo texto de PDF: ${pdf.numPages} páginas (processando até ${maxPages})`);
      
      for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((it: any) => 'str' in it ? it.str : '').join(' ');
        fullText += `\n\n[Página ${i}]\n${pageText}`;
      }
      
      const charCount = fullText.trim().length;
      console.log(`✅ PDF extraído: ${maxPages} páginas, ${charCount} caracteres`);
      
      if (charCount < 100) {
        console.warn('⚠️ PDF extraiu poucos caracteres - pode estar vazio ou com imagens');
      }
      
      return fullText.trim();
    } catch (e) {
      console.error('❌ Erro ao extrair texto do PDF:', e);
      return 'Não foi possível extrair o texto deste PDF. O arquivo pode estar protegido ou corrompido. Por favor, tente outro arquivo.';
    }
  };

  // Função para buscar materiais de estudo de forma visual
  const buscarMateriaisVisuais = async (query: string, tipo: 'livros' | 'videos' | 'todos') => {
    setIsLoading(true);
    const userMessage: Message = {
      role: 'user',
      content: query
    };
    setMessages([...messages, userMessage]);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('buscar-materiais-estudo', {
        body: {
          query,
          tipo
        }
      });
      if (error) throw error;

      // Criar mensagem do assistente com os resultados
      const assistantMessage: Message = {
        role: 'assistant',
        content: JSON.stringify({
          tipo: 'materiais_visuais',
          dados: data
        })
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Erro ao buscar materiais:', error);
      toast({
        title: "Erro",
        description: "Não foi possível buscar os materiais. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  const streamResponse = async (userMessage: string, streamMode: 'chat' | 'lesson' | 'analyze' = 'chat', filesOverride?: UploadedFile[], extractedText?: string, deepMode: boolean = false, responseLevelOverride?: 'basic' | 'complete' | 'deep') => {
    if (streamMode === 'chat' || streamMode === 'analyze') {
      setIsLoading(true);
      setThinkingStartTime(Date.now());
      setElapsedTime(0);
    } else {
      setIsCreatingLesson(true);
    }
    const newUserMessage: Message = {
      role: 'user',
      content: userMessage
    };
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);

    // NÃO criar mensagem vazia aqui - vamos criar só quando primeiro token chegar
    // Isso remove o "Pensando na melhor resposta..."

    // Watchdog de inatividade adaptativo
    const requestStartTime = Date.now();
    const firstTokenTimeoutMs = 40000; // 40s para primeiro token (Gemini 2.0 Flash pode demorar)
    const inactivityTimeoutMs = 10000; // 10s entre chunks
    let lastChunkTime = Date.now();
    let firstTokenReceived = false;
    const watchdogInterval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - requestStartTime;
      const timeSinceLastChunk = now - lastChunkTime;
      if (!firstTokenReceived && elapsed > firstTokenTimeoutMs) {
        console.error(`⏱️ Watchdog: Nenhum token recebido em ${elapsed}ms (limite: ${firstTokenTimeoutMs}ms)`);
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          clearInterval(watchdogInterval);
        }
      } else if (firstTokenReceived && timeSinceLastChunk > inactivityTimeoutMs) {
        console.error(`⏱️ Watchdog: Sem chunks há ${timeSinceLastChunk}ms (limite: ${inactivityTimeoutMs}ms)`);
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          clearInterval(watchdogInterval);
        }
      }
    }, 1000); // Verificar a cada segundo

    try {
      abortControllerRef.current = new AbortController();
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      const response = await fetch(`https://izspjvegxdfgkgibpyst.supabase.co/functions/v1/chat-professora`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          // Habilitar streaming SSE
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6c3BqdmVneGRmZ2tnaWJweXN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxNDA2MTQsImV4cCI6MjA2MDcxNjYxNH0.LwTMbDH-S0mBoiIxfrSH2BpUMA7r4upOWWAb5a_If0Y',
          'Authorization': `Bearer ${session?.access_token || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6c3BqdmVneGRmZ2tnaWJweXN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxNDA2MTQsImV4cCI6MjA2MDcxNjYxNH0.LwTMbDH-S0mBoiIxfrSH2BpUMA7r4upOWWAb5a_If0Y'}`
        },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({
            role: m.role,
            content: m.content
          })),
          files: filesOverride ?? uploadedFiles,
          mode: streamMode === 'analyze' ? 'analyze' : mode,
          extractedText: extractedText || undefined,
          deepMode: deepMode,
          responseLevel: responseLevelOverride || (fastMode ? 'basic' : responseLevel),
          linguagemMode: linguagemMode
        }),
        signal: abortControllerRef.current.signal
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Edge function error:', response.status, errorText);
        if (response.status === 401) {
          throw new Error('Erro de autenticação. Por favor, tente novamente.');
        }
        if (response.status === 402) {
          throw new Error('Créditos insuficientes. Por favor, adicione créditos à sua conta.');
        }
        if (response.status === 429) {
          throw new Error('A quota diária da API foi excedida. Por favor, tente novamente amanhã ou contate o suporte.');
        }
        throw new Error(`Erro ao processar sua pergunta (${response.status})`);
      }
      const contentType = response.headers.get('Content-Type') || response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        console.log('📦 Resposta JSON recebida');
        const result = await response.json();
        const text = result?.data || result?.content || result?.generatedText || '';
        console.log('📝 Conteúdo extraído:', text.substring(0, 200) + '...');
        console.log('🔍 Detectando componentes especiais...');

        // Verificar se tem componentes especiais
        const hasComparison = /\[COMPARAÇÃO/.test(text);
        const hasInfographic = /\[INFOGRÁFICO/.test(text);
        const hasStats = /\[ESTATÍSTICAS/.test(text);
        console.log('🎨 Componentes detectados:', {
          hasComparison,
          hasInfographic,
          hasStats
        });
        setMessages(prev => {
          const next = [...prev];
          // Criar mensagem se não existir, ou atualizar se já existe
          if (next.length > 0 && next[next.length - 1].role === 'assistant') {
            next[next.length - 1] = {
              ...next[next.length - 1],
              content: text,
              isStreaming: false
            };
          } else {
            next.push({
              role: 'assistant',
              content: text,
              isStreaming: false
            });
          }
          return next;
        });
        console.log('✅ Mensagem do assistente criada/atualizada');
        setUploadedFiles([]);
        if (imageInputRef.current) imageInputRef.current.value = '';
        if (pdfInputRef.current) pdfInputRef.current.value = '';
        setThinkingStartTime(null);
        clearInterval(watchdogInterval);
        setIsLoading(false);
        return;
      }
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';
      let buffer = '';
      let chunksReceived = 0;
      if (reader) {
        console.log('📖 Frontend: Iniciando leitura do stream');
        while (true) {
          const {
            done,
            value
          } = await reader.read();
          if (done) {
            console.log(`✅ Frontend: Stream concluído (${chunksReceived} chunks recebidos, ${accumulatedText.length} caracteres)`);
            break;
          }
          chunksReceived++;
          buffer += decoder.decode(value, {
            stream: true
          });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            // Ignore SSE comments/keepalive like ": ping"
            if (trimmed.startsWith(':')) continue;
            let payloadStr = trimmed;
            if (trimmed.startsWith('data:')) {
              payloadStr = trimmed.slice(5).trim();
              if (payloadStr === '[DONE]') {
                console.log('✅ Frontend: Recebeu [DONE]');
                continue;
              }
            }
            try {
              const parsed = JSON.parse(payloadStr);
              const content = parsed?.choices?.[0]?.delta?.content ?? parsed?.content ?? parsed?.data?.content ?? parsed?.message?.content ?? parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
              if (content) {
                // Log do primeiro token e resetar watchdog
                if (!firstTokenReceived) {
                  const latency = Date.now() - requestStartTime;
                  console.log(`🎉 Frontend: Primeiro token recebido após ${latency}ms`);
                  firstTokenReceived = true;

                  // Criar mensagem assistente SOMENTE quando primeiro token chegar
                  setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: '',
                    isStreaming: true
                  }]);
                }
                lastChunkTime = Date.now(); // Resetar watchdog

                accumulatedText += content;

                // 🔥 FORMATAÇÃO EM TEMPO REAL - MELHORADA
                let formattedText = accumulatedText;

                // 1. Adicionar quebra dupla após títulos (# ou ##) se ainda não tiver
                formattedText = formattedText.replace(/(^|\n)(#{1,2}\s[^\n]+)\n(?!\n)/gm, '$1$2\n\n');

                // 2. Adicionar quebra dupla antes de títulos se não tiver
                formattedText = formattedText.replace(/([^\n])\n(#{1,3}\s)/g, '$1\n\n$2');

                // 3. Adicionar quebra dupla entre parágrafos após pontuação
                formattedText = formattedText.replace(/([.!?])\n(?!\n)(?![#\-*\d\[])/g, '$1\n\n');

                // 4. NOVO: Quebras após qualquer linha seguida de linha começando com maiúscula ou emoji
                formattedText = formattedText.replace(/([^\n])\n(?!\n)(?=[A-ZÀ-Ú💡🤔📚⚖️✅❌⚠️🎯])/g, '$1\n\n');

                // 5. NOVO: Quebras após linhas longas (>60 chars) para melhorar legibilidade durante streaming
                formattedText = formattedText.replace(/([^\n]{60,})\n(?!\n)(?![#\-*\d\[])/g, '$1\n\n');

                // 6. Garantir quebra dupla antes de cards especiais
                formattedText = formattedText.replace(/([^\n])\n(?=\[(DICA|SACOU|IMPORTANTE|ATENÇÃO))/g, '$1\n\n');

                // 7. Garantir quebra dupla após listas
                formattedText = formattedText.replace(/(\n[-*]\s[^\n]+)\n(?!\n)(?![-*])/g, '$1\n\n');

                // Atualizar UI IMEDIATAMENTE a cada chunk com animação
                setMessages(prev => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1] = {
                    role: 'assistant',
                    content: formattedText,
                    isStreaming: true
                  };
                  return newMessages;
                });
              }
            } catch (parseError) {
              // Fallback: append raw text when not JSON (non-SSE providers)
              console.warn('⚠️ Frontend: Não foi possível parsear como JSON, tentando texto raw');
              console.warn('⚠️ Frontend: Erro de parse:', parseError);
              console.warn('⚠️ Frontend: Payload:', payloadStr);
              accumulatedText += payloadStr;
              setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = {
                  role: 'assistant',
                  content: accumulatedText,
                  isStreaming: true
                };
                return newMessages;
              });
            }
          }
        }

        // Parar watchdog
        clearInterval(watchdogInterval);

        // Verificar se recebeu algum conteúdo - se não, tentar fallback não-streaming
        if (!accumulatedText) {
          console.error('❌ Frontend: Stream vazio, tentando fallback não-streaming...');
          try {
            const fallbackResp = await fetch(`https://izspjvegxdfgkgibpyst.supabase.co/functions/v1/chat-professora`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6c3BqdmVneGRmZ2tnaWJweXN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxNDA2MTQsImV4cCI6MjA2MDcxNjYxNH0.LwTMbDH-S0mBoiIxfrSH2BpUMA7r4upOWWAb5a_If0Y',
                'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6c3BqdmVneGRmZ2tnaWJweXN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxNDA2MTQsImV4cCI6MjA2MDcxNjYxNH0.LwTMbDH-S0mBoiIxfrSH2BpUMA7r4upOWWAb5a_If0Y'}`
              },
              body: JSON.stringify({
                messages: updatedMessages.map(m => ({
                  role: m.role,
                  content: m.content
                })),
                files: filesOverride ?? uploadedFiles,
                mode: mode,
                extractedText: extractedText || undefined,
                deepMode: deepMode,
                responseLevel: responseLevelOverride || responseLevel
              })
            });
            if (fallbackResp.ok) {
              const result = await fallbackResp.json();
              const text = result?.data || result?.content || result?.generatedText || '';
              if (text) {
                console.log(`✅ Frontend: Fallback bem-sucedido (${text.length} caracteres)`);

                // Criar mensagem se ainda não foi criada (quando nenhum token foi recebido)
                setMessages(prev => {
                  const next = [...prev];
                  // Verificar se já existe uma mensagem do assistant
                  if (next[next.length - 1]?.role === 'assistant') {
                    // Atualizar mensagem existente
                    next[next.length - 1] = {
                      role: 'assistant',
                      content: text,
                      isStreaming: false
                    };
                  } else {
                    // Criar nova mensagem
                    next.push({
                      role: 'assistant',
                      content: text,
                      isStreaming: false
                    });
                  }
                  return next;
                });
                setUploadedFiles([]);
                if (imageInputRef.current) imageInputRef.current.value = '';
                if (pdfInputRef.current) pdfInputRef.current.value = '';
                setThinkingStartTime(null);
                sonnerToast.info('Resposta recebida sem streaming', {
                  description: 'A resposta foi obtida com sucesso.'
                });
                return; // Sucesso, sair da função
              }
            }
          } catch (fallbackError) {
            console.error('❌ Frontend: Fallback também falhou:', fallbackError);
          }

          // Se chegou aqui, nem stream nem fallback funcionaram
          throw new Error('A Professora não está respondendo. Tente novamente.');
        }

        // Log final de performance
        const totalTime = Date.now() - requestStartTime;
        const messageSize = accumulatedText.length;
        console.log(`✅ Frontend: Resposta completa em ${totalTime}ms (${chunksReceived} chunks, ${messageSize} caracteres)`);
      }

      // Finalizar streaming
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          role: 'assistant',
          content: accumulatedText,
          isStreaming: false
        };
        return newMessages;
      });
      setUploadedFiles([]);
      if (imageInputRef.current) imageInputRef.current.value = '';
      if (pdfInputRef.current) pdfInputRef.current.value = '';
      setThinkingStartTime(null);
      clearInterval(watchdogInterval);
    } catch (error: any) {
      const totalTime = Date.now() - requestStartTime;
      console.error(`❌ Frontend: Erro no streaming após ${totalTime}ms:`, error);
      console.error('❌ Frontend: Stack:', error?.stack);
      clearInterval(watchdogInterval);

      // Preservar resposta parcial se houver conteúdo
      if (error.name === 'AbortError') {
        console.log(`⚠️ Frontend: Request cancelado após ${totalTime}ms`);

        // Buscar último conteúdo acumulado da última mensagem
        setMessages(prev => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg?.role === 'assistant' && lastMsg.content && lastMsg.content.length > 10) {
            // Há conteúdo parcial: manter e marcar como finalizado
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = {
              ...lastMsg,
              isStreaming: false
            };
            sonnerToast.warning('Resposta parcial. Use "Aprofundar" para completar.');
            return newMessages;
          } else {
            // Sem conteúdo: remover mensagem vazia
            sonnerToast.error('A Professora está demorando demais. Tente com pergunta mais simples.');
            return prev.slice(0, -1);
          }
        });
      } else {
        // Erro não-AbortError: remover mensagem e mostrar toast
        const errorMessage = error.message || 'Erro ao processar sua pergunta.';
        sonnerToast.error(errorMessage, {
          description: 'Tente novamente em alguns instantes.'
        });
        setMessages(prev => prev.slice(0, -1));
      }
    } finally {
      // Finalização de estados de carregamento
      setIsLoading(false); // tanto para 'chat' quanto para 'analyze'
      if (streamMode === 'lesson') {
        setIsCreatingLesson(false);
      }
      abortControllerRef.current = null;
    }
  };
  const sendMessage = async () => {
    // Permitir envio se houver arquivo OU texto
    if (!input.trim() && uploadedFiles.length === 0) return;

    // Se estiver no modo recommendation, buscar materiais de forma visual
    if (mode === 'recommendation' && input.trim()) {
      const queryLower = input.toLowerCase();
      let tipo: 'livros' | 'videos' | 'todos' = 'todos';
      if (queryLower.includes('livro')) {
        tipo = 'livros';
      } else if (queryLower.includes('vídeo') || queryLower.includes('video')) {
        tipo = 'videos';
      }
      await buscarMateriaisVisuais(input.trim(), tipo);
      setInput("");
      return;
    }

    // Se houver arquivos anexados (imagem ou PDF), mostrar mensagem analisando
    let messageText = input.trim();
    if (uploadedFiles.length > 0) {
      const fileType = uploadedFiles[0].type.includes('image') ? 'imagem' : 'documento';
      if (!messageText) {
        messageText = `Analise ${fileType === 'imagem' ? 'esta imagem' : 'este documento'} detalhadamente. Descreva o que há ${fileType === 'imagem' ? 'nela' : 'nele'}, identifique conceitos jurídicos relevantes e sugira perguntas que eu poderia fazer sobre esse conteúdo.`;
      }
    }
    setInput("");

    // Iniciar timer do thinking indicator
    setThinkingStartTime(Date.now());
    setElapsedTime(0);
    await streamResponse(messageText, 'chat');
  };
  const handleCreateLesson = async (content: string) => {
    const topic = messages.find(m => m.role === 'user')?.content || 'este tema';
    const lessonPrompt = `Aprofunde mais sobre: "${topic}". 
Seja mais detalhado, traga exemplos práticos, jurisprudências relevantes e análise crítica completa.`;
    await streamResponse(lessonPrompt, 'chat', undefined, undefined, true);
  };
  const handleSummarize = async (content: string) => {
    // Envia "Resuma para mim" automaticamente
    await streamResponse("Resuma para mim", 'chat');
  };
  const handleGenerateFlashcards = (content: string) => {
    setCurrentContent(content);
    setShowFlashcardsModal(true);
  };
  const handleGenerateQuestions = (content: string) => {
    setCurrentContent(content);
    setShowQuestoesModal(true);
  };

  const limparConversa = () => {
    setMessages([]);
    setUploadedFiles([]);
    setInput("");
  };

  // Função para renderizar conteúdo com links clicáveis
  const renderMessageContent = (content: string) => {
    const linkRegex = /\[LINK:([\w-]+):([\w\s-]+):([^\]]+)\]/g;
    const parts: (string | JSX.Element)[] = [];
    let lastIndex = 0;
    let match;
    while ((match = linkRegex.exec(content)) !== null) {
      const [fullMatch, type, id, name] = match;
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index));
      }
      let route = '';
      let icon = <BookOpen className="w-4 h-4" />;
      if (type === 'biblioteca-estudos') {
        route = `/biblioteca-estudos/${id}`;
        icon = <Book className="w-4 h-4" />;
      } else if (type === 'biblioteca-oab') {
        route = `/biblioteca-oab/${id}`;
        icon = <Book className="w-4 h-4" />;
      } else if (type === 'videoaula') {
        route = `/videoaulas/area/${encodeURIComponent(id)}`;
        icon = <Video className="w-4 h-4" />;
      } else if (type === 'flashcards') {
        const [area, tema] = id.split('-');
        route = `/flashcards/estudar/${encodeURIComponent(area)}/${encodeURIComponent(tema)}`;
        icon = <Lightbulb className="w-4 h-4" />;
      }
      parts.push(<Button key={match.index} variant="outline" size="sm" className="mx-1 my-1 inline-flex gap-2 border-primary/30 hover:border-primary hover:bg-primary/5" onClick={() => navigate(route)}>
          {icon}
          <span className="text-sm">{name}</span>
          <ExternalLink className="w-3 h-3" />
        </Button>);
      lastIndex = match.index + fullMatch.length;
    }
    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }
    if (parts.length === 0) {
      return content;
    }
    return parts;
  };

  // Perguntas comuns pré-definidas - todas as opções
  const allQuestions = ["Qual a diferença entre dolo e culpa?", "O que é presunção de inocência?", "Explique o princípio da legalidade", "Diferença entre crime doloso e culposo", "O que são direitos fundamentais?", "Explique ação direta de inconstitucionalidade", "Diferença entre tutela e curatela", "O que é responsabilidade civil?", "Explique a prescrição penal", "O que é legítima defesa?"];

  // Selecionar 4 perguntas aleatórias a cada renderização da tela inicial
  const [commonQuestions] = useState(() => {
    const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 4);
  });
  const renderWelcomeScreen = () => {
    if (mode === "study") {
      return <div className="flex flex-col items-center justify-center h-full space-y-6 pb-20 px-4">
          <div className="text-center space-y-4 max-w-2xl">
            <div className="bg-primary/10 p-4 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
              <BookOpen className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Assistente de Estudo</h2>
            
            <div className="text-left space-y-3 bg-card border border-border rounded-lg p-4">
              <p className="font-semibold">📚 O que posso fazer:</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {linguagemMode === 'descomplicado' ? (
                  <>
                    <li>• Explicar conceitos jurídicos de forma simples e sem juridiquês</li>
                    <li>• Usar analogias do dia a dia para facilitar o entendimento</li>
                    <li>• Traduzir termos técnicos para linguagem que qualquer pessoa entende</li>
                    <li>• Analisar documentos e imagens de forma acessível</li>
                    <li>• Gerar flashcards e questões com explicações claras</li>
                  </>
                ) : (
                  <>
                    <li>• Esclarecer dúvidas com rigor técnico-jurídico</li>
                    <li>• Analisar documentos jurídicos (PDF) de forma aprofundada</li>
                    <li>• Interpretar imagens de textos legais com precisão</li>
                    <li>• Explicar conceitos com fundamentação legal e doutrinária</li>
                    <li>• Citar legislação e jurisprudência relevante</li>
                    <li>• Gerar flashcards e questões de estudo técnico</li>
                  </>
                )}
              </ul>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold flex items-center justify-center gap-2">
                <MessageCircle className="w-4 h-4" />
                💡 Dúvidas Comuns - Clique para perguntar:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {commonQuestions.map((question, index) => <Card key={index} className="p-3 cursor-pointer hover:bg-accent/10 transition-colors text-left border-accent/30" onClick={() => {
                setInput(question);
                setTimeout(() => sendMessage(), 100);
              }}>
                    <p className="text-[15px] leading-relaxed">{question}</p>
                  </Card>)}
              </div>
            </div>
          </div>
        </div>;
    } else if (mode === "recommendation") {
      return <div className="flex flex-col items-center justify-center h-full space-y-6 pb-20 px-4">
          <div className="text-center space-y-4 max-w-2xl">
            <div className="bg-primary/10 p-4 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
              <Lightbulb className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-3xl font-bold mb-2">O que você está estudando?</h2>
            <p className="text-muted-foreground mb-6">Escolha um tipo de material para começar</p>
            
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-8">
              <Card className="p-6 cursor-pointer hover:scale-105 hover:shadow-lg transition-all border-2 hover:border-primary" onClick={() => {
              setInput("Busque um livro sobre");
            }}>
                <div className="text-center space-y-2">
                  <Book className="w-12 h-12 mx-auto text-primary" />
                  <p className="font-bold">Livros</p>
                  <p className="text-xs text-muted-foreground">Biblioteca completa</p>
                </div>
              </Card>
              
              <Card className="p-6 cursor-pointer hover:scale-105 hover:shadow-lg transition-all border-2 hover:border-primary" onClick={() => {
              setInput("Busque vídeos sobre");
            }}>
                <div className="text-center space-y-2">
                  <Video className="w-12 h-12 mx-auto text-primary" />
                  <p className="font-bold">Vídeos</p>
                  <p className="text-xs text-muted-foreground">Videoaulas</p>
                </div>
              </Card>
            </div>
            
            <div className="text-left space-y-3 bg-card border border-border rounded-lg p-4 max-w-md mx-auto">
              <p className="font-semibold text-center">💡 Exemplos - Clique para testar:</p>
              <div className="space-y-2">
                {["Busque um livro sobre Direito Penal", "Busque vídeos sobre Direito Constitucional", "Recomende material sobre Processo Civil", "Vídeos sobre Direito do Trabalho"].map((example, index) => <Card key={index} className="p-3 cursor-pointer hover:bg-accent/10 transition-colors text-left border-accent/30" onClick={() => {
                setInput(example);
                setTimeout(() => sendMessage(), 100);
              }}>
                    <p className="text-sm">{example}</p>
                  </Card>)}
              </div>
            </div>
          </div>
        </div>;
    } else {
      return <div className="flex flex-col items-center justify-center h-full space-y-6 pb-20 px-4">
          <div className="text-center space-y-3">
            <div className="bg-primary/10 p-4 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
              <Scale className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Assistente de Caso Real</h2>
            
            <div className="max-w-md text-left space-y-3 bg-card border border-border rounded-lg p-4">
              <p className="font-semibold">⚖️ Como funciona:</p>
              <p className="text-sm text-muted-foreground">
                Descreva sua situação e receba orientações práticas sobre seus direitos e próximos passos.
              </p>
            </div>

            <div className="max-w-md space-y-3">
              <p className="text-sm font-semibold">💡 Exemplos para testar:</p>
              <Card className="p-3 cursor-pointer hover:bg-accent/10 transition-colors text-left" onClick={() => setInput("Meu carro foi atingido na traseira enquanto estava parado no sinal. O outro motorista não quer pagar os danos. O que eu faço?")}>
                <p className="text-sm">Meu carro foi atingido na traseira enquanto estava parado no sinal. O outro motorista não quer pagar os danos. O que eu faço?</p>
              </Card>
              <Card className="p-3 cursor-pointer hover:bg-accent/10 transition-colors text-left" onClick={() => setInput("Comprei um celular que veio com defeito. A loja não quer trocar nem devolver meu dinheiro. Quais são meus direitos?")}>
                <p className="text-sm">Comprei um celular que veio com defeito. A loja não quer trocar nem devolver meu dinheiro. Quais são meus direitos?</p>
              </Card>
              <Card className="p-3 cursor-pointer hover:bg-accent/10 transition-colors text-left" onClick={() => setInput("Fui demitido sem justa causa mas não recebi todas as verbas rescisórias. Como proceder?")}>
                <p className="text-sm">Fui demitido sem justa causa mas não recebi todas as verbas rescisórias. Como proceder?</p>
              </Card>
            </div>

            <div className="max-w-md bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <p className="text-sm">
                <strong>Receberá:</strong> Explicação dos seus direitos com citações de artigos de leis, documentos necessários, prazos importantes e sugestão de próximos passos.
              </p>
            </div>
          </div>
        </div>;
    }
  };
  return <div className="flex flex-col h-screen bg-background">
      <ChatFlashcardsModal isOpen={showFlashcardsModal} onClose={() => setShowFlashcardsModal(false)} content={currentContent} />
      <ChatQuestoesModal isOpen={showQuestoesModal} onClose={() => setShowQuestoesModal(false)} content={currentContent} />
      
      {/* Header fixo */}
      <div className="border-b border-border bg-card px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-semibold text-lg">Professora Jurídica</h1>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={limparConversa}
                className="shrink-0"
                title="Limpar conversa"
              >
                <Trash2 className="w-5 h-5" />
              </Button>
            )}
            <VLibrasButton />
          </div>
        </div>
        
        <Tabs value={mode} onValueChange={v => handleModeChange(v as ChatMode)}>
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="study" className="gap-2 text-xs md:text-sm"><BookOpen className="w-4 h-4" />Estudo</TabsTrigger>
            <TabsTrigger value="aula" className="gap-2 text-xs md:text-sm" onClick={() => navigate('/aula-interativa')}><GraduationCap className="w-4 h-4" />Aula</TabsTrigger>
            <TabsTrigger value="recommendation" className="gap-2 text-xs md:text-sm"><Lightbulb className="w-5 h-5" />Material</TabsTrigger>
            <TabsTrigger value="realcase" className="gap-2 text-xs md:text-sm"><Scale className="w-5 h-5" />Caso Real</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Toggle Linguagem */}
        <div className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white/5 backdrop-blur-sm rounded-lg mt-2">
          
          <div className="flex gap-1 p-1 bg-black/20 rounded-lg">
            <Button onClick={() => {
              if (linguagemMode !== 'descomplicado') {
                setLinguagemMode('descomplicado');
                limparConversa();
              }
            }} variant={linguagemMode === 'descomplicado' ? 'default' : 'ghost'} size="sm" className={cn("text-xs transition-all gap-1.5", linguagemMode === 'descomplicado' ? "bg-primary/60 text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-white/5")}>
              <span className="text-base">😊</span>
              <span>Descomplicado</span>
            </Button>
            <Button onClick={() => {
              if (linguagemMode !== 'tecnico') {
                setLinguagemMode('tecnico');
                limparConversa();
              }
            }} variant={linguagemMode === 'tecnico' ? 'default' : 'ghost'} size="sm" className={cn("text-xs transition-all gap-1.5", linguagemMode === 'tecnico' ? "bg-primary/60 text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-white/5")}>
              <span className="text-base">⚖️</span>
              <span>Modo Técnico</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Área scrollável de mensagens */}
      <div className="flex-1 relative overflow-hidden">
        <ScrollArea ref={scrollRef} className="h-full py-4">
          {messages.length === 0 ? renderWelcomeScreen() : <>
            {messages.map((message, index) => <div key={index}>
                {/* Mostrar "digitando..." se é assistente, está streaming e não tem conteúdo ainda */}
                {message.role === 'assistant' && message.isStreaming && !message.content && <div className="mb-4 px-4">
                    <SmartLoadingIndicator nome="Professora" onCancel={() => {
                if (abortControllerRef.current) {
                  abortControllerRef.current.abort();
                  sonnerToast.info('Cancelado pelo usuário');
                }
              }} />
                  </div>}
                
                {/* Só mostrar o card da mensagem se houver conteúdo */}
                {message.content && <div className={cn("mb-4 flex", message.role === "user" ? "justify-end px-4" : "justify-start")}>
                <div className={cn("rounded-2xl px-4 py-3 relative", message.role === "user" ? "bg-primary/60 text-primary-foreground max-w-[85%]" : "bg-muted/60 w-full")}>
                  {message.role === "assistant" ? (() => {
                  // Verificar se é uma resposta de materiais visuais
                  try {
                    const parsed = JSON.parse(message.content);
                    if (parsed.tipo === 'materiais_visuais') {
                      const {
                        dados
                      } = parsed;
                      const maxItensCarrossel = 6;
                      return <div className="space-y-6 w-full -mx-4">
                            {dados.livros && dados.livros.length > 0 && <div className="space-y-3">
                                <div className="flex items-center justify-between px-4">
                                  <h3 className="text-lg font-bold flex items-center gap-2">
                                    📚 Livros Encontrados ({dados.livros.length})
                                  </h3>
                                  {dados.livros.length > maxItensCarrossel && <Button variant="ghost" size="sm" onClick={() => {
                              const area = dados.livros[0]?.area;
                              if (area) {
                                navigate(`/bibliotecas?area=${encodeURIComponent(area)}`);
                              } else {
                                navigate('/bibliotecas');
                              }
                            }} className="text-primary hover:text-primary/80">
                                      Ver mais <ExternalLink className="w-4 h-4 ml-1" />
                                    </Button>}
                                </div>
                                
                                {/* Carrossel de livros sem margem */}
                                <div className="overflow-x-auto px-4">
                                  <div className="flex gap-3 pb-2">
                                    {dados.livros.slice(0, maxItensCarrossel).map((livro: any, idx: number) => <Card key={idx} className="flex-shrink-0 w-[140px] md:w-[160px] cursor-pointer hover:scale-105 transition-transform overflow-hidden shadow-lg" onClick={() => navigate(`/biblioteca-${livro.biblioteca}/${livro.id}`)}>
                                        <div className="aspect-[2/3] relative">
                                          {livro.capa ? <img src={livro.capa} alt={livro.titulo} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                                              <Book className="w-12 h-12 text-primary/40" />
                                            </div>}
                                          {/* Gradient overlay */}
                                          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                                          
                                          {/* Title overlay */}
                                          <div className="absolute bottom-0 left-0 right-0 p-2">
                                            <h4 className="text-xs font-bold text-white line-clamp-2 drop-shadow-lg leading-tight">
                                              {livro.titulo}
                                            </h4>
                                            <Badge className="mt-1 text-[10px] py-0 h-5">{livro.area}</Badge>
                                          </div>
                                        </div>
                                      </Card>)}
                                  </div>
                                </div>
                              </div>}
                            
                            {dados.videos && dados.videos.length > 0 && <div className="space-y-3">
                                <div className="flex items-center justify-between px-4">
                                  <h3 className="text-lg font-bold flex items-center gap-2">
                                    🎥 Vídeos Encontrados ({dados.videos.length})
                                  </h3>
                                  {dados.videos.length > maxItensCarrossel && <Button variant="ghost" size="sm" onClick={() => {
                              const area = dados.videos[0]?.area;
                              if (area) {
                                navigate(`/videoaulas/player?area=${encodeURIComponent(area)}`);
                              } else {
                                navigate('/videoaulas/areas');
                              }
                            }} className="text-primary hover:text-primary/80">
                                      Ver mais <ExternalLink className="w-4 h-4 ml-1" />
                                    </Button>}
                                </div>
                                
                                {/* Carrossel de vídeos sem margem */}
                                <div className="overflow-x-auto px-4">
                                  <div className="flex gap-3 pb-2">
                                    {dados.videos.slice(0, maxItensCarrossel).map((video: any, idx: number) => <Card key={idx} className="flex-shrink-0 w-[200px] md:w-[240px] cursor-pointer hover:scale-105 transition-transform overflow-hidden shadow-lg group" onClick={() => {
                                if (video.videoId) {
                                  navigate(`/videoaulas/player?area=${encodeURIComponent(video.area)}&videoId=${video.videoId}`);
                                }
                              }}>
                                        <div className="aspect-video relative bg-black">
                                          {video.thumbnail ? <img src={video.thumbnail} alt={video.titulo} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-red-500/20 to-red-500/5 flex items-center justify-center">
                                              <Video className="w-12 h-12 text-red-500/40" />
                                            </div>}
                                          {/* Play button overlay */}
                                          <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                            <div className="bg-red-600 rounded-full p-3 shadow-lg">
                                              <Play className="w-5 h-5 text-white fill-white" />
                                            </div>
                                          </div>
                                        </div>
                                        <CardContent className="p-3">
                                          <h4 className="font-semibold text-sm line-clamp-2 mb-1 leading-tight">{video.titulo}</h4>
                                          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground mt-2">
                                            <Badge variant="outline" className="text-[10px] py-0 h-5">{video.area}</Badge>
                                            {video.tempo && <span className="text-[10px]">{video.tempo}</span>}
                                          </div>
                                        </CardContent>
                                      </Card>)}
                                  </div>
                                </div>
                              </div>}
                            
                            {dados.livros.length === 0 && dados.videos.length === 0 && <div className="text-center py-8 text-muted-foreground">
                                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
                                <p>Nenhum material encontrado para esta busca.</p>
                                <p className="text-sm mt-2">Tente pesquisar por outra área ou tema.</p>
                              </div>}
                          </div>;
                    }
                  } catch (e) {
                    // Não é JSON, renderizar normalmente
                  }

                  // Função para parsear conteúdo com carrosséis, infográficos e estatísticas
                  const parseSpecialContent = (content: string) => {
                    console.log('🔧 parseSpecialContent iniciado. Tamanho do conteúdo:', content.length);

                    // Primeiro, converter \n literais em quebras de linha reais
                    let processedContent = content.replace(/\\n\\n\\n\\n/g, '\n\n\n\n') // 4 quebras
                    .replace(/\\n\\n/g, '\n\n') // 2 quebras
                    .replace(/\\n/g, '\n'); // 1 quebra

                    // Debug: verificar se QUESTOES_CLICAVEIS está presente
                    console.log('🔍 QUESTOES_CLICAVEIS no conteúdo?', processedContent.includes('[QUESTOES_CLICAVEIS]'));
                    console.log('🔍 Tag de fechamento presente?', processedContent.includes('[/QUESTOES_CLICAVEIS]'));
                    const elements: JSX.Element[] = [];
                    let key = 0;

                    // Detectar [COMPARAÇÃO], [CARROSSEL], [ETAPAS], [TIPOS] com regex mais permissivo
                    const comparisonRegex = /\[(COMPARAÇÃO|CARROSSEL|ETAPAS|TIPOS):\s*([^\]]+)\]\s*(\{[\s\S]*?\})\s*\[\/(COMPARAÇÃO|CARROSSEL|ETAPAS|TIPOS)\]/gi;
                    console.log('🔍 Testando regex de comparação no conteúdo...');
                    const testMatch = processedContent.match(comparisonRegex);
                    console.log('🎯 Matches encontrados:', testMatch ? testMatch.length : 0);

                    // Detectar [CASOS_PRATICOS]
                    const practicalCasesRegex = /\[CASOS_PRATICOS\]\s*(\{[\s\S]*?\})\s*\[\/CASOS_PRATICOS\]/gi;

                    // Detectar [QUESTOES_CLICAVEIS]
                    const clickableQuestionsRegex = /\[QUESTOES_CLICAVEIS\]([\s\S]*?)\[\/QUESTOES_CLICAVEIS\]/gi;

                    // Detectar [ACAO_BUTTONS] - botões de ação após análise
                    const actionButtonsRegex = /\[ACAO_BUTTONS\]([\s\S]*?)\[\/ACAO_BUTTONS\]/gi;

                    // Detectar [INFOGRÁFICO]
                    const infographicRegex = /\[INFOGRÁFICO:\s*([^\]]+)\]\s*(\{[\s\S]*?\})\s*\[\/INFOGRÁFICO\]/gi;

                    // Detectar [ESTATÍSTICAS] com ou sem título
                    const statsRegex = /\[ESTATÍSTICAS(?::\s*([^\]]+))?\]\s*(\{[\s\S]*?\})\s*\[\/ESTATÍSTICAS\]/gi;

                    // Detectar [MERMAID]
                    const mermaidRegex = /\[MERMAID:\s*([^\]]+)\]\s*([\s\S]*?)\s*\[\/MERMAID\]/gi;

                    // Detectar [PROCESSO]
                    const processRegex = /\[PROCESSO:\s*([^\]]+)\]\s*(\{[\s\S]*?\})\s*\[\/PROCESSO\]/gi;

                    // Detectar [TABS]
                    const tabsRegex = /\[TABS:\s*([^\]]+)\]\s*(\{[\s\S]*?\})\s*\[\/TABS\]/gi;

                    // Detectar [ACCORDION]
                    const accordionRegex = /\[ACCORDION\]\s*(\{[\s\S]*?\})\s*\[\/ACCORDION\]/gi;

                    // Detectar [SLIDES]
                    const slidesRegex = /\[SLIDES:\s*([^\]]+)\]\s*(\{[\s\S]*?\})\s*\[\/SLIDES\]/gi;
                    const allMatches: Array<{
                      index: number;
                      length: number;
                      type: string;
                      match: RegExpMatchArray;
                    }> = [];
                    let match;

                    // Coletar todas as correspondências de comparação
                    const compMatches = processedContent.matchAll(comparisonRegex);
                    let compCount = 0;
                    for (const m of compMatches) {
                      if (m.index !== undefined) {
                        compCount++;
                        console.log(`📌 Comparação ${compCount} encontrada na posição ${m.index}`);
                        allMatches.push({
                          index: m.index,
                          length: m[0].length,
                          type: 'comparison',
                          match: m as RegExpMatchArray
                        });
                      }
                    }
                    console.log(`✅ Total de ${compCount} comparações coletadas`);

                    // Coletar casos práticos
                    const practicalMatches = processedContent.matchAll(practicalCasesRegex);
                    for (const m of practicalMatches) {
                      if (m.index !== undefined) {
                        allMatches.push({
                          index: m.index,
                          length: m[0].length,
                          type: 'practical_cases',
                          match: m as RegExpMatchArray
                        });
                      }
                    }

                    // Coletar questões clicáveis
                    const questionMatches = processedContent.matchAll(clickableQuestionsRegex);
                    for (const m of questionMatches) {
                      if (m.index !== undefined) {
                        console.log('📍 Questão encontrada na posição:', m.index);
                        console.log('📝 Match completo:', m[0].substring(0, 100) + '...');
                        console.log('📊 Conteúdo capturado:', m[1]);
                        allMatches.push({
                          index: m.index,
                          length: m[0].length,
                          type: 'clickable_questions',
                          match: m as RegExpMatchArray
                        });
                      }
                    }

                    // Coletar botões de ação
                    const actionButtonMatches = processedContent.matchAll(actionButtonsRegex);
                    for (const m of actionButtonMatches) {
                      if (m.index !== undefined) {
                        console.log('🔘 Botões de ação encontrados na posição:', m.index);
                        allMatches.push({
                          index: m.index,
                          length: m[0].length,
                          type: 'action_buttons',
                          match: m as RegExpMatchArray
                        });
                      }
                    }

                    // Coletar infográficos
                    const infoMatches = processedContent.matchAll(infographicRegex);
                    for (const m of infoMatches) {
                      if (m.index !== undefined) {
                        allMatches.push({
                          index: m.index,
                          length: m[0].length,
                          type: 'infographic',
                          match: m as RegExpMatchArray
                        });
                      }
                    }

                    // Coletar estatísticas
                    const statMatches = processedContent.matchAll(statsRegex);
                    for (const m of statMatches) {
                      if (m.index !== undefined) {
                        allMatches.push({
                          index: m.index,
                          length: m[0].length,
                          type: 'stats',
                          match: m as RegExpMatchArray
                        });
                      }
                    }

                    // Coletar mermaid
                    const mermaidMatches = processedContent.matchAll(mermaidRegex);
                    for (const m of mermaidMatches) {
                      if (m.index !== undefined) {
                        allMatches.push({
                          index: m.index,
                          length: m[0].length,
                          type: 'mermaid',
                          match: m as RegExpMatchArray
                        });
                      }
                    }

                    // Coletar processo
                    const processMatches = processedContent.matchAll(processRegex);
                    for (const m of processMatches) {
                      if (m.index !== undefined) {
                        allMatches.push({
                          index: m.index,
                          length: m[0].length,
                          type: 'process',
                          match: m as RegExpMatchArray
                        });
                      }
                    }

                    // Coletar tabs
                    const tabMatches = processedContent.matchAll(tabsRegex);
                    for (const m of tabMatches) {
                      if (m.index !== undefined) {
                        allMatches.push({
                          index: m.index,
                          length: m[0].length,
                          type: 'tabs',
                          match: m as RegExpMatchArray
                        });
                      }
                    }

                    // Coletar accordion
                    const accordionMatches = processedContent.matchAll(accordionRegex);
                    for (const m of accordionMatches) {
                      if (m.index !== undefined) {
                        allMatches.push({
                          index: m.index,
                          length: m[0].length,
                          type: 'accordion',
                          match: m as RegExpMatchArray
                        });
                      }
                    }

                    // Coletar slides
                    const slideMatches = processedContent.matchAll(slidesRegex);
                    for (const m of slideMatches) {
                      if (m.index !== undefined) {
                        allMatches.push({
                          index: m.index,
                          length: m[0].length,
                          type: 'slides',
                          match: m as RegExpMatchArray
                        });
                      }
                    }

                    // Ordenar por índice
                    allMatches.sort((a, b) => a.index - b.index);
                    let lastIndex = 0;
                    allMatches.forEach(({
                      index: startIdx,
                      length,
                      type,
                      match
                    }) => {
                      const endIdx = startIdx + length;

                      // Adicionar texto antes do elemento especial
                      if (startIdx > lastIndex) {
                        let textBefore = processedContent.substring(lastIndex, startIdx);
                        
                        if (textBefore.trim()) {
                          elements.push(<div key={key++} className="prose prose-sm max-w-none dark:prose-invert">
                                <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                              h1: ({
                                children
                              }) => <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-6 mt-8 leading-tight">
                                        {children}
                                      </h1>,
                              h2: ({
                                children
                              }) => <h2 className="text-xl md:text-2xl font-bold text-foreground mb-4 mt-6 leading-tight">
                                        {children}
                                      </h2>,
                              h3: ({
                                children
                              }) => <h3 className="text-lg md:text-xl font-semibold text-foreground mb-3 mt-5 leading-snug">
                                        {children}
                                      </h3>,
                              p: ({
                                children,
                                node
                              }) => {
                                const text = node?.children?.map((child: any) => child.value || '').join('') || '';
                                
                                // Detectar [DICA DE OURO]
                                if (text.includes('[DICA DE OURO')) {
                                  const match = text.match(/\[DICA DE OURO\s*💎?\]([\s\S]*?)\[\/DICA DE OURO\]/i);
                                  if (match) {
                                    return <div className="my-4 p-4 bg-yellow-500/10 border-l-4 border-yellow-500 rounded-r-lg">
                                      <div className="flex items-start gap-3">
                                        <span className="text-2xl flex-shrink-0">💎</span>
                                        <div>
                                          <strong className="text-yellow-400 block mb-2">DICA DE OURO</strong>
                                          <div className="text-foreground text-[15px] md:text-base leading-relaxed">
                                            {match[1].trim()}
                                          </div>
                                        </div>
                                      </div>
                                    </div>;
                                  }
                                }
                                
                                // Detectar [SACOU?]
                                if (text.includes('[SACOU?')) {
                                  const match = text.match(/\[SACOU\?\s*💡?\]([\s\S]*?)\[\/SACOU\?\]/i);
                                  if (match) {
                                    return <div className="my-4 p-4 bg-blue-500/10 border-l-4 border-blue-500 rounded-r-lg">
                                      <div className="flex items-start gap-3">
                                        <span className="text-2xl flex-shrink-0">💡</span>
                                        <div>
                                          <strong className="text-blue-400 block mb-2">SACOU?</strong>
                                          <div className="text-foreground text-[15px] md:text-base leading-relaxed">
                                            {match[1].trim()}
                                          </div>
                                        </div>
                                      </div>
                                    </div>;
                                  }
                                }
                                
                                // Detectar [FICA LIGADO!]
                                if (text.includes('[FICA LIGADO!')) {
                                  const match = text.match(/\[FICA LIGADO!\s*⚠️?\]([\s\S]*?)\[\/FICA LIGADO!\]/i);
                                  if (match) {
                                    return <div className="my-4 p-4 bg-orange-500/10 border-l-4 border-orange-500 rounded-r-lg">
                                      <div className="flex items-start gap-3">
                                        <span className="text-2xl flex-shrink-0">⚠️</span>
                                        <div>
                                          <strong className="text-orange-400 block mb-2">FICA LIGADO!</strong>
                                          <div className="text-foreground text-[15px] md:text-base leading-relaxed">
                                            {match[1].trim()}
                                          </div>
                                        </div>
                                      </div>
                                    </div>;
                                  }
                                }
                                
                                // Detectar [ATENÇÃO], [IMPORTANTE], [DICA], [NOTA], [EXEMPLO]
                                const highlightMatch = text.match(/\[(ATENÇÃO|IMPORTANTE|DICA|NOTA|EXEMPLO)\]([\s\S]*?)\[\/\1\]/i);
                                if (highlightMatch) {
                                  const type = highlightMatch[1].toLowerCase();
                                  const content = highlightMatch[2].trim();
                                  return <HighlightedBox type={type as any}>{content}</HighlightedBox>;
                                }
                                
                                return <p className="text-foreground text-[15px] md:text-base mb-4 leading-relaxed">
                                  {children}
                                </p>;
                              },
                              ul: ({
                                children
                              }) => <ul className="list-disc list-inside space-y-2 mb-4 ml-4 text-foreground">
                                        {children}
                                      </ul>,
                              ol: ({
                                children
                              }) => <ol className="list-decimal list-inside space-y-2 mb-4 ml-4 text-foreground">
                                        {children}
                                      </ol>,
                              li: ({
                                children
                              }) => <li className="text-foreground text-[15px] md:text-base leading-relaxed">
                                        {children}
                                      </li>,
                              strong: ({
                                children
                              }) => <strong className="font-bold text-primary">
                                        {children}
                                      </strong>,
                              blockquote: ({
                                children
                              }) => <blockquote className="border-l-4 border-primary/50 pl-6 pr-4 py-4 my-6 bg-primary/5 rounded-r-lg text-foreground/95 text-[15px] leading-relaxed shadow-sm italic">
                                        {children}
                                      </blockquote>
                            }}>
                                  {textBefore}
                                </ReactMarkdown>
                              </div>);
                        }
                      }

                      // Adicionar elemento especial
                      try {
                        if (type === 'comparison') {
                          const title = match[2]?.trim();
                          const jsonStr = match[3]?.trim();
                          console.log('🎨 Parseando comparação:', title);
                          console.log('📋 JSON:', jsonStr.substring(0, 100) + '...');
                          const data = JSON.parse(jsonStr);
                          if (data.cards && Array.isArray(data.cards)) {
                            console.log(`✅ ComparisonCarousel renderizado com ${data.cards.length} cards`);
                            elements.push(<ComparisonCarousel key={key++} title={title} cards={data.cards} />);
                          } else {
                            console.warn('⚠️ Dados de comparação sem cards array');
                          }
                        } else if (type === 'practical_cases') {
                          const jsonStr = match[1]?.trim();
                          console.log('⚖️ Parseando casos práticos');
                          const data = JSON.parse(jsonStr);
                          if (data.cases && Array.isArray(data.cases)) {
                            console.log(`✅ PracticalCasesCarousel renderizado com ${data.cases.length} casos`);
                            elements.push(<PracticalCasesCarousel key={key++} cases={data.cases} title="📝 Casos Práticos" />);
                          }
                        } else if (type === 'clickable_questions') {
                          try {
                            const rawContent = match[1]?.trim();
                            console.log('💭 Raw content das questões:', rawContent);

                            // Tentar parsear diretamente
                            let questions;
                            try {
                              questions = JSON.parse(rawContent);
                            } catch (parseError) {
                              // Se falhar, tentar limpar o conteúdo
                              const cleaned = rawContent.replace(/\n/g, ' ') // Remover quebras de linha
                              .replace(/\s+/g, ' ') // Normalizar espaços
                              .trim();
                              console.log('🧹 Tentando com conteúdo limpo:', cleaned);
                              questions = JSON.parse(cleaned);
                            }
                            if (Array.isArray(questions) && questions.length > 0) {
                              console.log(`✅ ${questions.length} questões parseadas com sucesso`);
                              elements.push(<div key={key++} className="my-6">
                                    <h3 className="text-lg md:text-xl font-bold flex items-center gap-2 mb-4">
                                      <MessageCircle className="w-5 h-5 text-primary" />
                                      💭 Questões para Aprofundamento
                                    </h3>
                                    <div className="grid grid-cols-1 gap-3">
                                      {questions.map((question: string, idx: number) => <Button key={idx} variant="outline" className="w-full text-left justify-start h-auto py-3 px-4 whitespace-normal break-words hover:bg-primary/10 hover:border-primary transition-all group" onClick={() => {
                                    setInput(question);
                                    setTimeout(() => sendMessage(), 100);
                                  }}>
                                          <MessageCircle className="w-4 h-4 mr-2 flex-shrink-0 mt-1 text-primary group-hover:scale-110 transition-transform" />
                                          <span className="text-sm md:text-base leading-relaxed">{question}</span>
                                        </Button>)}
                                    </div>
                                  </div>);
                            } else {
                              console.warn('⚠️ Questões não é um array válido:', questions);
                            }
                          } catch (e) {
                            console.error('❌ Erro ao parsear questões clicáveis:', e);
                            console.error('📄 Conteúdo problemático:', match[0].substring(0, 200));
                            // Não renderizar nada em caso de erro (melhor que mostrar tag quebrada)
                          }
                        } else if (type === 'action_buttons') {
                          try {
                            const rawContent = match[1]?.trim();
                            console.log('🔘 Raw content dos botões:', rawContent);
                            
                            // Split por | para obter as 3 ações
                            const actions = rawContent.split('|').map(a => a.trim());
                            
                            if (actions.length === 3) {
                              console.log(`✅ ${actions.length} botões de ação parseados`);
                              
                              // Pegar o conteúdo analisado (texto antes dos botões)
                              const analyzedContent = processedContent.substring(0, match.index || 0).trim();
                              
                              elements.push(
                                <div key={key++} className="my-6 p-6 bg-card border-2 border-primary/20 rounded-lg">
                                  <h3 className="text-lg font-bold mb-4 text-center">
                                    💬 Como posso te ajudar com este material?
                                  </h3>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <Button
                                      variant="outline"
                                      className="h-auto py-4 px-4 flex flex-col items-center gap-2 hover:bg-primary/10 hover:border-primary transition-all group"
                                      onClick={() => {
                                        const actionMessage = `Com base no material que você analisou, faça um resumo executivo destacando os pontos principais.`;
                                        setInput(actionMessage);
                                        setTimeout(() => sendMessage(), 100);
                                      }}
                                    >
                                      <FileText className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
                                      <span className="font-semibold">{actions[0]}</span>
                                    </Button>
                                    
                                    <Button
                                      variant="outline"
                                      className="h-auto py-4 px-4 flex flex-col items-center gap-2 hover:bg-primary/10 hover:border-primary transition-all group"
                                      onClick={() => {
                                        const actionMessage = `Com base no material que você analisou, explique detalhadamente os conceitos jurídicos mencionados, usando ${linguagemMode === 'descomplicado' ? 'linguagem simples e acessível' : 'linguagem técnico-jurídica'}.`;
                                        setInput(actionMessage);
                                        setTimeout(() => sendMessage(), 100);
                                      }}
                                    >
                                      <Lightbulb className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
                                      <span className="font-semibold">{actions[1]}</span>
                                    </Button>
                                    
                                    <Button
                                      variant="outline"
                                      className="h-auto py-4 px-4 flex flex-col items-center gap-2 hover:bg-primary/10 hover:border-primary transition-all group"
                                      onClick={() => {
                                        handleGenerateQuestions(analyzedContent);
                                      }}
                                    >
                                      <MessageCircle className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
                                      <span className="font-semibold">{actions[2]}</span>
                                    </Button>
                                  </div>
                                </div>
                              );
                            } else {
                              console.warn('⚠️ Número incorreto de ações:', actions.length);
                            }
                          } catch (e) {
                            console.error('❌ Erro ao parsear botões de ação:', e);
                          }
                        } else if (type === 'infographic') {
                          const title = match[1]?.trim();
                          const jsonStr = match[2]?.trim();
                          const data = JSON.parse(jsonStr);
                          if (data.steps && Array.isArray(data.steps)) {
                            elements.push(<InfographicTimeline key={key++} title={title} steps={data.steps} />);
                          }
                        } else if (type === 'stats') {
                          const title = match[1]?.trim(); // Título opcional
                          const jsonStr = match[2]?.trim();
                          const data = JSON.parse(jsonStr);
                          if (data.stats && Array.isArray(data.stats)) {
                            elements.push(<LegalStatistics key={key++} title={title} stats={data.stats} />);
                          }
                        } else if (type === 'process') {
                          const title = match[1]?.trim();
                          const jsonStr = match[2]?.trim();
                          const data = JSON.parse(jsonStr);
                          if (data.steps && Array.isArray(data.steps)) {
                            elements.push(<ProcessFlow key={key++} title={title} steps={data.steps} />);
                          }
                        } else if (type === 'tabs') {
                          const title = match[1]?.trim();
                          const jsonStr = match[2]?.trim();
                          const data = JSON.parse(jsonStr);
                          if (data.tabs && Array.isArray(data.tabs)) {
                            elements.push(<MarkdownTabs key={key++} tabs={data.tabs} />);
                          }
                        } else if (type === 'accordion') {
                          const jsonStr = match[1]?.trim();
                          const data = JSON.parse(jsonStr);
                          if (data.items && Array.isArray(data.items)) {
                            elements.push(<MarkdownAccordion key={key++} items={data.items} />);
                          }
                        } else if (type === 'slides') {
                          const title = match[1]?.trim();
                          const jsonStr = match[2]?.trim();
                          const data = JSON.parse(jsonStr);
                          if (data.slides && Array.isArray(data.slides)) {
                            elements.push(<MarkdownSlides key={key++} title={title} slides={data.slides} />);
                          }
                        }
                      } catch (e) {
                        console.error(`❌ ERRO ao parsear ${type}:`, e);
                        console.error('📄 Conteúdo que causou erro:', match[0].substring(0, 200));
                        // Em caso de erro, incluir o texto original
                        elements.push(<div key={key++} className="prose prose-sm max-w-none dark:prose-invert">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {match[0]}
                              </ReactMarkdown>
                            </div>);
                      }
                      lastIndex = endIdx;
                    });

                    // Adicionar texto restante
                    if (lastIndex < processedContent.length) {
                      let remainingText = processedContent.substring(lastIndex);

                      if (remainingText.trim()) {
                        elements.push(<div key={key++} className="prose prose-sm max-w-none dark:prose-invert">
                              <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                            h1: ({
                              children
                            }) => <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-6 mt-8 leading-tight">
                                      {children}
                                    </h1>,
                            h2: ({
                              children
                            }) => <h2 className="text-xl md:text-2xl font-bold text-foreground mb-4 mt-6 leading-tight">
                                      {children}
                                    </h2>,
                            h3: ({
                              children
                            }) => <h3 className="text-lg md:text-xl font-semibold text-foreground mb-3 mt-5 leading-snug">
                                      {children}
                                    </h3>,
                            p: ({
                              children,
                              node
                            }) => {
                              const text = node?.children?.map((child: any) => child.value || '').join('') || '';
                              
                              // Detectar [DICA DE OURO]
                              if (text.includes('[DICA DE OURO')) {
                                const match = text.match(/\[DICA DE OURO\s*💎?\]([\s\S]*?)\[\/DICA DE OURO\]/i);
                                if (match) {
                                  return <div className="my-4 p-4 bg-yellow-500/10 border-l-4 border-yellow-500 rounded-r-lg">
                                    <div className="flex items-start gap-3">
                                      <span className="text-2xl flex-shrink-0">💎</span>
                                      <div>
                                        <strong className="text-yellow-400 block mb-2">DICA DE OURO</strong>
                                        <div className="text-foreground text-[15px] md:text-base leading-relaxed">
                                          {match[1].trim()}
                                        </div>
                                      </div>
                                    </div>
                                  </div>;
                                }
                              }
                              
                              // Detectar [SACOU?]
                              if (text.includes('[SACOU?')) {
                                const match = text.match(/\[SACOU\?\s*💡?\]([\s\S]*?)\[\/SACOU\?\]/i);
                                if (match) {
                                  return <div className="my-4 p-4 bg-blue-500/10 border-l-4 border-blue-500 rounded-r-lg">
                                    <div className="flex items-start gap-3">
                                      <span className="text-2xl flex-shrink-0">💡</span>
                                      <div>
                                        <strong className="text-blue-400 block mb-2">SACOU?</strong>
                                        <div className="text-foreground text-[15px] md:text-base leading-relaxed">
                                          {match[1].trim()}
                                        </div>
                                      </div>
                                    </div>
                                  </div>;
                                }
                              }
                              
                              // Detectar [FICA LIGADO!]
                              if (text.includes('[FICA LIGADO!')) {
                                const match = text.match(/\[FICA LIGADO!\s*⚠️?\]([\s\S]*?)\[\/FICA LIGADO!\]/i);
                                if (match) {
                                  return <div className="my-4 p-4 bg-orange-500/10 border-l-4 border-orange-500 rounded-r-lg">
                                    <div className="flex items-start gap-3">
                                      <span className="text-2xl flex-shrink-0">⚠️</span>
                                      <div>
                                        <strong className="text-orange-400 block mb-2">FICA LIGADO!</strong>
                                        <div className="text-foreground text-[15px] md:text-base leading-relaxed">
                                          {match[1].trim()}
                                        </div>
                                      </div>
                                    </div>
                                  </div>;
                                }
                              }
                              
                              // Detectar [ATENÇÃO], [IMPORTANTE], [DICA], [NOTA], [EXEMPLO]
                              const highlightMatch = text.match(/\[(ATENÇÃO|IMPORTANTE|DICA|NOTA|EXEMPLO)\]([\s\S]*?)\[\/\1\]/i);
                              if (highlightMatch) {
                                const type = highlightMatch[1].toLowerCase();
                                const content = highlightMatch[2].trim();
                                return <HighlightedBox type={type as any}>{content}</HighlightedBox>;
                              }
                              
                              return <p className="text-foreground text-[15px] md:text-base mb-4 leading-relaxed">
                                {children}
                              </p>;
                            },
                            ul: ({
                              children
                            }) => <ul className="list-disc list-inside space-y-2 mb-4 ml-4 text-foreground">
                                      {children}
                                    </ul>,
                            ol: ({
                              children
                            }) => <ol className="list-decimal list-inside space-y-2 mb-4 ml-4 text-foreground">
                                      {children}
                                    </ol>,
                            li: ({
                              children
                            }) => <li className="text-foreground text-[15px] md:text-base leading-relaxed">
                                      {children}
                                    </li>,
                            strong: ({
                              children
                            }) => <strong className="font-bold text-primary">
                                      {children}
                                    </strong>,
                            blockquote: ({
                              children
                            }) => <blockquote className="border-l-4 border-primary/50 pl-6 pr-4 py-4 my-6 bg-primary/5 rounded-r-lg text-foreground/95 text-[15px] leading-relaxed shadow-sm italic">
                                      {children}
                                    </blockquote>
                          }}>
                                {remainingText}
                              </ReactMarkdown>
                            </div>);
                      }
                    }
                    console.log(`🎯 parseSpecialContent retornando ${elements.length} elementos`);
                    return elements.length > 0 ? elements : null;
                  };

                  // Helpers: ocultar blocos incompletos durante streaming e fechar tags ausentes após fim
                  const stripIncompleteBlocks = (content: string) => {
                    const tags = ['COMPARAÇÃO', 'CARROSSEL', 'ETAPAS', 'TIPOS', 'INFOGRÁFICO', 'ESTATÍSTICAS', 'PROCESSO', 'TABS', 'ACCORDION', 'SLIDES', 'SUGESTÕES', 'ATENÇÃO', 'IMPORTANTE', 'DICA', 'NOTA', 'EXEMPLO', 'QUESTOES_CLICAVEIS', 'ACAO_BUTTONS', 'CASOS_PRATICOS'];
                    let result = content;
                    for (const t of tags) {
                      // Se abriu e não fechou ainda, tentar renderizar parcialmente
                      const openIdx = result.lastIndexOf(`[${t}`);
                      const closeIdx = result.lastIndexOf(`[/${t}]`);
                      if (openIdx !== -1 && (closeIdx === -1 || closeIdx < openIdx)) {
                        // Tentar extrair JSON parcial para comparações e carrosséis
                        if (t === 'COMPARAÇÃO' || t === 'CARROSSEL') {
                          const partialBlock = result.substring(openIdx);
                          const jsonMatch = partialBlock.match(/\[COMPARAÇÃO:([^\]]*)\]\s*(\{[\s\S]*)/);
                          if (jsonMatch) {
                            const jsonStr = jsonMatch[2];
                            // Tentar parsear JSON parcial
                            try {
                              // Verificar se tem pelo menos um card completo
                              const cardMatches = jsonStr.match(/\{[^}]*"titulo":[^}]*"descricao":[^}]*\}/g);
                              if (cardMatches && cardMatches.length > 0) {
                                // Manter o conteúdo parcial mas adicionar indicador
                                result = result.substring(0, openIdx) + partialBlock + `\n\n⌛ Carregando mais itens...`;
                                continue;
                              }
                            } catch (e) {
                              // Se falhar o parse, esconder JSON
                            }
                          }
                        }
                        // Fallback: esconder bloco incompleto
                        result = result.substring(0, openIdx) + `\n\n⌛ Gerando ${t.toLowerCase()}...`;
                      }
                    }
                    return result;
                  };
                  const autoCloseBlocks = (content: string) => {
                    // Garante que blocos sem tag de fechamento recebam uma automaticamente
                    const fix = (txt: string, tag: string) => {
                      const regex = new RegExp(`\\[${tag}:[^\\]]*\\]`, 'g');
                      let match;
                      let output = txt;
                      while ((match = regex.exec(txt)) !== null) {
                        const start = match.index;
                        const hasClose = txt.indexOf(`[/${tag}]`, start) !== -1;
                        if (!hasClose) {
                          // Tentar achar o término do JSON mais próximo
                          const jsonStart = txt.indexOf('{', start);
                          if (jsonStart !== -1) {
                            // Heurística: pega a última chave '}' depois do início
                            const nextOpenTag = txt.indexOf('[', jsonStart + 1);
                            const searchEnd = nextOpenTag === -1 ? txt.length : nextOpenTag;
                            const segment = txt.slice(jsonStart, searchEnd);
                            const lastBrace = segment.lastIndexOf('}');
                            if (lastBrace !== -1) {
                              const insertPos = jsonStart + lastBrace + 1;
                              output = output.slice(0, insertPos) + `[/${tag}]` + output.slice(insertPos);
                            }
                          }
                        }
                      }
                      return output;
                    };
                    let fixed = content;
                    ['COMPARAÇÃO', 'CARROSSEL', 'ETAPAS', 'TIPOS', 'INFOGRÁFICO', 'ESTATÍSTICAS', 'MERMAID', 'PROCESSO', 'TABS', 'ACCORDION', 'SLIDES'].forEach(tag => {
                      fixed = fix(fixed, tag);
                    });
                    return fixed;
                  };

                  // Remover tags soltas de blocos especiais
                  let baseContent = message.content.replace(/\[IMPORTANTE\][\s\S]*?\[\/IMPORTANTE\]/gi, '').replace(/\[DICA\][\s\S]*?\[\/DICA\]/gi, '').replace(/\[NOTA\][\s\S]*?\[\/NOTA\]/gi, '').replace(/\[ATENÇÃO\][\s\S]*?\[\/ATENÇÃO\]/gi, '').replace(/\[EXEMPLO\][\s\S]*?\[\/EXEMPLO\]/gi, '').replace(/\[CASOS_PRATICOS\][\s\S]*?\[\/CASOS_PRATICOS\]/gi, '').replace(/\[QUESTOES_CLICAVEIS\][\s\S]*?\[\/QUESTOES_CLICAVEIS\]/gi, '').replace(/\[ACAO_BUTTONS\][\s\S]*?\[\/ACAO_BUTTONS\]/gi, '').replace(/\[COMPARAÇÃO\][\s\S]*?\[\/COMPARAÇÃO\]/gi, '').replace(/\[SUGESTÕES\][\s\S]*?\[\/SUGESTÕES\]/gi, '').replace(/\[SUGESTÕES\]/gi, '').replace(/\[\/SUGESTÕES\]/gi, '').replace(/\[INFOGRÁFICO\][\s\S]*?\[\/INFOGRÁFICO\]/gi, '').replace(/\[INFOGRÁFICO\]/gi, '').replace(/\[\/INFOGRÁFICO\]/gi, '').replace(/\(Aguarde a geração do infográfico\)/gi, '').replace(/\[COMPARAÇÃO\]/gi, '').replace(/\[\/COMPARAÇÃO\]/gi, '').replace(/\[ESTATÍSTICAS\]/gi, '').replace(/\[\/ESTATÍSTICAS\]/gi, '').replace(/\[MERMAID\]/gi, '').replace(/\[\/MERMAID\]/gi, '').replace(/\[PROCESSO\]/gi, '').replace(/\[\/PROCESSO\]/gi, '');
                  const safeContent = message.isStreaming ? stripIncompleteBlocks(baseContent) : autoCloseBlocks(baseContent);
                  const parsedContent = !message.isStreaming ? parseSpecialContent(safeContent) : null;
                  return <>
                      {parsedContent || <motion.div className="prose prose-sm max-w-none dark:prose-invert prose-p:text-[15px] prose-p:leading-[1.4] prose-p:text-foreground prose-headings:text-foreground prose-strong:text-foreground prose-ul:text-foreground prose-ol:text-foreground prose-li:text-[15px]" initial={{
                      opacity: 0
                    }} animate={{
                      opacity: 1
                    }} transition={{
                      duration: 0.2
                    }}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                        p: ({
                          children
                        }) => {
                          const text = String(children);

                          // Detectar e remover tags de sugestões e infográficos vazios
                          if (text.includes('[SUGESTÕES]') || text.includes('[/SUGESTÕES]') || text.includes('[INFOGRÁFICO]') || text.includes('[COMPARAÇÃO]') || text.includes('(Aguarde a geração') || text.includes('[ESTATÍSTICAS]') || text.includes('[MERMAID]') || text.includes('[PROCESSO]')) {
                            return null;
                          }

                          // Detectar tags de destaque com tamanho padronizado
                          if (text.includes('[ATENÇÃO]')) {
                            const content = text.replace(/\[ATENÇÃO\](.*?)\[\/ATENÇÃO\]/gs, '$1');
                            return <div className="my-6">
                                    <HighlightedBox type="warning">
                                      <div className="text-[15px] md:text-base leading-relaxed space-y-2">{content}</div>
                                    </HighlightedBox>
                                  </div>;
                          }
                          if (text.includes('[IMPORTANTE]')) {
                            const content = text.replace(/\[IMPORTANTE\](.*?)\[\/IMPORTANTE\]/gs, '$1');
                            return <div className="my-6">
                                    <HighlightedBox type="important">
                                      <div className="text-[15px] md:text-base leading-relaxed space-y-2">{content}</div>
                                    </HighlightedBox>
                                  </div>;
                          }
                          if (text.includes('[DICA]')) {
                            const content = text.replace(/\[DICA\](.*?)\[\/DICA\]/gs, '$1');
                            return <div className="my-6">
                                    <HighlightedBox type="tip">
                                      <div className="text-[15px] md:text-base leading-relaxed space-y-2">{content}</div>
                                    </HighlightedBox>
                                  </div>;
                          }
                          if (text.includes('[NOTA]')) {
                            const content = text.replace(/\[NOTA\](.*?)\[\/NOTA\]/gs, '$1');
                            return <div className="my-6">
                                    <HighlightedBox type="note">
                                      <div className="text-[15px] md:text-base leading-relaxed space-y-2">{content}</div>
                                    </HighlightedBox>
                                  </div>;
                          }
                          if (text.includes('[EXEMPLO]')) {
                            const content = text.replace(/\[EXEMPLO\](.*?)\[\/EXEMPLO\]/gs, '$1');
                            return <div className="my-6">
                                    <HighlightedBox type="note">
                                      <div className="space-y-3">
                                        <p className="text-lg font-semibold">💡 Exemplo Prático:</p>
                                        <div className="text-[15px] md:text-base leading-relaxed space-y-2">{content}</div>
                                      </div>
                                    </HighlightedBox>
                                  </div>;
                          }

                          // Detectar comparações em formato JSON (caso apareçam sem as tags)
                          if (text.includes('{"cards"')) {
                            return null; // Ocultar JSON bruto que deve ser parseado
                          }
                          if (text.includes('[COMPARAÇÃO')) {
                            try {
                              const titleMatch = text.match(/\[COMPARAÇÃO:\s*([^\]]+)\]/);
                              const title = titleMatch ? titleMatch[1] : undefined;
                              const jsonMatch = text.match(/\{[\s\S]*"cards"[\s\S]*\}/);
                              if (jsonMatch) {
                                const parsed = JSON.parse(jsonMatch[0]);
                                return <ComparisonCarousel cards={parsed.cards} title={title} />;
                              }
                            } catch (e) {
                              console.error('Erro ao parsear comparação:', e);
                            }
                          }

                          // Renderizar links como botões
                          const linkMatches = text.matchAll(/\[LINK:([\w-]+):([\w\s-]+):([^\]]+)\]/g);
                          const matchesArray = Array.from(linkMatches);
                          if (matchesArray.length > 0) {
                            const parts = [];
                            let lastIndex = 0;
                            matchesArray.forEach(match => {
                              const [fullMatch, type, id, name] = match;
                              const matchIndex = match.index || 0;
                              if (matchIndex > lastIndex) {
                                parts.push(text.substring(lastIndex, matchIndex));
                              }
                              let route = '';
                              let icon = '📚';
                              if (type === 'biblioteca-estudos' || type === 'biblioteca-oab') {
                                route = `/${type}/livro/${id}`;
                                icon = '📚';
                              } else if (type === 'videoaula') {
                                route = `/videoaulas/area/${encodeURIComponent(id)}`;
                                icon = '🎥';
                              } else if (type === 'flashcards') {
                                const [area, tema] = id.split('-');
                                route = `/flashcards/estudar/${encodeURIComponent(area)}/${encodeURIComponent(tema)}`;
                                icon = '🎴';
                              }
                              parts.push(<Button key={matchIndex} variant="outline" size="sm" className="mx-1 my-1 inline-flex gap-2 border-primary/30 hover:border-primary hover:bg-primary/5" onClick={() => navigate(route)}>
                                      <span>{icon}</span>
                                      <span className="text-sm">{name}</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </Button>);
                              lastIndex = matchIndex + fullMatch.length;
                            });
                            if (lastIndex < text.length) {
                              parts.push(text.substring(lastIndex));
                            }
                            return <p className="text-[15px] leading-[1.4]">{parts}</p>;
                          }
                          return <p className="text-[15px] leading-[1.4]">{children}</p>;
                        }
                      }}>
                          {safeContent}
                        </ReactMarkdown>
                      </motion.div>}
                      
                      
                      {!message.isStreaming && <MessageActionsChat content={message.content.replace(/\[SUGESTÕES\][\s\S]*?\[\/SUGESTÕES\]/g, '')} onCreateLesson={() => handleCreateLesson(message.content)} onSummarize={() => handleSummarize(message.content)} onGenerateFlashcards={() => handleGenerateFlashcards(message.content)} onGenerateQuestions={() => handleGenerateQuestions(message.content)} />}
                    </>;
                })() : <p className="text-[15px] leading-[1.4] whitespace-pre-wrap">{message.content}</p>}
                  
                  {/* Não mostrar cursor piscante - apenas TypingIndicator */}
                </div>
              </div>}
              </div>)}
            {/* Estado: Pensando com indicador multi-fases */}
            {isLoading && messages[messages.length - 1]?.role !== 'assistant' && <div className="flex justify-start mb-4 px-4">
                <ThinkingIndicator elapsedTime={elapsedTime} />
              </div>}
            
            
            {/* Removido "Gerando..." - usar apenas TypingIndicator */}
          </>}
        </ScrollArea>

      </div>

      {/* Footer fixo com arquivos anexados e input */}
      <div className="flex-shrink-0">
        {uploadedFiles.length > 0 && <div className="px-4 py-2 border-t border-border bg-background">
            <div className="flex flex-wrap gap-2">
              {uploadedFiles.map((file, index) => <div key={index} className="flex items-center gap-2 bg-accent/10 rounded-lg px-3 py-2 text-sm">
                  {file.type.includes("image") ? <Image className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                  <span className="max-w-[120px] truncate">{file.name}</span>
                  <button onClick={() => removeFile(index)}><X className="w-4 h-4 text-muted-foreground hover:text-foreground" /></button>
                </div>)}
            </div>
          </div>}

        <div className="border-t border-border bg-background px-4 py-3 space-y-3">
          {mode !== "recommendation" && <div className="flex gap-2">
              <input ref={imageInputRef} type="file" accept="image/*" onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0], "image")} className="hidden" />
              <button onClick={() => imageInputRef.current?.click()} disabled={isLoading} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-accent/20 hover:bg-accent/30 transition-colors border border-border disabled:opacity-50 disabled:cursor-not-allowed">
                <Image className="w-4 h-4" /><span className="text-sm font-medium">Analisar Imagem</span>
              </button>
              <input ref={pdfInputRef} type="file" accept="application/pdf" onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0], "pdf")} className="hidden" />
              <button onClick={() => pdfInputRef.current?.click()} disabled={isLoading} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-accent/20 hover:bg-accent/30 transition-colors border border-border disabled:opacity-50 disabled:cursor-not-allowed">
                <FileText className="w-4 h-4" /><span className="text-sm font-medium">Analisar PDF</span>
              </button>
            </div>}
          <div className="flex items-center gap-2">
            <Input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }} placeholder="Digite sua pergunta..." disabled={isLoading || isCreatingLesson} className="flex-1" />
            <Button onClick={sendMessage} disabled={isLoading || isCreatingLesson || !input.trim() && uploadedFiles.length === 0} size="icon">
              {isLoading || isCreatingLesson ? <Brain className="w-4 h-4 animate-pulse" /> : <Send className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Modais */}
      <ChatFlashcardsModal isOpen={showFlashcardsModal} onClose={() => setShowFlashcardsModal(false)} content={currentContent} />
      
      <ChatQuestoesModal isOpen={showQuestoesModal} onClose={() => setShowQuestoesModal(false)} content={currentContent} />
    </div>;
};
export default ChatProfessora;