import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCursosCache } from "@/hooks/useCursosCache";
import { BookOpen, ArrowRight } from "lucide-react";
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
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="md:text-lg text-foreground font-normal text-base">
            Cursos em Destaque
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Descomplicando o Direito
          </p>
        </div>
        <button 
          onClick={() => navigate("/iniciando-direito")} 
          className="text-accent font-medium flex items-center text-sm md:text-xs hover:underline"
        >
          Ver todos <span className="text-lg md:text-base ml-0.5">›</span>
        </button>
      </div>

      <ScrollArea className="w-full">
        <div className="flex gap-3 md:gap-4 pb-4">
          {cursosDestaque.map((curso, idx) => (
            <div
              key={idx}
              onClick={() => navigate(`/iniciando-direito/${encodeURIComponent(curso.area)}/${encodeURIComponent(curso.tema)}`)}
              className="flex-shrink-0 w-[240px] cursor-pointer hover:scale-105 transition-all duration-300 group"
            >
              <div 
                className="relative rounded-xl overflow-hidden border-2 shadow-lg hover:shadow-2xl transition-all duration-300"
                style={{
                  backgroundColor: curso.corHex + '20',
                  borderColor: curso.corHex + '40'
                }}
              >
                {/* Imagem da capa se disponível */}
                {curso.capaAula ? (
                  <>
                    <img 
                      src={curso.capaAula} 
                      alt={curso.tema}
                      className="w-full h-auto object-contain transition-transform duration-500 group-hover:scale-105"
                    />
                    {/* Gradient overlay de baixo para cima - mais forte embaixo */}
                    <div 
                      className="absolute inset-0"
                      style={{
                        background: `linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 30%, rgba(0,0,0,0.3) 50%, transparent 70%)`
                      }}
                    />
                  </>
                ) : (
                  <>
                    {/* Gradient background quando não há capa */}
                    <div 
                      className="absolute inset-0"
                      style={{
                        background: `linear-gradient(135deg, ${curso.corHex}30, ${curso.corHex}10)`
                      }}
                    />
                    {/* Gradient overlay também no fallback */}
                    <div 
                      className="absolute inset-0"
                      style={{
                        background: `linear-gradient(to top, ${curso.corHex}40 0%, transparent 60%)`
                      }}
                    />
                  </>
                )}
                
                {/* Icon */}
                <div className="absolute top-4 left-4 z-10">
                  <div 
                    className="rounded-full p-2.5 shadow-lg backdrop-blur-sm"
                    style={{ backgroundColor: curso.corHex + (curso.capaAula ? '90' : '') }}
                  >
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                </div>

                {/* Aula número badge */}
                <div className="absolute top-4 right-4 z-10">
                  <div 
                    className="px-3 py-1 rounded-full text-xs font-bold text-white shadow-lg backdrop-blur-sm"
                    style={{ backgroundColor: curso.corHex + (curso.capaAula ? '90' : '') }}
                  >
                    Aula {curso.ordem}
                  </div>
                </div>

                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
                  <div className="mb-1">
                    <p 
                      className="text-xs font-semibold drop-shadow-lg text-white"
                    >
                      {curso.area}
                    </p>
                  </div>
                  <h3 
                    className="font-bold text-sm leading-tight line-clamp-2 mb-2 drop-shadow-lg text-white"
                  >
                    {curso.tema}
                  </h3>
                  
                  {/* Arrow on hover */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span 
                      className="text-xs font-medium drop-shadow-lg text-white"
                    >
                      Assistir aula
                    </span>
                    <ArrowRight 
                      className="w-3 h-3 text-white" 
                    />
                  </div>
                </div>

                {/* Hover overlay */}
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background: `linear-gradient(to top, ${curso.corHex}60 0%, transparent 60%)`
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};
