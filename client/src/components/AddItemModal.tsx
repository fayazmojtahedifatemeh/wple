import { useState } from "react";
import { X, Plus, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProductGallery } from "@/components/ProductGallery";

interface AddItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddItemModal({ open, onOpenChange }: AddItemModalProps) {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<any>(null);

  const handleFetchPreview = () => {
    if (!url) return;
    setIsLoading(true);
    console.log("Fetching preview for:", url);
    
    setTimeout(() => {
      setPreview({
        title: "Example Product Name - Purple Gradient Dress",
        price: 129.99,
        currency: "$",
        images: [
          "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400",
          "https://images.unsplash.com/photo-1596783074918-c84cb06531ca?w=400",
        ],
        colors: ["Purple", "Blue", "Pink"],
        sizes: ["XS", "S", "M", "L", "XL"],
        brand: "Fashion Brand",
        inStock: true,
      });
      setIsLoading(false);
    }, 1500);
  };

  const handleAdd = () => {
    console.log("Adding item to wishlist");
    onOpenChange(false);
    setUrl("");
    setPreview(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl glass rounded-3xl border-glass-border" data-testid="dialog-add-item">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display gradient-text">
            Add Item to Wishlist
          </DialogTitle>
          <DialogDescription>
            Paste a product URL to automatically fetch details
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
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
                disabled={!url || isLoading}
                className="rounded-xl gradient-bg"
                data-testid="button-fetch-preview"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Fetch"
                )}
              </Button>
            </div>
          </div>

          {preview && (
            <div className="space-y-4 p-6 rounded-2xl bg-muted/50">
              <h3 className="font-semibold text-lg">Preview</h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                <ProductGallery images={preview.images} />

                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {preview.brand}
                    </p>
                    <h4 className="font-semibold text-lg">{preview.title}</h4>
                  </div>

                  <div>
                    <p className="text-3xl font-bold font-mono">
                      {preview.currency}
                      {preview.price.toFixed(2)}
                    </p>
                  </div>

                  {preview.colors && (
                    <div>
                      <Label className="text-xs mb-2 block">Colors</Label>
                      <div className="flex gap-2 flex-wrap">
                        {preview.colors.map((color: string) => (
                          <div
                            key={color}
                            className="px-3 py-1 rounded-lg bg-background text-sm"
                          >
                            {color}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {preview.sizes && (
                    <div>
                      <Label className="text-xs mb-2 block">Sizes</Label>
                      <div className="flex gap-2 flex-wrap">
                        {preview.sizes.map((size: string) => (
                          <div
                            key={size}
                            className="px-3 py-1 rounded-lg bg-background text-sm"
                          >
                            {size}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => setPreview(null)}
                  className="rounded-xl"
                  data-testid="button-cancel-preview"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAdd}
                  className="rounded-xl gradient-bg"
                  data-testid="button-confirm-add"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add to Wishlist
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
