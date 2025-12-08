import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Minus, ShoppingCart, Trash2, X, RefreshCcw } from "lucide-react";
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
  
  // Payment States
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "UPI" | "SPLIT" | null>(null);
  const [cashAmount, setCashAmount] = useState<string>("");

  useEffect(() => {
    if (open) {
      fetchProducts();
      setCart({});
      setPaymentMethod(null);
      setCashAmount("");
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
    const { price: totalPrice } = calculateTotal();
    
    const cashVal = parseFloat(cashAmount) || 0;
    const finalCash = paymentMethod === "CASH" ? totalPrice : (paymentMethod === "SPLIT" ? cashVal : 0);
    const finalUpi = paymentMethod === "UPI" ? totalPrice : (paymentMethod === "SPLIT" ? totalPrice - cashVal : 0);

    const cartItems = Object.entries(cart);

    try {
      // 1. Deduct Stock
      const promises = cartItems.map(([productId, quantity]) => {
        const product = products.find((p) => p.id === productId);
        if (!product) return Promise.resolve();

        return supabase.rpc("add_session_item", {
          p_session_id: null, 
          p_product_id: productId,
          p_quantity: quantity,
          p_price: product.price,
        });
      });

      await Promise.all(promises);

      // 2. Record Sale
      const { error: saleError } = await supabase.from("direct_sales").insert({
        payment_method: paymentMethod,
        total_amount: totalPrice,
        amount_cash: finalCash,
        amount_upi: finalUpi,
        items: cart 
      });

      if (saleError) throw saleError;

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
  const cartEntries = Object.entries(cart);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-[#0f1115] border border-white/10 p-0 gap-0 shadow-2xl [&>button]:hidden flex flex-col md:flex-row h-[90vh] md:h-[600px]">
        
        {/* --- LEFT PANEL: PRODUCT SELECTION --- */}
        <div className="flex-1 flex flex-col border-r border-white/5 overflow-hidden">
          <DialogHeader className="p-4 border-b border-white/5 bg-white/5 flex flex-row items-center justify-between space-y-0">
            <DialogTitle className="font-orbitron text-lg flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              <span>Counter Sale</span>
            </DialogTitle>
            
            {/* Mobile Close Button */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => onOpenChange(false)}
              className="md:hidden h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 bg-background/20">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
                    <div className="absolute top-2 right-2 z-10">
                      {isOutOfStock ? (
                        <Badge variant="destructive" className="text-[9px] h-4 px-1.5 font-bold uppercase">Out</Badge>
                      ) : (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-white/10 bg-black/40 text-muted-foreground backdrop-blur-md">
                          {product.stock}
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

                    {qtyInCart > 0 && (
                      <div className="flex items-center justify-between p-1 bg-black/40 border-t border-white/5">
                        <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-red-400" onClick={() => updateQuantity(product, -1)}>
                          {qtyInCart === 1 ? <Trash2 className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                        </Button>
                        <span className="text-sm font-bold font-orbitron w-6 text-center text-white">{qtyInCart}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-white" onClick={() => updateQuantity(product, 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* --- RIGHT PANEL: CART & PAYMENT --- */}
        <div className="w-full md:w-[320px] bg-[#0f1115] flex flex-col h-[40vh] md:h-full border-t md:border-t-0 md:border-l border-white/10">
          
          <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
             <span className="text-xs font-bold font-orbitron uppercase tracking-wider text-muted-foreground">Current Order</span>
             <Button variant="ghost" size="sm" className="h-6 text-[10px] text-muted-foreground hover:text-white" onClick={() => setCart({})}>
               <RefreshCcw className="h-3 w-3 mr-1" /> Reset
             </Button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {cartEntries.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground/30">
                <ShoppingCart className="h-8 w-8 mb-2" />
                <p className="text-xs">Cart is empty</p>
              </div>
            ) : (
              cartEntries.map(([id, qty]) => {
                const product = products.find(p => p.id === id);
                if (!product) return null;
                return (
                  <div key={id} className="flex justify-between items-center p-2 rounded-lg bg-white/5 border border-white/5">
                    <div>
                      <p className="text-xs font-medium text-gray-200">{product.name}</p>
                      <p className="text-[10px] text-muted-foreground">x{qty} @ ₹{product.price}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono font-bold text-white">₹{qty * product.price}</p>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Payment Section */}
          <div className="p-4 bg-black/20 border-t border-white/10 space-y-4">
             <div className="flex justify-between items-end">
               <span className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Total Payable</span>
               <span className="text-3xl font-orbitron font-bold text-primary">₹{totalPrice}</span>
             </div>

             <div className="space-y-2">
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Payment Mode</Label>
                <div className="grid grid-cols-3 gap-2">
                    {["CASH", "UPI", "SPLIT"].map((method) => (
                      <Button
                        key={method}
                        variant="outline"
                        className={cn(
                          "h-10 text-[10px] font-bold tracking-wider uppercase transition-all duration-300",
                          paymentMethod === method 
                            ? "bg-primary/20 border-primary text-primary shadow-[0_0_15px_-3px_hsl(var(--primary)/0.3)]" 
                            : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10 hover:text-white"
                        )}
                        onClick={() => setPaymentMethod(method as any)}
                        disabled={totalItems === 0}
                      >
                        {method}
                      </Button>
                    ))}
                </div>

                {paymentMethod === "SPLIT" && (
                  <div className="animate-in slide-in-from-top-2 pt-1">
                    <div className="flex gap-2 items-center bg-black/40 p-2 rounded-lg border border-white/10">
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">Cash:</span>
                      <Input
                        type="number"
                        value={cashAmount}
                        onChange={(e) => setCashAmount(e.target.value)}
                        placeholder="0"
                        className="h-7 w-20 text-sm bg-transparent border-0 border-b border-white/20 rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary text-center font-mono"
                      />
                      <div className="flex-1 text-right">
                        <span className="text-[10px] text-muted-foreground mr-2">UPI:</span>
                        <span className="font-bold text-primary font-mono text-sm">₹{Math.max(0, totalPrice - (parseFloat(cashAmount) || 0))}</span>
                      </div>
                    </div>
                  </div>
                )}
             </div>

             <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 h-12 text-xs border-white/10 bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white hidden md:inline-flex">
                  Cancel
                </Button>
                <Button 
                  onClick={handleCheckout}
                  disabled={submitting || totalItems === 0 || !paymentMethod}
                  className="flex-[2] h-12 text-sm font-orbitron font-bold tracking-wide bg-gradient-to-r from-primary to-blue-600 hover:scale-[1.02] transition-transform shadow-lg text-white border-0"
                >
                  {submitting ? "Processing..." : "Complete Sale"}
                </Button>
             </div>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
};

export default DirectSaleModal;