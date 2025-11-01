import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AppStatistics {
  flashcards: number;
  videoaulas: number;
  audioaulas: number;
  livrosTotal: number;
  livrosEstudos: number;
  livrosForaDaToga: number;
  livrosClassicos: number;
  livrosLideranca: number;
  livrosOratoria: number;
  resumos: number;
  questoesOAB: number;
  cursosAulas: number;
  casosSimulacao: number;
  loading: boolean;
}

export const useAppStatistics = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["app-statistics"],
    queryFn: async (): Promise<AppStatistics> => {
      // Buscar todas as estatísticas em paralelo
      const [
        flashcardsCount,
        videoaulasCount,
        audioaulasCount,
        livrosEstudosCount,
        livrosForaDaTogaCount,
        livrosClassicosCount,
        livrosLiderancaCount,
        livrosOratoriaCount,
        resumosCount,
        questoesOABCount,
        cursosCount,
        casosSimulacaoCount,
      ] = await Promise.all([
        supabase.from("FLASHCARDS").select("*", { count: "exact", head: true }),
        supabase.from("VIDEO AULAS-NOVO").select("*", { count: "exact", head: true }),
        supabase.from("AUDIO-AULA").select("*", { count: "exact", head: true }),
        supabase.from("BIBLIOTECA-ESTUDOS").select("*", { count: "exact", head: true }),
        supabase.from("BIBLIOTECA-FORA-DA-TOGA").select("*", { count: "exact", head: true }),
        supabase.from("BIBLIOTECA-CLASSICOS").select("*", { count: "exact", head: true }),
        supabase.from("BIBLIOTECA-LIDERANÇA").select("*", { count: "exact", head: true }),
        supabase.from("BIBLIOTECA-ORATORIA").select("*", { count: "exact", head: true }),
        supabase.from("RESUMO").select("*", { count: "exact", head: true }),
        supabase.from("SIMULADO-OAB").select("*", { count: "exact", head: true }),
        supabase.from("CURSOS").select("*", { count: "exact", head: true }),
        supabase.from("SIMULACAO_CASOS").select("*", { count: "exact", head: true }),
      ]);

      const livrosTotal =
        (livrosEstudosCount.count || 0) +
        (livrosForaDaTogaCount.count || 0) +
        (livrosClassicosCount.count || 0) +
        (livrosLiderancaCount.count || 0) +
        (livrosOratoriaCount.count || 0);

      return {
        flashcards: flashcardsCount.count || 0,
        videoaulas: videoaulasCount.count || 0,
        audioaulas: audioaulasCount.count || 0,
        livrosTotal,
        livrosEstudos: livrosEstudosCount.count || 0,
        livrosForaDaToga: livrosForaDaTogaCount.count || 0,
        livrosClassicos: livrosClassicosCount.count || 0,
        livrosLideranca: livrosLiderancaCount.count || 0,
        livrosOratoria: livrosOratoriaCount.count || 0,
        resumos: resumosCount.count || 0,
        questoesOAB: questoesOABCount.count || 0,
        cursosAulas: cursosCount.count || 0,
        casosSimulacao: casosSimulacaoCount.count || 0,
        loading: false,
      };
    },
    staleTime: 1000 * 60 * 5, // Cache por 5 minutos
  });

  return {
    statistics: data || {
      flashcards: 0,
      videoaulas: 0,
      audioaulas: 0,
      livrosTotal: 0,
      livrosEstudos: 0,
      livrosForaDaToga: 0,
      livrosClassicos: 0,
      livrosLideranca: 0,
      livrosOratoria: 0,
      resumos: 0,
      questoesOAB: 0,
      cursosAulas: 0,
      casosSimulacao: 0,
      loading: true,
    },
    isLoading,
  };
};
