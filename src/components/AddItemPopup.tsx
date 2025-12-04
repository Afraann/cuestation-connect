import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PackageX, ShoppingBag } from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: number;
  is_available: boolean;
  stock: number; // Ensure stock is part of the interface
}

interface AddItemPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  onItemAdded: () => void;
}

const AddItemPopup = ({
  open,
  onOpenChange,
  sessionId,
  onItemAdded,
}: AddItemPopupProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchProducts();
    }
  }, [open]);

  const fetchProducts = async () => {
    // We select stock here to display it
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("is_available", true)
      .eq("is_active", true)
      .order("name");

    if (error) {
      console.error("Error fetching products:", error);
      return;
    }

    setProducts(data || []);
  };

  const handleAddItem = async (product: Product) => {
    setLoading(true);

    try {
      // CHANGED: Replaced .insert() with .rpc() to handle stock deduction
      const { error } = await supabase.rpc("add_session_item", {
        p_session_id: sessionId,
        p_product_id: product.id,
        p_quantity: 1,
        p_price: product.price
      });

      if (error) throw error;

      toast.success(`${product.name} added`);
      onItemAdded();
      
      // Refresh local list to show updated stock count immediately
      fetchProducts();
    } catch (error: any) {
      console.error("Error adding item:", error);
      if (error.message?.includes("Insufficient stock")) {
        toast.error(`Out of stock: ${product.name}`);
      } else {
        toast.error("Failed to add item");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-orbitron">Add Item</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            {products.map((product) => {
              const isOutOfStock = product.stock <= 0;
              
              return (
                <Button
                  key={product.id}
                  onClick={() => handleAddItem(product)}
                  disabled={loading || isOutOfStock}
                  variant={isOutOfStock ? "ghost" : "outline"}
                  className={`h-24 flex flex-col items-center justify-center relative overflow-hidden ${
                    isOutOfStock ? "opacity-50" : "hover:border-primary/50"
                  }`}
                >
                  {/* Stock Badge */}
                  <div className={`absolute top-2 right-2 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    isOutOfStock 
                      ? "bg-destructive/10 text-destructive" 
                      : product.stock <= 5 
                        ? "bg-yellow-500/10 text-yellow-500" 
                        : "bg-muted text-muted-foreground"
                  }`}>
                    {isOutOfStock ? "Empty" : `${product.stock}`}
                  </div>

                  <span className="font-medium text-base mb-1 text-center leading-tight px-1">
                    {product.name}
                  </span>
                  <span className="text-sm text-muted-foreground font-orbitron">
                    ₹{product.price}
                  </span>
                  
                  {isOutOfStock && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-[1px]">
                      <PackageX className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                  )}
                </Button>
              );
            })}
            
            {products.length === 0 && (
              <div className="col-span-2 py-8 text-center text-muted-foreground flex flex-col items-center gap-2">
                <ShoppingBag className="h-10 w-10 opacity-20" />
                <p>No products available</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddItemPopup;