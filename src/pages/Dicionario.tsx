import { useState, useMemo, useCallback } from "react";
import { Book, Search, Lightbulb, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useDebounce } from "@/hooks/useDebounce";
import { useNavigate } from "react-router-dom";

interface DicionarioTermo {
  Letra: string | null;
  Palavra: string | null;
  Significado: string | null;
  "Exemplo de Uso 1": string | null;
  "Exemplo de Uso 2": string | null;
  exemplo_pratico?: string | null;
  exemplo_pratico_gerado_em?: string | null;
}

const Dicionario = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [exemploPratico, setExemploPratico] = useState<{ [palavra: string]: string }>({});
  const [loadingExemplo, setLoadingExemplo] = useState<{ [palavra: string]: boolean }>({});
  const { toast } = useToast();

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Buscar letras disponíveis
  const { data: letrasDisponiveis = [] } = useQuery({
    queryKey: ["dicionario-letras"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("DICIONARIO" as any)
        .select("Letra")
        .not("Letra", "is", null);

      if (error) throw error;
      const letras = [...new Set((data as any[]).map(d => d.Letra))].sort() as string[];
      return letras;
    },
    staleTime: 1000 * 60 * 60,
  });

  const alfabeto = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  // Buscar termos pela pesquisa global
  const { data: resultados = [], isLoading: isSearching } = useQuery({
    queryKey: ["dicionario-busca", debouncedSearch],
    queryFn: async () => {
      const termoBusca = debouncedSearch.trim();
      if (!termoBusca) return [];

      const { data, error } = await supabase
        .from("DICIONARIO" as any)
        .select("*")
        .or(`Palavra.ilike.%${termoBusca}%,Significado.ilike.%${termoBusca}%`)
        .order("Palavra", { ascending: true })
        .limit(50);

      if (error) throw error;

      const termos = (data || []) as unknown as DicionarioTermo[];
      
      // Ordenar por relevância: exato > começa com > contém
      return termos.sort((a, b) => {
        const palavraA = (a.Palavra || "").toLowerCase();
        const palavraB = (b.Palavra || "").toLowerCase();
        const termo = termoBusca.toLowerCase();
        
        const exatoA = palavraA === termo;
        const exatoB = palavraB === termo;
        if (exatoA && !exatoB) return -1;
        if (!exatoA && exatoB) return 1;
        
        const começaA = palavraA.startsWith(termo);
        const começaB = palavraB.startsWith(termo);
        if (começaA && !começaB) return -1;
        if (!começaA && começaB) return 1;
        
        return 0;
      });
    },
    enabled: debouncedSearch.trim().length > 0,
  });

  // Buscar sugestões se não encontrar resultados
  const { data: sugestoes = [] } = useQuery({
    queryKey: ["dicionario-sugestoes", debouncedSearch],
    queryFn: async () => {
      const termoBusca = debouncedSearch.trim();
      if (!termoBusca || resultados.length > 0) return [];

      const primeiraLetra = termoBusca.charAt(0).toUpperCase();
      const { data } = await supabase
        .from("DICIONARIO" as any)
        .select("Palavra")
        .eq("Letra", primeiraLetra)
        .limit(10);

      return (data || [])
        .map((d: any) => d.Palavra)
        .filter((p: string) => p && p.toLowerCase().includes(termoBusca.slice(0, 3).toLowerCase()))
        .slice(0, 3);
    },
    enabled: debouncedSearch.trim().length > 0,
  });

  const termosPorLetra = useMemo(() => {
    const grouped: { [key: string]: DicionarioTermo[] } = {};
    resultados.forEach((termo) => {
      const letra = termo.Letra || "Outros";
      if (!grouped[letra]) {
        grouped[letra] = [];
      }
      grouped[letra].push(termo);
    });
    return grouped;
  }, [resultados]);

  const letras = Object.keys(termosPorLetra).sort();

  const handleGerarExemplo = async (palavra: string, significado: string, existente?: string | null) => {
    if (exemploPratico[palavra]) {
      // Se já está aberto, fecha
      setExemploPratico((prev) => {
        const novo = { ...prev };
        delete novo[palavra];
        return novo;
      });
      return;
    }

    // Se já existir no banco, apenas exibe sem gerar
    if (existente) {
      setExemploPratico((prev) => ({ ...prev, [palavra]: existente }));
      return;
    }

    setLoadingExemplo((prev) => ({ ...prev, [palavra]: true }));

    try {
      const { data, error } = await supabase.functions.invoke("gerar-exemplo-pratico", {
        body: { palavra, significado },
      });

      if (error) throw error;

      setExemploPratico((prev) => ({ ...prev, [palavra]: data.exemplo }));

      if (!data.cached) {
        toast({
          title: "Exemplo gerado com sucesso!",
          description: "Gerado por IA e salvo para consultas futuras.",
        });
      }
    } catch (error) {
      console.error("Erro ao gerar exemplo:", error);
      toast({
        title: "Erro ao gerar exemplo",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setLoadingExemplo((prev) => ({ ...prev, [palavra]: false }));
    }
  };

  return (
    <div className="px-3 py-4 max-w-4xl mx-auto pb-24">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold mb-1">Dicionário Jurídico</h1>
        <p className="text-sm text-muted-foreground">
          Consulte termos e definições do direito
        </p>
      </div>

      {/* Barra de Busca */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar termo jurídico..."
          className="pl-10 h-11 bg-card border-border"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Seletor de Letras - Maiores e clicáveis */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-muted-foreground mb-3">Buscar por letra:</p>
        <div className="grid grid-cols-4 gap-3">
          {alfabeto.map((letra) => {
            const disponivel = letrasDisponiveis.includes(letra);
            return (
              <Button
                key={letra}
                variant="outline"
                size="lg"
                className={cn(
                  "h-14 text-xl font-bold transition-all",
                  !disponivel && "opacity-30 cursor-not-allowed"
                )}
                onClick={() => disponivel && navigate(`/dicionario/${letra}`)}
                disabled={!disponivel}
              >
                {letra}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Sugestões "Você quis dizer?" */}
      {sugestoes.length > 0 && (
        <Card className="mb-6 border-accent/30 bg-accent/5">
          <CardContent className="p-4">
            <p className="text-sm font-semibold mb-2">Você quis dizer:</p>
            <div className="flex flex-wrap gap-2">
              {sugestoes.map((sugestao) => (
                <Badge
                  key={sugestao}
                  variant="outline"
                  className="cursor-pointer hover:bg-accent/20 transition-colors"
                  onClick={() => setSearchQuery(sugestao)}
                >
                  {sugestao}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isSearching ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : resultados.length === 0 && searchQuery ? (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-secondary mb-3">
            <Book className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            Nenhum termo encontrado
          </p>
        </div>
      ) : !searchQuery ? (
        /* Estado Inicial */
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-secondary mb-3">
            <Book className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="text-base font-semibold mb-1">Dicionário Jurídico</p>
          <p className="text-sm text-muted-foreground">
            Digite um termo ou selecione uma letra acima
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {letras.map((letra) => (
            <div key={letra}>
              <h2 className="text-2xl font-bold text-accent mb-3">{letra}</h2>
              <div className="space-y-3">
                {termosPorLetra[letra].map((termo, index) => (
                  <Card key={`${letra}-${index}`}>
                    <CardContent className="p-4">
                      <h3 className="font-bold text-lg mb-2 text-accent">
                        {termo.Palavra}
                      </h3>
                      <p className="text-sm text-foreground mb-3">
                        {termo.Significado}
                      </p>
                      
                      {/* Botão Exemplo Prático */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="mb-3"
                        onClick={() => handleGerarExemplo(termo.Palavra!, termo.Significado!, termo.exemplo_pratico)}
                        disabled={loadingExemplo[termo.Palavra!]}
                      >
                        {loadingExemplo[termo.Palavra!] ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Gerando...
                          </>
                        ) : (
                          <>
                            <Lightbulb className="w-4 h-4 mr-2" />
                            {exemploPratico[termo.Palavra!] ? "Fechar" : "Ver"} Exemplo Prático
                          </>
                        )}
                      </Button>

                      {/* Exibir Exemplo Prático */}
                      {exemploPratico[termo.Palavra!] && (
                        <div className="mb-3 p-3 bg-accent/10 rounded-lg border border-accent/20">
                          <p className="text-xs font-semibold text-accent mb-2 flex items-center gap-2">
                            <Lightbulb className="w-3 h-3" />
                            Exemplo Prático (Gerado por IA)
                          </p>
                          <div className="prose prose-invert prose-sm max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {exemploPratico[termo.Palavra!]}
                            </ReactMarkdown>
                          </div>
                        </div>
                      )}

                      {(termo["Exemplo de Uso 1"] || termo["Exemplo de Uso 2"]) && (
                        <div className="space-y-2 mt-3 pt-3 border-t border-border">
                          <p className="text-xs font-semibold text-muted-foreground">
                            Exemplos de uso:
                          </p>
                          {termo["Exemplo de Uso 1"] && (
                            <p className="text-sm text-muted-foreground italic">
                              • {termo["Exemplo de Uso 1"]}
                            </p>
                          )}
                          {termo["Exemplo de Uso 2"] && (
                            <p className="text-sm text-muted-foreground italic">
                              • {termo["Exemplo de Uso 2"]}
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dicionario;
