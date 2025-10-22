import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/ProductCard";
import { ActivityFeedItem } from "@/components/ActivityFeedItem";
import { AddItemModal } from "@/components/AddItemModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchWishlistItems, updateAllPrices } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { WishlistItem } from "@shared/schema";

function calculatePriceChange(item: WishlistItem): number | undefined {
  if (item.priceHistory.length < 2) return undefined;
  
  const currentPrice = item.priceHistory[item.priceHistory.length - 1].price;
  const previousPrice = item.priceHistory[item.priceHistory.length - 2].price;
  
  return ((currentPrice - previousPrice) / previousPrice) * 100;
}

function getActivityFeed(items: WishlistItem[]) {
  const activities: any[] = [];
  
  items.forEach(item => {
    if (item.priceHistory.length >= 2) {
      const currentPrice = item.priceHistory[item.priceHistory.length - 1].price;
      const previousPrice = item.priceHistory[item.priceHistory.length - 2].price;
      const priceChange = ((currentPrice - previousPrice) / previousPrice) * 100;
      
      if (Math.abs(priceChange) > 0.1) {
        activities.push({
          id: `price-${item.id}`,
          type: priceChange < 0 ? "price_drop" : "price_increase",
          productTitle: item.title,
          productImage: item.images[0],
          oldPrice: previousPrice,
          newPrice: currentPrice,
          priceChange,
          timestamp: new Date(item.priceHistory[item.priceHistory.length - 1].recordedAt).toLocaleString(),
        });
      }
    }
  });
  
  return activities.slice(0, 10);
}

export default function Home() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: wishlistItems = [], isLoading, error } = useQuery({
    queryKey: ["wishlist"],
    queryFn: fetchWishlistItems,
  });

  const updatePricesMutation = useMutation({
    mutationFn: updateAllPrices,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      toast({
        title: "Success",
        description: "All prices have been updated",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update prices",
        variant: "destructive",
      });
    },
  });

  const handleUpdateAll = () => {
    updatePricesMutation.mutate();
  };

  const products = wishlistItems.map(item => ({
    id: item.id,
    title: item.title,
    price: typeof item.price === 'string' ? parseFloat(item.price) : Number(item.price),
    image: item.images[0] || "",
    url: item.url,
    inStock: item.inStock,
    priceChange: calculatePriceChange(item),
    brand: item.brand || undefined,
  }));

  const activityFeed = getActivityFeed(wishlistItems);

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold font-display gradient-text mb-2">
              My Wishlist
            </h1>
            <p className="text-muted-foreground">
              Track your favorite items and get notified on price drops
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleUpdateAll}
              disabled={updatePricesMutation.isPending}
              className="rounded-xl hover-elevate"
              data-testid="button-update-all"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${updatePricesMutation.isPending ? "animate-spin" : ""}`} />
              Update All Prices
            </Button>
            <Button
              onClick={() => setIsAddModalOpen(true)}
              className="rounded-xl gradient-bg"
              data-testid="button-add-item"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
        </div>

        <Tabs defaultValue="grid" className="w-full">
          <TabsList className="rounded-xl glass">
            <TabsTrigger value="grid" className="rounded-lg" data-testid="tab-grid">
              Grid View
            </TabsTrigger>
            <TabsTrigger value="activity" className="rounded-lg" data-testid="tab-activity">
              Activity Feed
            </TabsTrigger>
          </TabsList>

          <TabsContent value="grid" className="mt-6">
            {error ? (
              <div className="text-center py-12">
                <p className="text-destructive mb-2">Failed to load wishlist</p>
                <p className="text-muted-foreground text-sm">{error instanceof Error ? error.message : "Unknown error"}</p>
              </div>
            ) : isLoading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading wishlist items...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">Your wishlist is empty</p>
                <Button onClick={() => setIsAddModalOpen(true)} className="gradient-bg">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Item
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map((product) => (
                  <ProductCard key={product.id} {...product} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="activity" className="mt-6">
            <div className="max-w-3xl space-y-4">
              {activityFeed.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No recent activity</p>
                </div>
              ) : (
                activityFeed.map((item) => (
                  <ActivityFeedItem key={item.id} {...item} />
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <AddItemModal open={isAddModalOpen} onOpenChange={setIsAddModalOpen} />
    </div>
  );
}
