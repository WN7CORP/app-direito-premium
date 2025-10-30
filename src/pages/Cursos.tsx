import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, GraduationCap, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Area {
  area: string;
  capa: string;
  totalModulos: number;
  totalAulas: number;
  fonte: 'CURSOS-APP' | 'CURSOS';
  cor?: string;
  primeirosTemas?: string[];
}

const CORES_AREAS: Record<string, string> = {
  "Direito Penal": "from-red-600 to-red-800",
  "Direito Civil": "from-blue-600 to-blue-800",
  "Direito Constitucional": "from-green-600 to-green-800",
  "Direito Administrativo": "from-purple-600 to-purple-800",
  "Direito Trabalhista": "from-yellow-600 to-yellow-800",
  "Direito Empresarial": "from-pink-600 to-pink-800",
  "Direito Tributário": "from-indigo-600 to-indigo-800",
  "Direito Processual Civil": "from-cyan-600 to-cyan-800",
  "Direito Processual Penal": "from-orange-600 to-orange-800",
};

const Cursos = () => {
  const navigate = useNavigate();
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAreas = async () => {
      setLoading(true);
      
      try {
        // Buscar dados de CURSOS-APP
        const { data: cursosAppData, error: cursosAppError } = await supabase
          .from("CURSOS-APP" as any)
          .select("area, tema, ordem")
          .order("area")
          .order("ordem");

        // Buscar dados de CURSOS (antigo)
        const { data: cursosData, error: cursosError } = await supabase
          .from("CURSOS" as any)
          .select("Area, Modulo, Aula, \"capa-area\"")
          .order("Area", { ascending: true });

        const areasArray: Area[] = [];

        // Processar CURSOS-APP
        if (cursosAppData && !cursosAppError) {
          const areasMap = new Map<string, { temas: string[]; totalAulas: number }>();
          
          cursosAppData.forEach((item: any) => {
            if (item.area) {
              if (!areasMap.has(item.area)) {
                areasMap.set(item.area, { temas: [], totalAulas: 0 });
              }
              const areaData = areasMap.get(item.area)!;
              areaData.temas.push(item.tema);
              areaData.totalAulas++;
            }
          });

          areasMap.forEach((data, area) => {
            areasArray.push({
              area,
              capa: "",
              totalModulos: 1,
              totalAulas: data.totalAulas,
              fonte: 'CURSOS-APP',
              cor: CORES_AREAS[area] || "from-gray-600 to-gray-800",
              primeirosTemas: data.temas.slice(0, 3),
            });
          });
        }

        // Processar CURSOS (antigo)
        if (cursosData && !cursosError) {
          const areasMap = new Map<string, { capa: string; modulos: Set<number>; totalAulas: number }>();
          
          cursosData.forEach((item: any) => {
            if (item.Area) {
              if (!areasMap.has(item.Area)) {
                areasMap.set(item.Area, {
                  capa: item["capa-area"] || "",
                  modulos: new Set(),
                  totalAulas: 0
                });
              }
              const areaData = areasMap.get(item.Area)!;
              if (item.Modulo) areaData.modulos.add(item.Modulo);
              if (item.Aula) areaData.totalAulas++;
            }
          });

          areasMap.forEach((data, area) => {
            areasArray.push({
              area,
              capa: data.capa,
              totalModulos: data.modulos.size,
              totalAulas: data.totalAulas,
              fonte: 'CURSOS',
            });
          });
        }

        setAreas(areasArray);
      } catch (error) {
        console.error("Erro ao buscar áreas:", error);
      }
      
      setLoading(false);
    };

    fetchAreas();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background pb-20">
      {/* Hero Section */}
      <div className="bg-card border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="text-center">
            <div className="inline-block bg-gradient-to-br from-primary to-accent rounded-2xl p-4 mb-4 shadow-lg">
              <BookOpen className="w-10 h-10 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold mb-2 text-foreground">
              Cursos Jurídicos
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Aprenda direito de forma estruturada com nossos cursos completos
            </p>
          </div>
        </div>
      </div>

      {/* Cursos - Iniciando o Direito */}
      {areas.filter(a => a.fonte === 'CURSOS-APP').length > 0 && (
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <GraduationCap className="w-7 h-7 text-primary" />
              📚 Iniciando o Direito
            </h2>
            <p className="text-muted-foreground mt-1">
              Curso completo para quem está começando no mundo jurídico
            </p>
          </div>

          {/* Timeline igual à História Jurídica */}
          <div className="relative space-y-6">
            {/* Linha vertical */}
            <div className="absolute left-[9px] top-0 bottom-0 w-0.5 bg-border" />

            {areas.filter(a => a.fonte === 'CURSOS-APP').map((area, index) => (
              <div key={index} className="relative pl-8">
                {/* Marcador colorido */}
                <div className={`absolute left-0 top-2 w-5 h-5 rounded-full bg-gradient-to-br ${area.cor} border-4 border-background`} />
                
                {/* Card da área */}
                <button
                  onClick={() => navigate(`/iniciando-direito/${encodeURIComponent(area.area)}`)}
                  className="w-full text-left bg-card border border-border rounded-lg p-5 hover:border-primary hover:shadow-lg transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                        {area.area}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {area.totalAulas} {area.totalAulas === 1 ? 'tema' : 'temas'} disponíveis
                      </p>
                    </div>
                    <span className={`bg-gradient-to-br ${area.cor} text-white px-3 py-1 rounded-full text-xs font-semibold`}>
                      {index + 1}
                    </span>
                  </div>

                  {/* Preview dos 3 primeiros temas */}
                  {area.primeirosTemas && area.primeirosTemas.length > 0 && (
                    <div className="space-y-2 mt-4 pt-4 border-t border-border">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        Primeiros temas:
                      </p>
                      {area.primeirosTemas.map((tema, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="text-primary mt-1">•</span>
                          <span className="flex-1">{tema}</span>
                        </div>
                      ))}
                    </div>
                  )}

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
      )}

      {/* Cursos Avançados (da tabela antiga) */}
      {areas.filter(a => a.fonte === 'CURSOS').length > 0 && (
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <BookOpen className="w-7 h-7 text-primary" />
              🎓 Cursos Avançados
            </h2>
            <p className="text-muted-foreground mt-1">
              Aprofunde seus conhecimentos com cursos completos
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {areas.filter(a => a.fonte === 'CURSOS').map((area, index) => (
              <div
                key={index}
                onClick={() => navigate(`/cursos/modulos?area=${encodeURIComponent(area.area)}`)}
                className="group cursor-pointer bg-card border border-border rounded-xl overflow-hidden hover:shadow-xl hover:border-primary transition-all duration-300"
              >
                {/* Imagem do curso */}
                <div className="relative h-48 bg-gradient-to-br from-primary/20 to-accent/20 overflow-hidden">
                  {area.capa ? (
                    <img
                      src={area.capa}
                      alt={area.area}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="w-16 h-16 text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-xl font-bold text-white mb-1 drop-shadow-lg">
                      {area.area}
                    </h3>
                  </div>
                </div>

                {/* Informações do curso */}
                <div className="p-6">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <GraduationCap className="w-4 h-4" />
                      <span>{area.totalModulos} {area.totalModulos === 1 ? 'módulo' : 'módulos'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <BookOpen className="w-4 h-4" />
                      <span>{area.totalAulas} {area.totalAulas === 1 ? 'aula' : 'aulas'}</span>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm font-semibold text-primary group-hover:underline">
                      Acessar curso
                    </span>
                    <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Cursos;
