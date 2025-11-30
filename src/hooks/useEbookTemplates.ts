import { useState, useEffect } from 'react';
import { EBOOK_TEMPLATES } from '@/components/templates/ebooks';

export interface EbookTemplate {
  id: string;
  name: string;
  description: string;
  component?: string;
  thumbnail?: string;
  source: 'local' | 'api';
}

const API_TEMPLATES_ENDPOINT = 'https://api.jsonbin.io/v3/b/692cd165d0ea881f400a4280';

/**
 * Hook para carregar templates de ebook com fallback
 * 
 * Tenta buscar templates de uma API externa primeiro.
 * Se falhar ou API não retornar dados, usa templates locais como fallback.
 */
export const useEbookTemplates = () => {
  // Inicializa com templates locais imediatamente
  const initialTemplates = EBOOK_TEMPLATES.map((t: typeof EBOOK_TEMPLATES[number]) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    component: t.component,
    source: 'local' as const,
  }));

  const [templates, setTemplates] = useState<EbookTemplate[]>(initialTemplates);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Função auxiliar para criar templates locais
  const getLocalTemplates = (): EbookTemplate[] => {
    return EBOOK_TEMPLATES.map((t: typeof EBOOK_TEMPLATES[number]) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      component: t.component,
      source: 'local' as const,
    }));
  };

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        setLoading(true);
        
        // Tenta buscar templates da API
        // Para usar: substitua YOUR_BIN_ID por um bin real do JSONBin.io
        // Ou use outra API gratuita de templates
        try {
          const response = await fetch(API_TEMPLATES_ENDPOINT, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const data = await response.json();
            const apiTemplates = data.record || data.templates || [];
            
            if (Array.isArray(apiTemplates) && apiTemplates.length > 0) {
              // Formata templates da API
              const formattedApiTemplates: EbookTemplate[] = apiTemplates.map((t: Record<string, unknown>) => ({
                id: typeof t.id === 'string' ? t.id : typeof t.slug === 'string' ? t.slug : `api-${Math.random()}`,
                name: typeof t.name === 'string' ? t.name : typeof t.title === 'string' ? t.title : 'Template',
                description: typeof t.description === 'string' ? t.description : '',
                thumbnail: typeof t.thumbnail === 'string' ? t.thumbnail : typeof t.preview === 'string' ? t.preview : undefined,
                component: typeof t.component === 'string' ? t.component : undefined,
                source: 'api' as const,
              }));

              // Combina templates da API com os locais
              const localTemplates = getLocalTemplates();
              setTemplates([
                ...localTemplates,
                ...formattedApiTemplates,
              ]);
              setError(null);
              setLoading(false);
              return;
            }
          }
        } catch (apiError) {
          console.log('Não foi possível carregar templates externos, usando templates locais:', apiError);
        }

        // Fallback: usa apenas templates locais
        const localTemplates = getLocalTemplates();
        if (localTemplates.length > 0) {
          setTemplates(localTemplates);
          setError(null);
        } else {
          setError('Nenhum template disponível');
        }
      } catch (err) {
        console.error('Erro ao carregar templates:', err);
        setError('Erro ao carregar templates');
        // Mesmo com erro, tenta usar templates locais
        const localTemplates = getLocalTemplates();
        if (localTemplates.length > 0) {
          setTemplates(localTemplates);
        }
      } finally {
        setLoading(false);
      }
    };

    loadTemplates();
  }, []);

  return { templates, loading, error };
};
