import { ClassicTemplate } from './templates/ebooks/ClassicTemplate';
import { VisualTemplate } from './templates/ebooks/VisualTemplate';
import { MinimalTemplate } from './templates/ebooks/MinimalTemplate';
import { EbookTemplateProps } from './templates/ebooks';

interface TemplateRendererProps {
  templateId: string | null;
  title: string;
  description: string;
  author: string | null;
  chapters: Array<{
    id?: string;
    title: string;
    content: string;
    chapter_order: number;
  }>;
  coverImage?: string | null;
}

export const TemplateRenderer = ({
  templateId,
  title,
  description,
  author,
  chapters,
  coverImage,
}: TemplateRendererProps) => {
  // Preparar dados para o template
  const templateProps: EbookTemplateProps = {
    title,
    content: chapters.map(ch => `<h2>${ch.title}</h2><div>${ch.content}</div>`).join('<hr />'),
    images: coverImage ? [{ src: coverImage, alt: 'Capa do eBook' }] : [],
  };

  // Mapear IDs da API para templates locais
  const getTemplateComponent = (id: string | null) => {
    if (!id) {
      console.log('Template ID é null, usando ClassicTemplate como fallback');
      return <ClassicTemplate {...templateProps} />;
    }
    
    console.log(`Renderizando template: ${id}`);
    
    switch (id) {
      // Templates locais
      case 'classic':
        console.log('✓ Renderizado: ClassicTemplate (layout tradicional)');
        return <ClassicTemplate {...templateProps} />;
      case 'visual':
        console.log('✓ Renderizado: VisualTemplate (blocos visuais)');
        return <VisualTemplate {...templateProps} />;
      case 'minimal':
        console.log('✓ Renderizado: MinimalTemplate (colunas)');
        return <MinimalTemplate {...templateProps} />;
      
      // Templates da API - mapear para locais
      case 'modern-magazine':
        console.log('✓ Renderizado: VisualTemplate (modern-magazine → visual)');
        return <VisualTemplate {...templateProps} />;
      case 'minimal-book':
        console.log('✓ Renderizado: MinimalTemplate (minimal-book → minimal)');
        return <MinimalTemplate {...templateProps} />;
      
      // Fallback
      default:
        console.warn(`Template desconhecido: ${id}, usando ClassicTemplate`);
        return <ClassicTemplate {...templateProps} />;
    }
  };

  return getTemplateComponent(templateId);
};