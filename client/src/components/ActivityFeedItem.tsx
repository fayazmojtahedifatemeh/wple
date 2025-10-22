import { TrendingDown, TrendingUp, Package } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface ActivityFeedItemProps {
  id: string;
  type: "price_drop" | "price_increase" | "restock";
  productTitle: string;
  productImage: string;
  oldPrice?: number;
  newPrice?: number;
  priceChange?: number;
  timestamp: string;
  currency?: string;
}

export function ActivityFeedItem({
  type,
  productTitle,
  productImage,
  oldPrice,
  newPrice,
  priceChange,
  timestamp,
  currency = "$",
}: ActivityFeedItemProps) {
  const getIcon = () => {
    switch (type) {
      case "price_drop":
        return <TrendingDown className="h-5 w-5 text-chart-4" />;
      case "price_increase":
        return <TrendingUp className="h-5 w-5 text-destructive" />;
      case "restock":
        return <Package className="h-5 w-5 text-primary" />;
    }
  };

  const getMessage = () => {
    switch (type) {
      case "price_drop":
        return "Price dropped";
      case "price_increase":
        return "Price increased";
      case "restock":
        return "Back in stock";
    }
  };

  return (
    <Card className="p-4 rounded-2xl glass hover-elevate transition-all" data-testid="card-activity">
      <div className="flex gap-4">
        <div className="shrink-0">
          <div className="h-16 w-16 rounded-xl overflow-hidden bg-muted">
            <img
              src={productImage}
              alt={productTitle}
              className="h-full w-full object-cover"
            />
          </div>
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm line-clamp-1">{productTitle}</p>
              <div className="flex items-center gap-2 mt-1">
                {getIcon()}
                <span className="text-sm text-muted-foreground">
                  {getMessage()}
                </span>
              </div>
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {timestamp}
            </span>
          </div>

          {(oldPrice !== undefined && newPrice !== undefined) && (
            <div className="flex items-center gap-3">
              <span className="text-sm line-through text-muted-foreground font-mono">
                {currency}
                {oldPrice.toFixed(2)}
              </span>
              <span className="text-lg font-bold font-mono">
                {currency}
                {newPrice.toFixed(2)}
              </span>
              {priceChange !== undefined && (
                <Badge
                  variant={priceChange < 0 ? "default" : "destructive"}
                  className={`gap-1 ${
                    priceChange < 0 ? "bg-chart-4 hover:bg-chart-4" : ""
                  }`}
                >
                  <span className="font-mono font-semibold text-xs">
                    {priceChange > 0 ? "+" : ""}
                    {priceChange}%
                  </span>
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
