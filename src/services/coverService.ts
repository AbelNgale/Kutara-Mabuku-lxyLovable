/**
 * Serviço para gerenciar uploads de capa de eBook
 */

import { supabase } from '@/integrations/supabase/client';

export interface CoverUploadResult {
  success: boolean;
  publicUrl?: string;
  error?: string;
}

/**
 * Upload da capa para storage e retorna URL pública
 */
export const uploadCoverImage = async (
  file: File,
  userId: string
): Promise<CoverUploadResult> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `covers/${userId}/${fileName}`;

    const { error: uploadError, data } = await supabase.storage
      .from('ebook-covers')
      .upload(filePath, file);

    if (uploadError) {
      return {
        success: false,
        error: `Erro ao fazer upload: ${uploadError.message}`,
      };
    }

    const { data: publicUrlData } = supabase.storage
      .from('ebook-covers')
      .getPublicUrl(filePath);

    return {
      success: true,
      publicUrl: publicUrlData.publicUrl,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao fazer upload da capa';
    return {
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Atualizar apenas a capa do eBook (sem tocar em outros campos)
 */
export const updateEbookCover = async (
  ebookId: string,
  coverImageUrl: string
) => {
  return supabase
    .from('ebooks')
    .update({ cover_image: coverImageUrl })
    .eq('id', ebookId);
};

/**
 * Atualizar metadados do eBook (sem tocar em cover_image)
 */
export const updateEbookMetadata = async (
  ebookId: string,
  metadata: {
    title: string;
    description: string;
    author?: string | null;
    genre?: string | null;
    price?: number;
    pages: number;
  }
) => {
  return supabase
    .from('ebooks')
    .update({
      title: metadata.title,
      description: metadata.description,
      author: metadata.author,
      genre: metadata.genre,
      price: metadata.price,
      pages: metadata.pages,
    })
    .eq('id', ebookId);
};
