/**
 * Sanitizar e normalizar texto antes de salvar
 */
export const sanitizeText = (text: string): string => {
  if (!text) return '';
  
  return text
    // Remover caracteres invisíveis
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    // Normalizar espaços em branco (múltiplos espaços → um)
    .replace(/\s+/g, ' ')
    // Trim início e fim
    .trim();
};

/**
 * Sanitizar HTML e remover conteúdo malicioso mantendo formatação básica
 */
export const sanitizeHtmlContent = (html: string): string => {
  if (!html) return '';
  
  // Remover caracteres invisíveis
  let sanitized = html.replace(/[\u200B-\u200D\uFEFF]/g, '');
  
  // Normalizar espaços consecutivos fora de tags
  sanitized = sanitized.replace(/>(\s+)</g, '><').replace(/(\s{2,})/g, ' ');
  
  return sanitized.trim();
};

/**
 * Validar e normalizar título de capítulo
 */
export const validateAndNormalizeTitle = (title: string, maxLength: number = 200): { isValid: boolean; normalized: string; error?: string } => {
  const normalized = sanitizeText(title);
  
  if (!normalized) {
    return { isValid: false, normalized: '', error: 'Título não pode estar vazio' };
  }
  
  if (normalized.length < 3) {
    return { isValid: false, normalized: '', error: 'Título deve ter pelo menos 3 caracteres' };
  }
  
  if (normalized.length > maxLength) {
    return { isValid: false, normalized: '', error: `Título não pode exceder ${maxLength} caracteres` };
  }
  
  return { isValid: true, normalized };
};

/**
 * Validar e normalizar conteúdo de capítulo
 */
export const validateAndNormalizeContent = (content: string, maxLength: number = 100000): { isValid: boolean; normalized: string; error?: string } => {
  const normalized = sanitizeHtmlContent(content);
  
  if (!normalized) {
    return { isValid: false, normalized: '', error: 'Conteúdo não pode estar vazio' };
  }
  
  if (normalized.length < 10) {
    return { isValid: false, normalized: '', error: 'Conteúdo deve ter pelo menos 10 caracteres' };
  }
  
  if (normalized.length > maxLength) {
    return { isValid: false, normalized: '', error: `Conteúdo não pode exceder ${maxLength} caracteres` };
  }
  
  return { isValid: true, normalized };
};
