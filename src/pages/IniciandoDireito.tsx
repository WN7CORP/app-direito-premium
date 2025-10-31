import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, GraduationCap } from "lucide-react";
import { useCursosCache } from "@/hooks/useCursosCache";
interface AreaData {
  area: string;
  totalTemas: number;
  primeirosTemas: string[];
  cor: string;
}
const CORES_AREAS: Record<string, string> = {
  "Direito Penal": "bg-red-600",
  "Direito Civil": "bg-blue-600",
  "Direito Constitucional": "bg-green-600",
  "Direito Administrativo": "bg-purple-600",
  "Direito Trabalhista": "bg-yellow-600",
  "Direito Empresarial": "bg-pink-600",
  "Direito Tributário": "bg-indigo-600",
  "Direito Processual Civil": "bg-cyan-600",
  "Direito Processual Penal": "bg-orange-600"
};
export default function IniciandoDireito() {
  const navigate = useNavigate();
  const [areas, setAreas] = useState<AreaData[]>([]);
  const [loading, setLoading] = useState(true);
  const { cursos, loading: cursosLoading } = useCursosCache();

  useEffect(() => {
    if (!cursosLoading) {
      processarAreas();
    }
  }, [cursosLoading, cursos]);

  const processarAreas = () => {
    if (cursos.length === 0) {
      setAreas([]);
      setLoading(false);
      return;
    }

    // Agrupar por área
    const areasMap = new Map<string, {
      temas: string[];
      total: number;
    }>();
    
    cursos.forEach((curso: any) => {
      const area = curso.area;
      if (!areasMap.has(area)) {
        areasMap.set(area, {
          temas: [],
          total: 0
        });
      }
      const areaData = areasMap.get(area)!;
      areaData.temas.push(curso.tema);
      areaData.total++;
    });

    // Converter para array
    const areasArray: AreaData[] = Array.from(areasMap.entries()).map(([area, dados]) => ({
      area,
      totalTemas: dados.total,
      primeirosTemas: dados.temas.slice(0, 3),
      cor: CORES_AREAS[area] || 'bg-gray-600'
    }));
    
    setAreas(areasArray);
    setLoading(false);
  };
  if (loading) {
    return <div className="min-h-screen bg-gradient-to-br from-background via-card to-background flex items-center justify-center">
        <div className="text-center">
          <GraduationCap className="w-16 h-16 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Carregando áreas do Direito...</p>
        </div>
      </div>;
  }
  return <div className="min-h-screen bg-gradient-to-br from-background via-card to-background pb-20">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-[600px] lg:max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center animate-scale-in shadow-lg">
              <GraduationCap className="w-6 h-6 text-primary-foreground animate-pulse" />
            </div>
            <div className="animate-fade-in-up">
              <h1 className="text-2xl font-bold text-foreground bg-gradient-to-r from-foreground to-primary bg-clip-text">
                Iniciando o Direito
              </h1>
              <p className="text-sm text-muted-foreground">Sua jornada no mundo jurídico começa aqui</p>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-[600px] lg:max-w-4xl mx-auto px-4 py-6">
        <div className="bg-card/50 backdrop-blur-sm border border-border rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Sobre este Curso
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            O "Iniciando o Direito" é o curso perfeito para quem está começando a estudar Direito. 
            Explore cada área jurídica através de videoaulas didáticas e conteúdo detalhado gerado 
            especialmente para facilitar seu aprendizado. Escolha uma área abaixo para começar!
          </p>
        </div>

        {/* Timeline de Áreas */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-foreground mb-4">Áreas do Direito</h2>
          
          <div className="relative space-y-6">
            {/* Linha vertical */}
            <div className="absolute left-[9px] top-0 bottom-0 w-0.5 bg-border" />

            {areas.map((areaData, index) => <div key={areaData.area} className="relative pl-8 animate-fade-in-up" style={{
            animationDelay: `${index * 0.15}s`,
            animationFillMode: 'backwards'
          }}>
                {/* Marcador colorido com pulso */}
                <div className={`absolute left-0 top-2 w-5 h-5 rounded-full ${areaData.cor} border-4 border-background shadow-lg animate-glow-pulse`} style={{
              animationDelay: `${index * 0.15 + 0.3}s`
            }} />
                
                {/* Card da área com background gradiente */}
                <button onClick={() => navigate(`/iniciando-direito/${encodeURIComponent(areaData.area)}`)} className={`w-full text-left relative overflow-hidden backdrop-blur-sm border-2 border-border/50 rounded-lg p-5 hover:border-primary hover:shadow-2xl shadow-lg transition-all duration-300 group hover:scale-[1.02] bg-accent/5`} style={{
              background: `linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--card)/0.8) 80%, ${areaData.cor.replace('bg-', '')} 100%)`,
              backgroundSize: '200% 200%',
              backgroundPosition: '0% 0%'
            }}>
                  {/* Shimmer effect on hover */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-300" style={{
                background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)`,
                backgroundSize: '200% 100%'
              }} />
                  
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors duration-300">
                          {areaData.area}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {areaData.totalTemas} {areaData.totalTemas === 1 ? 'tema' : 'temas'} disponíveis
                        </p>
                      </div>
                      <span className={`${areaData.cor} text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-md animate-bounce-in`} style={{
                    animationDelay: `${index * 0.15 + 0.5}s`,
                    animationFillMode: 'backwards'
                  }}>
                        {index + 1}
                      </span>
                    </div>

                    {/* Preview dos 3 primeiros temas */}
                    <div className="space-y-2 mt-4 pt-4 border-t border-border/50">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        Primeiros temas:
                      </p>
                      {areaData.primeirosTemas.map((tema, i) => <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                          <span className="text-primary mt-1">•</span>
                          <span className="flex-1">{tema}</span>
                        </div>)}
                    </div>

                    <div className="mt-4 text-right">
                      <span className="text-xs text-primary font-semibold group-hover:underline inline-flex items-center gap-1">
                        Ver todos os temas →
                      </span>
                    </div>
                  </div>
                </button>
              </div>)}
          </div>
        </div>
      </div>
    </div>;
}