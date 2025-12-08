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
import { Plus, Trash2, Wallet, Smartphone, Split, ArrowLeft } from "lucide-react";
import AddItemPopup from "./AddItemPopup";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { calculateSessionBill, PricingTier } from "@/utils/pricing";

interface Device {
  id: string;
  name: string;
  type: "PS5" | "BILLIARDS" | "CARROM";
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

interface TestRateProfile {
  id: string;
  name: string;
  pricing_tiers: PricingTier[]; // JSONB from DB
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
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "UPI" | "SPLIT" | null>(null);
  const [cashAmount, setCashAmount] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  
  // New State for Test Pricing
  const [testProfiles, setTestProfiles] = useState<TestRateProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");

  useEffect(() => {
    if (open) {
      const interval = setInterval(() => {
        updateDuration();
      }, 1000);

      fetchSessionItems();
      fetchTestProfiles(); // Fetch from TEST table
      setPaymentMethod(null);
      return () => clearInterval(interval);
    }
  }, [open, session]);

  // Recalculate bill whenever duration or selected profile changes
  useEffect(() => {
    calculateBill();
  }, [duration, sessionItems, selectedProfileId, testProfiles]);

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

  const fetchTestProfiles = async () => {
    // Fetch profiles from the TEST table matching this device type
    const { data, error } = await supabase
      .from("rate_profiles_test")
      .select("*")
      .eq("device_type", device.type)
      .order("name");

    if (error) {
      console.error("Error fetching test profiles:", error);
      return;
    }

    if (data) {
      // Cast the JSON column to our type
      const profiles = data.map(p => ({
        ...p,
        pricing_tiers: p.pricing_tiers as unknown as PricingTier[]
      }));
      setTestProfiles(profiles);

      // Default selection: Try to match the profile name if possible, otherwise pick first
      // Since live sessions use old IDs, we can't match by ID. We default to the first available test profile.
      if (profiles.length > 0 && !selectedProfileId) {
        setSelectedProfileId(profiles[0].id);
      }
    }
  };

  const calculateBill = () => {
    if (!selectedProfileId) return;

    const currentProfile = testProfiles.find(p => p.id === selectedProfileId);
    if (!currentProfile || !currentProfile.pricing_tiers) return;

    // Use the new utility function
    const timeCharge = calculateSessionBill(duration, currentProfile.pricing_tiers);

    setCalculatedAmount(timeCharge);
    setFinalAmount((timeCharge + itemsTotal).toString());
  };

  const handleCheckout = async () => {
    if (!paymentMethod) {
      toast.error("Please select a payment method");
      return;
    }

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
          // Note: We are NOT updating rate_profile_id to the test ID 
          // because it would break foreign key constraints with the live table.
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
        <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-4 gap-4">
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="font-orbitron flex justify-between items-center pr-8 text-lg">
              <span>{device.name}</span>
              
              {/* Test Profile Selector (Active Rate) */}
              <div className="w-[180px]">
                <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select Rate" />
                  </SelectTrigger>
                  <SelectContent>
                    {testProfiles.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-1 space-y-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-muted/50 rounded-lg border border-border/50">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Duration</p>
                <p className="text-xl font-orbitron text-primary mt-1">
                  {formatDuration(duration)}
                </p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg border border-border/50">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Total</p>
                <p className="text-xl font-orbitron text-secondary mt-1">
                  ₹{calculatedAmount + itemsTotal}
                </p>
              </div>
            </div>

            {/* Items Section */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-xs text-muted-foreground uppercase">Items</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAddItem(true)}
                  className="h-7 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </div>
              <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
                {sessionItems.length === 0 && (
                  <p className="text-xs text-muted-foreground italic text-center py-2">No items added</p>
                )}
                {sessionItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center p-2 bg-muted/30 rounded text-sm hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-xs font-medium">
                      {item.products.name} <span className="text-muted-foreground">x{item.quantity}</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono">₹{item.price_at_order * item.quantity}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => handleDeleteItem(item.id)}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Override Amount */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase">Override Amount (Optional)</Label>
              <Input
                type="number"
                value={finalAmount}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setFinalAmount(e.target.value)}
                className="bg-muted/50 h-9 text-sm"
                placeholder="Enter final amount"
              />
            </div>

            {/* Payment Methods */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase">Payment Method</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={paymentMethod === "CASH" ? "default" : "outline"}
                  className={cn(
                    "flex flex-col items-center justify-center h-14 gap-1 transition-all",
                    paymentMethod === "CASH" && "ring-2 ring-primary ring-offset-1"
                  )}
                  onClick={() => setPaymentMethod("CASH")}
                >
                  <Wallet className="h-4 w-4" />
                  <span className="font-orbitron text-[10px]">CASH</span>
                </Button>
                
                <Button
                  variant={paymentMethod === "UPI" ? "default" : "outline"}
                  className={cn(
                    "flex flex-col items-center justify-center h-14 gap-1 transition-all",
                    paymentMethod === "UPI" && "ring-2 ring-primary ring-offset-1"
                  )}
                  onClick={() => setPaymentMethod("UPI")}
                >
                  <Smartphone className="h-4 w-4" />
                  <span className="font-orbitron text-[10px]">UPI</span>
                </Button>

                <Button
                  variant={paymentMethod === "SPLIT" ? "default" : "outline"}
                  className={cn(
                    "flex flex-col items-center justify-center h-14 gap-1 transition-all",
                    paymentMethod === "SPLIT" && "ring-2 ring-primary ring-offset-1"
                  )}
                  onClick={() => setPaymentMethod("SPLIT")}
                >
                  <Split className="h-4 w-4" />
                  <span className="font-orbitron text-[10px]">SPLIT</span>
                </Button>
              </div>
            </div>

            {paymentMethod === "SPLIT" && (
              <div className="space-y-1.5 animate-in slide-in-from-top-2 fade-in duration-300">
                <Label className="text-xs">Cash Portion</Label>
                <Input
                  type="number"
                  value={cashAmount}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setCashAmount(e.target.value)}
                  placeholder="Enter cash amount"
                  className="bg-muted/50 h-9 text-sm"
                />
                <div className="flex justify-between text-xs text-muted-foreground px-1">
                  <span>Total: ₹{finalAmount || 0}</span>
                  <span className="font-medium text-primary">
                    UPI Bal: ₹{Math.max(0, (parseFloat(finalAmount) || 0) - (parseFloat(cashAmount) || 0))}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 mt-auto flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-10 text-sm"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            <Button
              onClick={handleCheckout}
              disabled={loading || !paymentMethod}
              className="flex-[2] h-10 text-sm font-orbitron"
            >
              {loading ? "Processing..." : "Complete"}
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