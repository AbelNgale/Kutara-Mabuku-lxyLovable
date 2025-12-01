/**
 * Serviço para gerenciar capítulos com ordenação
 */

import { supabase } from '@/integrations/supabase/client';

export interface Chapter {
  id: string;
  ebook_id: string;
  title: string;
  content: string;
  chapter_order: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Buscar capítulos de um eBook na ordem correta
 */
export const fetchChaptersOrdered = async (ebookId: string) => {
  const { data, error } = await supabase
    .from('chapters')
    .select('*')
    .eq('ebook_id', ebookId)
    .order('chapter_order', { ascending: true });

  if (error) {
    throw new Error(`Erro ao buscar capítulos: ${error.message}`);
  }

  return data as Chapter[];
};

/**
 * Criar novo capítulo com chapter_order automático
 */
export const createChapter = async (
  ebookId: string,
  title: string,
  content: string
) => {
  // Buscar o número de capítulos existentes
  const { count } = await supabase
    .from('chapters')
    .select('id', { count: 'exact' })
    .eq('ebook_id', ebookId);

  const nextOrder = (count ?? 0) + 1;

  const { data, error } = await supabase
    .from('chapters')
    .insert({
      ebook_id: ebookId,
      title,
      content,
      chapter_order: nextOrder,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao criar capítulo: ${error.message}`);
  }

  return data as Chapter;
};

/**
 * Atualizar ordenação dos capítulos (para reordenação via drag & drop)
 */
export const reorderChapters = async (
  chapters: Array<{ id: string; chapter_order: number }>
) => {
  const updates = chapters.map((ch) =>
    supabase
      .from('chapters')
      .update({ chapter_order: ch.chapter_order })
      .eq('id', ch.id)
  );

  const results = await Promise.all(updates);

  // Verificar se houve erros
  for (const result of results) {
    if (result.error) {
      throw new Error(`Erro ao reordenar capítulos: ${result.error.message}`);
    }
  }

  return true;
};

/**
 * Deletar capítulo e reordenar os restantes
 */
export const deleteChapterAndReorder = async (
  chapterId: string,
  ebookId: string
) => {
  // 1. Buscar todos os capítulos do eBook
  const { data: chapters } = await supabase
    .from('chapters')
    .select('*')
    .eq('ebook_id', ebookId)
    .order('chapter_order', { ascending: true });

  // 2. Deletar o capítulo
  const { error: deleteError } = await supabase
    .from('chapters')
    .delete()
    .eq('id', chapterId);

  if (deleteError) {
    throw new Error(`Erro ao deletar capítulo: ${deleteError.message}`);
  }

  // 3. Reordenar capítulos restantes
  if (chapters) {
    const remainingChapters = chapters
      .filter((ch) => ch.id !== chapterId)
      .sort((a, b) => a.chapter_order - b.chapter_order)
      .map((ch, idx) => ({ ...ch, chapter_order: idx }));

    await reorderChapters(
      remainingChapters.map((ch) => ({
        id: ch.id,
        chapter_order: ch.chapter_order,
      }))
    );
  }

  return true;
};
