import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProductGalleryProps {
  images: string[];
}

export function ProductGallery({ images }: ProductGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  if (images.length === 0) return null;

  return (
    <div className="relative group">
      <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-muted">
        <img
          src={images[currentIndex]}
          alt={`Product ${currentIndex + 1}`}
          className="w-full h-full object-cover"
        />
      </div>

      {images.length > 1 && (
        <>
          <Button
            size="icon"
            variant="secondary"
            className="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity glass"
            onClick={goToPrevious}
            data-testid="button-gallery-previous"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity glass"
            onClick={goToNext}
            data-testid="button-gallery-next"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, index) => (
              <button
                key={index}
                className={`h-1.5 rounded-full transition-all ${
                  index === currentIndex
                    ? "w-6 bg-primary"
                    : "w-1.5 bg-white/50"
                }`}
                onClick={() => setCurrentIndex(index)}
                data-testid={`button-gallery-dot-${index}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
