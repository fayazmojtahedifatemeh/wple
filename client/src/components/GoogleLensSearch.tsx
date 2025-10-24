import React, { useState } from 'react';
import { Search, Camera, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface GoogleLensResult {
  title: string;
  price?: string;
  image: string;
  url: string;
  source: string;
}

interface GoogleLensSearchProps {
  onItemSelect?: (item: GoogleLensResult) => void;
  className?: string;
}

export function GoogleLensSearch({ onItemSelect, className }: GoogleLensSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [results, setResults] = useState<GoogleLensResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      // Auto-search when image is uploaded
      handleImageSearch(file);
    }
  };

  const handleTextSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      // Simulate Google Lens search with text query
      const mockResults = await simulateGoogleLensSearch(searchQuery);
      setResults(mockResults);
    } catch (error) {
      toast({
        title: "Search Failed",
        description: "Could not perform Google Lens search",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleImageSearch = async (file: File) => {
    setIsSearching(true);
    try {
      // Simulate Google Lens search with image
      const mockResults = await simulateGoogleLensImageSearch(file);
      setResults(mockResults);
    } catch (error) {
      toast({
        title: "Image Search Failed",
        description: "Could not analyze the uploaded image",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const simulateGoogleLensSearch = async (query: string): Promise<GoogleLensResult[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    return [
      {
        title: `${query} - Premium Quality`,
        price: "$29.99",
        image: "https://via.placeholder.com/200x200?text=Product+1",
        url: "https://example.com/product1",
        source: "Amazon"
      },
      {
        title: `${query} - Designer Edition`,
        price: "$89.99",
        image: "https://via.placeholder.com/200x200?text=Product+2",
        url: "https://example.com/product2",
        source: "Etsy"
      },
      {
        title: `${query} - Budget Option`,
        price: "$15.99",
        image: "https://via.placeholder.com/200x200?text=Product+3",
        url: "https://example.com/product3",
        source: "eBay"
      }
    ];
  };

  const simulateGoogleLensImageSearch = async (file: File): Promise<GoogleLensResult[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return [
      {
        title: "Similar Item Found",
        price: "$45.99",
        image: "https://via.placeholder.com/200x200?text=Similar+1",
        url: "https://example.com/similar1",
        source: "Target"
      },
      {
        title: "Exact Match",
        price: "$67.50",
        image: "https://via.placeholder.com/200x200?text=Match+1",
        url: "https://example.com/match1",
        source: "Walmart"
      }
    ];
  };

  const handleItemSelect = (item: GoogleLensResult) => {
    if (onItemSelect) {
      onItemSelect(item);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="lens-search">Search by Text</Label>
          <div className="flex gap-2">
            <Input
              id="lens-search"
              placeholder="Describe what you're looking for..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTextSearch()}
              className="rounded-xl"
            />
            <Button
              onClick={handleTextSearch}
              disabled={!searchQuery.trim() || isSearching}
              className="rounded-xl gradient-bg-animated glow-interactive"
            >
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="lens-image">Search by Image</Label>
          <div className="flex gap-2">
            <Input
              id="lens-image"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="rounded-xl"
            />
            <Button
              variant="outline"
              className="rounded-xl glass-weak"
              disabled={!imageFile || isSearching}
            >
              <Camera className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {results.length > 0 && (
        <div className="space-y-3 animate-fade-in">
          <h3 className="font-semibold text-lg">Search Results</h3>
          <div className="grid gap-3">
            {results.map((item, index) => (
              <Card
                key={index}
                className="p-4 glass floating hover-elevate transition-all duration-200 animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex gap-4">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm line-clamp-2 mb-1">
                      {item.title}
                    </h4>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">
                        {item.source}
                      </Badge>
                      {item.price && (
                        <span className="text-sm font-mono font-bold text-primary">
                          {item.price}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(item.url, '_blank')}
                        className="rounded-lg text-xs"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleItemSelect(item)}
                        className="rounded-lg gradient-bg text-xs"
                      >
                        Add to Wishlist
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
