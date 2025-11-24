import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Chapter {
  id: string;
  title: string;
  content: string;
  order: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      throw new Error('No file provided');
    }

    const fileType = file.type;
    console.log('Processing file:', file.name, 'Type:', fileType);

    // For now, we'll do basic text extraction
    // In production, you'd use specialized libraries for EPUB/PDF parsing
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    let chapters: Chapter[] = [];

    if (fileType === 'application/pdf' || file.name.endsWith('.pdf')) {
      // Basic PDF parsing - extract text and split by patterns
      // In production, use a proper PDF library
      const text = new TextDecoder().decode(uint8Array);
      chapters = parsePdfLikeText(text);
    } else if (fileType === 'application/epub+zip' || file.name.endsWith('.epub')) {
      // Basic EPUB parsing
      // In production, use JSZip + proper EPUB parser
      chapters = await parseEpubLike(uint8Array);
    } else {
      // Treat as plain text
      const text = new TextDecoder().decode(uint8Array);
      chapters = parseTextIntoChapters(text);
    }

    console.log(`Parsed ${chapters.length} chapters`);

    return new Response(
      JSON.stringify({ chapters }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    // Log detailed error server-side only
    console.error('Error in parse-ebook function:', error);
    
    // Return user-friendly error messages without exposing internal details
    let statusCode = 500;
    let userMessage = 'An error occurred while processing your file. Please try again.';
    
    if (error instanceof Error) {
      if (error.message.includes('Unauthorized')) {
        statusCode = 401;
        userMessage = 'Authentication required. Please log in and try again.';
      } else if (error.message.includes('No file')) {
        statusCode = 400;
        userMessage = 'Please provide a file to parse.';
      }
    }
    
    return new Response(
      JSON.stringify({ error: userMessage }),
      { 
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function parsePdfLikeText(text: string): Chapter[] {
  // Split by common chapter patterns
  const chapterPattern = /(?:Chapter|CHAPTER|Capítulo|CAPÍTULO)\s+(\d+|[IVXLCDM]+)[\s:.-]*(.*?)(?=(?:Chapter|CHAPTER|Capítulo|CAPÍTULO)\s+(?:\d+|[IVXLCDM]+)|$)/gis;
  const matches = Array.from(text.matchAll(chapterPattern));
  
  if (matches.length === 0) {
    // No chapters found, return as single chapter
    return [{
      id: crypto.randomUUID(),
      title: 'Conteúdo',
      content: cleanContent(text.substring(0, 10000)), // Limit for demo
      order: 1
    }];
  }

  return matches.map((match, index) => ({
    id: crypto.randomUUID(),
    title: match[2]?.trim() || `Capítulo ${match[1]}`,
    content: cleanContent(match[0].substring(0, 10000)), // Limit for demo
    order: index + 1
  }));
}

async function parseEpubLike(data: Uint8Array): Promise<Chapter[]> {
  // Simplified EPUB parsing - in production use JSZip
  // For now, treat as text
  const text = new TextDecoder().decode(data);
  return parseTextIntoChapters(text);
}

function parseTextIntoChapters(text: string): Chapter[] {
  // Split by double line breaks or chapter markers
  const sections = text.split(/\n\n+/);
  
  if (sections.length < 3) {
    return [{
      id: crypto.randomUUID(),
      title: 'Conteúdo',
      content: cleanContent(text.substring(0, 10000)),
      order: 1
    }];
  }

  return sections
    .filter(section => section.trim().length > 100)
    .slice(0, 50) // Max 50 chapters
    .map((section, index) => {
      const lines = section.trim().split('\n');
      const title = lines[0].substring(0, 100);
      const content = lines.slice(1).join('\n');
      
      return {
        id: crypto.randomUUID(),
        title: title || `Seção ${index + 1}`,
        content: cleanContent(content.substring(0, 10000)),
        order: index + 1
      };
    });
}

function cleanContent(text: string): string {
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '') // Remove control chars
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}
