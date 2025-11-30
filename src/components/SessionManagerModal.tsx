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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import AddItemPopup from "./AddItemPopup";

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
  const [finalAmount, setFinalAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "UPI" | "SPLIT">("CASH");
  const [cashAmount, setCashAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);

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
    // Fetch rate profile
    const { data: rateProfile, error } = await supabase
      .from("rate_profiles")
      .select("*")
      .eq("id", session.rate_profile_id)
      .single();

    if (error || !rateProfile) return;

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
    setFinalAmount(timeCharge + itemsTotal);
  };

  const handleCheckout = async () => {
    setLoading(true);

    try {
      const amountCash = paymentMethod === "CASH" ? finalAmount : paymentMethod === "SPLIT" ? cashAmount : 0;
      const amountUpi = paymentMethod === "UPI" ? finalAmount : paymentMethod === "SPLIT" ? finalAmount - cashAmount : 0;

      // Update session
      const { error: sessionError } = await supabase
        .from("sessions")
        .update({
          end_time: new Date().toISOString(),
          status: "COMPLETED",
          payment_method: paymentMethod,
          amount_cash: amountCash,
          amount_upi: amountUpi,
          final_amount: finalAmount,
          calculated_amount: calculatedAmount,
        })
        .eq("id", session.id);

      if (sessionError) throw sessionError;

      // Update device
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-orbitron">
              Session Manager - {device.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Duration and Bill */}
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
                  ₹{finalAmount}
                </p>
              </div>
            </div>

            {/* Items */}
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

            {/* Override Final Amount */}
            <div className="space-y-2">
              <Label>Override Final Amount (Optional)</Label>
              <Input
                type="number"
                value={finalAmount}
                onChange={(e) => setFinalAmount(parseInt(e.target.value) || 0)}
                className="bg-muted/50"
              />
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select
                value={paymentMethod}
                onValueChange={(value) =>
                  setPaymentMethod(value as "CASH" | "UPI" | "SPLIT")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="SPLIT">Split Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Split Payment */}
            {paymentMethod === "SPLIT" && (
              <div className="space-y-2">
                <Label>Cash Amount</Label>
                <Input
                  type="number"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(parseInt(e.target.value) || 0)}
                  placeholder="Enter cash amount"
                  className="bg-muted/50"
                />
                <p className="text-sm text-muted-foreground">
                  UPI: ₹{finalAmount - cashAmount}
                </p>
              </div>
            )}

            <Button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full"
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
