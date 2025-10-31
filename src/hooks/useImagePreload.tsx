import { useEffect } from "react";

export const useImagePreload = (imageUrls: string[]) => {
  useEffect(() => {
    if (!imageUrls || imageUrls.length === 0) return;

    // Precarregar primeiras 3 imagens
    const imagesToPreload = imageUrls.slice(0, 3);
    const links: HTMLLinkElement[] = [];
    
    imagesToPreload.forEach((url, index) => {
      if (!url) return;
      
      // Criar link preload no head
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = url;
      if (index === 0) {
        link.setAttribute('fetchpriority', 'high');
      }
      
      document.head.appendChild(link);
      links.push(link);
    });
    
    // Limpar ao desmontar
    return () => {
      links.forEach(link => {
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
      });
    };
  }, [imageUrls]);
};
