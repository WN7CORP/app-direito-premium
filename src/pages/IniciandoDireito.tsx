import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, GraduationCap } from "lucide-react";
import { toast } from "sonner";

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
  "Direito Processual Penal": "bg-orange-600",
};

export default function IniciandoDireito() {
  const navigate = useNavigate();
  const [areas, setAreas] = useState<AreaData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarAreas();
  }, []);

  const carregarAreas = async () => {
    try {
      const { data, error } = await supabase
        .from('CURSOS-APP' as any)
        .select('area, tema, ordem')
        .order('area')
        .order('ordem');

      if (error) throw error;

      if (!data) {
        setAreas([]);
        return;
      }

      // Agrupar por área
      const areasMap = new Map<string, { temas: string[], total: number }>();
      
      data.forEach((row: any) => {
        const area = row.area;
        if (!areasMap.has(area)) {
          areasMap.set(area, { temas: [], total: 0 });
        }
        const areaData = areasMap.get(area)!;
        areaData.temas.push(row.tema);
        areaData.total++;
      });

      // Converter para array
      const areasArray: AreaData[] = Array.from(areasMap.entries()).map(([area, dados]) => ({
        area,
        totalTemas: dados.total,
        primeirosTemas: dados.temas.slice(0, 3),
        cor: CORES_AREAS[area] || 'bg-gray-600',
      }));

      setAreas(areasArray);
    } catch (error) {
      console.error('Erro ao carregar áreas:', error);
      toast.error('Erro ao carregar áreas do Direito');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-card to-background flex items-center justify-center">
        <div className="text-center">
          <GraduationCap className="w-16 h-16 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Carregando áreas do Direito...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background pb-20">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="mb-3"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Iniciando o Direito</h1>
              <p className="text-sm text-muted-foreground">Sua jornada no mundo jurídico começa aqui</p>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-4xl mx-auto px-4 py-6">
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

            {areas.map((areaData, index) => (
              <div key={areaData.area} className="relative pl-8">
                {/* Marcador colorido */}
                <div className={`absolute left-0 top-2 w-5 h-5 rounded-full ${areaData.cor} border-4 border-background`} />
                
                {/* Card da área */}
                <button
                  onClick={() => navigate(`/iniciando-direito/${encodeURIComponent(areaData.area)}`)}
                  className="w-full text-left bg-card/80 backdrop-blur-sm border-2 border-border rounded-lg p-5 hover:border-primary hover:shadow-2xl shadow-lg transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                        {areaData.area}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {areaData.totalTemas} {areaData.totalTemas === 1 ? 'tema' : 'temas'} disponíveis
                      </p>
                    </div>
                    <span className={`${areaData.cor} text-white px-3 py-1 rounded-full text-xs font-semibold`}>
                      {index + 1}
                    </span>
                  </div>

                  {/* Preview dos 3 primeiros temas */}
                  <div className="space-y-2 mt-4 pt-4 border-t border-border">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Primeiros temas:
                    </p>
                    {areaData.primeirosTemas.map((tema, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="text-primary mt-1">•</span>
                        <span className="flex-1">{tema}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 text-right">
                    <span className="text-xs text-primary font-semibold group-hover:underline">
                      Ver todos os temas →
                    </span>
                  </div>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
