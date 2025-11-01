import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Jurisprudencia {
  numeroProcesso: string;
  tribunal: string;
  ementa: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { titulo, conteudo, jurisprudencias } = await req.json();
    
    if (!titulo || !conteudo) {
      throw new Error("Título e conteúdo são obrigatórios");
    }

    console.log("Gerando PDF de petição:", titulo);

    // Importar jsPDF dinamicamente
    const jsPDF = (await import("https://esm.sh/jspdf@2.5.1")).default;
    
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 25;
    const maxWidth = pageWidth - 2 * margin;
    let y = margin;

    // Função auxiliar para adicionar nova página se necessário
    const checkNewPage = (space: number = 10) => {
      if (y > pageHeight - margin - space) {
        doc.addPage();
        y = margin;
        return true;
      }
      return false;
    };

    // Função auxiliar para processar texto
    const addText = (text: string, fontSize: number, isBold: boolean = false) => {
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", isBold ? "bold" : "normal");
      const lines = doc.splitTextToSize(text, maxWidth);
      
      for (const line of lines) {
        checkNewPage();
        doc.text(line, margin, y);
        y += fontSize * 0.35 + 2;
      }
    };

    // Cabeçalho
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(titulo, margin, y);
    y += 10;

    // Data
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const date = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
    doc.text(`Gerado em: ${date}`, margin, y);
    y += 10;

    // Linha divisória
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 15;

    // Processar Etapa 1
    if (conteudo.etapa1) {
      addText("QUALIFICAÇÃO E FUNDAMENTAÇÃO JURÍDICA", 12, true);
      y += 5;
      addText(conteudo.etapa1, 11);
      y += 10;
    }

    // Processar Etapa 2
    if (conteudo.etapa2) {
      checkNewPage(20);
      addText("ANÁLISE DETALHADA E ARGUMENTAÇÃO", 12, true);
      y += 5;
      addText(conteudo.etapa2, 11);
      y += 10;
    }

    // Processar Etapa 3
    if (conteudo.etapa3) {
      checkNewPage(20);
      addText("PEDIDOS E CONCLUSÃO", 12, true);
      y += 5;
      addText(conteudo.etapa3, 11);
      y += 10;
    }

    // Seção de Jurisprudências
    if (jurisprudencias && jurisprudencias.length > 0) {
      doc.addPage();
      y = margin;
      
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("JURISPRUDÊNCIAS CITADAS", margin, y);
      y += 10;

      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, pageWidth - margin, y);
      y += 10;

      jurisprudencias.forEach((juris: Jurisprudencia, index: number) => {
        checkNewPage(30);

        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(`${index + 1}. ${juris.tribunal} - ${juris.numeroProcesso}`, margin, y);
        y += 7;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        const ementaLines = doc.splitTextToSize(juris.ementa, maxWidth);
        
        for (const line of ementaLines) {
          checkNewPage();
          doc.text(line, margin, y);
          y += 5;
        }
        
        y += 8;
      });
    }

    // Rodapé em todas as páginas
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Página ${i} de ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }

    // Gerar PDF como ArrayBuffer
    const pdfArrayBuffer = doc.output('arraybuffer');
    const pdfUint8Array = new Uint8Array(pdfArrayBuffer);

    console.log("PDF de petição gerado com sucesso");

    // Upload para Supabase Storage
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const filename = `peticao-${Date.now()}-${titulo.toLowerCase().replace(/\s+/g, '-').substring(0, 30)}.pdf`;
    const bucketName = "pdfs-educacionais";

    const uploadResponse = await fetch(
      `${supabaseUrl}/storage/v1/object/${bucketName}/${filename}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/pdf",
        },
        body: pdfUint8Array,
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error("Erro ao fazer upload:", errorText);
      throw new Error("Erro ao fazer upload do PDF");
    }

    // Gerar URL assinada (válida por 24 horas)
    const signedUrlResponse = await fetch(
      `${supabaseUrl}/storage/v1/object/sign/${bucketName}/${filename}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ expiresIn: 86400 }), // 24 horas
      }
    );

    if (!signedUrlResponse.ok) {
      throw new Error("Erro ao gerar URL assinada");
    }

    const { signedURL } = await signedUrlResponse.json();
    const fullSignedUrl = `${supabaseUrl}/storage/v1${signedURL}`;

    console.log("PDF salvo e URL gerada:", fullSignedUrl);

    return new Response(
      JSON.stringify({ 
        pdfUrl: fullSignedUrl,
        message: "PDF gerado com sucesso! Link válido por 24 horas."
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error('Erro ao exportar PDF:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
