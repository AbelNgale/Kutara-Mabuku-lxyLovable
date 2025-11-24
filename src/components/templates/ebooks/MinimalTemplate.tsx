import { sanitizeHtml } from '@/lib/utils';

interface EbookTemplateProps {
  title: string;
  content: string;
  images?: { src: string; alt: string; caption?: string }[];
}

export const MinimalTemplate = ({ title, content, images }: EbookTemplateProps) => {
  return (
    <div className="min-h-screen bg-background">
      <article className="max-w-7xl mx-auto px-6 py-12">
        {/* Title */}
        <header className="mb-16">
          <h1 className="font-sans text-4xl md:text-6xl font-bold text-foreground tracking-tight">
            {title}
          </h1>
        </header>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
          {/* Text Content */}
          <div className="lg:col-span-3">
            <div 
              className="prose prose-lg dark:prose-invert max-w-none font-sans text-foreground/90 space-y-6"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }}
            />
          </div>

          {/* Sidebar Images */}
          {images && images.length > 0 && (
            <aside className="lg:col-span-2 space-y-8">
              {images.map((image, index) => (
                <figure key={index} className="sticky top-8">
                  <div className="rounded-lg overflow-hidden shadow-md border border-border">
                    <img
                      src={image.src}
                      alt={image.alt}
                      className="w-full h-auto"
                    />
                  </div>
                  {image.caption && (
                    <figcaption className="mt-3 text-sm text-muted-foreground font-sans">
                      {image.caption}
                    </figcaption>
                  )}
                </figure>
              ))}
            </aside>
          )}

          {/* Fallback when no images in desktop - full width content */}
          {(!images || images.length === 0) && (
            <div className="hidden lg:block lg:col-span-2"></div>
          )}
        </div>
      </article>
    </div>
  );
};
