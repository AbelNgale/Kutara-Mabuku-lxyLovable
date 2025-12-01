/**
 * Utilitários para o Editor de eBook
 */

import { validateAndNormalizeTitle, validateAndNormalizeContent, sanitizeText } from './sanitization';

export interface ChapterValidation {
  isValid: boolean;
  errors: string[];
  normalized?: {
    title: string;
    content: string;
  };
}

/**
 * Validar e normalizar um capítulo completo
 */
export const validateAndNormalizeChapter = (
  chapter: { title: string; content: string },
  chapterIndex: number
): ChapterValidation => {
  const errors: string[] = [];

  const titleValidation = validateAndNormalizeTitle(chapter.title, 200);
  if (!titleValidation.isValid) {
    errors.push(`Capítulo ${chapterIndex + 1}: ${titleValidation.error}`);
  }

  const contentValidation = validateAndNormalizeContent(chapter.content, 100000);
  if (!contentValidation.isValid) {
    errors.push(`Capítulo ${chapterIndex + 1}: ${contentValidation.error}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    normalized:
      titleValidation.isValid && contentValidation.isValid
        ? {
            title: titleValidation.normalized,
            content: contentValidation.normalized,
          }
        : undefined,
  };
};

/**
 * Validar e normalizar metadados do eBook
 */
export const validateAndNormalizeEbook = (ebook: {
  title: string;
  description: string;
  author?: string | null;
}): ChapterValidation => {
  const errors: string[] = [];

  const titleValidation = validateAndNormalizeTitle(ebook.title, 300);
  if (!titleValidation.isValid) {
    errors.push(`Título do eBook: ${titleValidation.error}`);
  }

  const descValidation = validateAndNormalizeContent(ebook.description, 5000);
  if (!descValidation.isValid) {
    errors.push(`Descrição: ${descValidation.error}`);
  }

  if (ebook.author) {
    const authorNormalized = sanitizeText(ebook.author);
    if (authorNormalized.length < 3 || authorNormalized.length > 100) {
      errors.push('Autor deve ter entre 3 e 100 caracteres');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    normalized:
      errors.length === 0
        ? {
            title: validateAndNormalizeTitle(ebook.title, 300).normalized,
            content: validateAndNormalizeContent(ebook.description, 5000).normalized,
          }
        : undefined,
  };
};
