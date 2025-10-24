import { useState } from "react";
import {
  Heart,
  ExternalLink,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Trash2,
  Loader2,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteWishlistItem, updateItemPrice } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeleteConfirmationModal } from "./DeleteConfirmationModal";

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
  id,
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
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updatePriceMutation = useMutation({
    mutationFn: () => updateItemPrice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      toast({
        title: "Price Updated",
        description: `Refreshed price for ${title}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to update price: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteWishlistItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      toast({
        title: "Item Deleted",
        description: `${title} removed from wishlist.`,
      });
      setDeleteModalOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to delete item: ${error.message}`,
        variant: "destructive",
      });
      setDeleteModalOpen(false);
    },
  });

  const handleUpdate = () => {
    updatePriceMutation.mutate();
  };

  const handleDeleteConfirm = () => {
    deleteMutation.mutate();
  };

  return (
    <>
      <Card
        className={`group relative overflow-hidden rounded-2xl glass floating hover-elevate transition-all duration-300 animate-fade-in ${
          !inStock ? "opacity-60" : ""
        }`}
        data-testid={`card-product-${id}`}
      >
        <div className="relative aspect-[3/4] overflow-hidden">
          <img
            src={image}
            alt={title}
            className={`h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 ${
              !inStock ? "grayscale" : ""
            }`}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.onerror = null;
              target.src = "https://via.placeholder.com/400?text=Image+Error";
            }}
          />

          {!inStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
              <Badge variant="destructive" className="text-sm font-semibold">
                Out of Stock
              </Badge>
            </div>
          )}

          {/* Action Buttons Container */}
          <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 animate-slide-up">
            {/* Update Price Button */}
            <Button
              size="icon"
              variant="secondary"
              className="h-9 w-9 rounded-xl glass-strong glow-button hover-elevate"
              title="Update Price"
              onClick={handleUpdate}
              disabled={updatePriceMutation.isPending}
              data-testid="button-update-price"
            >
              {updatePriceMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>

            {/* External Link Button */}
            <Button
              size="icon"
              variant="secondary"
              className="h-9 w-9 rounded-xl glass-strong glow-button hover-elevate"
              title="Visit Store Page"
              onClick={() => window.open(url, "_blank", "noopener noreferrer")}
              data-testid="button-open-url"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>

            {/* Delete Button - Opens Modal */}
            <Button
              size="icon"
              variant="destructive"
              className="h-9 w-9 rounded-xl glass-strong glow-button hover-elevate bg-destructive/80 hover:bg-destructive text-destructive-foreground"
              title="Delete Item"
              onClick={() => setDeleteModalOpen(true)}
              data-testid="button-delete-trigger"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Price Change Badge */}
          {priceChange !== undefined && priceChange !== 0 && (
            <div className="absolute bottom-3 left-3">
              <Badge
                variant={priceChange < 0 ? "default" : "destructive"}
                className={`gap-1 rounded-xl ${priceChange < 0 ? "bg-chart-4 hover:bg-chart-4 text-white" : ""}`}
              >
                {priceChange < 0 ? (
                  <TrendingDown className="h-3 w-3" />
                ) : (
                  <TrendingUp className="h-3 w-3" />
                )}
                <span className="font-mono font-semibold">
                  {Math.abs(priceChange).toFixed(1)}%
                </span>
              </Badge>
            </div>
          )}
        </div>

        {/* Card Content */}
        <div className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              {brand && (
                <p
                  className="text-xs text-muted-foreground font-medium mb-0.5 truncate"
                  title={brand}
                >
                  {brand}
                </p>
              )}
              <h3
                className={`font-semibold text-sm line-clamp-2 ${!inStock ? "line-through" : ""}`}
                title={title}
                data-testid="text-product-title"
              >
                {title}
              </h3>
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <p className="text-xl font-bold font-mono" data-testid="text-price">
              {currency}
              {price.toFixed(2)}
            </p>
          </div>
        </div>
      </Card>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onConfirm={handleDeleteConfirm}
        itemTitle={title}
        isLoading={deleteMutation.isPending}
      />
    </>
  );
}
