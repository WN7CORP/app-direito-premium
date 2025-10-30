import { createContext, useContext, useRef, ReactNode } from "react";

interface NarrationPlayerContextType {
  currentNarrationRef: React.MutableRefObject<HTMLAudioElement | null>;
  playNarration: (audioElement: HTMLAudioElement) => Promise<void>;
  stopNarration: () => void;
}

const NarrationPlayerContext = createContext<NarrationPlayerContextType | undefined>(undefined);

export const NarrationPlayerProvider = ({ children }: { children: ReactNode }) => {
  const currentNarrationRef = useRef<HTMLAudioElement | null>(null);

  const playNarration = async (audioElement: HTMLAudioElement) => {
    // Pausar áudio anterior se existir
    if (currentNarrationRef.current && currentNarrationRef.current !== audioElement) {
      currentNarrationRef.current.pause();
      currentNarrationRef.current.currentTime = 0;
    }

    // Atualizar referência e tocar novo áudio
    currentNarrationRef.current = audioElement;
    await audioElement.play();
  };

  const stopNarration = () => {
    if (currentNarrationRef.current) {
      currentNarrationRef.current.pause();
      currentNarrationRef.current.currentTime = 0;
      currentNarrationRef.current = null;
    }
  };

  return (
    <NarrationPlayerContext.Provider value={{ currentNarrationRef, playNarration, stopNarration }}>
      {children}
    </NarrationPlayerContext.Provider>
  );
};

export const useNarrationPlayer = () => {
  const context = useContext(NarrationPlayerContext);
  if (!context) {
    throw new Error("useNarrationPlayer must be used within NarrationPlayerProvider");
  }
  return context;
};
