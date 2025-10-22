import { ProductGallery } from "../ProductGallery";

export default function ProductGalleryExample() {
  const mockImages = [
    "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400",
    "https://images.unsplash.com/photo-1596783074918-c84cb06531ca?w=400",
    "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=400",
  ];

  return (
    <div className="p-8 max-w-md">
      <ProductGallery images={mockImages} />
    </div>
  );
}
