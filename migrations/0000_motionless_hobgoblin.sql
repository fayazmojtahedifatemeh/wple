CREATE TABLE "custom_categories" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"icon" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "custom_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "wishlist_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"brand" text,
	"price" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT '$' NOT NULL,
	"url" text NOT NULL,
	"images" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"category" text DEFAULT 'Extra' NOT NULL,
	"subcategory" text,
	"custom_category_id" varchar,
	"in_stock" boolean DEFAULT true NOT NULL,
	"colors" text[] DEFAULT ARRAY[]::text[],
	"sizes" text[] DEFAULT ARRAY[]::text[],
	"selected_color" text,
	"selected_size" text,
	"price_history" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
