export { ClassicTemplate } from './ClassicTemplate';
export { VisualTemplate } from './VisualTemplate';
export { MinimalTemplate } from './MinimalTemplate';

export interface EbookTemplateProps {
  title: string;
  content: string;
  images?: { src: string; alt: string; caption?: string }[];
}

export const EBOOK_TEMPLATES = [
  {
    id: 'classic',
    name: 'Clássico',
    description: 'Layout tradicional com texto corrido e imagens centralizadas',
    component: 'ClassicTemplate',
  },
  {
    id: 'visual',
    name: 'Visual',
    description: 'Blocos alternados com imagens grandes e impactantes',
    component: 'VisualTemplate',
  },
  {
    id: 'minimal',
    name: 'Minimalista',
    description: 'Design moderno com texto e imagens em colunas',
    component: 'MinimalTemplate',
  },
] as const;
