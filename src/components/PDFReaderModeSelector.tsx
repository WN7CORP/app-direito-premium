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
      <DialogContent className="max-w-lg p-4 sm:p-6">
        <DialogHeader className="space-y-2 pb-2">
          <DialogTitle className="text-center text-lg sm:text-xl font-bold">
            Como você quer ler?
          </DialogTitle>
          <p className="text-xs text-muted-foreground text-center line-clamp-1">{bookTitle}</p>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <Card 
            className="group relative p-4 sm:p-6 cursor-pointer transition-all duration-300 border-2 hover:border-primary hover:shadow-lg hover:-translate-y-0.5 active:scale-95"
            onClick={() => onSelectMode('normal')}
          >
            <div className="flex flex-col items-center text-center gap-2 sm:gap-3">
              <div className="p-3 sm:p-4 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base mb-1">
                  Páginas
                </h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">
                  Virar páginas
                </p>
              </div>
            </div>
          </Card>

          <Card 
            className="group relative p-4 sm:p-6 cursor-pointer transition-all duration-300 border-2 hover:border-primary hover:shadow-lg hover:-translate-y-0.5 active:scale-95"
            onClick={() => onSelectMode('vertical')}
          >
            <div className="flex flex-col items-center text-center gap-2 sm:gap-3">
              <div className="p-3 sm:p-4 rounded-xl bg-accent/10 group-hover:bg-accent/20 transition-colors">
                <ScrollText className="w-8 h-8 sm:w-10 sm:h-10 text-accent" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base mb-1">
                  Vertical
                </h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">
                  Scroll contínuo
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
