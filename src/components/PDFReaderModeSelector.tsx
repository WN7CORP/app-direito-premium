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
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Como você quer ler este livro?
          </DialogTitle>
          <p className="text-sm text-muted-foreground text-center mt-2">{bookTitle}</p>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6">
          <Card 
            className="group relative p-8 cursor-pointer transition-all duration-300 border-2 hover:border-primary hover:shadow-xl hover:shadow-primary/20 hover:-translate-y-1 overflow-hidden"
            onClick={() => onSelectMode('normal')}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex flex-col items-center text-center gap-4">
              <div className="p-5 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 group-hover:scale-110 transition-transform duration-300">
                <BookOpen className="w-12 h-12 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-xl mb-2 group-hover:text-primary transition-colors">
                  📖 Modo Páginas
                </h3>
                <p className="text-sm text-muted-foreground font-medium">
                  Experiência como um livro físico
                </p>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  Virar páginas, ideal para livros completos e leitura tradicional
                </p>
              </div>
            </div>
          </Card>

          <Card 
            className="group relative p-8 cursor-pointer transition-all duration-300 border-2 hover:border-primary hover:shadow-xl hover:shadow-primary/20 hover:-translate-y-1 overflow-hidden"
            onClick={() => onSelectMode('vertical')}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex flex-col items-center text-center gap-4">
              <div className="p-5 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 group-hover:scale-110 transition-transform duration-300">
                <ScrollText className="w-12 h-12 text-accent" />
              </div>
              <div>
                <h3 className="font-bold text-xl mb-2 group-hover:text-accent transition-colors">
                  📜 Modo Vertical
                </h3>
                <p className="text-sm text-muted-foreground font-medium">
                  Leitura contínua e rápida
                </p>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
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
