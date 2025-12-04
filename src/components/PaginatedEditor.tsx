import { useState, useEffect, useRef, useCallback } from 'react';
import SimplifiedCKEditor from './SimplifiedCKEditor';

interface PaginatedEditorProps {
  value: string;
  onChange: (data: string) => void;
  title: string;
  author?: string | null;
}

// Page dimensions in pixels (96 DPI: 1 inch = 96px)
const PAGE_WIDTH_PX = 816; // 8.5in
const PAGE_HEIGHT_PX = 1056; // 11in
const MARGIN_PX = 96; // 1in margins
const CONTENT_HEIGHT_PX = PAGE_HEIGHT_PX - (MARGIN_PX * 2); // ~864px usable height

export default function PaginatedEditor({ value, onChange, title, author }: PaginatedEditorProps) {
  const [pageCount, setPageCount] = useState(1);
  const contentRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);

  // Calculate number of pages based on content height
  const calculatePages = useCallback(() => {
    if (!measureRef.current) return;
    
    // Create a hidden div to measure content
    const measureDiv = measureRef.current;
    measureDiv.innerHTML = value || '<p></p>';
    
    const contentHeight = measureDiv.scrollHeight;
    const headerHeight = 80; // Title + author space
    const availableHeight = CONTENT_HEIGHT_PX - headerHeight;
    
    // Calculate pages needed
    const pages = Math.max(1, Math.ceil(contentHeight / availableHeight));
    setPageCount(pages);
  }, [value]);

  useEffect(() => {
    calculatePages();
  }, [value, calculatePages]);

  // Generate page indicators
  const renderPageIndicators = () => {
    const indicators = [];
    for (let i = 1; i < pageCount; i++) {
      indicators.push(
        <div 
          key={i}
          className="page-break-indicator"
          style={{
            position: 'absolute',
            top: `${i * CONTENT_HEIGHT_PX}px`,
            left: 0,
            right: 0,
            height: '24px',
            background: 'linear-gradient(to bottom, transparent, hsl(var(--muted)) 50%, transparent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 5
          }}
        >
          <span className="text-xs text-muted-foreground bg-background px-2 rounded">
            Página {i + 1}
          </span>
        </div>
      );
    }
    return indicators;
  };

  return (
    <div className="paginated-editor-container">
      {/* Hidden measure div */}
      <div 
        ref={measureRef}
        className="measure-div"
        style={{
          position: 'absolute',
          visibility: 'hidden',
          width: `${PAGE_WIDTH_PX - MARGIN_PX * 2}px`,
          fontFamily: "'Calibri', 'Segoe UI', sans-serif",
          fontSize: '12pt',
          lineHeight: '1.15',
          padding: 0,
          margin: 0
        }}
      />

      {/* Pages container */}
      <div className="pages-wrapper">
        {Array.from({ length: pageCount }, (_, pageIndex) => (
          <div 
            key={pageIndex}
            className="editor-page"
            style={{
              width: `${PAGE_WIDTH_PX}px`,
              minHeight: `${PAGE_HEIGHT_PX}px`,
              maxHeight: pageIndex === pageCount - 1 ? 'none' : `${PAGE_HEIGHT_PX}px`,
              background: 'white',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
              padding: `${MARGIN_PX}px`,
              boxSizing: 'border-box',
              marginBottom: '2rem',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {pageIndex === 0 ? (
              // First page with title, author and editor
              <div className="page-content-wrapper" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                {/* Title */}
                <div style={{ marginBottom: '12pt', flexShrink: 0 }}>
                  <h1 style={{ 
                    fontSize: '24pt', 
                    fontWeight: 'bold',
                    fontFamily: "'Calibri', 'Segoe UI', sans-serif",
                    margin: 0,
                    color: '#000'
                  }}>
                    {title}
                  </h1>
                </div>
                
                {/* Author */}
                {author && (
                  <div style={{ marginBottom: '16pt', flexShrink: 0 }}>
                    <span style={{ 
                      fontSize: '12pt', 
                      fontFamily: "'Calibri', 'Segoe UI', sans-serif",
                      color: '#666'
                    }}>
                      por {author}
                    </span>
                  </div>
                )}
                
                {/* Editor */}
                <div 
                  ref={contentRef}
                  className="editor-content-area"
                  style={{ 
                    flex: 1,
                    minHeight: 0,
                    position: 'relative',
                    overflow: 'visible'
                  }}
                >
                  <SimplifiedCKEditor
                    value={value}
                    onChange={onChange}
                  />
                  {renderPageIndicators()}
                </div>
              </div>
            ) : (
              // Continuation pages (visual only - content flows from editor)
              <div 
                className="continuation-page"
                style={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#999',
                  fontStyle: 'italic'
                }}
              >
                <p>Continuação da página {pageIndex}</p>
              </div>
            )}
            
            {/* Page number */}
            <div 
              style={{
                position: 'absolute',
                bottom: '0.5in',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '10pt',
                color: '#666'
              }}
            >
              {pageIndex + 1}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
