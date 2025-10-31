import { useState, useMemo, useEffect, useCallback } from "react";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [exemploPratico, setExemploPratico] = useState<{ [palavra: string]: string }>({});
  const [loadingExemplo, setLoadingExemplo] = useState<{ [palavra: string]: boolean }>({});
  const [resultados, setResultados] = useState<DicionarioTermo[]>([]);
  const [sugestoes, setSugestoes] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  // Debounce para busca em tempo real
  const debouncedSearch = useDebounce(searchQuery, 500);

  // Buscar letras disponíveis apenas
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

  // Todas as letras do alfabeto
  const alfabeto = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  // Função de busca otimizada
  const realizarBusca = useCallback(async () => {
    const termoBusca = debouncedSearch.trim();
    
    if (!termoBusca && !selectedLetter) {
      setResultados([]);
      setSugestoes([]);
      return;
    }

    setIsSearching(true);
    setSugestoes([]);

    try {
      let query = supabase.from("DICIONARIO" as any).select("*");

      // Se tem letra selecionada, filtra por ela
      if (selectedLetter) {
        query = query.eq("Letra", selectedLetter);
      }

      // Se tem termo de busca, filtra por palavra
      if (termoBusca) {
        query = query.ilike("Palavra", `%${termoBusca}%`);
      }

      const { data, error } = await query
        .order("Palavra", { ascending: true })
        .limit(100);

      if (error) throw error;

      const resultadosEncontrados = (data || []) as unknown as DicionarioTermo[];
      setResultados(resultadosEncontrados);

      // Se não encontrou nada e tem termo de busca, buscar sugestões
      if (resultadosEncontrados.length === 0 && termoBusca) {
        // Buscar sugestões inline
        const primeiraLetra = termoBusca.charAt(0).toUpperCase();
        const { data: sugestoesData } = await supabase
          .from("DICIONARIO" as any)
          .select("Palavra")
          .eq("Letra", primeiraLetra)
          .limit(5);

        const palavrasSimilares = (sugestoesData || [])
          .map((d: any) => d.Palavra)
          .filter((p: string) => p && p.toLowerCase().includes(termoBusca.slice(0, 3).toLowerCase()))
          .slice(0, 3);

        setSugestoes(palavrasSimilares);
      }
    } catch (error) {
      console.error("Erro ao buscar:", error);
      toast({
        title: "Erro ao buscar termos",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  }, [debouncedSearch, selectedLetter, toast]);

  // Efeito para busca em tempo real com debounce
  useEffect(() => {
    realizarBusca();
  }, [debouncedSearch, selectedLetter]);

  // Agrupar por letra
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

      {/* Seletor de Letras - 4 por linha */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-muted-foreground mb-3">Buscar por letra:</p>
        <div className="grid grid-cols-4 gap-2">
          <Badge
            variant={selectedLetter === null ? "default" : "outline"}
            className={cn(
              "cursor-pointer transition-all h-10 flex items-center justify-center text-base",
              selectedLetter === null && "bg-accent text-accent-foreground"
            )}
            onClick={() => {
              setSelectedLetter(null);
              setSearchQuery("");
            }}
          >
            Todas
          </Badge>
          {alfabeto.map((letra) => {
            const disponivel = letrasDisponiveis.includes(letra);
            return (
              <Badge
                key={letra}
                variant={selectedLetter === letra ? "default" : "outline"}
                className={cn(
                  "cursor-pointer transition-all h-10 flex items-center justify-center text-base font-semibold",
                  selectedLetter === letra && "bg-accent text-accent-foreground",
                  !disponivel && "opacity-30 cursor-not-allowed"
                )}
                onClick={() => disponivel && setSelectedLetter(letra)}
              >
                {letra}
              </Badge>
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
      ) : resultados.length === 0 && (searchQuery || selectedLetter) ? (
        /* Nenhum Resultado */
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-secondary mb-3">
            <Book className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            Nenhum termo encontrado
          </p>
        </div>
      ) : resultados.length === 0 ? (
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
