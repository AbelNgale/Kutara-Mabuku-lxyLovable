import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import SimplifiedCKEditor from "@/components/SimplifiedCKEditor";
import CoverPreview from "@/components/CoverPreview";
import { coverTemplates, CoverTemplate } from "@/components/templates/covers";
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ImageRun, PageBreak } from 'docx';
import { ArrowLeft, Save, Download, FileText, ImageIcon } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const PagedPreview = lazy(() => import("@/components/PagedPreview"));

interface Ebook {
  id: string;
  title: string;
  description: string;
  cover_image: string | null;
  template_id: string | null;
  author: string | null;
  genre: string | null;
  price: number;
}

export default function Editor() {
  const [searchParams] = useSearchParams();
  const ebookId = searchParams.get("id");
  const navigate = useNavigate();
  const { toast } = useToast();

  const [ebook, setEbook] = useState<Ebook | null>(null);
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("edit");
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [selectedCoverTemplate, setSelectedCoverTemplate] = useState<CoverTemplate>('classic');

  const getErrorMessage = (error: unknown) => {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    try {
      return JSON.stringify(error) || 'Erro desconhecido';
    } catch {
      return 'Erro desconhecido';
    }
  };

  const loadEbook = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      const { data: ebookData, error: ebookError } = await supabase.from("ebooks").select("*").eq("id", ebookId).single();
      if (ebookError) throw ebookError;
      setEbook(ebookData);
      setCoverImagePreview(ebookData.cover_image);
      
      // Load single content from chapters (get first one if exists)
      const { data: chaptersData, error: chaptersError } = await supabase.from("chapters").select("*").eq("ebook_id", ebookId).order("chapter_order", { ascending: true });
      if (chaptersError) throw chaptersError;
      if (chaptersData && chaptersData.length > 0) {
        setContent(chaptersData[0].content || "");
      } else {
        setContent("");
      }
    } catch (error: unknown) {
      toast({ title: "Erro ao carregar ebook", description: getErrorMessage(error), variant: "destructive" });
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  }, [ebookId, navigate, toast]);

  useEffect(() => {
    if (!ebookId) {
      navigate("/dashboard");
      return;
    }
    loadEbook();
  }, [ebookId, loadEbook, navigate]);

  const handleSave = async () => {
    if (!ebook) return;
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      let coverImageUrl = ebook.cover_image;
      if (coverImage) {
        const fileExt = coverImage.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${session.user.id}/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('ebook-covers').upload(filePath, coverImage);
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from('ebook-covers').getPublicUrl(filePath);
          coverImageUrl = publicUrl;
        }
      }

      const { error: ebookError } = await supabase.from("ebooks").update({
        title: ebook.title,
        description: ebook.description,
        pages: 1,
        cover_image: coverImageUrl,
        author: ebook.author,
        genre: ebook.genre,
        price: ebook.price
      }).eq("id", ebook.id);
      if (ebookError) throw ebookError;

      // Delete all chapters and insert single one
      const { error: deleteError } = await supabase.from("chapters").delete().eq("ebook_id", ebook.id);
      if (deleteError) throw deleteError;
      
      const { error: chaptersError } = await supabase.from("chapters").insert({
        ebook_id: ebook.id,
        title: ebook.title,
        content: content,
        chapter_order: 0
      });
      if (chaptersError) throw chaptersError;

      toast({ title: "Salvo com sucesso!", description: "Seu ebook foi salvo." });
      await loadEbook();
    } catch (error: unknown) {
      toast({ title: "Erro ao salvar", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveCoverImage = () => {
    setCoverImage(null);
    setCoverImagePreview(null);
    if (ebook) {
      setEbook({ ...ebook, cover_image: null });
    }
  };

  const handleDownloadPDF = async () => {
    if (!ebook) return;
    try {
      const htmlToText = (html: string) => {
        const temp = document.createElement('div');
        temp.innerHTML = html;
        return temp.textContent || temp.innerText || '';
      };

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4'
      });
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 72; // 1 inch margins
      const contentWidth = pageWidth - (margin * 2);

      // 1. Capture cover from preview if available
      const coverEl = document.querySelector('.cover-preview-container') as HTMLElement;
      if (coverEl) {
        try {
          const canvas = await html2canvas(coverEl, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff'
          });
          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight);
        } catch (err) {
          console.error('Cover capture error:', err);
        }
      }

      // 2. Capture paged content if available
      const pagedContainer = document.querySelector('.pagedjs_pages') as HTMLElement;
      if (pagedContainer) {
        const pages = pagedContainer.querySelectorAll('.pagedjs_page');
        for (let i = 0; i < pages.length; i++) {
          pdf.addPage();
          try {
            const canvas = await html2canvas(pages[i] as HTMLElement, {
              scale: 2,
              useCORS: true,
              allowTaint: true,
              backgroundColor: '#ffffff'
            });
            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight);
          } catch (err) {
            console.error('Page capture error:', err);
          }
        }
      } else {
        // Fallback: text-based PDF
        pdf.addPage();
        let yPos = margin + 100;
        
        // Title
        pdf.setFontSize(28);
        pdf.setFont('helvetica', 'bold');
        const titleLines = pdf.splitTextToSize(htmlToText(ebook.title), contentWidth);
        pdf.text(titleLines, pageWidth / 2, yPos, { align: 'center' });
        yPos += titleLines.length * 35 + 40;
        
        if (ebook.author) {
          pdf.setFontSize(16);
          pdf.setFont('helvetica', 'normal');
          pdf.text(`por ${ebook.author}`, pageWidth / 2, yPos, { align: 'center' });
        }
        
        // Description
        if (ebook.description) {
          pdf.addPage();
          yPos = margin;
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'italic');
          const descLines = pdf.splitTextToSize(htmlToText(ebook.description), contentWidth);
          for (const line of descLines) {
            if (yPos > pageHeight - margin) {
              pdf.addPage();
              yPos = margin;
            }
            pdf.text(line, margin, yPos);
            yPos += 18;
          }
        }
        
        // Content
        pdf.addPage();
        yPos = margin;
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'normal');
        const plainText = htmlToText(content);
        const paragraphs = plainText.split('\n').filter(p => p.trim());
        
        for (const para of paragraphs) {
          const lines = pdf.splitTextToSize(para, contentWidth);
          for (const line of lines) {
            if (yPos > pageHeight - margin) {
              pdf.addPage();
              yPos = margin;
            }
            pdf.text(line, margin, yPos);
            yPos += 18;
          }
          yPos += 12;
        }
      }

      pdf.save(`${htmlToText(ebook.title)}.pdf`);
      toast({ title: "PDF gerado!", description: "O download foi iniciado." });
    } catch (error: unknown) {
      toast({ title: "Erro ao gerar PDF", description: getErrorMessage(error), variant: "destructive" });
    }
  };

  const handleDownloadDOCX = async () => {
    if (!ebook) return;
    try {
      const htmlToText = (html: string): string => {
        const temp = document.createElement('div');
        temp.innerHTML = html;
        return temp.textContent || temp.innerText || '';
      };

      const children: Paragraph[] = [];

      // 1. Capture cover as image
      const coverEl = document.querySelector('.cover-preview-container') as HTMLElement;
      if (coverEl) {
        try {
          const canvas = await html2canvas(coverEl, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff'
          });
          const dataUrl = canvas.toDataURL('image/png');
          const base64 = dataUrl.split(',')[1];
          const coverData = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
          
          children.push(
            new Paragraph({
              children: [
                new ImageRun({
                  data: coverData,
                  transformation: { width: 500, height: 707 },
                  type: 'png'
                })
              ],
              alignment: AlignmentType.CENTER
            }),
            new Paragraph({ children: [new PageBreak()] })
          );
        } catch (err) {
          console.error('Cover capture error:', err);
        }
      }

      // 2. Title page
      children.push(
        new Paragraph({
          text: htmlToText(ebook.title),
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { before: 400, after: 200 }
        })
      );

      if (ebook.author) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `por ${ebook.author}`, italics: true, size: 28 })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
          })
        );
      }

      children.push(new Paragraph({ children: [new PageBreak()] }));

      // 3. Description
      if (ebook.description) {
        children.push(
          new Paragraph({
            text: 'Sinopse',
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 200 }
          })
        );
        
        const descText = htmlToText(ebook.description);
        descText.split('\n').filter(p => p.trim()).forEach(para => {
          children.push(new Paragraph({ text: para, spacing: { after: 200 } }));
        });

        children.push(new Paragraph({ children: [new PageBreak()] }));
      }

      // 4. Content with proper paragraphs
      const contentText = htmlToText(content);
      const paragraphs = contentText.split('\n').filter(p => p.trim());
      
      paragraphs.forEach(para => {
        children.push(new Paragraph({ text: para, spacing: { after: 240 } }));
      });

      const doc = new Document({
        sections: [{
          properties: {
            page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } }
          },
          children
        }]
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `${htmlToText(ebook.title)}.docx`);
      toast({ title: "DOCX gerado!", description: "O download foi iniciado." });
    } catch (error: unknown) {
      toast({ title: "Erro ao gerar DOCX", description: getErrorMessage(error), variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando editor...</p>
        </div>
      </div>
    );
  }

  if (!ebook) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <p className="text-sm text-muted-foreground">Editor de Ebook</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Salvando..." : "Salvar"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setActiveTab(activeTab === "edit" ? "preview" : "edit")}>
                {activeTab === "edit" ? "Visualizar" : "Editar"}
              </Button>
              <Button size="sm" onClick={handleDownloadPDF}>
                <Download className="h-4 w-4 mr-2" />
                Exportar PDF
              </Button>
              <Button size="sm" onClick={handleDownloadDOCX} variant="secondary">
                <Download className="h-4 w-4 mr-2" />
                Exportar DOCX
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="a4-editor-wrapper">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div style={{ paddingLeft: '2rem', paddingRight: '2rem' }}>
            <TabsList className="grid w-full max-w-xs grid-cols-2 mb-6">
              <TabsTrigger value="edit">
                <FileText className="h-4 w-4 mr-2" />
                Editar
              </TabsTrigger>
              <TabsTrigger value="preview">
                Visualizar
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Edit Tab - Show A4 page with editor inside */}
          <TabsContent value="edit" className="mt-0 flex justify-center w-full">
            <div className="a4-editor-content">
              {/* Cover Template Selector */}
              <div className="mb-4 p-4 bg-card border rounded-lg shadow-sm">
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Template da Capa:
                  </span>
                  <div className="flex gap-2 flex-wrap">
                    {coverTemplates.map((template) => (
                      <Button
                        key={template.id}
                        variant={selectedCoverTemplate === template.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedCoverTemplate(template.id)}
                      >
                        {template.name}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Cover Page Preview */}
              <div className="mb-6">
                <p className="text-sm text-muted-foreground mb-2 text-center">Capa do Ebook</p>
                <div style={{ transform: 'scale(0.5)', transformOrigin: 'top center', marginBottom: '-5.5in' }}>
                  <CoverPreview
                    template={selectedCoverTemplate}
                    title={ebook.title}
                    author={ebook.author}
                    coverImage={coverImagePreview}
                    genre={ebook.genre}
                  />
                </div>
              </div>
              
              {/* A4 Page for Content */}
              <div 
                className="a4-page"
                style={{ 
                  userSelect: 'none',
                  WebkitUserDrag: 'none',
                  pointerEvents: 'auto'
                } as React.CSSProperties}
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
              >
                <div className="page-content" style={{ userSelect: 'text' }}>
                  <div style={{ marginBottom: '16pt' }}>
                    <Input
                      value={ebook.title}
                      onChange={e => setEbook({ ...ebook, title: e.target.value })}
                      placeholder="Título do ebook"
                      className="text-2xl font-bold border-none shadow-none p-0 h-auto focus-visible:ring-0"
                      style={{ 
                        fontSize: '24pt', 
                        fontFamily: "'Calibri', 'Segoe UI', sans-serif",
                        background: 'transparent',
                        color: '#000'
                      }}
                    />
                  </div>
                  {ebook.author && (
                    <div style={{ marginBottom: '16pt', color: '#666' }}>
                      <span style={{ fontSize: '12pt', fontFamily: "'Calibri', 'Segoe UI', sans-serif" }}>
                        por {ebook.author}
                      </span>
                    </div>
                  )}
                  <div className="editor-area" style={{ flex: 1, minHeight: '600px', overflow: 'hidden' }}>
                    <SimplifiedCKEditor
                      value={content}
                      onChange={setContent}
                    />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Preview Tab - Using Paged.js for real pagination */}
          <TabsContent value="preview" className="mt-0 w-full">
            <Suspense fallback={
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            }>
              <div className="paged-preview-container">
                {/* Cover with selected template */}
                <CoverPreview
                  template={selectedCoverTemplate}
                  title={ebook.title}
                  author={ebook.author}
                  coverImage={coverImagePreview}
                  genre={ebook.genre}
                />
                
                {/* Content pages */}
                <PagedPreview
                  title={ebook.title}
                  author={ebook.author}
                  description={ebook.description || ''}
                  content={content}
                  coverImage={null}
                />
              </div>
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
