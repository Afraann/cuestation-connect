import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Package, RefreshCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  low_stock_threshold: number;
}

const ProductsSettings = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [newProduct, setNewProduct] = useState({ name: "", price: 0, stock: 0 });
  const [loading, setLoading] = useState(false);
  const [restockOpen, setRestockOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [restockAmount, setRestockAmount] = useState("");

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (error) {
      console.error("Error fetching products:", error);
      return;
    }
    setProducts(data || []);
  };

  const handleAddProduct = async () => {
    if (!newProduct.name || newProduct.price <= 0) {
      toast.error("Fill all fields");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("products").insert({
      name: newProduct.name,
      price: newProduct.price,
      stock: newProduct.stock,
      is_available: true,
      is_active: true,
    });

    if (error) {
      toast.error("Failed to add");
    } else {
      toast.success("Added");
      setNewProduct({ name: "", price: 0, stock: 0 });
      fetchProducts();
    }
    setLoading(false);
  };

  const handleDeleteProduct = async (id: string) => {
    const { error } = await supabase
      .from("products")
      .update({ is_active: false })
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete");
    } else {
      toast.success("Deleted");
      fetchProducts();
    }
  };

  const handleRestock = async () => {
    if (!selectedProduct || !restockAmount) return;
    const amount = parseInt(restockAmount);
    if (isNaN(amount)) return;

    const newStock = selectedProduct.stock + amount;
    const { error } = await supabase
      .from("products")
      .update({ stock: newStock })
      .eq("id", selectedProduct.id);

    if (error) {
      toast.error("Failed");
    } else {
      toast.success("Stock updated");
      setRestockOpen(false);
      setRestockAmount("");
      setSelectedProduct(null);
      fetchProducts();
    }
  };

  const openRestockDialog = (product: Product) => {
    setSelectedProduct(product);
    setRestockOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Add New Product Card */}
      <Card className="border-border/50 bg-card">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="font-orbitron text-base">Add Product</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="col-span-2 md:col-span-1 space-y-1">
              <Label className="text-xs text-muted-foreground">Name</Label>
              <Input
                value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                placeholder="Item Name"
                className="bg-muted/50 h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Price (₹)</Label>
              <Input
                type="number"
                value={newProduct.price || ""}
                onChange={(e) => setNewProduct({ ...newProduct, price: parseInt(e.target.value) || 0 })}
                placeholder="0"
                className="bg-muted/50 h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Stock</Label>
              <Input
                type="number"
                value={newProduct.stock || ""}
                onChange={(e) => setNewProduct({ ...newProduct, stock: parseInt(e.target.value) || 0 })}
                placeholder="0"
                className="bg-muted/50 h-8 text-sm"
              />
            </div>
            <div className="flex items-end col-span-2 md:col-span-1">
              <Button onClick={handleAddProduct} disabled={loading} className="w-full h-8 text-xs font-orbitron">
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3 mr-1" />}
                ADD
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Grid */}
      <div>
        <div className="flex items-center justify-between mb-2 px-1">
          <h3 className="text-xs font-medium text-muted-foreground font-orbitron uppercase tracking-wider">
            Inventory ({products.length})
          </h3>
        </div>
        
        {products.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border/50">
            <Package className="h-6 w-6 mx-auto mb-2 opacity-50" />
            <p className="text-xs">No items yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {products.map((product) => {
              const isOutOfStock = product.stock <= 0;
              const isLowStock = !isOutOfStock && product.stock <= (product.low_stock_threshold || 5);

              return (
                <div 
                  key={product.id} 
                  className="flex flex-col justify-between bg-card border border-border/50 rounded-lg p-2.5 hover:border-primary/30 transition-all shadow-sm relative group"
                >
                  {/* Stock Badge */}
                  <div className="flex justify-between items-start mb-2">
                    <div className={`px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold uppercase tracking-wide border ${
                      isOutOfStock 
                        ? "bg-destructive/10 text-destructive border-destructive/20" 
                        : isLowStock 
                          ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" 
                          : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                    }`}>
                      {isOutOfStock ? "Out of Stock" : `${product.stock} Left`}
                    </div>
                    
                    <button 
                      onClick={() => handleDeleteProduct(product.id)}
                      className="text-muted-foreground/40 hover:text-destructive transition-colors p-1"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="mb-3 px-0.5">
                    <h4 className="font-medium text-xs truncate leading-tight mb-0.5" title={product.name}>
                      {product.name}
                    </h4>
                    <p className="text-[10px] text-muted-foreground font-orbitron">
                      ₹{product.price}
                    </p>
                  </div>

                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full h-6 text-[10px] gap-1 bg-transparent border-border/60 hover:bg-accent hover:text-accent-foreground"
                    onClick={() => openRestockDialog(product)}
                  >
                    <RefreshCcw className="h-2.5 w-2.5" /> Restock
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Restock Dialog */}
      <Dialog open={restockOpen} onOpenChange={setRestockOpen}>
        <DialogContent className="sm:max-w-[320px] w-[90%] rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-orbitron">Update Stock</DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-3 py-1">
              <div className="flex justify-between items-center text-xs border-b border-border/50 pb-2">
                <span className="font-medium truncate max-w-[150px]">{selectedProduct.name}</span>
                <span className={`font-mono ${selectedProduct.stock === 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  Current: {selectedProduct.stock}
                </span>
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground uppercase">Quantity (+/-)</Label>
                <Input
                  type="number"
                  value={restockAmount}
                  onChange={(e) => setRestockAmount(e.target.value)}
                  placeholder="e.g. 10"
                  autoFocus
                  className="h-8 text-sm"
                />
              </div>
              <Button onClick={handleRestock} className="w-full h-8 text-xs mt-2">
                Save Update
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductsSettings;