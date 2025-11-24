import { sanitizeHtml } from '@/lib/utils';

interface EbookTemplateProps {
  title: string;
  content: string;
  images?: { src: string; alt: string; caption?: string }[];
}

export const VisualTemplate = ({ title, content, images }: EbookTemplateProps) => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section with Cover Image */}
      {images && images.length > 0 && (
        <section className="relative h-[60vh] flex items-center justify-center overflow-hidden mb-12">
          <img
            src={images[0].src}
            alt={images[0].alt}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background"></div>
          <div className="relative z-10 text-center px-6">
            <h1 className="text-5xl md:text-7xl font-bold text-foreground drop-shadow-lg">
              {title}
            </h1>
          </div>
        </section>
      )}

      {!images?.length && (
        <header className="py-16 text-center bg-gradient-to-b from-primary/10 to-background">
          <h1 className="text-5xl md:text-7xl font-bold text-foreground">
            {title}
          </h1>
        </header>
      )}

      {/* Content in Blocks */}
      <article className="max-w-6xl mx-auto px-6 md:px-12 pb-16 space-y-16">
        <div 
          className="prose prose-xl dark:prose-invert max-w-none text-foreground/90 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }}
        />

        {/* Image Grid (skip first image if used as cover) */}
        {images && images.length > 1 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
            {images.slice(1).map((image, index) => (
              <figure key={index} className="group">
                <div className="overflow-hidden rounded-lg shadow-lg">
                  <img
                    src={image.src}
                    alt={image.alt}
                    className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                {image.caption && (
                  <figcaption className="mt-3 text-sm text-muted-foreground">
                    {image.caption}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        )}
      </article>
    </div>
  );
};
