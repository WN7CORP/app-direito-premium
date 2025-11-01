import { Volume2, Loader2 } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useNarrationPlayer } from "@/contexts/NarrationPlayerContext";
import AudioWaveAnimation from "./AudioWaveAnimation";

interface CopyButtonProps {
  text: string;
  articleNumber: string;
  narrationUrl?: string;
}

export const CopyButton = ({ text, articleNumber, narrationUrl }: CopyButtonProps) => {
  const { toast } = useToast();
  const { playNarration, currentNarrationRef } = useNarrationPlayer();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Detectar quando outro áudio começa a tocar
  useEffect(() => {
    const checkIfStillPlaying = () => {
      if (audioRef.current && currentNarrationRef.current !== audioRef.current) {
        setIsPlaying(false);
        setProgress(0);
      }
    };

    const interval = setInterval(checkIfStillPlaying, 100);
    return () => clearInterval(interval);
  }, [currentNarrationRef]);

  const handlePlayNarration = async () => {
    if (!narrationUrl || !audioRef.current) return;
    
    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        setLoading(true);
        await playNarration(audioRef.current);
        setIsPlaying(true);
        setLoading(false);
      }
    } catch (e) {
      setLoading(false);
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const currentProgress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setProgress(currentProgress);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
  };

  const handleCanPlayThrough = () => {
    setLoading(false);
  };

  return (
    <div className="absolute top-4 right-4 z-10">
      {narrationUrl && (
        <>
          <audio 
            ref={audioRef} 
            src={narrationUrl} 
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
            onCanPlayThrough={handleCanPlayThrough}
            preload="auto"
          />
          <button
            onClick={handlePlayNarration}
            disabled={loading}
            className="relative flex items-center gap-2 px-3.5 py-2.5 rounded-lg transition-all border text-sm font-medium hover:scale-105 bg-accent/20 hover:bg-accent/30 border-accent/30 text-foreground overflow-hidden group"
            title={isPlaying ? "Pausar Narração" : "Ouvir Narração"}
          >
            {/* Barra de progresso por dentro */}
            {isPlaying && (
              <div 
                className="absolute inset-0 bg-accent/10 transition-all duration-200 ease-linear"
                style={{ width: `${progress}%` }}
              />
            )}
            
            {/* Conteúdo */}
            <div className="relative z-10 flex items-center gap-2">
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isPlaying ? (
                <AudioWaveAnimation />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
              <span>{isPlaying ? "Pausar" : "Narração"}</span>
            </div>
          </button>
        </>
      )}
    </div>
  );
};
