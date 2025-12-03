import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import SimplifiedCKEditor from "@/components/SimplifiedCKEditor";
import { TemplateRenderer } from "@/components/TemplateRenderer";
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { ArrowLeft, Save, Download, FileText, X } from "lucide-react";
import jsPDF from "jspdf";

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

      const pdf = new jsPDF();
      let yPosition = 20;

      // Cover page
      if (coverImagePreview) {
        try {
          const img = new Image();
          img.src = coverImagePreview;
          await new Promise<void>(resolve => {
            img.onload = () => resolve();
          });
          const pageWidth = pdf.internal.pageSize.getWidth();
          const pageHeight = pdf.internal.pageSize.getHeight();
          const imgRatio = img.width / img.height;
          const pageRatio = pageWidth / pageHeight;
          let finalWidth, finalHeight, xOffset, yOffset;
          if (imgRatio > pageRatio) {
            finalHeight = pageHeight;
            finalWidth = finalHeight * imgRatio;
            xOffset = (pageWidth - finalWidth) / 2;
            yOffset = 0;
          } else {
            finalWidth = pageWidth;
            finalHeight = finalWidth / imgRatio;
            xOffset = 0;
            yOffset = (pageHeight - finalHeight) / 2;
          }
          pdf.addImage(img, 'JPEG', xOffset, yOffset, finalWidth, finalHeight);
        } catch (error) {
          console.error('Erro ao adicionar capa ao PDF:', error);
        }
      }

      // Title page
      pdf.addPage();
      yPosition = 20;
      pdf.setFontSize(24);
      const titleText = htmlToText(ebook.title);
      const titleLines = pdf.splitTextToSize(titleText, 170);
      pdf.text(titleLines, 20, yPosition);
      yPosition += titleLines.length * 12 + 20;
      if (ebook.author) {
        pdf.setFontSize(14);
        pdf.text(`Escrito por ${ebook.author}`, 20, yPosition);
      }

      // Description page
      if (ebook.description) {
        pdf.addPage();
        yPosition = 20;
        pdf.setFontSize(12);
        const descText = htmlToText(ebook.description);
        const descLines = pdf.splitTextToSize(descText, 170);
        pdf.text(descLines, 20, yPosition);
      }

      // Content page
      pdf.addPage();
      yPosition = 20;
      pdf.setFontSize(12);
      const plainText = htmlToText(content);
      const contentLines = pdf.splitTextToSize(plainText, 170);
      contentLines.forEach((line: string) => {
        if (yPosition > 280) {
          pdf.addPage();
          yPosition = 20;
        }
        pdf.text(line, 20, yPosition);
        yPosition += 7;
      });

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

      const docSections: Paragraph[] = [];

      // Title
      docSections.push(new Paragraph({
        text: htmlToText(ebook.title),
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      }));

      // Author
      if (ebook.author) {
        docSections.push(new Paragraph({
          children: [new TextRun({ text: `Escrito por ${ebook.author}`, bold: true })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        }));
      }

      // Description
      if (ebook.description) {
        docSections.push(new Paragraph({
          text: htmlToText(ebook.description),
          spacing: { after: 400 }
        }));
      }

      // Content
      const contentText = htmlToText(content);
      const paragraphs = contentText.split('\n').filter(p => p.trim());
      paragraphs.forEach(para => {
        docSections.push(new Paragraph({
          text: para,
          spacing: { after: 200 }
        }));
      });

      const doc = new Document({
        sections: [{
          properties: {},
          children: docSections
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
              {/* Toolbar outside the page */}
              <div id="editor-toolbar-container" className="mb-4 bg-card border rounded-lg p-2 shadow-sm" />
              
              {/* A4 Page */}
              <div 
                className="a4-page"
                style={{ 
                  userSelect: 'none',
                  WebkitUserDrag: 'none'
                } as React.CSSProperties}
                draggable={false}
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
                        background: 'transparent'
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
                  <div className="flex-1" style={{ minHeight: 0 }}>
                    <SimplifiedCKEditor
                      value={content}
                      onChange={setContent}
                    />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="mt-0 w-full">
            <TemplateRenderer
              templateId={ebook.template_id}
              title={ebook.title}
              description={ebook.description || ''}
              author={ebook.author}
              chapters={[{
                title: ebook.title,
                content: content,
                chapter_order: 0
              }]}
              coverImage={coverImagePreview}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
