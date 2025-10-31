import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CursoData {
  area: string;
  tema: string;
  ordem: number;
  'capa-aula': string;
  'aula-link': string;
  conteudo: string;
  'conteudo-final': string | null;
  flashcards: any[] | null;
  questoes: any[] | null;
}

const CACHE_KEY_CURSOS = 'cursos_app_cache';
const CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 horas

export const useCursosCache = () => {
  const [cursos, setCursos] = useState<CursoData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCursos();
  }, []);

  const loadCursos = async () => {
    try {
      // 1. Verificar cache
      const cached = localStorage.getItem(CACHE_KEY_CURSOS);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          console.log('✅ Cursos carregados do cache');
          setCursos(data);
          setLoading(false);
          return;
        }
      }

      // 2. Buscar do Supabase
      console.log('🔄 Buscando cursos do Supabase...');
      const { data, error } = await supabase
        .from('CURSOS-APP' as any)
        .select('*')
        .order('area')
        .order('ordem');

      if (error) throw error;

      // 3. Salvar no cache
      localStorage.setItem(CACHE_KEY_CURSOS, JSON.stringify({
        data: data || [],
        timestamp: Date.now()
      }));

      console.log('✅ Cursos salvos no cache');
      setCursos(data as any || []);
    } catch (error) {
      console.error('Erro ao carregar cursos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Função para invalidar cache (útil quando atualizar cursos)
  const invalidateCache = () => {
    localStorage.removeItem(CACHE_KEY_CURSOS);
    loadCursos();
  };

  return { cursos, loading, invalidateCache };
};
