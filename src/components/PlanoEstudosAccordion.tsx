import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface DiaData {
  diaSemana: string;
  conteudo: string;
}

interface SemanaData {
  numero: number;
  titulo: string;
  dias: DiaData[];
  conteudoCompleto: string;
}

interface PlanoEstudosAccordionProps {
  semanas: SemanaData[];
}

export const PlanoEstudosAccordion = ({ semanas }: PlanoEstudosAccordionProps) => {
  if (!semanas || semanas.length === 0) {
    return null;
  }

  return (
    <Accordion type="single" collapsible className="w-full space-y-3">
      {semanas.map((semana) => (
        <AccordionItem 
          key={semana.numero} 
          value={`semana-${semana.numero}`}
          className="border border-border rounded-lg overflow-hidden"
        >
          <AccordionTrigger className="px-4 py-3 hover:bg-accent/5 text-left font-bold">
            <div className="flex items-center gap-2">
              <span className="text-accent">📅</span>
              <span>Semana {semana.numero}</span>
              {semana.titulo && <span className="text-muted-foreground font-normal">• {semana.titulo}</span>}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            {semana.dias.length > 0 ? (
              <Accordion type="single" collapsible className="pl-2 space-y-2">
                {semana.dias.map((dia, idx) => (
                  <AccordionItem 
                    key={idx} 
                    value={`dia-${idx}`}
                    className="border border-border/50 rounded-md"
                  >
                    <AccordionTrigger className="px-3 py-2 text-sm hover:bg-accent/5">
                      <div className="flex items-center gap-2">
                        <span className="text-accent text-xs">📖</span>
                        <span className="font-semibold">{dia.diaSemana}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-3 pb-3">
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {dia.conteudo}
                        </ReactMarkdown>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <div className="prose prose-sm max-w-none dark:prose-invert pl-2">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {semana.conteudoCompleto}
                </ReactMarkdown>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
};
