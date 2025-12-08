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
import { ShoppingBag, Plus, Minus, ShoppingCart, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  price: number;
  is_available: boolean;
  stock: number;
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
  const [cart, setCart] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      fetchProducts();
      setCart({});
    }
  }, [open]);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("is_available", true)
      .eq("is_active", true)
      .order("name");

    if (error) {
      console.error("Error fetching products:", error);
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  const updateQuantity = (product: Product, delta: number) => {
    setCart((prev) => {
      const currentQty = prev[product.id] || 0;
      const newQty = currentQty + delta;

      if (newQty < 0) return prev;
      if (newQty > product.stock) {
        toast.error(`Only ${product.stock} available`);
        return prev;
      }

      if (newQty === 0) {
        const { [product.id]: _, ...rest } = prev;
        return rest;
      }

      return { ...prev, [product.id]: newQty };
    });
  };

  const handleCheckout = async () => {
    setSubmitting(true);
    const cartItems = Object.entries(cart);

    if (cartItems.length === 0) return;

    try {
      const promises = cartItems.map(([productId, quantity]) => {
        const product = products.find((p) => p.id === productId);
        if (!product) return Promise.resolve();

        return supabase.rpc("add_session_item", {
          p_session_id: sessionId,
          p_product_id: productId,
          p_quantity: quantity,
          p_price: product.price,
        });
      });

      await Promise.all(promises);
      toast.success("Items added to session");
      onItemAdded();
      onOpenChange(false);
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Failed to process items");
    } finally {
      setSubmitting(false);
    }
  };

  const calculateTotal = () => {
    let count = 0;
    let price = 0;
    Object.entries(cart).forEach(([id, qty]) => {
      const product = products.find((p) => p.id === id);
      if (product) {
        count += qty;
        price += qty * product.price;
      }
    });
    return { count, price };
  };

  const { count: totalItems, price: totalPrice } = calculateTotal();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Hidden default close button */}
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col p-0 gap-0 bg-[#0f1115] border border-white/10 shadow-2xl [&>button]:hidden">
        
        {/* Header */}
        <DialogHeader className="p-4 border-b border-white/5 bg-white/5 flex flex-row items-center justify-between space-y-0">
          <DialogTitle className="font-orbitron text-lg flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            <span>Select Items</span>
          </DialogTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 text-muted-foreground hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-4 bg-background/20">
          {products.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground/50">
              <ShoppingBag className="h-10 w-10 mb-2 opacity-20" />
              <p className="text-xs">No products available</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {products.map((product) => {
                const qtyInCart = cart[product.id] || 0;
                const isOutOfStock = product.stock <= 0;
                
                return (
                  <div
                    key={product.id}
                    className={cn(
                      "relative flex flex-col bg-card/40 border border-white/5 rounded-xl overflow-hidden transition-all duration-200 group",
                      qtyInCart > 0 ? "ring-1 ring-primary/50 border-primary/20 bg-primary/5" : "hover:border-white/20",
                      isOutOfStock && "opacity-50 grayscale pointer-events-none"
                    )}
                  >
                    {/* Stock Pill */}
                    <div className="absolute top-2 right-2 z-10">
                      {isOutOfStock ? (
                        <Badge variant="destructive" className="text-[9px] h-4 px-1.5 font-bold uppercase">Out</Badge>
                      ) : (
                        <span className={cn(
                          "text-[9px] font-bold px-1.5 py-0.5 rounded border backdrop-blur-md",
                          product.stock <= 5 
                            ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" 
                            : "bg-black/40 text-muted-foreground border-white/10"
                        )}>
                          {product.stock} left
                        </span>
                      )}
                    </div>

                    <button
                      className="flex-1 flex flex-col items-start justify-end p-3 pt-8 min-h-[90px] w-full text-left outline-none"
                      onClick={() => !isOutOfStock && updateQuantity(product, 1)}
                      disabled={isOutOfStock}
                    >
                      <span className="font-bold text-sm leading-tight mb-1 text-gray-200 group-hover:text-white transition-colors">
                        {product.name}
                      </span>
                      <span className="text-xs font-mono text-primary">
                        ₹{product.price}
                      </span>
                    </button>

                    {/* Quantity Controls */}
                    {qtyInCart > 0 && (
                      <div className="flex items-center justify-between p-1 bg-black/40 border-t border-white/5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-red-400"
                          onClick={() => updateQuantity(product, -1)}
                        >
                          {qtyInCart === 1 ? <Trash2 className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                        </Button>
                        <span className="text-sm font-bold font-orbitron w-6 text-center text-white">
                          {qtyInCart}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-white"
                          onClick={() => updateQuantity(product, 1)}
                          disabled={product.stock - qtyInCart <= 0}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-[#0f1115]">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Total</span>
              <span className="text-2xl font-bold font-orbitron text-white">₹{totalPrice}</span>
            </div>
            <Button 
              className="flex-1 h-12 font-orbitron text-sm bg-gradient-to-r from-primary to-blue-600 hover:scale-[1.02] transition-transform shadow-lg shadow-primary/20 text-white border-0"
              onClick={handleCheckout}
              disabled={submitting || totalItems === 0}
            >
              {submitting ? "Adding..." : "Add to Order"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddItemPopup;