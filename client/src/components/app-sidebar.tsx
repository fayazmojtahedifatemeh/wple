import { 
  Shirt, 
  ShoppingBag, 
  Sparkles, 
  Home as HomeIcon, 
  Utensils,
  Plus,
  ChevronRight,
  Footprints
} from "lucide-react";
import { useState } from "react";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";

const categories = [
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
  {
    id: "shoes",
    title: "Shoes",
    icon: Footprints,
    collapsible: false,
  },
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
  {
    id: "food",
    title: "Food",
    icon: Utensils,
    collapsible: false,
  },
  {
    id: "extra",
    title: "Extra Stuff",
    icon: Sparkles,
    collapsible: false,
  },
];

export function AppSidebar() {
  const [openCategories, setOpenCategories] = useState<string[]>(["clothing"]);
  const [activeCategory, setActiveCategory] = useState<string | null>("clothing");
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>("Dresses");

  const toggleCategory = (categoryId: string) => {
    setOpenCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarContent className="p-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-lg font-display font-semibold mb-4 px-2">
            <span className="gradient-text">Categories</span>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {categories.map((category) => (
                <SidebarMenuItem key={category.id}>
                  {category.collapsible ? (
                    <Collapsible
                      open={openCategories.includes(category.id)}
                      onOpenChange={() => toggleCategory(category.id)}
                    >
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          data-testid={`button-category-${category.id}`}
                          className="w-full justify-between rounded-xl data-[active=true]:bg-sidebar-accent"
                          data-active={activeCategory === category.id}
                          onClick={() => setActiveCategory(category.id)}
                        >
                          <div className="flex items-center gap-3">
                            <category.icon className="h-5 w-5" />
                            <span className="font-medium">{category.title}</span>
                          </div>
                          <ChevronRight
                            className={`h-4 w-4 transition-transform ${
                              openCategories.includes(category.id) ? "rotate-90" : ""
                            }`}
                          />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub className="ml-6 mt-1 space-y-1">
                          {category.subcategories?.map((sub) => (
                            <SidebarMenuSubItem key={sub}>
                              <SidebarMenuSubButton
                                data-testid={`button-subcategory-${sub.toLowerCase().replace(/\s+/g, "-")}`}
                                className="rounded-lg data-[active=true]:bg-sidebar-accent"
                                data-active={activeSubcategory === sub}
                                onClick={() => {
                                  setActiveCategory(category.id);
                                  setActiveSubcategory(sub);
                                }}
                              >
                                <span className="text-sm">{sub}</span>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </Collapsible>
                  ) : (
                    <SidebarMenuButton
                      data-testid={`button-category-${category.id}`}
                      className="w-full rounded-xl data-[active=true]:bg-sidebar-accent"
                      data-active={activeCategory === category.id}
                      onClick={() => {
                        setActiveCategory(category.id);
                        setActiveSubcategory(null);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <category.icon className="h-5 w-5" />
                        <span className="font-medium">{category.title}</span>
                      </div>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <div className="mt-4 px-2">
          <Button
            variant="outline"
            className="w-full justify-start gap-2 rounded-xl border-dashed hover-elevate"
            data-testid="button-add-category"
            onClick={() => console.log("Add custom category")}
          >
            <Plus className="h-4 w-4" />
            <span>Add Category</span>
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
