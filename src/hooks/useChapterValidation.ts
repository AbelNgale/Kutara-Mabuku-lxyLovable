/**
 * Hook melhorado para atualizar capítulos com validações
 */

import { validateAndNormalizeTitle, validateAndNormalizeContent } from '@/lib/sanitization';

export const useChapterValidation = () => {
  const validateAndUpdateChapter = (
    index: number,
    field: 'title' | 'content',
    value: string,
    chapters: Array<{ title: string; content: string; chapter_order: number }>,
    onError: (message: string) => void,
    onSuccess: (chapters: typeof chapters) => void
  ) => {
    if (field === 'title') {
      const validation = validateAndNormalizeTitle(value, 200);
      if (!validation.isValid) {
        onError(validation.error || 'Erro de validação');
        return;
      }

      const newChapters = [...chapters];
      newChapters[index].title = validation.normalized;
      onSuccess(newChapters);
    } else {
      const validation = validateAndNormalizeContent(value, 100000);
      if (!validation.isValid) {
        onError(validation.error || 'Erro de validação');
        return;
      }

      const newChapters = [...chapters];
      newChapters[index].content = validation.normalized;
      onSuccess(newChapters);
    }
  };

  return { validateAndUpdateChapter };
};
