import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ArrowLeft, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import CustomPDFViewer from "./CustomPDFViewer";

interface PDFViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  normalModeUrl: string;
  verticalModeUrl: string;
  title: string;
  viewMode?: 'normal' | 'vertical';
}

const PDFViewerModal = ({ isOpen, onClose, normalModeUrl, verticalModeUrl, title, viewMode = 'normal' }: PDFViewerModalProps) => {
  const [zoomLevel, setZoomLevel] = useState(100);
  
  // Selecionar URL baseado no modo
  const urlToUse = viewMode === 'normal' ? normalModeUrl : verticalModeUrl;
  
  // Extrair ID do Google Drive da URL
  const extractDriveId = (url: string): string => {
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : '';
  };
  
  const driveId = extractDriveId(urlToUse);
  const pdfUrl = driveId ? `https://drive.google.com/uc?export=download&id=${driveId}` : urlToUse;
  
  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 10, 200));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 10, 50));
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-full w-full h-screen max-h-screen p-0 m-0 rounded-none border-0">
        <div className="flex flex-col h-full bg-background">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 bg-card border-b border-border flex-wrap">
            <Button
              onClick={onClose}
              variant="destructive"
              size="sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            
            <h2 className="text-sm md:text-lg font-semibold text-foreground flex-1 min-w-0 truncate">
              {title}
            </h2>
          </div>
          
          {/* Conteúdo do PDF */}
          <div className="flex-1 overflow-hidden relative">
            <CustomPDFViewer url={pdfUrl} zoom={zoomLevel} />
            
            {/* Controles de Zoom */}
            <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-40">
              <Button
                onClick={handleZoomIn}
                size="sm"
                variant="secondary"
                className="shadow-lg"
                title="Aumentar zoom"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button
                onClick={handleZoomOut}
                size="sm"
                variant="secondary"
                className="shadow-lg"
                title="Diminuir zoom"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PDFViewerModal;