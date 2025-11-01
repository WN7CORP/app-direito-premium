import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Image, Upload } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ProgressBar } from "@/components/ProgressBar";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useDropzone } from "react-dropzone";

type InputType = "texto" | "pdf" | "imagem";
type ResumoLevel = "detalhado" | "resumido";

const ResumosJuridicos = () => {
  const navigate = useNavigate();
  const [inputType, setInputType] = useState<InputType>("texto");
  const [texto, setTexto] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<ResumoLevel | null>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: inputType === "pdf" 
      ? { 'application/pdf': ['.pdf'] }
      : { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setArquivo(acceptedFiles[0]);
      }
    },
  });

  const progressStepsAnalyze = [
    { progress: 15, message: "Iniciando análise..." },
    { progress: 35, message: "Lendo documento..." },
    { progress: 60, message: "Extraindo conteúdo..." },
    { progress: 85, message: "Organizando informações..." },
    { progress: 100, message: "✅ Análise concluída!" },
  ];

  const progressStepsSummarize = [
    { progress: 15, message: "Iniciando síntese..." },
    { progress: 40, message: "Identificando pontos-chave..." },
    { progress: 70, message: "Estruturando o resumo..." },
    { progress: 90, message: "Finalizando..." },
    { progress: 100, message: "✅ Resumo pronto!" },
  ];

  const simulateProgress = (steps: { progress: number; message: string }[]) => {
    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setProgress(steps[currentStep].progress);
        setStatusMessage(steps[currentStep].message);
        currentStep++;
      } else {
        clearInterval(interval);
      }
    }, 1200);
    return interval;
  };

  const handleAnalyze = async () => {
    if (!selectedLevel) {
      toast({
        title: "Selecione o tipo de resumo",
        description: "É obrigatório escolher entre Resumido ou Detalhado.",
        variant: "destructive",
      });
      return;
    }

    if (inputType === "texto" && !texto.trim()) {
      toast({
        title: "Campo vazio",
        description: "Por favor, insira um texto para resumir.",
        variant: "destructive",
      });
      return;
    }

    if ((inputType === "pdf" || inputType === "imagem") && !arquivo) {
      toast({
        title: "Arquivo não selecionado",
        description: "Por favor, selecione um arquivo.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setStatusMessage("Iniciando análise...");
    const progressInterval = simulateProgress(progressStepsAnalyze);

    try {
      let arquivoBase64: string | undefined;
      if (arquivo) {
        const reader = new FileReader();
        arquivoBase64 = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(arquivo);
        });
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutos

      const { data, error } = await supabase.functions.invoke("gerar-resumo", {
        body: {
          tipo: inputType,
          conteudo: inputType === "texto" ? texto : undefined,
          arquivo: arquivoBase64,
          nomeArquivo: arquivo?.name,
          acao: "extrair",
        },
      });

      clearTimeout(timeoutId);
      clearInterval(progressInterval);

      if (error) {
        console.error("Erro da função gerar-resumo (extrair):", error);
        console.error("Detalhes completos do erro:", JSON.stringify(error, null, 2));
        throw new Error("Erro ao processar documento. Tente um arquivo menor ou em outro formato.");
      }

      if (data?.extraido && typeof data.extraido === "string" && data.extraido.trim().length > 0) {
        setExtractedText(data.extraido);
        setProgress(100);
        setStatusMessage("✅ Análise concluída!");
        setTimeout(() => {
          setIsProcessing(false);
        }, 500);
        toast({ 
          title: "Análise concluída!", 
          description: "Agora escolha o nível do resumo abaixo." 
        });
      } else {
        throw new Error("Não foi possível extrair texto do documento. Verifique se o arquivo está legível.");
      }
    } catch (error: any) {
      clearInterval(progressInterval);
      console.error("Erro ao analisar documento:", error);
      setProgress(0);
      setIsProcessing(false);
      setExtractedText(null);
      
      const errorMessage = error.name === 'AbortError' 
        ? "Tempo esgotado. Tente um arquivo menor." 
        : error.message || "Erro ao processar documento. Tente novamente.";
      
      toast({
        title: "Erro na análise",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleSummarize = async () => {
    if (!selectedLevel) {
      toast({
        title: "Erro",
        description: "Nível de resumo não selecionado.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    const progressInterval = simulateProgress(progressStepsSummarize);

    try {
      let arquivoBase64: string | undefined;
      if (arquivo && inputType !== "texto") {
        const reader = new FileReader();
        arquivoBase64 = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(arquivo);
        });
      }

      const { data, error } = await supabase.functions.invoke("gerar-resumo", {
        body: {
          tipo: inputType,
          conteudo: inputType === "texto" ? texto : extractedText || undefined,
          arquivo: arquivoBase64,
          nomeArquivo: arquivo?.name,
          acao: "resumir",
          nivel: selectedLevel,
        },
      });

      clearInterval(progressInterval);

      if (error) {
        console.error("Erro da função gerar-resumo (resumir):", error);
        console.error("Detalhes completos do erro:", JSON.stringify(error, null, 2));
        throw error;
      }

      if (data?.resumo) {
        setProgress(100);
        setStatusMessage("✅ Resumo pronto!");
        navigate("/resumos-juridicos/resultado", {
          state: { resumo: data.resumo, titulo: "Resumo Jurídico" },
        });
      } else {
        throw new Error(data?.error || "Falha ao gerar resumo.");
      }
    } catch (error: any) {
      clearInterval(progressInterval);
      console.error("Erro ao gerar resumo:", error);
      toast({
        title: "Erro ao gerar resumo",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  if (isProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-2xl">
          <ProgressBar
            progress={progress}
            message={statusMessage}
            subMessage="Isso pode levar alguns segundos..."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 py-4 max-w-4xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold mb-1">Resumos Jurídicos</h1>
        <p className="text-sm text-muted-foreground">
          Crie resumos estruturados de textos, PDFs ou imagens
        </p>
      </div>

      <div className="space-y-6">
        {/* ETAPA 1: Selecionar tipo de resumo - OBRIGATÓRIO */}
        <Card className="border-accent/50">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">
                1️⃣ Escolha o tipo de resumo
              </Label>
              <span className="text-xs text-accent font-medium px-2 py-1 bg-accent/10 rounded">
                Obrigatório
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={selectedLevel === "resumido" ? "default" : "outline"}
                className={`h-auto py-4 flex flex-col gap-2 ${
                  selectedLevel === "resumido" ? "ring-2 ring-accent" : ""
                }`}
                onClick={() => setSelectedLevel("resumido")}
              >
                <span className="text-lg">📋</span>
                <div>
                  <div className="font-semibold">Resumido</div>
                  <div className="text-xs opacity-80">Principais pontos</div>
                </div>
              </Button>
              <Button
                variant={selectedLevel === "detalhado" ? "default" : "outline"}
                className={`h-auto py-4 flex flex-col gap-2 ${
                  selectedLevel === "detalhado" ? "ring-2 ring-accent" : ""
                }`}
                onClick={() => setSelectedLevel("detalhado")}
              >
                <span className="text-lg">📚</span>
                <div>
                  <div className="font-semibold">Detalhado</div>
                  <div className="text-xs opacity-80">Análise completa</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ETAPA 2: Seleção de tipo de input */}
        <div>
          <Label className="text-base font-semibold mb-3 block">
            2️⃣ Escolha o formato do conteúdo
          </Label>
          <div className="grid grid-cols-3 gap-3">
          <Card
            className={`cursor-pointer transition-all ${
              inputType === "texto"
                ? "border-accent bg-accent/10"
                : "border-border hover:border-accent/50"
            }`}
              onClick={() => {
                setInputType("texto");
                setArquivo(null);
                setExtractedText(null);
                setSelectedLevel(null);
              }}
          >
            <CardContent className="p-4 flex flex-col items-center gap-2">
              <FileText className="w-8 h-8 text-accent" />
              <span className="text-sm font-medium">Texto</span>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all ${
              inputType === "pdf"
                ? "border-accent bg-accent/10"
                : "border-border hover:border-accent/50"
            }`}
            onClick={() => {
              setInputType("pdf");
              setTexto("");
              setExtractedText(null);
              setSelectedLevel(null);
            }}
          >
            <CardContent className="p-4 flex flex-col items-center gap-2">
              <Upload className="w-8 h-8 text-accent" />
              <span className="text-sm font-medium">PDF</span>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all ${
              inputType === "imagem"
                ? "border-accent bg-accent/10"
                : "border-border hover:border-accent/50"
            }`}
            onClick={() => {
              setInputType("imagem");
              setTexto("");
              setExtractedText(null);
              setSelectedLevel(null);
            }}
          >
            <CardContent className="p-4 flex flex-col items-center gap-2">
              <Image className="w-8 h-8 text-accent" />
              <span className="text-sm font-medium">Imagem</span>
            </CardContent>
          </Card>
          </div>
        </div>

        {/* ETAPA 3: Input de conteúdo */}
        {inputType === "texto" && (
          <div className="space-y-2">
            <Label htmlFor="texto">Digite ou cole seu texto</Label>
            <Textarea
              id="texto"
              placeholder="Cole aqui o texto que deseja resumir..."
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              className="min-h-[300px] resize-none"
            />
          </div>
        )}

        {/* Upload de arquivo */}
        {(inputType === "pdf" || inputType === "imagem") && (
          <div className="space-y-2">
            <Label>
              Selecione {inputType === "pdf" ? "um PDF" : "uma imagem"}
            </Label>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? "border-accent bg-accent/10"
                  : "border-border hover:border-accent/50"
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              {arquivo ? (
                <p className="text-sm text-foreground font-medium">{arquivo.name}</p>
              ) : (
                <>
                  <p className="text-sm text-foreground mb-1">
                    Arraste e solte ou clique para selecionar
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {inputType === "pdf" ? "PDF até 20MB" : "JPG, PNG ou WEBP até 20MB"}
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {extractedText && !isProcessing ? (
          <Button
            onClick={handleSummarize}
            size="lg"
            className="w-full bg-gradient-to-r from-accent to-primary"
            disabled={!selectedLevel}
          >
            Gerar Resumo {selectedLevel === "resumido" ? "Resumido" : "Detalhado"}
          </Button>
        ) : (
          <Button
            onClick={handleAnalyze}
            size="lg"
            className="w-full bg-gradient-to-r from-accent to-primary"
            disabled={isProcessing || !selectedLevel}
          >
            {!selectedLevel ? "Escolha o tipo de resumo primeiro" : "Analisar e Gerar Resumo"}
          </Button>
        )}
      </div>
    </div>
  );
};

export default ResumosJuridicos;
