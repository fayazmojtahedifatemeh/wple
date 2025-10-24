import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
// Removed the postcssConfig import

// Determine the root directory relative to this config file
const rootDir = process.cwd(); // Use process.cwd() for reliability in Vite config

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          // Using await import inside the array
          import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          import("@replit/vite-plugin-dev-banner").then((m) => m.devBanner()),
        ]
      : []),
  ],
  resolve: {
    alias: {
      // Adjusted paths to be relative to rootDir
      "@": path.resolve(rootDir, "client", "src"),
      "@shared": path.resolve(rootDir, "shared"),
      "@assets": path.resolve(rootDir, "attached_assets"),
    },
  },
  // Set Vite's root to the client directory
  root: path.resolve(rootDir, "client"),
  build: {
    // Output directory relative to the project root
    outDir: path.resolve(rootDir, "dist/public"),
    emptyOutDir: true,
  },
  // FIX: Removed the explicit css.postcss block
  // Vite should automatically detect postcss.config.cjs in the project root
  // css: {
  //   postcss: postcssConfig,
  // },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
      // Allow access to the project root
      allow: [".."],
    },
    // Keep the API proxy
    proxy: {
      "/api": {
        target: "http://localhost:5000", // Your backend server address
        changeOrigin: true,
        // secure: false,
      },
    },
  },
});
