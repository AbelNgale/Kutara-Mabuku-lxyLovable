-- Verificar e garantir que chapters tem chapter_order
-- Esta migration garante que todos os capítulos têm ordem definida

-- 1. Adicionar coluna chapter_order se não existir (pode precisar ajustar conforme seu BD)
ALTER TABLE chapters 
ADD COLUMN IF NOT EXISTS chapter_order INTEGER DEFAULT 0;

-- 2. Criar índice para melhor performance nas buscas ordenadas
CREATE INDEX IF NOT EXISTS idx_chapters_ebook_order 
ON chapters(ebook_id, chapter_order ASC);

-- 3. Garantir que não há capítulos com chapter_order NULL
UPDATE chapters 
SET chapter_order = (
  SELECT COUNT(*) - 1
  FROM chapters c2
  WHERE c2.ebook_id = chapters.ebook_id
  AND c2.id <= chapters.id
)
WHERE chapter_order IS NULL;

-- Comentários:
-- - Se a coluna já existe, o IF NOT EXISTS a evitará
-- - O índice melhora performance ao buscar capítulos na ordem
-- - A atualização garante que cada capítulo tenha uma ordem sequencial
