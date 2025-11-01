import { useState, useMemo, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Book, Search, Lightbulb, Loader2, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
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

const DicionarioLetra = () => {
  const { letra } = useParams<{ letra: string }>();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [exemploPratico, setExemploPratico] = useState<{ [palavra: string]: string }>({});
  const [loadingExemplo, setLoadingExemplo] = useState<{ [palavra: string]: boolean }>({});
  const { toast } = useToast();

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Buscar termos da letra
  const { data: termos = [], isLoading } = useQuery({
    queryKey: ["dicionario-letra", letra],
    queryFn: async () => {
      if (!letra) return [];
      
      const { data, error } = await supabase
        .from("DICIONARIO" as any)
        .select("*")
        .eq("Letra", letra.toUpperCase())
        .order("Palavra", { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as DicionarioTermo[];
    },
    enabled: !!letra,
  });

  // Filtrar termos pela busca
  const termosFiltrados = useMemo(() => {
    if (!debouncedSearch.trim()) return termos;
    
    const termo = debouncedSearch.trim().toLowerCase();
    
    return termos.filter((t) => {
      const palavra = t.Palavra?.toLowerCase() || "";
      const significado = t.Significado?.toLowerCase() || "";
      
      // Busca mais precisa: palavra exata ou que começa com o termo
      return palavra.includes(termo) || significado.includes(termo);
    }).sort((a, b) => {
      // Priorizar palavras que começam com o termo buscado
      const palavraA = a.Palavra?.toLowerCase() || "";
      const palavraB = b.Palavra?.toLowerCase() || "";
      const começaA = palavraA.startsWith(termo);
      const começaB = palavraB.startsWith(termo);
      
      if (começaA && !começaB) return -1;
      if (!começaA && começaB) return 1;
      return 0;
    });
  }, [termos, debouncedSearch]);

  const handleGerarExemplo = async (palavra: string, significado: string, existente?: string | null) => {
    if (exemploPratico[palavra]) {
      setExemploPratico((prev) => {
        const novo = { ...prev };
        delete novo[palavra];
        return novo;
      });
      return;
    }

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
        <Button
          variant="ghost"
          size="sm"
          className="mb-3 -ml-2"
          onClick={() => navigate("/dicionario")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-xl md:text-2xl font-bold mb-1">
          Letra {letra?.toUpperCase()}
        </h1>
        <p className="text-sm text-muted-foreground">
          {termos.length} {termos.length === 1 ? "termo encontrado" : "termos encontrados"}
        </p>
      </div>

      {/* Barra de Busca */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar nesta letra..."
          className="pl-10 h-11 bg-card border-border"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Resultados */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : termosFiltrados.length === 0 ? (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-secondary mb-3">
            <Book className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            Nenhum termo encontrado
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {termosFiltrados.map((termo, index) => (
            <Card key={`${letra}-${index}`}>
              <CardContent className="p-4">
                <h3 className="font-bold text-lg mb-2 text-accent">
                  {termo.Palavra}
                </h3>
                <p className="text-sm text-foreground mb-3">
                  {termo.Significado}
                </p>
                
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
      )}
    </div>
  );
};

export default DicionarioLetra;
