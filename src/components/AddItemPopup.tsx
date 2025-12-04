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
import { PackageX, ShoppingBag, Plus, Minus, ShoppingCart, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
      setCart({}); // Reset cart on open
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

      // Validation: Prevent going below 0 or above stock
      if (newQty < 0) return prev;
      if (newQty > product.stock) {
        toast.error(`Only ${product.stock} ${product.name} available`);
        return prev;
      }

      // If quantity is 0, remove key from cart
      if (newQty === 0) {
        const { [product.id]: _, ...rest } = prev;
        return rest;
      }

      return { ...prev, [product.id]: newQty };
    });
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

  const handleCheckout = async () => {
    setSubmitting(true);
    const cartItems = Object.entries(cart);

    if (cartItems.length === 0) return;

    try {
      // Process all items
      // Note: We use Promise.all to send requests in parallel. 
      // Ideally, a batch RPC function would be better for atomicity, but this works for now.
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

      const results = await Promise.all(promises);
      
      // Check for errors in results
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        console.error("Some items failed:", errors);
        toast.error("Some items could not be added. Check stock.");
      } else {
        toast.success("Items added to session");
        onItemAdded();
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Failed to process items");
    } finally {
      setSubmitting(false);
    }
  };

  const { count: totalItems, price: totalPrice } = calculateTotal();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] flex flex-col p-0 gap-0 sm:max-w-md">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="font-orbitron flex justify-between items-center">
            <span>Add Items</span>
            {totalItems > 0 && (
              <Badge variant="secondary" className="font-mono">
                {totalItems} in cart
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-3">
            {products.map((product) => {
              const qtyInCart = cart[product.id] || 0;
              const isOutOfStock = product.stock <= 0;
              const available = product.stock - qtyInCart;

              return (
                <div
                  key={product.id}
                  className={`relative flex flex-col bg-card border rounded-xl overflow-hidden transition-all ${
                    qtyInCart > 0 ? "border-primary/50 ring-1 ring-primary/20" : "border-border/50"
                  } ${isOutOfStock ? "opacity-60 grayscale" : ""}`}
                >
                  {/* Stock Badge */}
                  <div className="absolute top-2 right-2 z-10">
                    {isOutOfStock ? (
                      <Badge variant="destructive" className="text-[10px] h-5 px-1.5">
                        Out
                      </Badge>
                    ) : (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${
                        product.stock <= 5 
                          ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                          : "bg-muted text-muted-foreground border-border"
                      }`}>
                        {product.stock} left
                      </span>
                    )}
                  </div>

                  <button
                    className="flex-1 flex flex-col items-center justify-center p-3 pt-6 min-h-[100px] outline-none"
                    onClick={() => !isOutOfStock && updateQuantity(product, 1)}
                    disabled={isOutOfStock}
                  >
                    <span className="font-medium text-sm text-center leading-tight mb-1">
                      {product.name}
                    </span>
                    <span className="text-xs text-muted-foreground font-orbitron">
                      ₹{product.price}
                    </span>
                  </button>

                  {/* Quantity Controls */}
                  {qtyInCart > 0 && (
                    <div className="flex items-center justify-between p-1 bg-muted/50 border-t border-border/50">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg hover:bg-background hover:text-destructive"
                        onClick={() => updateQuantity(product, -1)}
                      >
                        {qtyInCart === 1 ? <Trash2 className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                      </Button>
                      <span className="text-sm font-bold w-6 text-center font-orbitron">
                        {qtyInCart}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg hover:bg-background hover:text-primary"
                        onClick={() => updateQuantity(product, 1)}
                        disabled={available <= 0}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}

            {!loading && products.length === 0 && (
              <div className="col-span-2 py-10 text-center text-muted-foreground flex flex-col items-center gap-3">
                <ShoppingBag className="h-12 w-12 opacity-10" />
                <p>No products available</p>
              </div>
            )}
          </div>
        </div>

        {/* Checkout Bar */}
        <div className="p-4 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Total</span>
              <span className="text-xl font-bold font-orbitron text-primary">
                ₹{totalPrice}
              </span>
            </div>
            <Button 
              className="flex-1 h-12 font-orbitron text-base shadow-lg shadow-primary/20"
              onClick={handleCheckout}
              disabled={submitting || totalItems === 0}
            >
              {submitting ? (
                "Adding..."
              ) : (
                <>
                  Add to Session <ShoppingCart className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddItemPopup;