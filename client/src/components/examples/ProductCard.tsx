import { ProductCard } from "../ProductCard";
import dressImage from "@assets/generated_images/Purple_dress_product_photo_23fef3a8.png";

export default function ProductCardExample() {
  return (
    <div className="p-8 max-w-sm">
      <ProductCard
        id="1"
        title="Elegant Purple Gradient Dress - Summer Collection"
        price={129.99}
        currency="$"
        image={dressImage}
        url="https://example.com"
        inStock={true}
        priceChange={-15}
        brand="Fashion Co."
      />
    </div>
  );
}
