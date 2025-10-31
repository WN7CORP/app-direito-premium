import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { parsePlanoEstudos } from "@/lib/planoEstudosParser";
import { PlanoEstudosAccordion } from "@/components/PlanoEstudosAccordion";

const PlanoEstudosResultado = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { plano, materia, totalHoras } = location.state || {};
  const [exportingPDF, setExportingPDF] = useState(false);

  if (!plano) {
    navigate("/plano-estudos");
    return null;
  }

  const planoParseado = parsePlanoEstudos(plano);

  const handleExportPDF = async () => {
    setExportingPDF(true);
    try {
      const { data, error } = await supabase.functions.invoke('exportar-pdf-educacional', {
        body: { 
          content: plano,
          filename: `plano-estudos-${materia?.toLowerCase().replace(/\s+/g, '-')}`,
          title: `Plano de Estudos: ${materia}`,
          darkMode: true, // Ativar modo escuro com margens ABNT
        }
      });
      
      if (error) throw error;
      
      window.open(data.pdfUrl, '_blank');
      
      toast({
        title: "PDF gerado!",
        description: "O PDF com fundo escuro foi aberto em uma nova aba.",
      });
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast({
        title: "Erro ao gerar PDF",
        description: "Não foi possível gerar o PDF. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setExportingPDF(false);
    }
  };

  return (
    <div className="px-3 py-4 max-w-4xl mx-auto animate-fade-in">
      <div className="mb-6 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/plano-estudos")}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Plano Criado</h1>
          <p className="text-sm text-muted-foreground">
            Seu cronograma personalizado está pronto
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Info card */}
        <Card className="bg-accent/10 border-accent/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Matéria</p>
                <p className="font-semibold text-foreground">{materia}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Carga Total</p>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-accent" />
                  <p className="font-semibold text-accent">{totalHoras}h</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Botão de exportar */}
        <Button onClick={handleExportPDF} disabled={exportingPDF} className="w-full" size="lg">
          <Download className="w-4 h-4 mr-2" />
          {exportingPDF ? "Gerando PDF..." : "Exportar PDF"}
        </Button>

        {/* Objetivo e Visão Geral */}
        {(planoParseado.objetivo || planoParseado.visaoGeral) && (
          <Card className="border-accent/20">
            <CardContent className="p-6 space-y-4">
              {planoParseado.objetivo && (
                <div>
                  <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                    <span className="text-accent">🎯</span> Objetivo
                  </h2>
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {planoParseado.objetivo}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
              {planoParseado.visaoGeral && (
                <div>
                  <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                    <span className="text-accent">📋</span> Visão Geral
                  </h2>
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {planoParseado.visaoGeral}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Cronograma com Accordion */}
        {planoParseado.semanas.length > 0 && (
          <Card className="border-accent/20">
            <CardContent className="p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="text-accent">📚</span> Cronograma Semanal
              </h2>
              <PlanoEstudosAccordion semanas={planoParseado.semanas} />
            </CardContent>
          </Card>
        )}

        {/* Outras Seções */}
        {(planoParseado.materiaisEstudo || planoParseado.estrategias || planoParseado.checklist || planoParseado.revisaoFinal) && (
          <Card className="border-accent/20">
            <CardContent className="p-6 space-y-6">
              {planoParseado.materiaisEstudo && (
                <div>
                  <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                    <span className="text-accent">📚</span> Materiais de Estudo
                  </h2>
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {planoParseado.materiaisEstudo}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
              {planoParseado.estrategias && (
                <div>
                  <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                    <span className="text-accent">💡</span> Estratégias
                  </h2>
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {planoParseado.estrategias}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
              {planoParseado.checklist && (
                <div>
                  <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                    <span className="text-accent">✅</span> Checklist
                  </h2>
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {planoParseado.checklist}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
              {planoParseado.revisaoFinal && (
                <div>
                  <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                    <span className="text-accent">🔄</span> Revisão Final
                  </h2>
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {planoParseado.revisaoFinal}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Botão para novo plano */}
        <Button
          onClick={() => navigate("/plano-estudos")}
          variant="outline"
          className="w-full"
        >
          Criar Novo Plano
        </Button>
      </div>
    </div>
  );
};

export default PlanoEstudosResultado;
