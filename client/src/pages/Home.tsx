import { useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/ProductCard";
import { ActivityFeedItem } from "@/components/ActivityFeedItem";
import { AddItemModal } from "@/components/AddItemModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import dressImage from "@assets/generated_images/Purple_dress_product_photo_23fef3a8.png";
import shoesImage from "@assets/generated_images/White_sneakers_product_photo_52d3741a.png";
import bagImage from "@assets/generated_images/Pink_handbag_product_photo_0ce8bd29.png";
import perfumeImage from "@assets/generated_images/Perfume_bottle_product_photo_2fcdbdcb.png";

export default function Home() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdateAll = () => {
    setIsUpdating(true);
    console.log("Updating all prices...");
    setTimeout(() => setIsUpdating(false), 2000);
  };

  const mockProducts = [
    {
      id: "1",
      title: "Elegant Purple Gradient Dress - Summer Collection",
      price: 129.99,
      image: dressImage,
      url: "https://example.com",
      inStock: true,
      priceChange: -15,
      brand: "Fashion Co.",
    },
    {
      id: "2",
      title: "Classic White Sneakers - Premium Leather",
      price: 89.99,
      image: shoesImage,
      url: "https://example.com",
      inStock: true,
      priceChange: 5,
      brand: "Footwear Brand",
    },
    {
      id: "3",
      title: "Luxury Pink Handbag - Designer Collection",
      price: 299.99,
      image: bagImage,
      url: "https://example.com",
      inStock: false,
      brand: "Luxury Bags",
    },
    {
      id: "4",
      title: "Signature Perfume - Floral Notes",
      price: 79.99,
      image: perfumeImage,
      url: "https://example.com",
      inStock: true,
      brand: "Fragrance House",
    },
  ];

  const mockActivity = [
    {
      id: "1",
      type: "price_drop" as const,
      productTitle: "Elegant Purple Gradient Dress",
      productImage: dressImage,
      oldPrice: 152.99,
      newPrice: 129.99,
      priceChange: -15,
      timestamp: "2 hours ago",
    },
    {
      id: "2",
      type: "price_increase" as const,
      productTitle: "Classic White Sneakers",
      productImage: shoesImage,
      oldPrice: 85.99,
      newPrice: 89.99,
      priceChange: 5,
      timestamp: "5 hours ago",
    },
    {
      id: "3",
      type: "restock" as const,
      productTitle: "Signature Perfume",
      productImage: perfumeImage,
      timestamp: "1 day ago",
    },
  ];

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
              disabled={isUpdating}
              className="rounded-xl hover-elevate"
              data-testid="button-update-all"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isUpdating ? "animate-spin" : ""}`} />
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {mockProducts.map((product) => (
                <ProductCard key={product.id} {...product} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="activity" className="mt-6">
            <div className="max-w-3xl space-y-4">
              {mockActivity.map((item) => (
                <ActivityFeedItem key={item.id} {...item} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <AddItemModal open={isAddModalOpen} onOpenChange={setIsAddModalOpen} />
    </div>
  );
}
