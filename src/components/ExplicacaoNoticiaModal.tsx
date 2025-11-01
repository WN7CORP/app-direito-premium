import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Share2, FileDown, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { formatForWhatsApp } from "@/lib/formatWhatsApp";

interface ExplicacaoNoticiaModalProps {
  isOpen: boolean;
  onClose: () => void;
  titulo: string;
  url: string;
  analisePreGerada?: string;
}

const ExplicacaoNoticiaModal = ({
  isOpen,
  onClose,
  titulo,
  url,
  analisePreGerada,
}: ExplicacaoNoticiaModalProps) => {
  const [loading, setLoading] = useState(false);
  const [explicacao, setExplicacao] = useState(analisePreGerada || "");
  const [exportingPDF, setExportingPDF] = useState(false);

  const gerarExplicacao = async () => {
    try {
      setLoading(true);
      setExplicacao("");

      const { data, error } = await supabase.functions.invoke("explicar-noticia", {
        body: { url, titulo },
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      setExplicacao(data.explicacao);
      toast.success("Explicação gerada com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar explicação:", error);
      toast.error("Erro ao gerar explicação. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const compartilharWhatsApp = () => {
    if (!explicacao) return;

    const conteudoMarkdown = `# ${titulo}\n\n${explicacao}\n\n---\n\n**Fonte:** ${url}`;
    const textoFormatado = formatForWhatsApp(conteudoMarkdown);
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(textoFormatado)}`;
    window.open(whatsappUrl, "_blank");
    toast.success("Abrindo WhatsApp...");
  };

  const handleExportPDF = async () => {
    if (!explicacao) return;

    try {
      setExportingPDF(true);
      toast.info("Gerando PDF...");

      const conteudoCompleto = `${explicacao}\n\n---\n\n**Fonte:** ${url}`;

      const { data, error } = await supabase.functions.invoke("exportar-pdf-educacional", {
        body: {
          content: conteudoCompleto,
          filename: `explicacao-noticia-${Date.now()}`,
          title: `Explicação: ${titulo}`,
        },
      });

      if (error) throw error;

      if (data?.pdfUrl) {
        // Abrir o PDF em nova aba
        window.open(data.pdfUrl, '_blank');
        toast.success("PDF gerado com sucesso!");
      } else {
        throw new Error("URL do PDF não foi retornada");
      }
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      toast.error("Erro ao gerar PDF. Tente novamente.");
    } finally {
      setExportingPDF(false);
    }
  };

  const handleClose = () => {
    // Não limpar se for análise pré-gerada
    if (!analisePreGerada) {
      setExplicacao("");
    }
    setLoading(false);
    onClose();
  };

  // Se tiver análise pré-gerada e explicacao estiver vazio, popular
  useEffect(() => {
    if (analisePreGerada && !explicacao && isOpen) {
      setExplicacao(analisePreGerada);
    }
  }, [analisePreGerada, isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Explicação Detalhada
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!explicacao && !loading && (
            <div className="text-center py-8">
              <Sparkles className="w-16 h-16 mx-auto text-primary mb-4 animate-pulse" />
              <p className="text-muted-foreground mb-6">
                Clique no botão abaixo para gerar uma explicação detalhada e descomplicada desta notícia
              </p>
              <Button onClick={gerarExplicacao} size="lg" className="gap-2">
                <Sparkles className="w-4 h-4" />
                Gerar Explicação com IA
              </Button>
            </div>
          )}

          {loading && (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">
                Analisando notícia e gerando explicação detalhada...
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Isso pode levar alguns segundos
              </p>
            </div>
          )}

          {explicacao && !loading && (
            <>
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => (
                      <h1 className="text-2xl font-bold text-foreground mb-4 mt-6">{children}</h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-xl font-semibold text-foreground mb-3 mt-5">{children}</h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-lg font-semibold text-foreground mb-2 mt-4">{children}</h3>
                    ),
                    p: ({ children }) => (
                      <p className="text-foreground mb-3 leading-relaxed">{children}</p>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc list-inside space-y-2 mb-4 text-foreground">{children}</ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal list-inside space-y-2 mb-4 text-foreground">{children}</ol>
                    ),
                    li: ({ children }) => (
                      <li className="text-foreground ml-4">{children}</li>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-bold text-primary">{children}</strong>
                    ),
                  }}
                >
                  {explicacao}
                </ReactMarkdown>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  onClick={compartilharWhatsApp}
                  variant="outline"
                  className="flex-1 gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  Compartilhar
                </Button>
                <Button
                  onClick={handleExportPDF}
                  disabled={exportingPDF}
                  variant="outline"
                  className="flex-1 gap-2"
                >
                  {exportingPDF ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileDown className="w-4 h-4" />
                  )}
                  Exportar PDF
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExplicacaoNoticiaModal;
