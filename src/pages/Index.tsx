import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Crown, Gavel, FileText, Scale, GraduationCap, BookOpen as BookOpenIcon, Library, Hammer, Target, Search, Headphones, Play, Loader2, BookMarked, Newspaper } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import useEmblaCarousel from 'embla-carousel-react';
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AudioAula } from "@/types/database.types";
import BibliotecasCarousel from "@/components/BibliotecasCarousel";
import ProposicoesRecentesCarousel from "@/components/ProposicoesRecentesCarousel";
import { useFeaturedNews } from "@/hooks/useFeaturedNews";
import { Button } from "@/components/ui/button";
import { CursosCarousel } from "@/components/CursosCarousel";

const Index = () => {
  const navigate = useNavigate();
  const [atualizandoNoticias, setAtualizandoNoticias] = useState(false);
  const [emblaRef] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    dragFree: true
  });
  const [emblaRefVideo] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    dragFree: true
  });
  const { featuredNews, loading: loadingNews, reload: reloadNews } = useFeaturedNews();
  const {
    data: videoaulasDestaque
  } = useQuery({
    queryKey: ["videoaulas-destaque"],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("VIDEO AULAS-NOVO" as any).select("*").eq("categoria", "Faculdade");
      if (error) throw error;

      // Buscar todos os vídeos de todas as playlists
      const todosVideos: any[] = [];
      for (const playlist of (data || []) as any[]) {
        try {
          const {
            data: videoData
          } = await supabase.functions.invoke('buscar-videos-playlist', {
            body: {
              playlistLink: playlist.link
            }
          });
          if (videoData?.videos && Array.isArray(videoData.videos)) {
            // Adicionar informações da playlist a cada vídeo
            const videosComPlaylist = videoData.videos.map((video: any) => ({
              ...video,
              playlistArea: playlist.area,
              playlistLink: playlist.link
            }));
            todosVideos.push(...videosComPlaylist);
          }
        } catch (err) {
          console.error('Erro ao buscar vídeos da playlist:', err);
        }
      }

      // Randomizar a ordem dos vídeos
      return todosVideos.sort(() => Math.random() - 0.5);
    }
  });
  const academicCategories = [{
    id: "faculdade",
    title: "Faculdade",
    description: "Conteúdo para aprender sobre Direito",
    icon: GraduationCap,
    gradient: "from-[hsl(0,75%,55%)] to-[hsl(350,70%,45%)]",
    route: "/aprender"
  }, {
    id: "vade-mecum",
    title: "Vade Mecum",
    description: "Constituição, códigos, leis e súmulas",
    icon: BookMarked,
    gradient: "from-[hsl(0,75%,55%)] to-[hsl(350,70%,45%)]",
    route: "/vade-mecum"
  }, {
    id: "oab",
    title: "OAB",
    description: "Biblioteca, videoaulas e simulados",
    icon: Scale,
    gradient: "from-[hsl(0,75%,55%)] to-[hsl(350,70%,45%)]",
    route: "/oab"
  }, {
    id: "ferramentas",
    title: "Ferramentas",
    description: "Recursos práticos jurídicos",
    icon: Gavel,
    gradient: "from-[hsl(0,75%,55%)] to-[hsl(350,70%,45%)]",
    route: "/ferramentas"
  }];

  const atualizarNoticias = async () => {
    setAtualizandoNoticias(true);
    try {
      const { data, error } = await supabase.functions.invoke('atualizar-noticias-juridicas');
      if (error) throw error;
      
      const quantidade = data?.noticiasAdicionadas || 0;
      console.log(`${quantidade} notícias atualizadas com sucesso!`);
      
      // Toast detalhado com feedback
      if (quantidade > 0) {
        const mensagem = quantidade === 1 
          ? '1 nova notícia adicionada!' 
          : `${quantidade} novas notícias adicionadas!`;
        
        // Usar toast do sonner
        const { toast } = await import('sonner');
        toast.success('Notícias Atualizadas', {
          description: mensagem,
          duration: 3000,
        });
        
        // Recarregar notícias
        await reloadNews();
      } else {
        const { toast } = await import('sonner');
        toast.info('Nenhuma novidade', {
          description: 'Você já está atualizado com as últimas notícias',
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Erro ao atualizar notícias:', error);
      const { toast } = await import('sonner');
      toast.error('Erro ao atualizar', {
        description: 'Não foi possível atualizar as notícias',
        duration: 3000,
      });
    } finally {
      setAtualizandoNoticias(false);
    }
  };

  return <div className="flex flex-col min-h-screen bg-background pb-20 md:pb-0">
      {/* Header */}
      

      <div className="flex-1 px-3 md:px-6 py-4 md:py-6 space-y-5 md:space-y-6">
        {/* Search Bar */}
        <div
          onClick={() => navigate('/pesquisar')}
          className="flex items-center gap-3 px-4 py-3 md:py-2.5 bg-muted rounded-xl cursor-pointer hover:bg-muted/80 transition-colors"
        >
          <Search className="w-5 h-5 md:w-4 md:h-4 text-muted-foreground" />
          <span className="text-foreground/60 text-sm md:text-xs">
            O que você quer buscar?
          </span>
        </div>

        {/* Bibliotecas Elite Section - Carrossel */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <h2 className="md:text-lg text-foreground font-normal text-base">Bibliotecas Elite</h2>
              <span className="px-2.5 py-0.5 md:px-2 md:py-0.5 bg-accent rounded-full text-xs md:text-[10px] font-bold text-accent-foreground">PRO</span>
            </div>
            <button onClick={() => navigate("/bibliotecas")} className="text-accent font-medium flex items-center text-sm md:text-xs">
              Todas <span className="text-lg md:text-base ml-0.5">›</span>
            </button>
          </div>
          
          <BibliotecasCarousel />
        </div>

        {/* Academic Environment Section */}
        <div className="space-y-3">
          <h2 className="md:text-lg text-foreground px-1 font-normal text-base">Ambiente Acadêmico</h2>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {academicCategories.map(category => {
            const Icon = category.icon;
            return <button key={category.id} onClick={() => navigate(category.route)} className={`bg-gradient-to-br ${category.gradient} rounded-2xl md:rounded-xl p-5 md:p-4 text-left transition-all hover:scale-105 hover:shadow-2xl min-h-[160px] md:min-h-[140px] flex flex-col relative overflow-hidden shadow-xl`}>
                  <div className="absolute inset-0 bg-gradient-to-tl from-black/60 via-black/30 to-transparent pointer-events-none" />
                  <div className="bg-white/20 rounded-xl md:rounded-lg p-2.5 md:p-2 w-fit relative z-10 shadow-lg mb-3 md:mb-2">
                    <Icon className="w-6 h-6 md:w-5 md:h-5 text-white" />
                  </div>
                  <h3 className="text-lg md:text-base font-bold text-white mb-2 md:mb-1 relative z-10" style={{
                textShadow: '2px 2px 4px rgba(0,0,0,0.6)'
              }}>
                    {category.title}
                  </h3>
                  <p className="text-white/80 text-xs md:text-[11px] line-clamp-2 relative z-10" style={{
                textShadow: '1px 1px 3px rgba(0,0,0,0.5)'
              }}>
                    {category.description}
                  </p>
                </button>;
          })}
          </div>
        </div>

        {/* Cursos em Destaque */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="md:text-lg text-foreground font-normal text-base">
                Cursos em Destaque
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Descomplicando o Direito
              </p>
            </div>
            <button
              onClick={() => navigate("/iniciando-direito")}
              className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors font-medium text-sm"
            >
              Acessar
            </button>
          </div>
          
          <CursosCarousel />
        </div>

        {/* Notícias em Destaque - Carrossel */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="md:text-lg text-foreground font-normal text-base">Notícias em Destaque</h2>
            <div className="flex gap-2">
              <Button 
                onClick={atualizarNoticias} 
                disabled={atualizandoNoticias}
                variant="ghost"
                size="sm"
                className="text-xs"
              >
                {atualizandoNoticias ? <Loader2 className="w-3 h-3 animate-spin" /> : "🔄"}
              </Button>
              <button onClick={() => navigate("/noticias-juridicas")} className="text-accent font-medium flex items-center text-sm md:text-xs">
                Ver todos <span className="text-lg md:text-base ml-0.5">›</span>
              </button>
            </div>
          </div>
          
          {loadingNews ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 md:w-5 md:h-5 animate-spin text-accent" />
            </div>
          ) : featuredNews.length > 0 ? (
            <div className="overflow-hidden" ref={emblaRefVideo}>
              <div className="flex gap-3 md:gap-4">
                {featuredNews.map((noticia, index) => {
                  const formatarDataHora = (dataString: string) => {
                    try {
                      if (!dataString) return '';
                      
                      // Se for uma data ISO com hora
                      if (dataString.includes('T')) {
                        const date = new Date(dataString);
                        if (isNaN(date.getTime())) return '';
                        
                        // Adicionar 3 horas para corrigir fuso horário
                        date.setHours(date.getHours() + 3);
                        
                        return date.toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        });
                      }
                      
                      // Se for uma data com hora no formato brasileiro (dd/MM/yyyy HH:mm)
                      if (dataString.includes('/') && dataString.includes(':')) {
                        return dataString;
                      }
                      
                      // Se for apenas data no formato ISO
                      if (dataString.includes('-')) {
                        const date = new Date(dataString);
                        if (isNaN(date.getTime())) return '';
                        return date.toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        });
                      }
                      
                      // Se for apenas data no formato brasileiro dd/MM/yyyy
                      if (dataString.includes('/')) {
                        return dataString;
                      }
                      
                      return dataString;
                    } catch {
                      return '';
                    }
                  };

                  return (
                    <div
                      key={noticia.id}
                      className="flex-[0_0_70%] md:flex-[0_0_40%] lg:flex-[0_0_28.5%] min-w-0 bg-card rounded-xl overflow-hidden text-left transition-all hover:scale-105 hover:shadow-2xl border border-border hover:border-primary/30 shadow-lg relative"
                    >
                      <button
                        onClick={() => {
                          navigate('/noticias-juridicas/:noticiaId', {
                            state: {
                              noticia: {
                                id: noticia.id,
                                categoria: noticia.categoria_tipo || 'Geral',
                                portal: noticia.fonte || '',
                                titulo: noticia.titulo,
                                capa: noticia.imagem || '',
                                link: noticia.link,
                                dataHora: noticia.data
                              }
                            }
                          });
                        }}
                        className="w-full"
                      >
                        {noticia.imagem && (
                          <div className="aspect-video relative bg-secondary">
                            <img 
                              src={noticia.imagem} 
                              alt={noticia.titulo} 
                              className="w-full h-full object-cover" 
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          </div>
                        )}
                        <div className="p-3">
                          <h3 className="text-sm font-bold text-foreground mb-2 leading-tight text-left">
                            {noticia.titulo}
                          </h3>
                          <div className="flex items-center justify-between text-xs">
                            {noticia.data && (
                              <p className="text-muted-foreground">
                                {formatarDataHora(noticia.data)}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>;
};
export default Index;