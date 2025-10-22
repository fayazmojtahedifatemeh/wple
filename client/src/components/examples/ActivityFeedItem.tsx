import { ActivityFeedItem } from "../ActivityFeedItem";
import dressImage from "@assets/generated_images/Purple_dress_product_photo_23fef3a8.png";

export default function ActivityFeedItemExample() {
  return (
    <div className="p-8 max-w-2xl space-y-4">
      <ActivityFeedItem
        id="1"
        type="price_drop"
        productTitle="Elegant Purple Gradient Dress"
        productImage={dressImage}
        oldPrice={152.99}
        newPrice={129.99}
        priceChange={-15}
        timestamp="2 hours ago"
      />
      <ActivityFeedItem
        id="2"
        type="restock"
        productTitle="Signature Perfume"
        productImage={dressImage}
        timestamp="1 day ago"
      />
    </div>
  );
}
