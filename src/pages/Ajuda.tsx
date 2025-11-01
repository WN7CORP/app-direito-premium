import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  MessageCircle, 
  Book, 
  Scale, 
  User, 
  FileText, 
  Gamepad2, 
  HelpCircle,
  Mail,
  Copy,
  Video,
  Headphones,
  BookOpen,
  FileQuestion,
  GraduationCap,
  Gavel,
  TrendingUp
} from "lucide-react";
import { SuporteChatModal } from "@/components/SuporteChatModal";
import { FAQSearch } from "@/components/FAQSearch";
import { AppStatisticsCard } from "@/components/AppStatisticsCard";
import { useAppStatistics } from "@/hooks/useAppStatistics";
import { toast } from "sonner";

export default function Ajuda() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { statistics, isLoading } = useAppStatistics();

  const copyEmail = () => {
    navigator.clipboard.writeText("wn7corporation@gmail.com");
    toast.success("E-mail copiado!");
  };

  const faqCategories = [
    {
      id: "aprendizado",
      title: "Aprendizado",
      icon: Book,
      questions: [
        {
          q: "Como acessar os cursos e videoaulas?",
          a: 'Acesse o menu "Aprender" e escolha entre Cursos, Videoaulas ou Audioaulas. Todo o conteúdo está organizado por área do Direito.'
        },
        {
          q: "Os flashcards são gratuitos?",
          a: "Sim! Todos os flashcards estão disponíveis gratuitamente. Acesse em Aprender > Flashcards."
        },
        {
          q: "Como funciona o plano de estudos personalizado?",
          a: "Na seção Ferramentas, você encontra o Gerador de Plano de Estudos. Responda algumas perguntas e receba um cronograma personalizado."
        }
      ]
    },
    {
      id: "ferramentas",
      title: "Ferramentas Jurídicas",
      icon: Scale,
      questions: [
        {
          q: "O Vade Mecum está atualizado?",
          a: "Sim! Nosso Vade Mecum é atualizado regularmente com as últimas alterações legislativas."
        },
        {
          q: "Como buscar jurisprudência?",
          a: 'Acesse "Jurisprudência" no menu e use os filtros por tribunal, área do direito e palavras-chave.'
        },
        {
          q: "Posso baixar os materiais para estudar offline?",
          a: "Alguns materiais como PDFs de resumos e petições podem ser salvos. Use o botão de download quando disponível."
        }
      ]
    },
    {
      id: "conta",
      title: "Conta e Acesso",
      icon: User,
      questions: [
        {
          q: "Como criar uma conta?",
          a: "Clique em 'Entrar' no menu e siga as instruções para criar sua conta com e-mail ou Google."
        },
        {
          q: "Esqueci minha senha, como recupero?",
          a: "Na tela de login, clique em 'Esqueci minha senha' e siga as instruções enviadas por e-mail."
        },
        {
          q: "Posso usar em mais de um dispositivo?",
          a: "Sim! Sua conta sincroniza automaticamente em todos os dispositivos."
        }
      ]
    },
    {
      id: "documentos",
      title: "Documentos e Petições",
      icon: FileText,
      questions: [
        {
          q: "Como gerar uma petição?",
          a: 'Acesse "Ferramentas" > "Advogado IA" e escolha o tipo de petição. Preencha os dados e a IA gerará o documento.'
        },
        {
          q: "Posso editar as petições geradas?",
          a: "Sim! Todas as petições podem ser editadas antes de exportar para PDF."
        },
        {
          q: "Os documentos são salvos automaticamente?",
          a: "Sim, seus documentos ficam disponíveis no histórico do Advogado IA."
        }
      ]
    },
    {
      id: "jogos",
      title: "Jogos e Simulações",
      icon: Gamepad2,
      questions: [
        {
          q: "Como funcionam as simulações de audiência?",
          a: "Escolha um caso, selecione provas e argumentos, e enfrente um advogado virtual. Você recebe feedback em tempo real da juíza."
        },
        {
          q: "Os jogos ajudam no aprendizado?",
          a: "Sim! Jogos como Forca, Stop e Palavras Cruzadas reforçam conceitos jurídicos de forma lúdica."
        },
        {
          q: "Posso repetir as simulações?",
          a: "Sim! Você pode jogar quantas vezes quiser para melhorar sua pontuação."
        }
      ]
    },
    {
      id: "outros",
      title: "Outros",
      icon: HelpCircle,
      questions: [
        {
          q: "O app funciona offline?",
          a: "Algumas funcionalidades exigem internet (IA, atualizações). Conteúdos baixados ficam disponíveis offline."
        },
        {
          q: "Como reportar um erro?",
          a: "Use o chat de suporte clicando no botão 'Falar com Suporte' ou entre em contato pelo e-mail da equipe."
        },
        {
          q: "Vocês oferecem certificados?",
          a: "Atualmente não oferecemos certificados, mas estamos trabalhando nessa funcionalidade!"
        }
      ]
    }
  ];

  const filteredCategories = faqCategories.map(category => ({
    ...category,
    questions: category.questions.filter(
      faq =>
        faq.q.toLowerCase().includes(searchTerm.toLowerCase()) ||
        faq.a.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => category.questions.length > 0);

  const statisticsCards = [
    { icon: BookOpen, title: "Flashcards", value: statistics.flashcards, color: "bg-blue-500" },
    { icon: Video, title: "Videoaulas", value: statistics.videoaulas, color: "bg-red-500" },
    { icon: Headphones, title: "Audioaulas", value: statistics.audioaulas, color: "bg-purple-500" },
    { icon: Book, title: "Livros no Total", value: statistics.livrosTotal, color: "bg-green-500" },
    { icon: FileText, title: "Resumos Jurídicos", value: statistics.resumos, color: "bg-orange-500" },
    { icon: FileQuestion, title: "Questões OAB", value: statistics.questoesOAB, color: "bg-yellow-500" },
    { icon: GraduationCap, title: "Aulas de Cursos", value: statistics.cursosAulas, color: "bg-indigo-500" },
    { icon: Gavel, title: "Casos de Simulação", value: statistics.casosSimulacao, color: "bg-pink-500" }
  ];

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-foreground">Central de Ajuda</h1>
          <p className="text-lg text-muted-foreground">
            Tire suas dúvidas, entre em contato ou veja nossos números
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="faq" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="suporte" className="gap-2">
              <MessageCircle className="w-4 h-4" />
              Suporte
            </TabsTrigger>
            <TabsTrigger value="faq" className="gap-2">
              <HelpCircle className="w-4 h-4" />
              FAQ
            </TabsTrigger>
            <TabsTrigger value="numeros" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Números
            </TabsTrigger>
          </TabsList>

          {/* Aba Suporte */}
          <TabsContent value="suporte" className="space-y-6 mt-6">
            <Card className="p-8 text-center bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <MessageCircle className="w-16 h-16 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Fale com Nossa Equipe</h2>
              <p className="text-muted-foreground mb-6">
                Estamos prontos para te ajudar com qualquer dúvida
              </p>
              <Button size="lg" onClick={() => setIsChatOpen(true)} className="gap-2">
                <MessageCircle className="w-5 h-5" />
                Iniciar Chat de Suporte
              </Button>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-primary/10">
                    <Mail className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">E-mail de Suporte</h3>
                    <p className="text-muted-foreground mb-3">
                      Entre em contato por e-mail para questões mais detalhadas
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 bg-muted rounded text-sm">
                        wn7corporation@gmail.com
                      </code>
                      <Button size="icon" variant="outline" onClick={copyEmail}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-green-500/10">
                    <MessageCircle className="w-6 h-6 text-green-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">Horário de Atendimento</h3>
                    <p className="text-muted-foreground mb-3">
                      Nossa equipe está disponível para te ajudar
                    </p>
                    <div className="space-y-1 text-sm">
                      <p><strong>Segunda a Sexta:</strong> 9h às 18h</p>
                      <p><strong>Sábado:</strong> 9h às 13h</p>
                      <p><strong>Domingo:</strong> Fechado</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Aba FAQ */}
          <TabsContent value="faq" className="space-y-6 mt-6">
            <FAQSearch value={searchTerm} onChange={setSearchTerm} />

            {filteredCategories.length === 0 ? (
              <Card className="p-12 text-center">
                <HelpCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-lg text-muted-foreground">
                  Nenhuma pergunta encontrada para "{searchTerm}"
                </p>
              </Card>
            ) : (
              <div className="space-y-6">
                {filteredCategories.map((category) => {
                  const Icon = category.icon;
                  return (
                    <Card key={category.id} className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <h3 className="text-xl font-semibold">{category.title}</h3>
                      </div>
                      
                      <Accordion type="single" collapsible className="w-full">
                        {category.questions.map((faq, index) => (
                          <AccordionItem key={index} value={`item-${index}`}>
                            <AccordionTrigger className="text-left">
                              {faq.q}
                            </AccordionTrigger>
                            <AccordionContent className="text-muted-foreground">
                              {faq.a}
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Aba App em Números */}
          <TabsContent value="numeros" className="space-y-6 mt-6">
            <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/10">
              <div className="text-center mb-2">
                <h2 className="text-2xl font-bold mb-2">Direito Premium em Números</h2>
                <p className="text-muted-foreground">
                  Todo esse conteúdo está disponível para você estudar e aprender
                </p>
              </div>
            </Card>

            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <Card key={i} className="p-6">
                    <div className="flex flex-col items-center gap-4">
                      <Skeleton className="w-16 h-16 rounded-full" />
                      <div className="w-full space-y-2">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {statisticsCards.map((card, index) => (
                  <AppStatisticsCard
                    key={card.title}
                    icon={card.icon}
                    title={card.title}
                    value={card.value}
                    color={card.color}
                    delay={index * 100}
                  />
                ))}
              </div>
            )}

            {!isLoading && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Detalhes da Biblioteca</h3>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between p-3 bg-muted/50 rounded">
                    <span>Biblioteca de Estudos</span>
                    <span className="font-bold">{statistics.livrosEstudos} livros</span>
                  </div>
                  <div className="flex justify-between p-3 bg-muted/50 rounded">
                    <span>Fora da Toga</span>
                    <span className="font-bold">{statistics.livrosForaDaToga} livros</span>
                  </div>
                  <div className="flex justify-between p-3 bg-muted/50 rounded">
                    <span>Clássicos</span>
                    <span className="font-bold">{statistics.livrosClassicos} livros</span>
                  </div>
                  <div className="flex justify-between p-3 bg-muted/50 rounded">
                    <span>Liderança</span>
                    <span className="font-bold">{statistics.livrosLideranca} livros</span>
                  </div>
                  <div className="flex justify-between p-3 bg-muted/50 rounded">
                    <span>Oratória</span>
                    <span className="font-bold">{statistics.livrosOratoria} livros</span>
                  </div>
                </div>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <SuporteChatModal open={isChatOpen} onOpenChange={setIsChatOpen} />
    </div>
  );
}
