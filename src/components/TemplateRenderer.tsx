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

  switch (templateId) {
    case 'classic':
      return <ClassicTemplate {...templateProps} />;
    case 'visual':
      return <VisualTemplate {...templateProps} />;
    case 'minimal':
      return <MinimalTemplate {...templateProps} />;
    default:
      // Fallback para o template clássico
      return <ClassicTemplate {...templateProps} />;
  }
};
