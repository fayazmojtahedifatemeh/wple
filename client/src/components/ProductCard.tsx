import { Heart, ExternalLink, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

export interface ProductCardProps {
  id: string;
  title: string;
  price: number;
  currency?: string;
  image: string;
  url: string;
  inStock: boolean;
  priceChange?: number;
  brand?: string;
}

export function ProductCard({
  title,
  price,
  currency = "$",
  image,
  url,
  inStock,
  priceChange,
  brand,
}: ProductCardProps) {
  const [isFavorite, setIsFavorite] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = () => {
    setIsUpdating(true);
    console.log("Updating price...");
    setTimeout(() => setIsUpdating(false), 1000);
  };

  return (
    <Card 
      className={`group overflow-hidden rounded-2xl glass hover-elevate transition-all duration-200 ${
        !inStock ? "opacity-60" : ""
      }`}
      data-testid={`card-product`}
    >
      <div className="relative aspect-[3/4] overflow-hidden">
        <img
          src={image}
          alt={title}
          className={`h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 ${
            !inStock ? "grayscale" : ""
          }`}
        />
        
        {!inStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
            <Badge variant="destructive" className="text-sm font-semibold">
              Out of Stock
            </Badge>
          </div>
        )}
        
        <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="icon"
            variant="secondary"
            className="h-9 w-9 rounded-xl glass"
            onClick={handleUpdate}
            data-testid="button-update-price"
          >
            <RefreshCw className={`h-4 w-4 ${isUpdating ? "animate-spin" : ""}`} />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="h-9 w-9 rounded-xl glass"
            onClick={() => window.open(url, "_blank")}
            data-testid="button-open-url"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>

        {priceChange !== undefined && priceChange !== 0 && (
          <div className="absolute bottom-3 left-3">
            <Badge
              variant={priceChange < 0 ? "default" : "destructive"}
              className={`gap-1 rounded-xl ${
                priceChange < 0 ? "bg-chart-4 hover:bg-chart-4" : ""
              }`}
            >
              {priceChange < 0 ? (
                <TrendingDown className="h-3 w-3" />
              ) : (
                <TrendingUp className="h-3 w-3" />
              )}
              <span className="font-mono font-semibold">
                {Math.abs(priceChange)}%
              </span>
            </Badge>
          </div>
        )}
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {brand && (
              <p className="text-xs text-muted-foreground font-medium mb-1">
                {brand}
              </p>
            )}
            <h3
              className={`font-semibold text-sm line-clamp-2 ${
                !inStock ? "line-through" : ""
              }`}
              data-testid="text-product-title"
            >
              {title}
            </h3>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-xl shrink-0"
            onClick={() => setIsFavorite(!isFavorite)}
            data-testid="button-favorite"
          >
            <Heart
              className={`h-4 w-4 transition-colors ${
                isFavorite ? "fill-primary text-primary" : ""
              }`}
            />
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-2xl font-bold font-mono" data-testid="text-price">
            {currency}
            {price.toFixed(2)}
          </p>
        </div>
      </div>
    </Card>
  );
}
