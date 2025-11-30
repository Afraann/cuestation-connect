import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, Trash2, Wallet, Smartphone, Split } from "lucide-react";
import AddItemPopup from "./AddItemPopup";
import { cn } from "@/lib/utils";

interface Device {
  id: string;
  name: string;
}

interface Session {
  id: string;
  start_time: string;
  rate_profile_id: string;
}

interface SessionItem {
  id: string;
  product_id: string;
  quantity: number;
  price_at_order: number;
  products: {
    name: string;
  };
}

interface SessionManagerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device: Device;
  session: Session;
  onSessionEnded: () => void;
}

const SessionManagerModal = ({
  open,
  onOpenChange,
  device,
  session,
  onSessionEnded,
}: SessionManagerModalProps) => {
  const [duration, setDuration] = useState(0);
  const [calculatedAmount, setCalculatedAmount] = useState(0);
  const [sessionItems, setSessionItems] = useState<SessionItem[]>([]);
  const [itemsTotal, setItemsTotal] = useState(0);
  const [finalAmount, setFinalAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "UPI" | "SPLIT">("CASH");
  const [cashAmount, setCashAmount] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [rateProfileName, setRateProfileName] = useState<string>("");

  useEffect(() => {
    if (open) {
      const interval = setInterval(() => {
        updateDuration();
      }, 1000);

      fetchSessionItems();
      return () => clearInterval(interval);
    }
  }, [open, session]);

  useEffect(() => {
    calculateBill();
  }, [duration, sessionItems]);

  const updateDuration = () => {
    const start = new Date(session.start_time);
    const now = new Date();
    const diff = Math.floor((now.getTime() - start.getTime()) / 1000 / 60);
    setDuration(diff);
  };

  const fetchSessionItems = async () => {
    const { data, error } = await supabase
      .from("session_items")
      .select("*, products(name)")
      .eq("session_id", session.id);

    if (error) {
      console.error("Error fetching session items:", error);
      return;
    }

    setSessionItems(data || []);
    const total = (data || []).reduce(
      (sum, item) => sum + item.price_at_order * item.quantity,
      0
    );
    setItemsTotal(total);
  };

  const calculateBill = async () => {
    const { data: rateProfile, error } = await supabase
      .from("rate_profiles")
      .select("*")
      .eq("id", session.rate_profile_id)
      .single();

    if (error || !rateProfile) return;

    setRateProfileName(rateProfile.name);

    let timeCharge = 0;

    if (duration <= 40) {
      timeCharge = rateProfile.base_rate_30;
    } else if (duration <= 70) {
      timeCharge = rateProfile.base_rate_60;
    } else {
      const extraMinutes = duration - 70;
      const extra15Blocks = Math.ceil(extraMinutes / 15);
      timeCharge = rateProfile.base_rate_60 + extra15Blocks * rateProfile.extra_15_rate;
    }

    setCalculatedAmount(timeCharge);
    setFinalAmount((timeCharge + itemsTotal).toString());
  };

  const handleCheckout = async () => {
    setLoading(true);

    try {
      const finalAmountNum = parseFloat(finalAmount) || 0;
      const cashAmountNum = parseFloat(cashAmount) || 0;

      const amountCash = paymentMethod === "CASH" ? finalAmountNum : paymentMethod === "SPLIT" ? cashAmountNum : 0;
      const amountUpi = paymentMethod === "UPI" ? finalAmountNum : paymentMethod === "SPLIT" ? finalAmountNum - cashAmountNum : 0;

      const { error: sessionError } = await supabase
        .from("sessions")
        .update({
          end_time: new Date().toISOString(),
          status: "COMPLETED",
          payment_method: paymentMethod,
          amount_cash: amountCash,
          amount_upi: amountUpi,
          final_amount: finalAmountNum,
          calculated_amount: calculatedAmount,
        })
        .eq("id", session.id);

      if (sessionError) throw sessionError;

      const { error: deviceError } = await supabase
        .from("devices")
        .update({
          status: "AVAILABLE",
          current_session_id: null,
        })
        .eq("id", device.id);

      if (deviceError) throw deviceError;

      toast.success("Session completed successfully!");
      onSessionEnded();
    } catch (error) {
      console.error("Error ending session:", error);
      toast.error("Failed to end session");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    const { error } = await supabase
      .from("session_items")
      .delete()
      .eq("id", itemId);

    if (error) {
      toast.error("Failed to delete item");
      return;
    }

    fetchSessionItems();
    toast.success("Item removed");
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-orbitron flex justify-between items-center pr-8">
              <span>Session Manager - {device.name}</span>
              {rateProfileName && (
                <span className="text-sm font-sans font-normal px-3 py-1 bg-primary/10 text-primary rounded-full border border-primary/20">
                  {rateProfileName}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {/* Replaced ScrollArea with native div for robust scrolling */}
          <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="text-2xl font-orbitron text-primary">
                  {formatDuration(duration)}
                </p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Current Bill</p>
                <p className="text-2xl font-orbitron text-secondary">
                  ₹{calculatedAmount + itemsTotal}
                </p>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Items Added</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAddItem(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>
              <div className="space-y-2">
                {sessionItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center p-3 bg-muted/30 rounded"
                  >
                    <span>
                      {item.products.name} x{item.quantity}
                    </span>
                    <div className="flex items-center gap-2">
                      <span>₹{item.price_at_order * item.quantity}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Override Final Amount (Optional)</Label>
              <Input
                type="number"
                value={finalAmount}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setFinalAmount(e.target.value)}
                className="bg-muted/50"
                placeholder="Enter final amount"
              />
            </div>

            <div className="space-y-3">
              <Label>Payment Method</Label>
              <div className="grid grid-cols-3 gap-3">
                <Button
                  variant={paymentMethod === "CASH" ? "default" : "outline"}
                  className={cn(
                    "flex flex-col items-center justify-center h-20 gap-2 transition-all",
                    paymentMethod === "CASH" && "ring-2 ring-primary ring-offset-2"
                  )}
                  onClick={() => setPaymentMethod("CASH")}
                >
                  <Wallet className="h-6 w-6" />
                  <span className="font-orbitron">CASH</span>
                </Button>
                
                <Button
                  variant={paymentMethod === "UPI" ? "default" : "outline"}
                  className={cn(
                    "flex flex-col items-center justify-center h-20 gap-2 transition-all",
                    paymentMethod === "UPI" && "ring-2 ring-primary ring-offset-2"
                  )}
                  onClick={() => setPaymentMethod("UPI")}
                >
                  <Smartphone className="h-6 w-6" />
                  <span className="font-orbitron">UPI</span>
                </Button>

                <Button
                  variant={paymentMethod === "SPLIT" ? "default" : "outline"}
                  className={cn(
                    "flex flex-col items-center justify-center h-20 gap-2 transition-all",
                    paymentMethod === "SPLIT" && "ring-2 ring-primary ring-offset-2"
                  )}
                  onClick={() => setPaymentMethod("SPLIT")}
                >
                  <Split className="h-6 w-6" />
                  <span className="font-orbitron">SPLIT</span>
                </Button>
              </div>
            </div>

            {paymentMethod === "SPLIT" && (
              <div className="space-y-2 animate-in slide-in-from-top-2 fade-in duration-300">
                <Label>Cash Amount</Label>
                <Input
                  type="number"
                  value={cashAmount}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setCashAmount(e.target.value)}
                  placeholder="Enter cash amount"
                  className="bg-muted/50"
                />
                <div className="flex justify-between text-sm text-muted-foreground px-1">
                  <span>Total: ₹{finalAmount || 0}</span>
                  <span className="font-medium text-primary">
                    UPI Balance: ₹{Math.max(0, (parseFloat(finalAmount) || 0) - (parseFloat(cashAmount) || 0))}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t mt-auto">
            <Button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full h-12 text-lg font-orbitron"
            >
              {loading ? "Processing..." : "Complete Session"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AddItemPopup
        open={showAddItem}
        onOpenChange={setShowAddItem}
        sessionId={session.id}
        onItemAdded={fetchSessionItems}
      />
    </>
  );
};

export default SessionManagerModal;