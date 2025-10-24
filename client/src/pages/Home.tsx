import React, { useState, useMemo } from "react"; // Added React import
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, RefreshCw, Activity } from "lucide-react"; // Removed LayoutGrid
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/ProductCard";
import { ActivityFeedItem } from "@/components/ActivityFeedItem";
import { AddItemModal } from "@/components/AddItemModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Keep Tabs for Grid/Activity toggle
import { fetchWishlistItems, updateAllPrices } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { WishlistItem } from "@shared/schema";
// Ensure correct import path and CategoryCounts is exported from app-sidebar
import { AppSidebar, CategoryCounts } from "@/components/app-sidebar";

// --- Helper functions ---

function calculatePriceChange(item: WishlistItem): number | undefined {
  // Ensure price history exists, has at least two entries, and entries have valid prices
  if (
    !item.priceHistory ||
    item.priceHistory.length < 2 ||
    typeof item.priceHistory[item.priceHistory.length - 1]?.price !==
      "number" ||
    typeof item.priceHistory[item.priceHistory.length - 2]?.price !== "number"
  ) {
    return undefined;
  }

  const currentPrice = item.priceHistory[item.priceHistory.length - 1].price;
  const previousPrice = item.priceHistory[item.priceHistory.length - 2].price;

  // Avoid division by zero
  if (previousPrice === 0) {
    console.warn(
      "Previous price is zero, cannot calculate change for item:",
      item.id,
    );
    return undefined;
  }

  // Calculate percentage change
  const change = ((currentPrice - previousPrice) / previousPrice) * 100;

  // Return undefined if the change is effectively zero to avoid tiny fluctuations
  return Math.abs(change) < 0.01 ? undefined : change;
}

// Define a specific type for the activity feed items
interface ActivityItem {
  id: string;
  type: "price_drop" | "price_increase"; // Or potentially 'added', 'stock_change' later
  productTitle: string;
  productImage: string;
  oldPrice: number;
  newPrice: number;
  priceChange: number; // Storing the raw percentage
  timestamp: string; // Will be formatted string for display
  url: string;
}

function getActivityFeed(items: WishlistItem[]): ActivityItem[] {
  const activities: {
    // Intermediate type with raw timestamp for sorting
    id: string;
    type: "price_drop" | "price_increase";
    productTitle: string;
    productImage: string;
    oldPrice: number;
    newPrice: number;
    priceChange: number;
    timestamp: string; // ISO string from DB
    url: string;
  }[] = [];

  if (!items || !Array.isArray(items)) {
    console.warn("getActivityFeed received invalid items:", items);
    return []; // Return empty if items is not a valid array
  }

  items.forEach((item) => {
    // Check validity similar to calculatePriceChange
    if (
      !item.priceHistory ||
      item.priceHistory.length < 2 ||
      typeof item.priceHistory[item.priceHistory.length - 1]?.price !==
        "number" ||
      typeof item.priceHistory[item.priceHistory.length - 2]?.price !==
        "number" ||
      !item.priceHistory[item.priceHistory.length - 1]?.recordedAt // Ensure timestamp exists
    ) {
      // console.warn("Skipping item in activity feed due to invalid history:", item.id);
      return; // Skip item if history is insufficient or invalid
    }

    const currentPriceEntry = item.priceHistory[item.priceHistory.length - 1];
    const previousPriceEntry = item.priceHistory[item.priceHistory.length - 2];

    const currentPrice = currentPriceEntry.price;
    const previousPrice = previousPriceEntry.price;

    if (previousPrice === 0) {
      console.warn("Previous price is zero for activity feed item:", item.id);
      return; // Skip if previous price is zero
    }

    const priceChange = ((currentPrice - previousPrice) / previousPrice) * 100;

    // Only record if the change is significant (e.g., > 0.1%)
    if (Math.abs(priceChange) > 0.1) {
      activities.push({
        id: `price-${item.id}-${currentPriceEntry.recordedAt}`, // More unique ID
        type: priceChange < 0 ? "price_drop" : "price_increase",
        productTitle: item.title || "Untitled Product", // Add fallback
        productImage: item.images?.[0] || "", // Safer access
        oldPrice: previousPrice,
        newPrice: currentPrice,
        priceChange: priceChange, // Store the raw percentage
        timestamp: currentPriceEntry.recordedAt, // Store ISO string for sorting
        url: item.url,
      });
    }
  });

  // Sort activities newest first based on the recordedAt timestamp
  activities.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  // Format timestamp and priceChange for display *after* sorting
  const formattedActivities: ActivityItem[] = activities.map((activity) => ({
    ...activity,
    timestamp: new Date(activity.timestamp).toLocaleString(), // Format for display
    priceChange: parseFloat(activity.priceChange.toFixed(1)), // Format percentage number
  }));

  return formattedActivities.slice(0, 15); // Limit to the 15 most recent activities
}

// --- End Helper functions ---

export default function Home() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  // FIX: State for selected category/subcategory
  // FIX: State for selected category/subcategory
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null); // null means "All Items"
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<string>("grid"); // State for active tab

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const {
    data: allWishlistItems = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["wishlist"], // This key fetches all items
    queryFn: fetchWishlistItems,
  });

  const updatePricesMutation = useMutation({
    mutationFn: updateAllPrices,
    onSuccess: (data) => {
      // Check response data if needed
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      toast({
        title: "Success",
        description: "Price update process initiated.", // Adjusted message
      });
      // You could optionally show details about successes/failures from 'data' here
    },
    onError: (error) => {
      toast({
        title: "Error Updating Prices",
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    },
  });

  const handleUpdateAll = () => {
    updatePricesMutation.mutate();
  };

  // --- FIX: Calculate Category Counts ---
  const categoryCounts: CategoryCounts = useMemo(() => {
    const counts: CategoryCounts = { all: allWishlistItems.length };
    allWishlistItems.forEach((item) => {
      const cat = item.category || "extra"; // Default to extra if category is missing
      counts[cat] = (counts[cat] || 0) + 1;
      if (item.subcategory) {
        // Ensure subcategory name doesn't contain ":" itself
        const safeSubcategory = item.subcategory.replace(":", "");
        const subKey = `${cat}:${safeSubcategory}`; // Unique key for subcategory count
        counts[subKey] = (counts[subKey] || 0) + 1;
      }
    });
    return counts;
  }, [allWishlistItems]);

  // --- FIX: Filter Products Based on Selection ---
  const filteredProducts = useMemo(() => {
    if (!selectedCategory) {
      return allWishlistItems; // Show all if no category selected
    }
    return allWishlistItems.filter(
      (item) =>
        item.category === selectedCategory &&
        (!selectedSubcategory || item.subcategory === selectedSubcategory), // Match subcategory if selected
    );
  }, [allWishlistItems, selectedCategory, selectedSubcategory]);
  // Dynamically set title based on selection
  const pageTitle = selectedSubcategory
    ? selectedSubcategory
    : selectedCategory
      ? (
          selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)
        ).replace("-", " & ")
      : "All Items";
  const pageDescription = selectedCategory
    ? `Items in the ${selectedSubcategory || selectedCategory} category`
    : "Showing all items in your wishlist";
  // Map the *filtered* items for display
  const productsToDisplay = filteredProducts.map((item) => ({
    id: item.id,
    title: item.title,
    // Ensure price is always a number for calculations/display
    price:
      typeof item.price === "string"
        ? parseFloat(item.price)
        : Number(item.price || 0),
    currency: item.currency, // Pass currency to ProductCard
    image: item.images?.[0] || "", // Safer access to image
    url: item.url,
    inStock: item.inStock,
    priceChange: calculatePriceChange(item),
    brand: item.brand || undefined,
  }));

  const activityFeed = getActivityFeed(allWishlistItems); // Activity feed uses all items

  // --- Empty/Loading/Error States ---
  const EmptyState = ({
    message = "Your wishlist is empty",
  }: {
    message?: string;
  }) => (
    <div className="text-center py-12">
      <p className="text-muted-foreground mb-4">{message}</p>
      <Button
        onClick={() => setIsAddModalOpen(true)}
        className="gradient-bg rounded-xl"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Your First Item
      </Button>
    </div>
  );

  const LoadingState = () => (
    <div className="text-center py-12">
      <p className="text-muted-foreground">Loading wishlist items...</p>
    </div>
  );

  const ErrorState = ({ error }: { error: Error | null }) => (
    <div className="text-center py-12">
      <p className="text-destructive mb-2">Failed to load wishlist</p>
      <p className="text-muted-foreground text-sm">
        {error instanceof Error ? error.message : "Unknown error"}
      </p>
    </div>
  );

  // --- FIX: Handler for sidebar selection ---
  const handleSelectCategory = (
    category: string | null,
    subcategory: string | null,
  ) => {
    setSelectedCategory(category);
    setSelectedSubcategory(subcategory);
    setActiveTab("grid"); // Switch back to grid view when category changes
  };

  return (
    // FIX: Apply flex layout to the overall page container
    <div className="flex h-screen w-full bg-gradient-to-br from-background via-background to-primary/5 overflow-hidden">
      {" "}
      {/* Added overflow-hidden */}
      {/* Pass necessary props to the Sidebar */}
      <AppSidebar
        selectedCategory={selectedCategory}
        selectedSubcategory={selectedSubcategory}
        onSelectCategory={handleSelectCategory}
        categoryCounts={categoryCounts}
      />
      {/* FIX: Make this the main scrollable container */}
      <div className="flex flex-col flex-1 overflow-y-auto">
        {" "}
        {/* Added overflow-y-auto */}
        {/* FIX: Make Header sticky */}
        <header className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-border/50 glass backdrop-blur-xl">
          {/* Removed SidebarTrigger */}
          <div className="flex-1">
            {/* Placeholder for potential breadcrumbs or search */}
          </div>
          <div className="flex gap-2 md:gap-3 shrink-0">
            {/* Update All Button */}
            <Button
              variant="outline"
              onClick={handleUpdateAll}
              disabled={updatePricesMutation.isPending}
              className="rounded-xl hover-elevate text-xs md:text-sm"
              data-testid="button-update-all"
            >
              <RefreshCw
                className={`h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2 ${updatePricesMutation.isPending ? "animate-spin" : ""}`}
              />
              Update All
            </Button>
            {/* Add Item Button */}
            <Button
              onClick={() => setIsAddModalOpen(true)}
              className="rounded-xl gradient-bg text-xs md:text-sm"
              data-testid="button-add-item"
            >
              <Plus className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
              Add Item
            </Button>
          </div>
        </header>
        {/* FIX: Content area scrolls within the main container */}
        <main className="flex-1 p-4 md:p-6">
          {" "}
          {/* Removed overflow-y-auto here */}
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Page Title */}
            <div>
              <h1 className="text-3xl md:text-4xl font-bold font-display gradient-text mb-1 md:mb-2">
                {pageTitle}
              </h1>
              <p className="text-sm md:text-base text-muted-foreground">
                {pageDescription}
              </p>
            </div>

            {/* FIX: Removed Tabs for categories, only keep Activity Feed tab optional */}
            {/* FIX: Use controlled Tabs with onValueChange */}
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="rounded-xl glass max-w-sm">
                <TabsTrigger
                  value="grid"
                  className="rounded-lg gap-1.5"
                  data-testid="tab-grid"
                >
                  Grid View
                </TabsTrigger>
                <TabsTrigger
                  value="activity"
                  className="rounded-lg gap-1.5"
                  data-testid="tab-activity"
                >
                  <Activity className="h-4 w-4" />
                  Activity Feed
                </TabsTrigger>
              </TabsList>

              {/* Product Grid Content */}
              <TabsContent value="grid" className="mt-6">
                {error ? (
                  <ErrorState error={error as Error} />
                ) : isLoading ? (
                  <LoadingState />
                ) : productsToDisplay.length === 0 ? (
                  // Pass appropriate message based on selection
                  <EmptyState
                    message={
                      selectedCategory
                        ? "No items found in this category yet."
                        : "Your wishlist is empty."
                    }
                  />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                    {productsToDisplay.map((product) => (
                      // Pass all needed props to ProductCard
                      <ProductCard key={product.id} {...product} />
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Activity Feed Content */}
              <TabsContent value="activity" className="mt-6">
                <div className="max-w-3xl mx-auto space-y-4">
                  {isLoading ? (
                    <LoadingState />
                  ) : activityFeed.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">
                        No recent price changes or activity
                      </p>
                    </div>
                  ) : (
                    activityFeed.map(
                      (
                        item: ActivityItem, // Use ActivityItem type
                      ) => <ActivityFeedItem key={item.id} {...item} />,
                    )
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
      <AddItemModal open={isAddModalOpen} onOpenChange={setIsAddModalOpen} />
    </div>
  );
}

// --- (Helper functions calculatePriceChange and getActivityFeed are already defined above) ---
