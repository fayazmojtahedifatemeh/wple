import { GoogleGenAI } from "@google/genai";

// Blueprint: javascript_gemini
// Using Gemini 2.5 Flash for AI-powered categorization
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

interface CategoryResult {
  category: string;
  subcategory: string | null;
}

const PREDEFINED_CATEGORIES = {
  clothing: ["Dresses", "Tops", "Shirts & Blouses", "Sweaters & Cardigans", "Coats", "Blazers", "Skirts", "Pants", "Gym"],
  shoes: [],
  accessories: ["Bags", "Jewelry", "Accessories"],
  beauty: ["Makeup", "Nails", "Perfumes"],
  "home-tech": ["House Things", "Electronics"],
  food: [],
  extra: [],
};

export async function categorizeProduct(
  title: string,
  brand?: string,
  url?: string
): Promise<CategoryResult> {
  try {
    const systemPrompt = `You are a product categorization expert. Analyze the product and categorize it into the most appropriate category and subcategory.

Available categories and their subcategories:
- clothing: Dresses, Tops, Shirts & Blouses, Sweaters & Cardigans, Coats, Blazers, Skirts, Pants, Gym
- shoes: (no subcategories)
- accessories: Bags, Jewelry, Accessories
- beauty: Makeup, Nails, Perfumes
- home-tech: House Things, Electronics
- food: (no subcategories)
- extra: (no subcategories - use this for items that don't fit other categories)

Respond with JSON in this exact format:
{
  "category": "category-name",
  "subcategory": "subcategory-name or null"
}

Category names must be lowercase with hyphens (clothing, shoes, accessories, beauty, home-tech, food, extra).
Subcategory must exactly match one of the listed options for that category, or be null if the category has no subcategories.`;

    const productInfo = `Product Title: ${title}${brand ? `\nBrand: ${brand}` : ''}${url ? `\nURL: ${url}` : ''}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            category: { type: "string" },
            subcategory: { type: ["string", "null"] },
          },
          required: ["category", "subcategory"],
        },
      },
      contents: productInfo,
    });

    const rawJson = response.text;
    if (rawJson) {
      const data: CategoryResult = JSON.parse(rawJson);
      
      const validCategories = Object.keys(PREDEFINED_CATEGORIES);
      if (!validCategories.includes(data.category)) {
        data.category = "extra";
        data.subcategory = null;
      }
      
      return data;
    } else {
      throw new Error("Empty response from model");
    }
  } catch (error) {
    console.error("Failed to categorize product:", error);
    return {
      category: "extra",
      subcategory: null,
    };
  }
}
