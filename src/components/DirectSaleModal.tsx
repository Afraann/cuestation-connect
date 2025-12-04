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
import { PackageX, ShoppingBag, Plus, Minus, Wallet, Smartphone, ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  price: number;
  is_available: boolean;
  stock: number;
}

interface DirectSaleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaleComplete?: () => void;
}

const DirectSaleModal = ({
  open,
  onOpenChange,
  onSaleComplete,
}: DirectSaleModalProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "UPI" | null>(null);
  const [step, setStep] = useState<"SELECT" | "PAY">("SELECT");

  useEffect(() => {
    if (open) {
      fetchProducts();
      setCart({});
      setStep("SELECT");
      setPaymentMethod(null);
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
    if (!paymentMethod) {
      toast.error("Select payment method");
      return;
    }

    setSubmitting(true);
    const cartItems = Object.entries(cart);

    try {
      // 1. Create a "Direct Sale" session record (Optional, depending on how strict your FK is)
      // For now, we are inserting into session_items with NULL session_id as per SQL update
      
      const promises = cartItems.map(([productId, quantity]) => {
        const product = products.find((p) => p.id === productId);
        if (!product) return Promise.resolve();

        // Note: We use the same function, passing NULL as session_id
        return supabase.rpc("add_session_item", {
          p_session_id: null, 
          p_product_id: productId,
          p_quantity: quantity,
          p_price: product.price,
        });
      });

      await Promise.all(promises);

      // Ideally, we should also record this payment somewhere.
      // Since session_items doesn't store "payment_method", we might rely on the fact 
      // that we are just deducting stock for now. 
      // *Future Improvement:* Create a `direct_sales` table to track the cash/upi split.
      
      toast.success("Sale completed");
      if (onSaleComplete) onSaleComplete();
      onOpenChange(false);
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Failed to process sale");
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
            <span>
                {step === "SELECT" ? "Counter Sale" : "Payment"}
            </span>
            {totalItems > 0 && (
              <Badge variant="secondary" className="font-mono">
                ₹{totalPrice}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {step === "SELECT" ? (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-2 gap-3">
              {products.map((product) => {
                const qtyInCart = cart[product.id] || 0;
                const isOutOfStock = product.stock <= 0;

                return (
                  <div
                    key={product.id}
                    className={`relative flex flex-col bg-card border rounded-xl overflow-hidden transition-all ${
                      qtyInCart > 0 ? "border-primary/50 ring-1 ring-primary/20" : "border-border/50"
                    } ${isOutOfStock ? "opacity-60 grayscale" : ""}`}
                  >
                    <div className="absolute top-2 right-2 z-10">
                      {isOutOfStock ? (
                        <Badge variant="destructive" className="text-[10px] h-5 px-1.5">Out</Badge>
                      ) : (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border bg-muted text-muted-foreground border-border">
                          {product.stock}
                        </span>
                      )}
                    </div>

                    <button
                      className="flex-1 flex flex-col items-center justify-center p-3 pt-6 min-h-[100px]"
                      onClick={() => !isOutOfStock && updateQuantity(product, 1)}
                      disabled={isOutOfStock}
                    >
                      <span className="font-medium text-sm text-center leading-tight mb-1">{product.name}</span>
                      <span className="text-xs text-muted-foreground font-orbitron">₹{product.price}</span>
                    </button>

                    {qtyInCart > 0 && (
                      <div className="flex items-center justify-between p-1 bg-muted/50 border-t border-border/50">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateQuantity(product, -1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-sm font-bold w-6 text-center font-orbitron">{qtyInCart}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateQuantity(product, 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex-1 p-6 flex flex-col justify-center gap-6">
             <div className="text-center">
                <p className="text-muted-foreground text-sm uppercase tracking-wider mb-2">Total Amount</p>
                <p className="text-5xl font-black font-orbitron text-primary">₹{totalPrice}</p>
             </div>

             <div className="grid grid-cols-2 gap-4">
                <Button 
                    variant={paymentMethod === "CASH" ? "default" : "outline"}
                    className={cn("h-24 flex flex-col gap-2", paymentMethod === "CASH" && "ring-2 ring-primary ring-offset-2")}
                    onClick={() => setPaymentMethod("CASH")}
                >
                    <Wallet className="h-8 w-8" />
                    <span className="font-orbitron text-lg">CASH</span>
                </Button>
                <Button 
                    variant={paymentMethod === "UPI" ? "default" : "outline"}
                    className={cn("h-24 flex flex-col gap-2", paymentMethod === "UPI" && "ring-2 ring-primary ring-offset-2")}
                    onClick={() => setPaymentMethod("UPI")}
                >
                    <Smartphone className="h-8 w-8" />
                    <span className="font-orbitron text-lg">UPI</span>
                </Button>
             </div>
          </div>
        )}

        <div className="p-4 border-t bg-card/95 backdrop-blur">
          {step === "SELECT" ? (
            <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Total</span>
                <span className="text-xl font-bold font-orbitron text-primary">₹{totalPrice}</span>
                </div>
                <Button 
                className="flex-1 h-12 font-orbitron text-base"
                onClick={() => setStep("PAY")}
                disabled={totalItems === 0}
                >
                Checkout <ShoppingCart className="ml-2 h-4 w-4" />
                </Button>
            </div>
          ) : (
            <div className="flex gap-3">
                <Button variant="outline" className="h-12 flex-1" onClick={() => setStep("SELECT")}>
                    Back
                </Button>
                <Button 
                    className="flex-[2] h-12 font-orbitron text-base"
                    onClick={handleCheckout}
                    disabled={submitting || !paymentMethod}
                >
                    {submitting ? "Processing..." : "Confirm Sale"}
                </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DirectSaleModal;