import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { 
  Loader2, 
  Send, 
  X, 
  BookOpen, 
  GraduationCap, 
  Lightbulb, 
  Scale,
  Image,
  FileText,
  Brain
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast as sonnerToast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

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

type ChatMode = "study" | "aula" | "recommendation" | "realcase";

interface ProfessoraChatDesktopProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfessoraChatDesktop = ({ isOpen, onClose }: ProfessoraChatDesktopProps) => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<ChatMode>("study");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [linguagemMode, setLinguagemMode] = useState<'descomplicado' | 'tecnico'>('descomplicado');
  const scrollRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Notificar parent quando modal abre/fecha
  useEffect(() => {
    if (isOpen && onClose) {
      // Disparar evento customizado quando modal abre
      window.dispatchEvent(new CustomEvent('professora-modal-open'));
    }
    return () => {
      if (isOpen) {
        window.dispatchEvent(new CustomEvent('professora-modal-close'));
      }
    };
  }, [isOpen]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  const handleModeChange = (newMode: ChatMode) => {
    if (newMode === "aula") {
      navigate('/aula-interativa');
      return;
    }
    setMode(newMode);
    setMessages([]);
    setInput("");
    setUploadedFiles([]);
  };

  const limparConversa = () => {
    setMessages([]);
    setUploadedFiles([]);
    setInput("");
  };

  const handleFileSelect = async (file: File, expectedType: "image" | "pdf") => {
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const uploaded: UploadedFile = {
        name: file.name,
        type: file.type,
        data: base64,
      };

      setUploadedFiles((prev) => [...prev, uploaded]);
      sonnerToast.info(`${expectedType === "image" ? "Imagem" : "PDF"} anexada`);
    } catch (error) {
      sonnerToast.error("Erro ao processar arquivo");
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const sendMessage = async () => {
    if (!input.trim() && uploadedFiles.length === 0) return;

    const userMessage = input.trim();
    setInput("");

    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: userMessage },
    ];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      console.log('🎓 Enviando mensagem para chat-professora:', {
        messagesCount: newMessages.length,
        filesCount: uploadedFiles.length,
        mode,
        linguagemMode
      });

      const { data, error } = await supabase.functions.invoke("chat-professora", {
        body: {
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          files: uploadedFiles,
          mode: mode,
          linguagemMode: linguagemMode,
        },
      });

      console.log('✅ Resposta recebida:', { data, error });

      if (error) {
        console.error('❌ Erro da função:', error);
        throw error;
      }

      if (!data || !data.resposta) {
        console.error('❌ Resposta inválida:', data);
        throw new Error('Resposta inválida do servidor');
      }

      setMessages([
        ...newMessages,
        { role: "assistant", content: data.resposta },
      ]);
      setUploadedFiles([]);
      sonnerToast.success("Resposta recebida!");
    } catch (error) {
      console.error("❌ Erro completo ao enviar mensagem:", error);
      sonnerToast.error("Erro ao enviar mensagem. Tente novamente.");
      // Remove a última mensagem do usuário em caso de erro
      setMessages(messages);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Perguntas comuns
  const commonQuestions = [
    "Qual a diferença entre dolo e culpa?",
    "O que é presunção de inocência?",
    "Explique o princípio da legalidade",
    "O que são direitos fundamentais?",
  ];

  const renderWelcomeScreen = () => {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-6 px-6">
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
                  <li>• Explicar conceitos jurídicos de forma simples</li>
                  <li>• Usar analogias do dia a dia</li>
                  <li>• Analisar documentos e imagens</li>
                </>
              ) : (
                <>
                  <li>• Esclarecer dúvidas com rigor técnico-jurídico</li>
                  <li>• Analisar documentos jurídicos</li>
                  <li>• Fundamentação legal e doutrinária</li>
                </>
              )}
            </ul>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold">💡 Dúvidas Comuns:</p>
            <div className="grid grid-cols-2 gap-2">
              {commonQuestions.map((question, index) => (
                <Card
                  key={index}
                  className="p-3 cursor-pointer hover:bg-accent/10 transition-colors text-left"
                  onClick={() => {
                    setInput(question);
                    setTimeout(() => sendMessage(), 100);
                  }}
                >
                  <p className="text-sm">{question}</p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay escuro */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      
      {/* Conteúdo centralizado estilo ChatGPT */}
      <div className="relative z-50 flex flex-col w-full max-w-4xl mx-auto my-8 bg-background rounded-lg shadow-2xl">
        {/* Header fixo */}
        <div className="border-b border-border bg-card px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">Professora Jurídica</h1>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <Tabs value={mode} onValueChange={(v) => handleModeChange(v as ChatMode)}>
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="study" className="gap-2">
              <BookOpen className="w-4 h-4" />
              Estudo
            </TabsTrigger>
            <TabsTrigger value="aula" className="gap-2">
              <GraduationCap className="w-4 h-4" />
              Aula
            </TabsTrigger>
            <TabsTrigger value="recommendation" className="gap-2">
              <Lightbulb className="w-4 h-4" />
              Material
            </TabsTrigger>
            <TabsTrigger value="realcase" className="gap-2">
              <Scale className="w-4 h-4" />
              Caso Real
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Toggle Linguagem */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            <Button
              onClick={() => {
                if (linguagemMode !== 'descomplicado') {
                  setLinguagemMode('descomplicado');
                  limparConversa();
                }
              }}
              variant={linguagemMode === 'descomplicado' ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                "text-xs gap-1.5",
                linguagemMode === 'descomplicado' && "bg-primary text-primary-foreground"
              )}
            >
              <span>😊</span>
              Descomplicado
            </Button>
            <Button
              onClick={() => {
                if (linguagemMode !== 'tecnico') {
                  setLinguagemMode('tecnico');
                  limparConversa();
                }
              }}
              variant={linguagemMode === 'tecnico' ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                "text-xs gap-1.5",
                linguagemMode === 'tecnico' && "bg-primary text-primary-foreground"
              )}
            >
              <span>⚖️</span>
              Modo Técnico
            </Button>
          </div>
        </div>
      </div>

      {/* Messages Area - com altura definida */}
      <div className="flex-1 overflow-hidden" style={{ maxHeight: 'calc(100vh - 400px)' }}>
        <ScrollArea ref={scrollRef} className="h-full py-4">
          {messages.length === 0 ? (
            renderWelcomeScreen()
          ) : (
            <div className="space-y-4 px-6 max-w-5xl mx-auto">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-3",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground max-w-[80%]"
                        : "bg-muted max-w-[90%]"
                    )}
                  >
                    {message.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl px-4 py-3 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Professora está pensando...</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Footer estilo ChatGPT - sempre visível e fixo */}
      <div className="flex-shrink-0 px-6 py-4 bg-background border-t border-border">
        {uploadedFiles.length > 0 && (
          <div className="mb-3">
            <div className="flex flex-wrap gap-2">
              {uploadedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 text-sm"
                >
                  {file.type.includes("image") ? (
                    <Image className="w-4 h-4" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                  <span className="max-w-[120px] truncate">{file.name}</span>
                  <button onClick={() => removeFile(index)}>
                    <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Container estilo ChatGPT */}
        <div className="bg-muted/30 rounded-2xl border border-border/50 shadow-sm">
          {mode !== "recommendation" && (
            <div className="px-4 pt-3 pb-2 flex gap-2 border-b border-border/30">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={(e) =>
                  e.target.files?.[0] && handleFileSelect(e.target.files[0], "image")
                }
                className="hidden"
              />
              <button
                onClick={() => imageInputRef.current?.click()}
                disabled={isLoading}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-muted/50 transition-colors text-xs font-medium disabled:opacity-50"
              >
                <Image className="w-4 h-4" />
                <span>Imagem</span>
              </button>

              <input
                ref={pdfInputRef}
                type="file"
                accept="application/pdf"
                onChange={(e) =>
                  e.target.files?.[0] && handleFileSelect(e.target.files[0], "pdf")
                }
                className="hidden"
              />
              <button
                onClick={() => pdfInputRef.current?.click()}
                disabled={isLoading}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-muted/50 transition-colors text-xs font-medium disabled:opacity-50"
              >
                <FileText className="w-4 h-4" />
                <span>PDF</span>
              </button>
            </div>
          )}

          <div className="px-4 py-3 flex items-center gap-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Digite sua pergunta..."
              disabled={isLoading}
              className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <Button
              onClick={sendMessage}
              disabled={isLoading || (!input.trim() && uploadedFiles.length === 0)}
              size="icon"
              className="rounded-lg shrink-0"
            >
              {isLoading ? (
                <Brain className="w-5 h-5 animate-pulse" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};
