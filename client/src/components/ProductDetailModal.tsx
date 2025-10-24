import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Edit3,
  Save,
  X,
} from "lucide-react";
import { updateWishlistItem } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { WishlistItem, ProductVariant } from "@shared/schema";

interface ProductDetailModalProps {
  item: WishlistItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductDetailModal({
  item,
  open,
  onOpenChange,
}: ProductDetailModalProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editedSize, setEditedSize] = useState("");
  const [editedColor, setEditedColor] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Reset state when modal opens/closes or item changes
  useEffect(() => {
    if (item && open) {
      setCurrentImageIndex(0);
      setIsEditing(false);
      setEditedSize(item.selectedSize || "");
      setEditedColor(item.selectedColor || "");
    }
  }, [item, open]);

  const updateMutation = useMutation({
    mutationFn: (updates: { selectedSize?: string; selectedColor?: string }) =>
      updateWishlistItem(item!.id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      toast({
        title: "Success",
        description: "Item updated successfully",
      });
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update item",
        variant: "destructive",
      });
    },
  });

  const handleSaveEdits = () => {
    if (!item) return;

    const updates: { selectedSize?: string; selectedColor?: string } = {};
    if (editedSize !== item.selectedSize) updates.selectedSize = editedSize;
    if (editedColor !== item.selectedColor) updates.selectedColor = editedColor;

    if (Object.keys(updates).length > 0) {
      updateMutation.mutate(updates);
    } else {
      setIsEditing(false);
    }
  };

  const handleCancelEdits = () => {
    setEditedSize(item?.selectedSize || "");
    setEditedColor(item?.selectedColor || "");
    setIsEditing(false);
  };

  const nextImage = () => {
    if (!item) return;
    setCurrentImageIndex((prev) =>
      prev === item.images.length - 1 ? 0 : prev + 1,
    );
  };

  const prevImage = () => {
    if (!item) return;
    setCurrentImageIndex((prev) =>
      prev === 0 ? item.images.length - 1 : prev - 1,
    );
  };

  const getShortUrl = (url: string) => {
    try {
      const domain = new URL(url).hostname.replace("www.", "");
      return domain;
    } catch {
      return url.length > 30 ? url.substring(0, 30) + "..." : url;
    }
  };

  const getPriceHistoryStats = () => {
    if (!item?.priceHistory || item.priceHistory.length === 0) return null;

    const prices = item.priceHistory.map((entry) => entry.price);
    const maxPrice = Math.max(...prices);
    const currentPrice = item.priceHistory[item.priceHistory.length - 1].price;

    // Get last 3 months of price history
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const recentPrices = item.priceHistory.filter(
      (entry) => new Date(entry.recordedAt) >= threeMonthsAgo,
    );

    return {
      maxPrice,
      currentPrice,
      priceChange: currentPrice - (recentPrices[0]?.price || currentPrice),
      recentPrices: recentPrices.slice(-6), // Last 6 entries for chart
    };
  };

  if (!item) return null;

  const priceStats = getPriceHistoryStats();
  const currentImage = item.images[currentImageIndex];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto glass-strong rounded-3xl border-glass-border animate-scale-in">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display gradient-text animate-fade-in">
            Product Details
          </DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-8 p-4 animate-fade-in">
          {/* Left Column - Images */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100">
              <img
                src={currentImage}
                alt={item.title}
                className="w-full h-full object-cover"
              />

              {/* Navigation Arrows */}
              {item.images.length > 1 && (
                <>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 glass-strong rounded-full w-10 h-10"
                    onClick={prevImage}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 glass-strong rounded-full w-10 h-10"
                    onClick={nextImage}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </>
              )}

              {/* Image Counter */}
              {item.images.length > 1 && (
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 glass-strong rounded-full px-3 py-1 text-xs">
                  {currentImageIndex + 1} / {item.images.length}
                </div>
              )}
            </div>

            {/* Thumbnail Strip */}
            {item.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {item.images.map((image, index) => (
                  <button
                    key={index}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                      index === currentImageIndex
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-transparent hover:border-gray-300"
                    }`}
                    onClick={() => setCurrentImageIndex(index)}
                  >
                    <img
                      src={image}
                      alt={`${item.title} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column - Details */}
          <div className="space-y-6">
            {/* Product Title and Brand */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                {item.brand || "No Brand"}
              </p>
              <h2 className="text-2xl font-bold">{item.title}</h2>
            </div>

            {/* Out of Stock Banner */}
            {!item.inStock && (
              <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-2 rounded-xl text-sm">
                ⚠️ Out of Stock
              </div>
            )}

            {/* Price */}
            <div className="flex items-center gap-4">
              <p className="text-3xl font-bold font-mono">
                {item.currency}
                {typeof item.price === "number"
                  ? item.price.toFixed(2)
                  : item.price}
              </p>
              {priceStats && priceStats.priceChange !== 0 && (
                <span
                  className={`text-sm ${priceStats.priceChange > 0 ? "text-destructive" : "text-green-600"}`}
                >
                  {priceStats.priceChange > 0 ? "↑" : "↓"}
                  {item.currency}
                  {Math.abs(priceStats.priceChange).toFixed(2)}
                </span>
              )}
            </div>

            {/* Product Link */}
            <div>
              <Label className="text-xs mb-2 block">Product Link</Label>
              <Button
                variant="outline"
                className="w-full justify-between rounded-xl"
                onClick={() => window.open(item.url, "_blank")}
              >
                <span className="truncate">{getShortUrl(item.url)}</span>
                <ExternalLink className="h-4 w-4 ml-2 flex-shrink-0" />
              </Button>
            </div>

            {/* Selected Color */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs">Color</Label>
                {isEditing ? (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCancelEdits}
                      disabled={updateMutation.isPending}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleSaveEdits}
                      disabled={updateMutation.isPending}
                    >
                      <Save className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit3 className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {isEditing ? (
                <Input
                  value={editedColor}
                  onChange={(e) => setEditedColor(e.target.value)}
                  placeholder="Enter color"
                  className="rounded-xl"
                />
              ) : (
                <div className="px-3 py-2 rounded-xl border border-border bg-background">
                  {item.selectedColor || "No color selected"}
                </div>
              )}
            </div>

            {/* Selected Size */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs">Size</Label>
                {isEditing ? (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCancelEdits}
                      disabled={updateMutation.isPending}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleSaveEdits}
                      disabled={updateMutation.isPending}
                    >
                      <Save className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit3 className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {isEditing ? (
                <Input
                  value={editedSize}
                  onChange={(e) => setEditedSize(e.target.value)}
                  placeholder="Enter size"
                  className="rounded-xl"
                />
              ) : (
                <div className="px-3 py-2 rounded-xl border border-border bg-background">
                  {item.selectedSize || "No size selected"}
                </div>
              )}
            </div>

            {/* Price History Stats */}
            {priceStats && (
              <div className="space-y-3 p-4 rounded-xl glass-weak border border-primary/20">
                <h3 className="font-semibold text-sm">Price History</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Current Price</p>
                    <p className="font-semibold">
                      {item.currency}
                      {priceStats.currentPrice.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Highest Price</p>
                    <p className="font-semibold">
                      {item.currency}
                      {priceStats.maxPrice.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Simple Price Trend Visualization */}
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground mb-1">
                    Last 3 Months
                  </p>
                  <div className="flex items-end gap-1 h-8">
                    {priceStats.recentPrices.map((entry, index) => {
                      const maxRecentPrice = Math.max(
                        ...priceStats.recentPrices.map((p) => p.price),
                      );
                      const height = (entry.price / maxRecentPrice) * 100;
                      return (
                        <div
                          key={index}
                          className="flex-1 bg-primary/30 rounded-t transition-all hover:bg-primary/50"
                          style={{ height: `${Math.max(height, 10)}%` }}
                          title={`${item.currency}${entry.price.toFixed(2)}`}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Available Colors & Sizes (Read-only) */}
            <div className="grid grid-cols-2 gap-4">
              {/* Available Colors */}
              {item.colors && item.colors.length > 0 && (
                <div>
                  <Label className="text-xs mb-2 block">Available Colors</Label>
                  <div className="flex flex-wrap gap-1">
                    {item.colors.slice(0, 4).map((color, index) => (
                      <div
                        key={index}
                        className="text-xs px-2 py-1 rounded border border-border opacity-60"
                      >
                        {color}
                      </div>
                    ))}
                    {item.colors.length > 4 && (
                      <div className="text-xs px-2 py-1 rounded border border-border opacity-40">
                        +{item.colors.length - 4}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Available Sizes */}
              {item.sizes && item.sizes.length > 0 && (
                <div>
                  <Label className="text-xs mb-2 block">Available Sizes</Label>
                  <div className="flex flex-wrap gap-1">
                    {item.sizes.slice(0, 4).map((size, index) => (
                      <div
                        key={index}
                        className="text-xs px-2 py-1 rounded border border-border opacity-60"
                      >
                        {size}
                      </div>
                    ))}
                    {item.sizes.length > 4 && (
                      <div className="text-xs px-2 py-1 rounded border border-border opacity-40">
                        +{item.sizes.length - 4}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
