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
import { Plus, Minus, Wallet, Smartphone, ShoppingCart, Split } from "lucide-react";
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
  const [step, setStep] = useState<"SELECT" | "PAY">("SELECT");

  useEffect(() => {
    if (open) {
      fetchProducts();
      setCart({});
      setStep("SELECT");
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
    
    // Calculate Split Amounts
    const cashVal = parseFloat(cashAmount) || 0;
    
    // Determine final split
    const finalCash = paymentMethod === "CASH" ? totalPrice : (paymentMethod === "SPLIT" ? cashVal : 0);
    const finalUpi = paymentMethod === "UPI" ? totalPrice : (paymentMethod === "SPLIT" ? totalPrice - cashVal : 0);

    const cartItems = Object.entries(cart);

    try {
      // 1. Deduct Stock (Session Items with NULL session_id)
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

      const { error: saleError } = await supabase.from("direct_sales").insert({
        payment_method: paymentMethod,
        total_amount: totalPrice,
        amount_cash: finalCash,
        amount_upi: finalUpi,
        items: cart // Optional: store the cart JSON for record
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] flex flex-col p-0 gap-0 sm:max-w-md">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="font-orbitron flex justify-between items-center">
            <span>
                {step === "SELECT" ? "Counter Sale" : "Payment"}
            </span>
            {/* Badge removed here */}
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
          <div className="flex-1 p-6 flex flex-col justify-start gap-6 overflow-y-auto">
             <div className="text-center">
                <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Total Payable</p>
                <p className="text-4xl font-black font-orbitron text-primary">₹{totalPrice}</p>
             </div>

             <div className="space-y-3">
                <Label className="text-xs text-muted-foreground uppercase">Payment Mode</Label>
                <div className="grid grid-cols-3 gap-3">
                    <Button 
                        variant={paymentMethod === "CASH" ? "default" : "outline"}
                        className={cn("h-16 flex flex-col gap-1", paymentMethod === "CASH" && "ring-2 ring-primary ring-offset-2")}
                        onClick={() => setPaymentMethod("CASH")}
                    >
                        <Wallet className="h-5 w-5" />
                        <span className="font-orbitron text-xs">CASH</span>
                    </Button>
                    <Button 
                        variant={paymentMethod === "UPI" ? "default" : "outline"}
                        className={cn("h-16 flex flex-col gap-1", paymentMethod === "UPI" && "ring-2 ring-primary ring-offset-2")}
                        onClick={() => setPaymentMethod("UPI")}
                    >
                        <Smartphone className="h-5 w-5" />
                        <span className="font-orbitron text-xs">UPI</span>
                    </Button>
                    <Button 
                        variant={paymentMethod === "SPLIT" ? "default" : "outline"}
                        className={cn("h-16 flex flex-col gap-1", paymentMethod === "SPLIT" && "ring-2 ring-primary ring-offset-2")}
                        onClick={() => setPaymentMethod("SPLIT")}
                    >
                        <Split className="h-5 w-5" />
                        <span className="font-orbitron text-xs">SPLIT</span>
                    </Button>
                </div>
             </div>

             {/* Split Payment Inputs */}
             {paymentMethod === "SPLIT" && (
                <div className="space-y-3 animate-in slide-in-from-top-2 fade-in duration-300 p-4 bg-muted/30 rounded-lg border border-border/50">
                    <div className="space-y-1.5">
                        <Label className="text-xs">Cash Received</Label>
                        <Input
                            type="number"
                            value={cashAmount}
                            onChange={(e) => setCashAmount(e.target.value)}
                            placeholder="Enter cash amount"
                            className="bg-background h-10 text-lg font-mono"
                            autoFocus
                        />
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-border/50">
                        <span className="text-xs text-muted-foreground">UPI Balance</span>
                        <span className="text-lg font-bold font-orbitron text-primary">
                            ₹{Math.max(0, totalPrice - (parseFloat(cashAmount) || 0))}
                        </span>
                    </div>
                </div>
             )}
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