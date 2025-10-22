# Wishlist & Price Tracker - Design Guidelines

## Design Approach: Glassmorphism + Modern Utility

**Primary Inspiration:** The provided reference image showcasing glassmorphism aesthetics with dark mode optimization. This is a **design system approach** focused on creating a cohesive, feature-rich utility application with strong visual appeal.

---

## Core Design Elements

### A. Color Palette

**Dark Mode (Primary)**
- **Background Base:** 240 8% 8% (deep charcoal)
- **Background Elevated:** 240 8% 12% (slightly lighter panels)
- **Primary Gradient:** Linear gradient from 280 80% 60% (vibrant purple) → 320 70% 55% (pink) → 220 85% 65% (blue)
- **Glassmorphic Surfaces:** Background with 40-60% opacity, backdrop-filter blur (24px)
- **Text Primary:** 0 0% 98%
- **Text Secondary:** 0 0% 70%
- **Accent Green (Price Drops):** 142 76% 45%
- **Accent Red (Price Increases):** 0 72% 55%
- **Border Subtle:** 240 8% 20% with 20% opacity

**Light Mode**
- **Background Base:** 240 10% 98%
- **Background Elevated:** 0 0% 100%
- **Primary Gradient:** Same hues, adjusted lightness (280 80% 65% → 320 70% 60% → 220 85% 70%)
- **Glassmorphic Surfaces:** White with 70% opacity, backdrop-filter blur (24px)
- **Text Primary:** 240 8% 12%
- **Text Secondary:** 240 5% 45%

### B. Typography

**Font Families**
- **Primary (UI):** 'Inter' from Google Fonts - clean, modern, excellent readability
- **Display (Headers):** 'Plus Jakarta Sans' from Google Fonts - slightly rounded, friendly
- **Monospace (Prices):** 'JetBrains Mono' - for numerical displays

**Type Scale**
- Hero/Display: text-5xl to text-6xl, font-bold (48-60px)
- Page Headers: text-3xl, font-semibold (30px)
- Section Headers: text-2xl, font-semibold (24px)
- Card Titles: text-lg, font-semibold (18px)
- Body Text: text-base, font-normal (16px)
- Small/Meta: text-sm, font-normal (14px)
- Price Display: text-2xl to text-4xl, font-bold, monospace

### C. Layout System

**Spacing Primitives:** Use Tailwind units of 2, 4, 6, 8, 12, 16, 24
- Component padding: p-6, p-8
- Section spacing: gap-6, gap-8
- Card spacing: p-4, p-6
- Icon spacing: m-2, m-4

**Grid System**
- Main container: max-w-7xl, px-4 to px-8
- Sidebar: fixed width 280px (lg+), collapsible on mobile
- Product grid: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
- Activity feed: single column, max-w-3xl

### D. Component Library

**1. Navigation & Sidebar**
- Fixed left sidebar (280px) with glassmorphic background
- Category tree with collapsible sections using chevron icons
- Category icons: Use Heroicons via CDN (Outline style for inactive, Solid for active)
- Hover states: Subtle background glow (primary gradient at 10% opacity)
- Active category: Primary gradient background with white text

**2. Product Cards**
- Glassmorphic container with border-radius: 20px
- Soft shadow: shadow-xl with colored glow matching gradient
- Hover state: Lift effect (translate-y -2px) + enhanced glow
- Image gallery: Swipeable carousel with dots indicator
- Price display: Large, monospace font with currency symbol
- Stock status: Grey overlay + line-through for out-of-stock
- Quick actions: Floating action buttons (update, delete, view) on hover

**3. Add Item Modal**
- Slide-up or center modal with glassmorphic background
- URL input with instant preview
- Preview card shows: Image gallery, title, price, variants (colors/sizes)
- Confirm button: Primary gradient background
- Cancel: Outline style with subtle border

**4. Activity Feed**
- Timeline-style layout with connector lines
- Price change indicators: Green arrow down, red arrow up with percentage
- Timestamp: Relative time (e.g., "2 hours ago")
- Item thumbnail + title + price change in single row
- Expandable details on click

**5. Price History Chart**
- Glassmorphic container
- Line chart with gradient fill beneath
- X-axis: Time (3 months / all time toggle)
- Y-axis: Price
- Markers: Lowest (green), highest (red), current (primary)

**6. Buttons & CTAs**
- Primary: Full gradient background, white text, shadow-lg
- Secondary: Outline with gradient border, gradient text
- Icon buttons: Circular, glassmorphic with icon centered
- Update buttons: Positioned top-right of sections, gradient background
- Hover: Slight scale (1.05) + enhanced glow

**7. Form Inputs**
- Glassmorphic background with subtle border
- Focus state: Primary gradient border (2px)
- Placeholder: Text-secondary color
- Consistent padding: px-4, py-3
- Border-radius: 12px

**8. Tags & Labels**
- Category tags: Small pills with gradient background
- Price drop badge: Green background, white text, pill shape
- Stock status: Red/grey badges

### E. Glassmorphism Implementation

**Standard Glass Surface**
```
Background: HSL with 40-60% opacity
Backdrop-filter: blur(24px) saturate(180%)
Border: 1px solid white/10% (dark mode) or black/10% (light mode)
Border-radius: 16-24px
Shadow: Layered shadows with subtle color tint from gradient
```

**Floating Elements**
- Elevated cards: Multiple shadow layers for depth
- Primary shadow: 0 8px 32px rgba(0,0,0,0.2)
- Accent shadow: 0 4px 16px gradient-color/20%

### F. Iconography

**Icon Library:** Heroicons (via CDN)
- Navigation icons: 24px
- Button icons: 20px
- Status indicators: 16px
- Use outline style as default, solid for active states

**AI-Generated Category Icons:** Use icon placeholders with descriptive comments for future AI icon generation:
```html
<!-- AI-ICON: Dress icon for Clothing category -->
<!-- AI-ICON: High heel shoe for Shoes category -->
<!-- AI-ICON: Handbag for Accessories category -->
```

### G. Animations (Minimal, Purposeful)

- **Card hover:** 200ms ease-out transform + glow
- **Modal entry:** 300ms slide-up with fade-in
- **Price change:** Subtle pulse animation on new price (once)
- **Category expand/collapse:** 200ms ease transition
- **Loading states:** Gradient shimmer effect
- **NO continuous animations or parallax effects**

---

## Key Screens & Layouts

**1. Main Dashboard**
- Sidebar (left): Category navigation
- Center: Product grid with filters at top
- Right panel (optional): Activity feed preview
- Top bar: Search, "Add Item" button, user menu

**2. Product Detail View**
- Large image gallery (carousel)
- Product info panel: Title, brand, current price, stock status
- Price history chart below
- Similar items section (Google Lens integration placeholder)

**3. Activity Feed Page**
- Full-width timeline view
- Filter options: Price drops only, all changes, restocks
- Date range selector

---

## Images

**Hero Section:** Not applicable - this is a utility app, not a marketing page. Focus on immediate functionality.

**Product Images:**
- Display in card grids (aspect ratio 3:4 for products)
- Gallery carousel with smooth swipe transitions
- Zoom capability on detail view
- Lazy loading for performance

**Empty States:**
- Illustrative graphics for empty wishlist
- Call-to-action to add first item

---

## Responsive Behavior

- **Mobile (<768px):** Sidebar becomes drawer, single-column grid, stacked activity feed
- **Tablet (768-1024px):** 2-column grid, sidebar toggleable
- **Desktop (1024px+):** Full layout with fixed sidebar, 3-4 column grid