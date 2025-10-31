interface DiaData {
  diaSemana: string;
  conteudo: string;
}

interface SemanaData {
  numero: number;
  titulo: string;
  dias: DiaData[];
  conteudoCompleto: string;
}

interface PlanoParseado {
  objetivo: string;
  visaoGeral: string;
  semanas: SemanaData[];
  materiaisEstudo: string;
  estrategias: string;
  checklist: string;
  revisaoFinal: string;
  outrasSecoes: string;
}

export function parsePlanoEstudos(markdown: string): PlanoParseado {
  const resultado: PlanoParseado = {
    objetivo: "",
    visaoGeral: "",
    semanas: [],
    materiaisEstudo: "",
    estrategias: "",
    checklist: "",
    revisaoFinal: "",
    outrasSecoes: "",
  };

  // Extrair Objetivo
  const objetivoMatch = markdown.match(/##?\s*(?:🎯\s*)?Objetivo[^\n]*\n([\s\S]*?)(?=\n##)/i);
  if (objetivoMatch) {
    resultado.objetivo = objetivoMatch[1].trim();
  }

  // Extrair Visão Geral
  const visaoMatch = markdown.match(/##?\s*(?:📋\s*)?Visão Geral[^\n]*\n([\s\S]*?)(?=\n##)/i);
  if (visaoMatch) {
    resultado.visaoGeral = visaoMatch[1].trim();
  }

  // Extrair Cronograma Semanal completo
  const cronogramaMatch = markdown.match(/##?\s*(?:📅\s*)?Cronograma Semanal[^\n]*\n([\s\S]*?)(?=\n##\s*(?:Materiais|Estratégias|Checklist|Revisão)|$)/i);
  
  if (cronogramaMatch) {
    const cronogramaCompleto = cronogramaMatch[1];
    
    // Dividir por semanas usando regex mais robusto
    const semanasRegex = /###\s*(?:📌\s*)?Semana\s*(\d+)[:\s-]*([^\n]*)\n([\s\S]*?)(?=###\s*(?:📌\s*)?Semana\s*\d+|$)/gi;
    let semanaMatch;
    
    while ((semanaMatch = semanasRegex.exec(cronogramaCompleto)) !== null) {
      const numero = parseInt(semanaMatch[1]);
      const titulo = semanaMatch[2].trim();
      const conteudoSemana = semanaMatch[3];
      
      // Extrair dias da semana
      const dias: DiaData[] = [];
      const diasRegex = /\*\*([A-Za-zç-]+feira)\*\*[:\s-]*([\s\S]*?)(?=\*\*[A-Za-zç-]+feira\*\*|$)/gi;
      let diaMatch;
      
      while ((diaMatch = diasRegex.exec(conteudoSemana)) !== null) {
        dias.push({
          diaSemana: diaMatch[1],
          conteudo: diaMatch[2].trim(),
        });
      }
      
      resultado.semanas.push({
        numero,
        titulo,
        dias,
        conteudoCompleto: conteudoSemana.trim(),
      });
    }
  }

  // Extrair Materiais de Estudo
  const materiaisMatch = markdown.match(/##?\s*(?:📚\s*)?Materiais de Estudo[^\n]*\n([\s\S]*?)(?=\n##)/i);
  if (materiaisMatch) {
    resultado.materiaisEstudo = materiaisMatch[1].trim();
  }

  // Extrair Estratégias
  const estrategiasMatch = markdown.match(/##?\s*(?:💡\s*)?Estratégias[^\n]*\n([\s\S]*?)(?=\n##)/i);
  if (estrategiasMatch) {
    resultado.estrategias = estrategiasMatch[1].trim();
  }

  // Extrair Checklist
  const checklistMatch = markdown.match(/##?\s*(?:✅\s*)?Checklist[^\n]*\n([\s\S]*?)(?=\n##|$)/i);
  if (checklistMatch) {
    resultado.checklist = checklistMatch[1].trim();
  }

  // Extrair Revisão Final
  const revisaoMatch = markdown.match(/##?\s*(?:🔄\s*)?Revisão Final[^\n]*\n([\s\S]*?)(?=\n##|$)/i);
  if (revisaoMatch) {
    resultado.revisaoFinal = revisaoMatch[1].trim();
  }

  return resultado;
}
