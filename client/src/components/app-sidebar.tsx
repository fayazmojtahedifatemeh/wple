import React, { useState } from "react"; // Added React import
import {
  List,
  Shirt,
  ShoppingBag,
  Sparkles,
  Home as HomeIcon, // Renamed Home to avoid conflict
  Utensils,
  Plus,
  ChevronRight,
  Footprints,
  LucideIcon, // Keep LucideIcon type
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge"; // Ensure Badge is imported

// Export CategoryCounts interface
export interface CategoryCounts {
  all: number;
  [key: string]: number;
}

// Define AppSidebarProps interface
interface AppSidebarProps {
  selectedCategory: string | null;
  selectedSubcategory: string | null;
  onSelectCategory: (
    category: string | null,
    subcategory: string | null,
  ) => void;
  // Make categoryCounts potentially optional initially
  categoryCounts?: CategoryCounts;
}

// Define Category interface with LucideIcon type
interface Category {
  id: string;
  title: string;
  icon: LucideIcon;
  collapsible: boolean;
  subcategories?: string[];
}

const categories: Category[] = [
  {
    id: "clothing",
    title: "Clothing",
    icon: Shirt,
    collapsible: true,
    subcategories: [
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
  },
  { id: "shoes", title: "Shoes", icon: Footprints, collapsible: false },
  {
    id: "accessories",
    title: "Accessories",
    icon: ShoppingBag,
    collapsible: true,
    subcategories: ["Bags", "Jewelry", "Accessories"],
  },
  {
    id: "beauty",
    title: "Beauty",
    icon: Sparkles,
    collapsible: true,
    subcategories: ["Makeup", "Nails", "Perfumes"],
  },
  {
    id: "home-tech",
    title: "Home & Tech",
    icon: HomeIcon,
    collapsible: true,
    subcategories: ["House Things", "Electronics"],
  },
  { id: "food", title: "Food", icon: Utensils, collapsible: false },
  { id: "extra", title: "Extra Stuff", icon: Sparkles, collapsible: false },
];

// Destructure props and provide default for categoryCounts
export function AppSidebar({
  selectedCategory,
  selectedSubcategory,
  onSelectCategory,
  categoryCounts = { all: 0 }, // Default value added
}: AppSidebarProps) {
  const [openCategories, setOpenCategories] = useState<string[]>(["clothing"]);

  const toggleCategory = (categoryId: string) => {
    setOpenCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId],
    );
  };

  return (
    // Add fixed width, ensure block display
    <Sidebar className="border-r border-sidebar-border hidden md:block w-64 shrink-0">
      {/* Add flex, full height, and scrolling */}
      <SidebarContent className="p-4 flex flex-col h-full overflow-y-auto">
        {/* Make group grow */}
        <SidebarGroup className="flex-1">
          {/* ... GroupLabel ... */}
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {/* "All Items" */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  data-testid="button-category-all"
                  className="w-full rounded-xl data-[active=true]:bg-sidebar-accent justify-between h-auto py-2" // Add h-auto py-2
                  data-active={selectedCategory === null}
                  onClick={() => onSelectCategory(null, null)}
                >
                  <div className="flex items-center gap-3">
                    <List className="h-5 w-5 shrink-0" /> {/* Added shrink-0 */}
                    {/* Add wrapping, left align */}
                    <span className="font-medium text-sm whitespace-normal text-left">
                      All Items
                    </span>
                  </div>
                  {/* Add Badge with count, shrink-0 */}
                  <Badge
                    variant="secondary"
                    className="rounded-md h-5 px-1.5 text-xs font-mono shrink-0"
                  >
                    {categoryCounts?.all || 0}
                  </Badge>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Map through categories */}
              {categories.map((category) => {
                // Get count (check categoryCounts existence)
                const count = categoryCounts?.[category.id] || 0;
                // Active state logic
                const isCategoryActive = selectedCategory === category.id;
                const isSubcategoryActive = category.subcategories?.includes(
                  selectedSubcategory || "",
                );

                return (
                  <SidebarMenuItem key={category.id}>
                    {category.collapsible ? (
                      <Collapsible
                        open={openCategories.includes(category.id)}
                        onOpenChange={() => toggleCategory(category.id)}
                      >
                        <CollapsibleTrigger asChild>
                          {/* Add wrapping, auto height, padding */}
                          <SidebarMenuButton
                            data-testid={`button-category-${category.id}`}
                            className="w-full justify-between rounded-xl data-[active=true]:bg-sidebar-accent h-auto py-2" // Add h-auto py-2
                            data-active={isCategoryActive}
                            onClick={() => onSelectCategory(category.id, null)}
                          >
                            <div className="flex items-center gap-3">
                              <category.icon className="h-5 w-5 shrink-0" />
                              <span className="font-medium text-sm whitespace-normal text-left">
                                {category.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {/* Add Badge with count, shrink-0 */}
                              <Badge
                                variant="secondary"
                                className="rounded-md h-5 px-1.5 text-xs font-mono shrink-0"
                              >
                                {count}
                              </Badge>
                              <ChevronRight
                                className={`h-4 w-4 transition-transform ${openCategories.includes(category.id) ? "rotate-90" : ""} shrink-0`}
                              />{" "}
                              {/* Added shrink-0 */}
                            </div>
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub className="ml-6 mt-1 space-y-1">
                            {category.subcategories?.map((sub) => {
                              // Get sub count (check categoryCounts existence)
                              const subKey = `${category.id}:${sub.replace(":", "")}`;
                              const subCount = categoryCounts?.[subKey] || 0;
                              return (
                                <SidebarMenuSubItem key={sub}>
                                  {/* Add wrapping, auto height, padding */}
                                  <SidebarMenuSubButton
                                    data-testid={`button-subcategory-${sub.toLowerCase().replace(/\s+/g, "-")}`}
                                    className="rounded-lg data-[active=true]:bg-sidebar-accent justify-between h-auto py-1.5" // Add h-auto py-1.5
                                    data-active={
                                      isCategoryActive &&
                                      selectedSubcategory === sub
                                    }
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onSelectCategory(category.id, sub);
                                    }} // Add stopPropagation
                                  >
                                    <span className="text-sm whitespace-normal text-left">
                                      {sub}
                                    </span>
                                    {/* Add Badge with count, shrink-0 */}
                                    <Badge
                                      variant="secondary"
                                      className="rounded-md h-5 px-1.5 text-xs font-mono shrink-0"
                                    >
                                      {subCount}
                                    </Badge>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              );
                            })}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </Collapsible>
                    ) : (
                      // Non-collapsible category
                      /* Add wrapping, auto height, padding */
                      <SidebarMenuButton
                        data-testid={`button-category-${category.id}`}
                        className="w-full rounded-xl data-[active=true]:bg-sidebar-accent justify-between h-auto py-2" // Add h-auto py-2
                        data-active={isCategoryActive && !selectedSubcategory}
                        onClick={() => onSelectCategory(category.id, null)}
                      >
                        <div className="flex items-center gap-3">
                          <category.icon className="h-5 w-5 shrink-0" />
                          <span className="font-medium text-sm whitespace-normal text-left">
                            {category.title}
                          </span>
                        </div>
                        {/* Add Badge with count, shrink-0 */}
                        <Badge
                          variant="secondary"
                          className="rounded-md h-5 px-1.5 text-xs font-mono shrink-0"
                        >
                          {count}
                        </Badge>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Push "Add Category" button to bottom */}
        <div className="mt-auto pt-4 px-2">
          <Button
            variant="outline"
            className="w-full justify-start gap-2 rounded-xl border-dashed hover-elevate"
            data-testid="button-add-category"
            onClick={() => console.log("Add custom category feature TBD")}
          >
            <Plus className="h-4 w-4" />
            <span>Add Category</span>
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
