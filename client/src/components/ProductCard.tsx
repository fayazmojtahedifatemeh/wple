import { useState } from "react";
// FIX: Import Trash2 icon, useMutation, queryClient, api function, toast
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
import { deleteWishlistItem, updateItemPrice } from "@/lib/api"; // Assuming updateItemPrice exists
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
// FIX: Import AlertDialog for confirmation (optional but recommended)
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export interface ProductCardProps {
  id: string; // Needed for delete/update
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
  id, // Destructure id
  title,
  price,
  currency = "$",
  image,
  url,
  inStock,
  priceChange,
  brand,
}: ProductCardProps) {
  const [isFavorite, setIsFavorite] = useState(true); // Assuming favorite is default for now
  // FIX: Add state for confirmation dialog
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // FIX: Add hooks for mutations and cache invalidation
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // FIX: Mutation for updating price (example, adjust if needed)
  const updatePriceMutation = useMutation({
    mutationFn: () => updateItemPrice(id), // Pass the item ID
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] }); // Refresh list
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

  // FIX: Mutation for deleting item
  const deleteMutation = useMutation({
    mutationFn: () => deleteWishlistItem(id), // Pass the item ID
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] }); // Refresh list
      toast({
        title: "Item Deleted",
        description: `${title} removed from wishlist.`,
      });
      setShowDeleteConfirm(false); // Close confirmation dialog
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to delete item: ${error.message}`,
        variant: "destructive",
      });
      setShowDeleteConfirm(false); // Close confirmation dialog
    },
  });

  const handleUpdate = () => {
    updatePriceMutation.mutate(); // Use the mutation
  };

  const handleDeleteConfirm = () => {
    deleteMutation.mutate(); // Trigger deletion
  };

  return (
    <Card
      className={`group relative overflow-hidden rounded-2xl glass hover-elevate transition-all duration-200 ${
        // Added relative positioning
        !inStock ? "opacity-60" : ""
      }`}
      data-testid={`card-product-${id}`} // Add ID for testing
    >
      <div className="relative aspect-[3/4] overflow-hidden">
        <img
          src={image}
          alt={title}
          className={`h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 ${
            !inStock ? "grayscale" : ""
          }`}
          // Add error handling
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
        <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {/* Update Price Button */}
          <Button
            size="icon"
            variant="secondary"
            className="h-9 w-9 rounded-xl glass"
            title="Update Price" // Tooltip text
            onClick={handleUpdate}
            disabled={updatePriceMutation.isPending} // Disable while updating
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
            className="h-9 w-9 rounded-xl glass"
            title="Visit Store Page" // Tooltip text
            onClick={() => window.open(url, "_blank", "noopener noreferrer")} // Added security attributes
            data-testid="button-open-url"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>

          {/* FIX: Delete Button with Confirmation */}
          <AlertDialog
            open={showDeleteConfirm}
            onOpenChange={setShowDeleteConfirm}
          >
            <AlertDialogTrigger asChild>
              <Button
                size="icon"
                variant="destructive" // Destructive variant for delete
                className="h-9 w-9 rounded-xl glass bg-destructive/80 hover:bg-destructive text-destructive-foreground" // Destructive styling
                title="Delete Item" // Tooltip text
                data-testid="button-delete-trigger"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete "
                  {title}" from your wishlist.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleteMutation.isPending}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteConfirm}
                  disabled={deleteMutation.isPending}
                  className="bg-destructive hover:bg-destructive/90" // Style confirm button
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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
              </span>{" "}
              {/* Use toFixed(1) */}
            </Badge>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="p-4 space-y-2">
        {" "}
        {/* Reduced vertical spacing */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {brand && (
              <p
                className="text-xs text-muted-foreground font-medium mb-0.5 truncate"
                title={brand}
              >
                {" "}
                {/* Added truncate */}
                {brand}
              </p>
            )}
            <h3
              className={`font-semibold text-sm line-clamp-2 ${!inStock ? "line-through" : ""}`}
              title={title}
              data-testid="text-product-title"
            >
              {" "}
              {/* Added title attribute */}
              {title}
            </h3>
          </div>
          {/* Favorite Button - Consider removing if not fully implemented */}
          {/* <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl shrink-0" onClick={() => setIsFavorite(!isFavorite)} data-testid="button-favorite" >
<Heart className={`h-4 w-4 transition-colors ${ isFavorite ? "fill-primary text-primary" : "" }`} />
</Button> */}
        </div>
        <div className="flex items-center justify-between pt-1">
          {" "}
          {/* Added padding top */}
          <p className="text-xl font-bold font-mono" data-testid="text-price">
            {" "}
            {/* Adjusted size */}
            {currency}
            {price.toFixed(2)}
          </p>
          {/* Placeholder for future actions like 'Edit' */}
          {/* <Button size="sm" variant="outline">Edit</Button> */}
        </div>
      </div>
    </Card>
  );
}
