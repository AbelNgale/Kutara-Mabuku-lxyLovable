import { sanitizeHtml } from '@/lib/utils';

interface EbookTemplateProps {
  title: string;
  content: string;
  images?: { src: string; alt: string; caption?: string }[];
}

export const ClassicTemplate = ({ title, content, images }: EbookTemplateProps) => {
  return (
    <div className="min-h-screen bg-background">
      <article className="max-w-3xl mx-auto px-8 py-16">
        {/* Title */}
        <header className="mb-12 text-center">
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-4">
            {title}
          </h1>
          <div className="w-24 h-1 bg-primary mx-auto"></div>
        </header>

        {/* Content */}
        <div 
          className="prose prose-lg dark:prose-invert max-w-none font-serif text-foreground/90 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }}
        />

        {/* Images */}
        {images && images.length > 0 && (
          <div className="space-y-8 mt-12">
            {images.map((image, index) => (
              <figure key={index} className="text-center">
                <img
                  src={image.src}
                  alt={image.alt}
                  className="w-[90%] mx-auto rounded-sm shadow-lg"
                />
                {image.caption && (
                  <figcaption className="mt-4 text-sm text-muted-foreground italic font-serif">
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
