export { ClassicCover } from './ClassicCover';
export { ModernCover } from './ModernCover';
export { MinimalCover } from './MinimalCover';
export { BoldCover } from './BoldCover';

export type CoverTemplate = 'classic' | 'modern' | 'minimal' | 'bold';

export const coverTemplates: { id: CoverTemplate; name: string; description: string }[] = [
  { id: 'classic', name: 'Clássico', description: 'Design elegante e tradicional' },
  { id: 'modern', name: 'Moderno', description: 'Visual contemporâneo com gradientes' },
  { id: 'minimal', name: 'Minimalista', description: 'Limpo e sofisticado' },
  { id: 'bold', name: 'Impactante', description: 'Cores vibrantes e tipografia forte' }
];
