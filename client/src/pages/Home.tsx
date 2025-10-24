import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, RefreshCw, Activity, Upload, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/ProductCard";
import { ActivityFeedItem } from "@/components/ActivityFeedItem";
import { AddItemModal } from "@/components/AddItemModal";
import { CSVImportModal } from "@/components/CSVImportModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { fetchWishlistItems, updateAllPrices } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { WishlistItem } from "@shared/schema";
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
  const [isCSVImportOpen, setIsCSVImportOpen] = useState(false);
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
    <div className="text-center py-16 glass-weak rounded-3xl mx-auto max-w-md shadow-2xl border border-purple-200/30 dark:border-purple-500/30">
      <p className="text-foreground/80 mb-6 text-lg font-medium">{message}</p>
      <Button
        onClick={() => setIsAddModalOpen(true)}
        className="gradient-bg-animated rounded-2xl glow-interactive font-bold text-white shadow-2xl px-8 py-6 text-lg"
      >
        <Plus className="h-5 w-5 mr-2" />
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
    <div className="flex h-screen w-full overflow-hidden relative">
      {/* Animated pastel gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-200/40 via-pink-200/40 to-blue-200/40 dark:from-purple-900/20 dark:via-pink-900/20 dark:to-blue-900/20"></div>
      <div className="absolute inset-0 opacity-60">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-purple-300/50 to-transparent dark:from-purple-700/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-20 right-20 w-80 h-80 bg-gradient-to-br from-pink-300/50 to-transparent dark:from-pink-700/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-20 left-1/3 w-96 h-96 bg-gradient-to-br from-blue-300/50 to-transparent dark:from-blue-700/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>
      
      <AppSidebar
        selectedCategory={selectedCategory}
        selectedSubcategory={selectedSubcategory}
        onSelectCategory={handleSelectCategory}
        categoryCounts={categoryCounts}
      />
      <div className="flex flex-col flex-1 overflow-y-auto relative z-10 scrollbar-refined">
        <header className="sticky top-0 z-20 flex items-center justify-between p-4 border-b border-border/30 glass-strong backdrop-blur-xl shadow-2xl">
          <div className="flex items-center gap-3">
            <SidebarTrigger
              data-testid="button-sidebar-toggle"
              className="rounded-xl glow-button hover-elevate glass-weak"
            />
            <div className="hidden sm:block">
              <h2 className="text-lg font-semibold gradient-text">Wishlist Tracker</h2>
            </div>
          </div>
          <div className="flex gap-2 md:gap-3 shrink-0">
            {/* Update All Button */}
            <Button
              variant="outline"
              onClick={handleUpdateAll}
              disabled={updatePricesMutation.isPending}
              className="rounded-2xl hover-elevate glow-button text-xs md:text-sm glass-strong border-purple-300/30 dark:border-purple-500/30 bg-gradient-to-r from-purple-100/80 to-pink-100/80 dark:from-purple-900/40 dark:to-pink-900/40 hover:from-purple-200/90 hover:to-pink-200/90 dark:hover:from-purple-800/50 dark:hover:to-pink-800/50 text-purple-900 dark:text-purple-100 font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              data-testid="button-update-all"
            >
              <RefreshCw
                className={`h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2 ${updatePricesMutation.isPending ? "animate-spin" : ""}`}
              />
              Update All
            </Button>
            {/* CSV Import Button */}
            <Button
              variant="outline"
              onClick={() => setIsCSVImportOpen(true)}
              className="rounded-2xl hover-elevate glow-button text-xs md:text-sm glass-strong border-blue-300/30 dark:border-blue-500/30 bg-gradient-to-r from-blue-100/80 to-cyan-100/80 dark:from-blue-900/40 dark:to-cyan-900/40 hover:from-blue-200/90 hover:to-cyan-200/90 dark:hover:from-blue-800/50 dark:hover:to-cyan-800/50 text-blue-900 dark:text-blue-100 font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              data-testid="button-csv-import"
            >
              <Upload className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
              Import CSV
            </Button>
            {/* Add Item Button */}
            <Button
              onClick={() => setIsAddModalOpen(true)}
              className="rounded-2xl gradient-bg-animated glow-interactive text-xs md:text-sm font-bold text-white shadow-2xl"
              data-testid="button-add-item"
            >
              <Plus className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
              Add Item
            </Button>
            {/* Theme Toggle */}
            <ThemeToggle />
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
              <TabsList className="rounded-2xl glass-strong max-w-sm animate-fade-in shadow-lg border border-purple-200/30 dark:border-purple-500/30 bg-gradient-to-r from-purple-50/90 to-pink-50/90 dark:from-purple-900/30 dark:to-pink-900/30 p-1.5">
                <TabsTrigger
                  value="grid"
                  className="rounded-xl gap-1.5 hover-elevate data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-200/80 data-[state=active]:to-pink-200/80 dark:data-[state=active]:from-purple-700/60 dark:data-[state=active]:to-pink-700/60 data-[state=active]:text-purple-900 dark:data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 font-semibold"
                  data-testid="tab-grid"
                >
                  Grid View
                </TabsTrigger>
                <TabsTrigger
                  value="activity"
                  className="rounded-xl gap-1.5 hover-elevate data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-200/80 data-[state=active]:to-pink-200/80 dark:data-[state=active]:from-purple-700/60 dark:data-[state=active]:to-pink-700/60 data-[state=active]:text-purple-900 dark:data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 font-semibold"
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 animate-fade-in">
                    {productsToDisplay.map((product, index) => (
                      <div 
                        key={product.id} 
                        className="animate-slide-up"
                        style={{ animationDelay: `${index * 0.1}s` }}
                      >
                        <ProductCard {...product} />
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Activity Feed Content */}
              <TabsContent value="activity" className="mt-6">
                <div className="max-w-3xl mx-auto space-y-4 animate-fade-in">
                  {isLoading ? (
                    <LoadingState />
                  ) : activityFeed.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">
                        No recent price changes or activity
                      </p>
                    </div>
                  ) : (
                    activityFeed.map((item: ActivityItem, index) => (
                      <div 
                        key={item.id}
                        className="animate-slide-up"
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <ActivityFeedItem {...item} />
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
      <AddItemModal open={isAddModalOpen} onOpenChange={setIsAddModalOpen} />
      <CSVImportModal 
        open={isCSVImportOpen} 
        onOpenChange={setIsCSVImportOpen}
        onImportComplete={() => {
          queryClient.invalidateQueries({ queryKey: ["wishlist"] });
        }}
      />
    </div>
  );
}

// --- (Helper functions calculatePriceChange and getActivityFeed are already defined above) ---
