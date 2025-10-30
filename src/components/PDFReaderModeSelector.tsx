import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BookOpen, ScrollText } from "lucide-react";
import { Card } from "@/components/ui/card";

interface PDFReaderModeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMode: (mode: 'normal' | 'vertical') => void;
  bookTitle: string;
}

const PDFReaderModeSelector = ({ isOpen, onClose, onSelectMode, bookTitle }: PDFReaderModeSelectorProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Como você quer ler este livro?</DialogTitle>
          <p className="text-sm text-muted-foreground text-center mt-2">{bookTitle}</p>
        </DialogHeader>
        
        <div className="grid grid-cols-1 gap-4 py-4">
          <Card 
            className="p-6 cursor-pointer hover:bg-accent transition-colors border-2 hover:border-primary"
            onClick={() => onSelectMode('normal')}
          >
            <div className="flex flex-col items-center text-center gap-3">
              <div className="p-3 rounded-full bg-primary/10">
                <BookOpen className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">📖 Modo Páginas</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Experiência como um livro físico
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Virar páginas, ideal para livros completos
                </p>
              </div>
            </div>
          </Card>

          <Card 
            className="p-6 cursor-pointer hover:bg-accent transition-colors border-2 hover:border-primary"
            onClick={() => onSelectMode('vertical')}
          >
            <div className="flex flex-col items-center text-center gap-3">
              <div className="p-3 rounded-full bg-primary/10">
                <ScrollText className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">📜 Modo Vertical</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Leitura contínua e rápida
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Scroll contínuo, ideal para artigos e PDFs técnicos
                </p>
              </div>
            </div>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PDFReaderModeSelector;
