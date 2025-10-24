import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

interface CSVImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: () => void;
}

interface CSVRow {
  title: string;
  price: string;
  currency?: string;
  url: string;
  brand?: string;
  category?: string;
  subcategory?: string;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

export function CSVImportModal({ open, onOpenChange, onImportComplete }: CSVImportModalProps) {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [preferredCurrency, setPreferredCurrency] = useState('$');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const currencies = [
    { code: '$', name: 'USD ($)', symbol: '$' },
    { code: '€', name: 'EUR (€)', symbol: '€' },
    { code: '£', name: 'GBP (£)', symbol: '£' },
    { code: '¥', name: 'JPY (¥)', symbol: '¥' },
    { code: '₹', name: 'INR (₹)', symbol: '₹' },
    { code: 'C$', name: 'CAD (C$)', symbol: 'C$' },
    { code: 'A$', name: 'AUD (A$)', symbol: 'A$' },
  ];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setCsvFile(file);
      parseCSV(file);
    } else {
      toast({
        title: "Invalid File",
        description: "Please select a CSV file",
        variant: "destructive",
      });
    }
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast({
          title: "Invalid CSV",
          description: "CSV must have at least a header and one data row",
          variant: "destructive",
        });
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const requiredHeaders = ['title', 'price', 'url'];
      
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        toast({
          title: "Missing Headers",
          description: `CSV must include: ${missingHeaders.join(', ')}`,
          variant: "destructive",
        });
        return;
      }

      const data: CSVRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length >= 3) {
          data.push({
            title: values[headers.indexOf('title')] || '',
            price: values[headers.indexOf('price')] || '0',
            currency: values[headers.indexOf('currency')] || preferredCurrency,
            url: values[headers.indexOf('url')] || '',
            brand: values[headers.indexOf('brand')] || '',
            category: values[headers.indexOf('category')] || '',
            subcategory: values[headers.indexOf('subcategory')] || '',
          });
        }
      }

      setCsvData(data);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (csvData.length === 0) return;

    setIsProcessing(true);
    const result: ImportResult = { success: 0, failed: 0, errors: [] };

    for (const row of csvData) {
      try {
        const response = await fetch('/api/wishlist', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: row.title,
            price: parseFloat(row.price),
            currency: row.currency || preferredCurrency,
            url: row.url,
            brand: row.brand,
            category: row.category || 'extra',
            subcategory: row.subcategory,
            images: [],
            inStock: true,
            colors: [],
            sizes: [],
          }),
        });

        if (response.ok) {
          result.success++;
        } else {
          result.failed++;
          result.errors.push(`Failed to import "${row.title}": ${response.statusText}`);
        }
      } catch (error) {
        result.failed++;
        result.errors.push(`Failed to import "${row.title}": ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    setImportResult(result);
    setIsProcessing(false);

    if (result.success > 0) {
      toast({
        title: "Import Complete",
        description: `Successfully imported ${result.success} items`,
      });
      if (onImportComplete) {
        onImportComplete();
      }
    }
  };

  const downloadTemplate = () => {
    const template = 'title,price,currency,url,brand,category,subcategory\n' +
      'Sample Product,29.99,$,https://example.com/product1,Sample Brand,clothing,Dresses\n' +
      'Another Product,49.99,€,https://example.com/product2,Another Brand,accessories,Bags';
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wishlist_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const resetModal = () => {
    setCsvFile(null);
    setCsvData([]);
    setImportResult(null);
    setIsProcessing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetModal();
    onOpenChange(false);
  };

  return (
    <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 ${open ? 'animate-fade-in' : 'hidden'}`}>
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden glass-strong animate-scale-in">
        <div className="p-6 border-b border-border/50">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-display gradient-text">Import from CSV</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="rounded-xl"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto scrollbar-refined max-h-[60vh]">
          {/* Currency Preference */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Preferred Currency</label>
            <div className="grid grid-cols-4 gap-2">
              {currencies.map((currency) => (
                <Button
                  key={currency.code}
                  variant={preferredCurrency === currency.code ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPreferredCurrency(currency.code)}
                  className="rounded-lg"
                >
                  {currency.symbol} {currency.name}
                </Button>
              ))}
            </div>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <label className="text-sm font-medium">CSV File</label>
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl flex-1"
              >
                <Upload className="h-4 w-4 mr-2" />
                Choose CSV File
              </Button>
              <Button
                variant="outline"
                onClick={downloadTemplate}
                className="rounded-xl"
              >
                <Download className="h-4 w-4 mr-2" />
                Template
              </Button>
            </div>
            {csvFile && (
              <div className="flex items-center gap-2 p-3 rounded-xl glass-weak">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-sm">{csvFile.name}</span>
                <Badge variant="outline">{csvData.length} items</Badge>
              </div>
            )}
          </div>

          {/* Preview Data */}
          {csvData.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Preview ({csvData.length} items)</label>
              <div className="max-h-40 overflow-y-auto space-y-2 scrollbar-refined">
                {csvData.slice(0, 5).map((row, index) => (
                  <div key={index} className="p-3 rounded-lg glass-weak text-sm">
                    <div className="font-medium">{row.title}</div>
                    <div className="text-muted-foreground">
                      {row.currency || preferredCurrency}{row.price} • {row.brand || 'No brand'}
                    </div>
                  </div>
                ))}
                {csvData.length > 5 && (
                  <div className="text-center text-muted-foreground text-sm">
                    ... and {csvData.length - 5} more items
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Import Results */}
          {importResult && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Import Results</label>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">Success</span>
                  </div>
                  <div className="text-2xl font-bold text-green-500">{importResult.success}</div>
                </div>
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium">Failed</span>
                  </div>
                  <div className="text-2xl font-bold text-red-500">{importResult.failed}</div>
                </div>
              </div>
              {importResult.errors.length > 0 && (
                <div className="max-h-32 overflow-y-auto space-y-1 scrollbar-refined">
                  {importResult.errors.map((error, index) => (
                    <div key={index} className="text-xs text-red-500 p-2 rounded bg-red-500/10">
                      {error}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-border/50">
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={handleClose}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={csvData.length === 0 || isProcessing}
              className="rounded-xl gradient-bg-animated glow-interactive"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import {csvData.length} Items
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
