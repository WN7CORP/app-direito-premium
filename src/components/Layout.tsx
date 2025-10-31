import { ReactNode, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { DesktopTopNav } from "./DesktopTopNav";
import { AppSidebar } from "./AppSidebar";
import { DesktopChatPanel } from "./DesktopChatPanel";
import { VideoPlaylistSidebar } from "./VideoPlaylistSidebar";
import { ResumosSidebar } from "./ResumosSidebar";
import { AulasPlaylistSidebar } from "./AulasPlaylistSidebar";
import { useDeviceType } from "@/hooks/use-device-type";
import { useCursosCache } from "@/hooks/useCursosCache";

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const { isMobile, isTablet, isDesktop } = useDeviceType();
  const [professoraModalOpen, setProfessoraModalOpen] = useState(false);

  // Ouvir eventos de abertura/fechamento do modal da professora
  useEffect(() => {
    const handleOpen = () => setProfessoraModalOpen(true);
    const handleClose = () => setProfessoraModalOpen(false);

    window.addEventListener('professora-modal-open', handleOpen);
    window.addEventListener('professora-modal-close', handleClose);

    return () => {
      window.removeEventListener('professora-modal-open', handleOpen);
      window.removeEventListener('professora-modal-close', handleClose);
    };
  }, []);
  
  // Esconder BottomNav em páginas de conteúdo jurídico e simulados
  const hideBottomNav = 
    location.pathname === "/vade-mecum" ||
    location.pathname.startsWith("/codigo/") ||
    location.pathname === "/codigos" ||
    location.pathname === "/constituicao" ||
    location.pathname === "/estatutos" ||
    location.pathname.startsWith("/estatuto/") ||
    location.pathname === "/sumulas" ||
    location.pathname.startsWith("/sumula/") ||
    location.pathname === "/simulados/realizar" ||
    location.pathname === "/simulados/personalizado" ||
    location.pathname.includes("/simulacao-juridica/avatar") ||
    location.pathname.includes("/simulacao-juridica/escolha-caso") ||
    location.pathname.includes("/simulacao-juridica/caso/") ||
    location.pathname.includes("/simulacao-juridica/audiencia/") ||
    location.pathname.includes("/simulacao-juridica/feedback/") ||
    location.pathname === "/chat-professora" ||
    location.pathname === "/aula-interativa" ||
    location.pathname === "/plano-estudos" ||
    location.pathname === "/cursos/modulos" ||
    location.pathname === "/cursos/aulas" ||
    location.pathname === "/aprender/estagios/buscar" ||
    location.pathname.startsWith("/meu-brasil/jurista/") ||
    location.pathname.startsWith("/iniciando-direito/") ||
    // Esconder em páginas de livros específicos (que contêm /número no final)
    /\/biblioteca-estudos\/\d+/.test(location.pathname) ||
    /\/biblioteca-classicos\/\d+/.test(location.pathname) ||
    /\/biblioteca-oab\/\d+/.test(location.pathname) ||
    /\/biblioteca-oratoria\/\d+/.test(location.pathname) ||
    /\/biblioteca-lideranca\/\d+/.test(location.pathname) ||
    /\/biblioteca-fora-da-toga\/\d+/.test(location.pathname);
  
  // Esconder Header em páginas com header próprio
  const hideHeader = location.pathname === "/professora" || location.pathname === "/chat-professora";

  // DESKTOP LAYOUT (>= 1024px)
  if (isDesktop) {
    const { cursos } = useCursosCache();
    
    // Detectar se deve mostrar sidebar de playlists
    const isVideoPlayer = location.pathname === '/videoaulas/player';
    const isResumoView = location.pathname.includes('/resumos-juridicos/prontos/') && 
                         location.pathname.split('/').length > 4;
    
    // Detectar se está na view de aula individual
    const aulaMatch = location.pathname.match(/^\/iniciando-direito\/([^/]+)\/([^/]+)$/);
    const isAulaView = !!aulaMatch;
    const aulaArea = aulaMatch ? decodeURIComponent(aulaMatch[1]) : '';
    const aulaTema = aulaMatch ? decodeURIComponent(aulaMatch[2]) : '';
    const aulasDoArea = isAulaView ? cursos.filter(c => c.area === aulaArea) : [];

    // Sistema de Layout Variável por Rota
    const getLayoutConfig = () => {
      const path = location.pathname;
      
      // Páginas com layout completo (sidebar + chat)
      if (path === '/' || path === '/aprender' || path === '/ferramentas') {
        return { 
          showLeftSidebar: true,
          showRightPanel: true,
          contentMaxWidth: 'max-w-7xl'
        };
      }
      
      // Notícias - layout mais largo sem chat
      if (path === '/noticias-juridicas' || path.startsWith('/noticias-juridicas/')) {
        return {
          showLeftSidebar: true,
          showRightPanel: false,
          contentMaxWidth: 'max-w-full px-6'
        };
      }

      // Novidades - centralizado
      if (path === '/novidades') {
        return {
          showLeftSidebar: true,
          showRightPanel: true,
          contentMaxWidth: 'max-w-5xl'
        };
      }
      
      // Aula individual - sidebar de aulas, sem chat
      if (isAulaView) {
        return {
          showLeftSidebar: true,
          showRightPanel: false,
          contentMaxWidth: 'max-w-6xl'
        };
      }
      
      // Default: sidebar + chat
      return { 
        showLeftSidebar: true,
        showRightPanel: true,
        contentMaxWidth: 'max-w-7xl'
      };
    };

    const layout = getLayoutConfig();

    return (
      <div className="h-screen flex flex-col w-full bg-background text-foreground">
        <DesktopTopNav />
        
        <div className="flex-1 flex overflow-hidden w-full">
          {/* Sidebar Esquerda - CONDICIONAL */}
          {layout.showLeftSidebar && (
            <div className="w-64 flex-shrink-0">
              {isVideoPlayer ? (
                <VideoPlaylistSidebar />
              ) : isResumoView ? (
                <ResumosSidebar />
              ) : isAulaView ? (
                <AulasPlaylistSidebar 
                  area={aulaArea}
                  aulas={aulasDoArea.map(c => ({
                    tema: c.tema,
                    ordem: c.ordem,
                    'capa-aula': c['capa-aula'],
                    'aula-link': c['aula-link']
                  }))}
                  aulaAtual={aulaTema}
                />
              ) : (
                <AppSidebar />
              )}
            </div>
          )}

          {/* Conteúdo Central */}
          <main className="flex-1 overflow-y-auto">
            <div className={`${layout.contentMaxWidth} mx-auto`}>
              {children}
            </div>
          </main>

          {/* Chat Panel Direita - CONDICIONAL */}
          {layout.showRightPanel && !professoraModalOpen && <DesktopChatPanel />}
        </div>
      </div>
    );
  }

  // TABLET LAYOUT (640px - 1024px)
  if (isTablet) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        {!hideHeader && <Header />}
        <main className={hideBottomNav ? "flex-1 w-full max-w-5xl mx-auto px-4" : "flex-1 pb-20 w-full max-w-5xl mx-auto px-4"}>
          {children}
        </main>
        {!hideBottomNav && <BottomNav />}
      </div>
    );
  }
  
  // MOBILE LAYOUT (< 640px)
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {!hideHeader && <Header />}
      <main className={hideBottomNav ? "flex-1 w-full max-w-7xl mx-auto" : "flex-1 pb-20 w-full max-w-7xl mx-auto"}>
        {children}
      </main>
      {!hideBottomNav && <BottomNav />}
    </div>
  );
};
