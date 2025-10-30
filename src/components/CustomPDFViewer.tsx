import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Configurar o worker do PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface CustomPDFViewerProps {
  url: string;
  zoom: number;
}

const CustomPDFViewer = ({ url, zoom }: CustomPDFViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const container = containerRef.current;
    if (!container) return;

    const loadPDF = async () => {
      try {
        setLoading(true);
        setError(null);

        // Limpar container
        container.innerHTML = '';

        // Carregar o PDF
        const loadingTask = pdfjsLib.getDocument(url);
        const pdf = await loadingTask.promise;

        if (!isMounted) return;

        setNumPages(pdf.numPages);

        // Renderizar todas as páginas
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          
          if (!isMounted) return;

          const viewport = page.getViewport({ scale: zoom / 100 });

          // Criar canvas para a página
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          
          if (!context) continue;

          canvas.height = viewport.height;
          canvas.width = viewport.width;
          canvas.className = 'mx-auto mb-4 shadow-lg';

          // Adicionar ao container
          container.appendChild(canvas);

          // Renderizar a página
          const renderContext = {
            canvasContext: context,
            viewport: viewport,
          };

          await page.render(renderContext as any).promise;
        }

        setLoading(false);
      } catch (err) {
        console.error('Erro ao carregar PDF:', err);
        if (isMounted) {
          setError('Erro ao carregar o PDF. Por favor, tente novamente.');
          setLoading(false);
        }
      }
    };

    loadPDF();

    return () => {
      isMounted = false;
    };
  }, [url, zoom]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent mb-4"></div>
          <p className="text-muted-foreground">Carregando PDF...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-destructive">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-muted/30 p-4">
      <div ref={containerRef} className="max-w-4xl mx-auto" />
    </div>
  );
};

export default CustomPDFViewer;
