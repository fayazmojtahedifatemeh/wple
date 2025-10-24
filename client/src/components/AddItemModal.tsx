import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
// FIX: Removed unused 'X' import
import { Plus, Loader2 } from "lucide-react";
// Import DialogFooter
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProductGallery } from "@/components/ProductGallery";
import { scrapeProduct, addWishlistItem } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type {
  ScrapedProduct,
  ProductVariant,
  InsertScrapedProduct,
} from "@shared/schema";

interface AddItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Define categories outside component for reuse
const PREDEFINED_CATEGORIES = {
  clothing: [
    "Dresses",
    "Tops",
    "Shirts & Blouses",
    "Sweaters & Cardigans",
    "Coats",
    "Blazers",
    "Skirts",
    "Pants",
    "Gym",
  ],
  shoes: [],
  accessories: ["Bags", "Jewelry", "Accessories"],
  beauty: ["Makeup", "Nails", "Perfumes"],
  "home-tech": ["House Things", "Electronics"],
  food: [],
  extra: [],
};

export function AddItemModal({ open, onOpenChange }: AddItemModalProps) {
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState<ScrapedProduct | null>(null);
  const [manualCategory, setManualCategory] = useState<string>("");
  const [manualSubcategory, setManualSubcategory] = useState<string>("");
  const [subcategories, setSubcategories] = useState<string[]>([]);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Log preview data when it changes
  useEffect(() => {
    if (preview) {
      console.log("--- AddItemModal: Preview Data Updated ---");
      console.log("Title:", preview.title);
      console.log("Price:", preview.price);
      console.log("Currency:", preview.currency);
      console.log("Brand:", preview.brand);
      console.log("Images:", preview.images);
      console.log("Colors:", preview.colors);
      console.log("Sizes:", preview.sizes);
      console.log("-----------------------------------------");
    }
  }, [preview]);

  // Mutation for scraping product details
  const scrapeMutation = useMutation({
    mutationFn: (url: string): Promise<ScrapedProduct> => scrapeProduct(url),
    onSuccess: (data) => {
      console.log("--- AddItemModal: Scrape Successful ---");
      console.log("Received data:", data);
      console.log("-------------------------------------");
      setPreview(data);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch product details",
        variant: "destructive",
      });
      console.error("Scrape Mutation Error:", error);
    },
  });

  // Mutation for adding item to wishlist
  const addMutation = useMutation({
    mutationFn: (data: InsertScrapedProduct) => addWishlistItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      toast({
        title: "Success",
        description: "Item added to wishlist",
      });
      // Close modal and reset state via handleOpenChange(false)
      handleOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add item to wishlist",
        variant: "destructive",
      });
      console.error("Add Mutation Error:", error);
    },
  });

  // Handler to initiate scraping
  const handleFetchPreview = () => {
    if (!url) return;
    setPreview(null); // Clear previous preview immediately
    console.log(`--- AddItemModal: Starting scrape for ${url} ---`);
    scrapeMutation.mutate(url);
  };

  // Handler to add the item (uses preview data + categories)
  const handleAdd = () => {
    if (!preview) return;
    console.log("--- AddItemModal: handleAdd called ---");
    const dataToSend: InsertScrapedProduct = {
      ...preview,
      manualCategory: manualCategory || undefined, // Send undefined if empty string
      manualSubcategory: manualSubcategory || undefined, // Send undefined if empty string
    };
    console.log("Sending data:", dataToSend);
    addMutation.mutate(dataToSend);
  };

  // Handler to reset state when modal is closed
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      // Reset state when closing
      setUrl("");
      setPreview(null);
      setManualCategory("");
      setManualSubcategory("");
      setSubcategories([]);
      scrapeMutation.reset(); // Reset scrape mutation state
      addMutation.reset(); // Reset add mutation state
    }
    onOpenChange(isOpen); // Call the original prop function
  };

  // Handler for category dropdown changes
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cat = e.target.value;
    setManualCategory(cat);
    setManualSubcategory(""); // Reset subcategory when main category changes
    // Update available subcategories
    if (
      cat &&
      PREDEFINED_CATEGORIES[cat as keyof typeof PREDEFINED_CATEGORIES]?.length >
        0
    ) {
      setSubcategories(
        PREDEFINED_CATEGORIES[cat as keyof typeof PREDEFINED_CATEGORIES],
      );
    } else {
      setSubcategories([]);
    }
  };

  return (
    // Use the custom handleOpenChange
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* Add max height and flex structure for scrolling */}
      <DialogContent className="max-w-2xl glass rounded-3xl border-glass-border flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display gradient-text">
            Add Item to Wishlist
          </DialogTitle>
          <DialogDescription>
            Paste a product URL to automatically fetch details
          </DialogDescription>
        </DialogHeader>
        {/* Make this middle section scrollable */}
        {/* Added standard scrollbar classes, adjust as needed or use plugin */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar scrollbar-thumb-primary scrollbar-track-primary/20 scrollbar-thumb-rounded-full scrollbar-track-rounded-full">
          {/* URL Input Section */}
          <div className="space-y-2">
            <Label htmlFor="url">Product URL</Label>
            <div className="flex gap-2">
              <Input
                id="url"
                placeholder="https://example.com/product"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleFetchPreview()}
                className="rounded-xl"
                data-testid="input-product-url"
              />
              <Button
                onClick={handleFetchPreview}
                disabled={!url || scrapeMutation.isPending}
                className="rounded-xl gradient-bg"
                data-testid="button-fetch-preview"
              >
                {scrapeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Fetch"
                )}
              </Button>
            </div>
          </div>

          {/* Loading state for scrape */}
          {scrapeMutation.isPending && !preview && (
            <div className="text-center py-10">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
              <p className="mt-2 text-muted-foreground">Fetching details...</p>
            </div>
          )}

          {/* Scrape Error state */}
          {scrapeMutation.isError && !preview && (
            <div className="text-center py-10 px-4 rounded-lg bg-destructive/10 border border-destructive/30">
              <p className="font-semibold text-destructive">Scraping Failed</p>
              <p className="mt-1 text-sm text-destructive/90">
                {scrapeMutation.error?.message ||
                  "Could not retrieve product details."}
              </p>
              {/* Allow retrying by resetting the mutation state */}
              {/* FIX: Changed variant="link" to variant="ghost" */}
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 text-destructive hover:bg-destructive/10"
                onClick={() => {
                  scrapeMutation.reset();
                  setUrl(""); /* Optionally clear URL */
                }}
              >
                Clear
              </Button>
            </div>
          )}

          {/* Preview Section - Only shows if preview exists */}
          {preview && (
            <div className="space-y-4 rounded-2xl">
              {" "}
              {/* Removed bg-muted/50 and padding */}
              <h3 className="font-semibold text-lg">Preview</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <ProductGallery images={preview.images} />
                <div className="space-y-4">
                  {/* Brand, Title, Price */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {preview.brand || "No Brand Found"}
                    </p>{" "}
                    {/* Added fallback text */}
                    <h4 className="font-semibold text-lg">{preview.title}</h4>
                  </div>
                  <div>
                    <p className="text-3xl font-bold font-mono">
                      {preview.currency}
                      {typeof preview.price === "number"
                        ? preview.price.toFixed(2)
                        : preview.price}
                    </p>
                  </div>

                  {/* Colors */}
                  {preview.colors && preview.colors.length > 0 && (
                    <div>
                      <Label className="text-xs mb-2 block">Colors</Label>
                      <div className="flex gap-2 flex-wrap">
                        {preview.colors.map((color: ProductVariant) => (
                          <Button
                            key={`${color.name}-${color.available}`} // More unique key
                            variant="outline"
                            size="sm"
                            className={`rounded-lg h-auto text-xs px-2 py-1 ${!color.available ? "line-through text-muted-foreground opacity-60 cursor-not-allowed" : "cursor-default"}`} // Adjusted styling and cursor
                            disabled={!color.available}
                            aria-disabled={!color.available} // Accessibility
                            tabIndex={-1} // Prevent tabbing to disabled buttons
                          >
                            {color.swatch && (
                              <span
                                className="h-3 w-3 rounded-full mr-1.5 border" // Smaller swatch
                                style={{
                                  backgroundImage: `url(${color.swatch})`,
                                  backgroundColor: color.name.toLowerCase(), // Fallback bg
                                  backgroundSize: "cover",
                                  backgroundPosition: "center",
                                }}
                              />
                            )}
                            {color.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sizes */}
                  {preview.sizes && preview.sizes.length > 0 && (
                    <div>
                      <Label className="text-xs mb-2 block">Sizes</Label>
                      <div className="flex gap-2 flex-wrap">
                        {preview.sizes.map((size: ProductVariant) => (
                          <Button
                            key={`${size.name}-${size.available}`} // More unique key
                            variant="outline"
                            size="sm"
                            className={`rounded-lg text-xs px-2 py-1 ${!size.available ? "line-through text-muted-foreground opacity-60 cursor-not-allowed" : "cursor-default"}`} // Adjusted styling and cursor
                            disabled={!size.available}
                            aria-disabled={!size.available}
                            tabIndex={-1}
                          >
                            {size.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Show message if colors/sizes are expected but not found */}
                  {(!preview.colors || preview.colors.length === 0) &&
                    (!preview.sizes || preview.sizes.length === 0) && (
                      <p className="text-xs text-muted-foreground italic">
                        Color/Size options not detected for this product.
                      </p>
                    )}
                </div>
              </div>
              {/* Category Selection */}
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category (Optional)</Label>
                  <select
                    id="category"
                    value={manualCategory}
                    onChange={handleCategoryChange}
                    className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm focus:ring-ring focus:ring-1 focus:outline-none" // Added focus styles
                  >
                    <option value="">Auto-categorize (Gemini)</option>
                    {Object.keys(PREDEFINED_CATEGORIES).map((cat) => (
                      <option key={cat} value={cat}>
                        {(cat.charAt(0).toUpperCase() + cat.slice(1)).replace(
                          "-",
                          " & ",
                        )}
                      </option> // Format name
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subcategory">Subcategory (Optional)</Label>
                  <select
                    id="subcategory"
                    value={manualSubcategory}
                    onChange={(e) => setManualSubcategory(e.target.value)}
                    disabled={subcategories.length === 0}
                    className="w-full h-10 px-3 rounded-xl bg-background border border-border disabled:opacity-50 text-sm focus:ring-ring focus:ring-1 focus:outline-none" // Added focus styles
                  >
                    <option value="">
                      {subcategories.length === 0
                        ? "N/A"
                        : "Select subcategory"}
                    </option>
                    {subcategories.map((subcat) => (
                      <option key={subcat} value={subcat}>
                        {subcat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div> // End Preview Div
          )}
        </div>{" "}
        {/* End scrollable div */}
        {/* Move Footer outside the scrollable area */}
        <DialogFooter className="pt-4 border-t border-border/50 px-6 pb-6">
          {" "}
          {/* Added padding */}
          {/* Show Cancel/Add only when preview is loaded and not currently adding */}
          {preview && !addMutation.isPending && (
            <>
              {/* Changed Cancel button to use handleOpenChange */}
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                className="rounded-xl"
                data-testid="button-cancel-preview"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAdd}
                disabled={addMutation.isPending}
                className="rounded-xl gradient-bg"
                data-testid="button-confirm-add"
              >
                {addMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Add to Wishlist
              </Button>
            </>
          )}
          {/* Show loading state for Add mutation */}
          {addMutation.isPending && (
            <Button
              disabled
              className="rounded-xl gradient-bg w-full md:w-auto"
            >
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Adding...
            </Button>
          )}
          {/* Show just a close button if no preview is loaded or scraping failed */}
          {!preview &&
            !scrapeMutation.isPending &&
            !scrapeMutation.isError && ( // Hide close button during error state too
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                className="rounded-xl"
              >
                Close
              </Button>
            )}
          {/* Show disabled button while scraping */}
          {scrapeMutation.isPending && (
            <Button
              disabled
              className="rounded-xl gradient-bg w-full md:w-auto"
            >
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Fetching...
            </Button>
          )}
          {/* Show only Close button if scraping failed */}
          {scrapeMutation.isError && !preview && (
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className="rounded-xl"
            >
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
