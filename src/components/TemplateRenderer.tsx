import React, { useEffect, useRef, useState } from 'react';
import { sanitizeHtml } from '@/lib/utils';

interface TemplateRendererProps {
  templateId: string | null;
  title: string;
  description: string;
  author: string | null;
  chapters: Array<{
    id?: string;
    title: string;
    content: string;
    chapter_order: number;
  }>;
  coverImage?: string | null;
}

export const TemplateRenderer = ({
  templateId,
  title,
  description,
  author,
  chapters,
  coverImage,
}: TemplateRendererProps) => {
  // Automatic splitting: convert chapters into pages that fit the printable area.
  const [pages, setPages] = useState<Array<{ html: string; key: string }>>([]);
  const measureRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Runs only in browser
    if (typeof window === 'undefined') return;

    // Create measurer with Word-standard margins (1 inch on all sides)
    // 8.5in page - 1in left - 1in right = 6.5in content width
    // 11in page - 1in top - 1in bottom = 9in content height
    const measurer = document.createElement('div');
    measurer.style.position = 'absolute';
    measurer.style.left = '-9999px';
    measurer.style.top = '0';
    measurer.style.visibility = 'hidden';
    measurer.style.width = '6.5in';
    measurer.style.boxSizing = 'border-box';
    measurer.style.fontFamily = "'Calibri', 'Segoe UI', sans-serif";
    measurer.style.fontSize = '12pt';
    measurer.style.lineHeight = '1.15';
    measurer.style.padding = '0';
    measurer.style.wordWrap = 'break-word';
    measurer.style.overflow = 'hidden';
    document.body.appendChild(measurer);

    // Measure available height: 11in - 1in top - 1in bottom = 9in
    const heightTester = document.createElement('div');
    heightTester.style.position = 'absolute';
    heightTester.style.left = '-9999px';
    heightTester.style.height = '9in';
    heightTester.style.visibility = 'hidden';
    document.body.appendChild(heightTester);
    const contentHeightPx = heightTester.clientHeight || (9 * 96);
    document.body.removeChild(heightTester);

    const newPages: Array<{ html: string; key: string }> = [];

    const splitChapter = (chapterHtml: string, chapIndex: number) => {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = sanitizeHtml(chapterHtml);

      let currentPageHtml = '';
      let pageCount = 0;

      const flushPage = () => {
        newPages.push({ html: currentPageHtml, key: `${chapIndex}-${pageCount}` });
        currentPageHtml = '';
        pageCount++;
      };

      // Process nodes sequentially
      const nodes = Array.from(wrapper.childNodes);
      for (const node of nodes) {
        const nodeClone = node.cloneNode(true);
        const tempDiv = document.createElement('div');
        tempDiv.appendChild(nodeClone);
        
        // Test if adding this node would exceed height
        measurer.innerHTML = currentPageHtml + tempDiv.innerHTML;
        if (measurer.scrollHeight > contentHeightPx && currentPageHtml) {
          // Current page is full, flush it
          flushPage();
          // Add node to new page
          currentPageHtml = tempDiv.innerHTML;
        } else {
          // Node fits, add to current page
          currentPageHtml += tempDiv.innerHTML;
        }
      }

      // Flush last page if has content
      if (currentPageHtml.trim()) {
        flushPage();
      }
    };

    // Process all chapters
    chapters.forEach((ch, idx) => {
      splitChapter(ch.content, idx);
    });

    setPages(newPages);

    if (measurer.parentNode) document.body.removeChild(measurer);
  }, [chapters, title]);

  return (
    <div className="a4-editor-wrapper">
      {coverImage && (
        <div className="cover-block">
          <img src={coverImage} alt="Capa do ebook" className="cover-image mx-auto" />
        </div>
      )}

      <div className="chapters-container">
        {pages.length > 0 ? (
          pages.map((p, i) => (
            <section key={p.key} className="a4-page chapter-page" dangerouslySetInnerHTML={{ __html: p.html }} />
          ))
        ) : (
          // fallback: render raw chapters if splitting hasn't run yet
          chapters.map((ch, i) => (
            <section key={ch.id ?? i} className="a4-page chapter-page">
              <div className="page-content">
                <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(ch.content) }} />
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
};