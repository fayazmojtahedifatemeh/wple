import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProductGalleryProps {
  images: string[];
}

export function ProductGallery({ images }: ProductGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goToPrevious = () => {
    // Added check for empty images array
    if (!images || images.length === 0) return;
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNext = () => {
    // Added check for empty images array
    if (!images || images.length === 0) return;
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  // Handle case where images might be undefined or empty initially
  if (!images || images.length === 0) {
    return (
      <div className="aspect-[3/4] rounded-2xl bg-muted flex items-center justify-center">
        <p className="text-muted-foreground text-sm">No Image</p>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      {" "}
      {/* Ensures container takes width */}
      <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-muted">
        <img
          src={images[currentIndex]}
          alt={`Product ${currentIndex + 1}`}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.onerror = null;
            target.src = "https://via.placeholder.com/400?text=Image+Error";
          }}
        />
      </div>
      {/* Controls Container - Placed below the image */}
      {images.length > 1 && (
        <div className="flex justify-between items-center mt-2 px-1">
          {" "}
          {/* Added mt-2 for spacing */}
          {/* Previous Button */}
          <Button
            size="icon"
            variant="ghost" // Changed to ghost for less intrusion
            className="h-8 w-8 rounded-full text-foreground/70 hover:bg-muted/50 hover:text-foreground" // Adjusted style
            onClick={goToPrevious}
            data-testid="button-gallery-previous"
          >
            <ChevronLeft className="h-5 w-5" /> {/* Slightly larger icon */}
          </Button>
          {/* Dots Container */}
          <div className="flex gap-1.5">
            {images.map((_, index) => (
              <button
                key={index}
                className={`h-1.5 rounded-full transition-all ${
                  index === currentIndex
                    ? "w-4 bg-primary" // Shorter active dot
                    : "w-1.5 bg-muted-foreground/50 hover:bg-muted-foreground/75" // Adjusted colors
                }`}
                onClick={() => setCurrentIndex(index)}
                aria-label={`Go to image ${index + 1}`}
                data-testid={`button-gallery-dot-${index}`}
              />
            ))}
          </div>
          {/* Next Button */}
          <Button
            size="icon"
            variant="ghost" // Changed to ghost
            className="h-8 w-8 rounded-full text-foreground/70 hover:bg-muted/50 hover:text-foreground" // Adjusted style
            onClick={goToNext}
            data-testid="button-gallery-next"
          >
            <ChevronRight className="h-5 w-5" /> {/* Slightly larger icon */}
          </Button>
        </div>
      )}
    </div>
  );
}
