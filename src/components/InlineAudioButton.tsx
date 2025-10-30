import { useState, useRef, useEffect } from "react";
import { Pause, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNarrationPlayer } from "@/contexts/NarrationPlayerContext";
import AudioWaveAnimation from "./AudioWaveAnimation";

interface InlineAudioButtonProps {
  audioUrl: string;
  articleNumber: string;
  onPlay?: (audioElement: HTMLAudioElement) => void;
}

const InlineAudioButton = ({ audioUrl, articleNumber, onPlay }: InlineAudioButtonProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { playNarration, currentNarrationRef } = useNarrationPlayer();

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

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

  const togglePlay = async () => {
    if (!audioRef.current) return;
    
    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        setLoading(true);
        if (onPlay) {
          onPlay(audioRef.current);
        } else {
          await playNarration(audioRef.current);
        }
        setIsPlaying(true);
        setLoading(false);
      }
    } catch (error) {
      console.error('Erro ao reproduzir áudio:', error);
      setLoading(false);
      setIsPlaying(false);
    }
  };

  const handleCanPlayThrough = () => {
    setLoading(false);
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

  return (
    <div className="relative w-full">
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onCanPlayThrough={handleCanPlayThrough}
      />
      
      {/* Botão de Narração com cor vermelha e animação de ondas */}
      <button
        onClick={togglePlay}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition-all text-sm shadow-lg hover:shadow-xl hover:scale-105 animate-fade-in relative overflow-hidden bg-accent/15 hover:bg-accent/25 border border-accent/30 text-accent group"
      >
        {/* Progress Fill */}
        {isPlaying && (
          <div 
            className="absolute inset-0 bg-accent/10 transition-all duration-200 ease-linear"
            style={{ width: `${progress}%` }}
          />
        )}
        
        {/* Content */}
        <div className="relative z-10 flex items-center gap-2">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isPlaying ? (
            <>
              <AudioWaveAnimation />
              <Pause className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity absolute left-0" />
            </>
          ) : (
            <span className="font-medium text-xs sm:text-sm">
              {articleNumber}
            </span>
          )}
          {isPlaying && (
            <span className="font-medium text-xs sm:text-sm opacity-0 group-hover:opacity-100 transition-opacity">
              Pausar
            </span>
          )}
        </div>
      </button>
    </div>
  );
};

export default InlineAudioButton;
