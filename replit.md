# Wishlist & Price Tracker Application

## Overview

A full-stack web application for tracking product prices across multiple e-commerce platforms. Users can add items to their wishlist by URL, and the system automatically scrapes product details, categorizes items using AI, monitors price changes, and sends email notifications for price drops. The application features a modern glassmorphic UI with dark/light mode support.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server for fast HMR and optimized production builds
- Wouter for lightweight client-side routing

**UI Component Strategy**
- Shadcn/ui component library using Radix UI primitives for accessible, headless components
- Tailwind CSS for utility-first styling with custom design tokens
- Glassmorphism design system with gradient accents and backdrop blur effects
- Custom fonts: Inter (UI), Plus Jakarta Sans (display), JetBrains Mono (prices)
- Theme system supporting dark/light modes with CSS custom properties
- Responsive sidebar navigation with collapsible category sections

**State Management**
- TanStack Query (React Query) for server state management, data fetching, and caching
- Local component state using React hooks for UI-specific state
- Theme context for dark/light mode persistence

**Data Visualization**
- Recharts library for price history line charts with gradient fills

### Backend Architecture

**Server Framework**
- Express.js server handling API routes and serving the frontend SPA
- TypeScript for type safety across server and shared types
- Middleware for JSON parsing, request logging, and error handling

**Web Scraping Engine**
- Multi-strategy scraping approach adapting to site complexity:
  - Axios + Cheerio for static HTML/JSON sites (H&M, basic retailers)
  - Puppeteer capability mentioned for JavaScript-heavy sites (Zara, J.Crew)
- Site-specific selector configurations for major retailers (Amazon, Zara, H&M)
- Extraction of product metadata: title, price, images, brand, stock status, variants (colors/sizes)
- Price normalization: currency symbol removal, comma stripping, float conversion

**AI-Powered Categorization**
- Google Gemini 2.5 Flash API for intelligent product categorization
- Predefined category taxonomy:
  - Clothing (Dresses, Tops, Shirts & Blouses, Sweaters, Coats, Blazers, Skirts, Pants, Gym)
  - Shoes
  - Accessories (Bags, Jewelry, Accessories)
  - Beauty (Makeup, Nails, Perfumes)
  - Home-tech (House Things, Electronics)
  - Food
  - Extra (catch-all)
- Categorization based on product title, brand, and URL context

**Background Job Processing**
- Node-cron scheduler for periodic price checking (every 12 hours)
- Price comparison logic with percentage change calculation
- Price history tracking with timestamped entries
- Automated email notifications for price drops and restocks

**Email Notification System**
- Nodemailer integration for transactional emails
- Configurable SMTP settings via environment variables
- Price drop alerts with percentage change and old/new price details
- Restock notifications for previously unavailable items
- Graceful degradation when email is not configured

### Data Storage

**Database Technology**
- PostgreSQL via Neon serverless database
- Drizzle ORM for type-safe database queries and schema management
- WebSocket connection pooling for serverless environments

**Schema Design**
- **Users table**: Basic user accounts with username/password
- **Wishlist items table**: Core product data including:
  - Product metadata (title, brand, price, currency, URL)
  - Media (image array)
  - Categorization (category, subcategory, custom category FK)
  - Variants (colors array, sizes array)
  - Stock status (boolean)
  - Price history (JSONB array of timestamped entries)
  - Timestamps (created, updated)
- **Custom categories table**: User-defined category extensions

**Data Patterns**
- JSONB storage for flexible price history without schema migrations
- Array types for multi-value fields (images, colors, sizes)
- Numeric type for precise price calculations (10,2 precision)
- UUID generation for primary keys

### API Architecture

**RESTful Endpoints**
- `POST /api/scrape` - Scrape product from URL
- `GET /api/wishlist` - Fetch all wishlist items
- `GET /api/wishlist/category/:category` - Filter by category/subcategory
- `POST /api/wishlist` - Add item with auto-categorization
- `PATCH /api/wishlist/:id` - Update item details
- `DELETE /api/wishlist/:id` - Remove item
- `POST /api/wishlist/:id/check-price` - Manual price check trigger
- `POST /api/wishlist/check-all-prices` - Trigger bulk price check
- Custom category CRUD endpoints

**Response Patterns**
- JSON responses with consistent error structures
- HTTP status codes for semantic error handling
- Request logging with duration tracking for API routes

## External Dependencies

**Third-Party Services**
- **Neon Database**: Serverless PostgreSQL hosting with WebSocket support
- **Google Gemini API**: AI-powered product categorization (2.5 Flash model)
- **SMTP Email Service**: Configurable email provider for notifications (requires host/credentials)

**Major NPM Packages**
- **UI Framework**: React, Radix UI component primitives, Shadcn/ui
- **Styling**: Tailwind CSS, class-variance-authority, clsx
- **Data Fetching**: TanStack Query, Axios
- **Scraping**: Cheerio for HTML parsing
- **Database**: Drizzle ORM, @neondatabase/serverless, pg
- **Scheduling**: node-cron for background jobs
- **Email**: nodemailer
- **Validation**: Zod schemas for runtime type checking
- **Charts**: Recharts
- **Build Tools**: Vite, esbuild, TypeScript
- **Development**: tsx for TypeScript execution

**Font Dependencies**
- Google Fonts: Inter, Plus Jakarta Sans, JetBrains Mono

**Environment Configuration**
- `DATABASE_URL`: Required PostgreSQL connection string
- `GEMINI_API_KEY`: Required for AI categorization
- `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`: Optional email configuration
- `EMAIL_SECURE`: Optional boolean for TLS
- `NODE_ENV`: Environment mode (development/production)