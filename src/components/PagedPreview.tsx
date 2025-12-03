import { useEffect, useRef, useState } from 'react';
import { sanitizeHtml } from '@/lib/utils';

interface PagedPreviewProps {
  title: string;
  author: string | null;
  description: string;
  content: string;
  coverImage?: string | null;
}

export default function PagedPreview({ title, author, description, content, coverImage }: PagedPreviewProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [isRendering, setIsRendering] = useState(true);

  useEffect(() => {
    if (!previewRef.current) return;

    const renderPaged = async () => {
      setIsRendering(true);
      
      // Clear previous content
      previewRef.current!.innerHTML = '';

      // Build HTML content with proper structure
      const htmlContent = `
        <div class="paged-content">
          ${coverImage ? `
            <section class="cover-page">
              <img src="${coverImage}" alt="Capa" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
            </section>
          ` : ''}
          
          <section class="title-page">
            <h1 class="book-title">${sanitizeHtml(title)}</h1>
            ${author ? `<p class="book-author">por ${sanitizeHtml(author)}</p>` : ''}
            ${description ? `<p class="book-description">${sanitizeHtml(description)}</p>` : ''}
          </section>
          
          <section class="content-section">
            ${sanitizeHtml(content)}
          </section>
        </div>
      `;

      // Paged.js CSS for proper pagination
      const pagedStyles = `
        @page {
          size: 8.5in 11in;
          margin: 1in;
        }
        
        .pagedjs_page {
          background: white;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
          margin-bottom: 20px;
        }
        
        .cover-page {
          page-break-after: always;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100%;
        }
        
        .title-page {
          page-break-after: always;
          padding-top: 30%;
        }
        
        .book-title {
          font-size: 24pt;
          font-weight: bold;
          text-align: center;
          margin-bottom: 24pt;
          font-family: 'Calibri', 'Segoe UI', sans-serif;
        }
        
        .book-author {
          font-size: 14pt;
          text-align: center;
          color: #666;
          margin-bottom: 16pt;
          font-family: 'Calibri', 'Segoe UI', sans-serif;
        }
        
        .book-description {
          font-size: 12pt;
          text-align: center;
          color: #888;
          max-width: 80%;
          margin: 0 auto;
          font-family: 'Calibri', 'Segoe UI', sans-serif;
        }
        
        .content-section {
          font-family: 'Calibri', 'Segoe UI', sans-serif;
          font-size: 12pt;
          line-height: 1.15;
        }
        
        .content-section h1 {
          font-size: 24pt;
          font-weight: bold;
          margin: 0 0 12pt 0;
          page-break-after: avoid;
        }
        
        .content-section h2 {
          font-size: 18pt;
          font-weight: bold;
          margin: 0 0 10pt 0;
          page-break-after: avoid;
        }
        
        .content-section h3 {
          font-size: 14pt;
          font-weight: bold;
          margin: 0 0 8pt 0;
          page-break-after: avoid;
        }
        
        .content-section p {
          margin: 0 0 6pt 0;
          orphans: 3;
          widows: 3;
        }
        
        .content-section ul, .content-section ol {
          margin: 0 0 6pt 24pt;
          padding: 0;
        }
        
        .content-section li {
          margin-bottom: 3pt;
        }
      `;

      try {
        // Dynamic import for Paged.js to avoid SSR issues
        const { Previewer } = await import('pagedjs');
        const previewer = new Previewer();
        await previewer.preview(htmlContent, [{ styles: pagedStyles }], previewRef.current!);
      } catch (error) {
        console.error('Paged.js error:', error);
        // Fallback: render without pagination in styled container
        previewRef.current!.innerHTML = `
          <div class="fallback-preview" style="
            width: 8.5in;
            min-height: 11in;
            background: white;
            padding: 1in;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            font-family: 'Calibri', 'Segoe UI', sans-serif;
            font-size: 12pt;
            line-height: 1.15;
            margin: 0 auto;
          ">
            ${htmlContent}
          </div>
        `;
      }
      
      setIsRendering(false);
    };

    renderPaged();
  }, [title, author, description, content, coverImage]);

  return (
    <div className="paged-preview-container">
      {isRendering && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3 text-muted-foreground">A renderizar páginas...</span>
        </div>
      )}
      <div 
        ref={previewRef} 
        className="paged-preview"
        style={{ opacity: isRendering ? 0 : 1, transition: 'opacity 0.3s' }}
      />
    </div>
  );
}
