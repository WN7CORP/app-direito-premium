import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCursosCache } from "@/hooks/useCursosCache";
import { Play, ArrowRight } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { SmartLoadingIndicator } from "@/components/chat/SmartLoadingIndicator";

interface CursoPreview {
  area: string;
  tema: string;
  ordem: number;
  corHex: string;
  capaAula?: string;
}

const CORES_AREAS: Record<string, string> = {
  "Direito Penal": "#ef4444",
  "Direito Civil": "#3b82f6",
  "Direito Constitucional": "#10b981",
  "Direito Administrativo": "#a855f7",
  "Direito Trabalhista": "#f59e0b",
  "Direito Empresarial": "#ec4899",
  "Direito Tributário": "#6366f1",
  "Direito Processual Civil": "#06b6d4",
  "Direito Processual Penal": "#f97316"
};

export const CursosCarousel = () => {
  const navigate = useNavigate();
  const { cursos, loading: cursosLoading } = useCursosCache();
  const [cursosDestaque, setCursosDestaque] = useState<CursoPreview[]>([]);

  useEffect(() => {
    if (!cursosLoading && cursos.length > 0) {
      // Pegar todas as áreas disponíveis
      const areas = [...new Set(cursos.map((c: any) => c.area))];
      
      // Escolher uma área aleatória ou rotacionar
      const areaEscolhida = areas[Math.floor(Math.random() * areas.length)];
      
      // Pegar as primeiras 6 aulas dessa área
      const cursosArea = cursos
        .filter((c: any) => c.area === areaEscolhida)
        .slice(0, 6)
        .map((c: any) => ({
          area: c.area,
          tema: c.tema,
          ordem: c.ordem,
          corHex: CORES_AREAS[c.area] || "#6b7280",
          capaAula: c['capa-aula']
        }));
      
      setCursosDestaque(cursosArea);
    }
  }, [cursosLoading, cursos]);

  if (cursosLoading) {
    return <SmartLoadingIndicator nome="Cursos" />;
  }

  if (cursosDestaque.length === 0) {
    return null;
  }

  const areaAtual = cursosDestaque[0]?.area;

  return (
    <ScrollArea className="w-full">
      <div className="flex gap-3 md:gap-4 pb-4">
        {cursosDestaque.map((curso, idx) => (
          <div
            key={idx}
            onClick={() => navigate(`/iniciando-direito/${encodeURIComponent(curso.area)}/${encodeURIComponent(curso.tema)}`)}
            className="flex-shrink-0 w-[320px] cursor-pointer hover:scale-105 transition-all duration-300 group bg-card rounded-xl overflow-hidden shadow-lg hover:shadow-2xl border border-border"
          >
            {/* Container da imagem - limpo, sem texto sobreposto */}
            <div 
              className="relative overflow-hidden"
              style={{
                backgroundColor: curso.corHex + '20'
              }}
            >
              {/* Imagem da capa */}
              {curso.capaAula ? (
                <img 
                  src={curso.capaAula} 
                  alt={curso.tema}
                  className="w-full h-auto object-contain transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div 
                  className="w-full aspect-[3/4]"
                  style={{
                    background: `linear-gradient(135deg, ${curso.corHex}30, ${curso.corHex}10)`
                  }}
                />
              )}
              
              {/* Icon de Play - centralizado */}
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <div 
                  className="rounded-full p-4 shadow-2xl backdrop-blur-sm"
                  style={{ backgroundColor: curso.corHex + '40' }}
                >
                  <Play className="w-8 h-8 text-white fill-white" />
                </div>
              </div>

              {/* Aula número badge - apenas sobre a imagem */}
              <div className="absolute top-4 right-4 z-10">
                <div 
                  className="px-3 py-1 rounded-full text-xs font-bold text-white shadow-lg backdrop-blur-sm"
                  style={{ backgroundColor: curso.corHex + (curso.capaAula ? '90' : '') }}
                >
                  Aula {curso.ordem}
                </div>
              </div>

              {/* Hover overlay sutil */}
              <div 
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background: `linear-gradient(to top, ${curso.corHex}20 0%, transparent 40%)`
                }}
              />
            </div>

            {/* Informações ABAIXO da capa */}
            <div className="p-3">
              <p className="text-xs text-muted-foreground mb-1">
                {curso.area}
              </p>
              <h3 className="font-bold text-sm leading-tight line-clamp-2 text-foreground">
                {curso.tema}
              </h3>
            </div>
          </div>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
};
