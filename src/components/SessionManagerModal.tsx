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
import { Plus, Trash2, Wallet, Smartphone, Split, ArrowLeft, History, Forward, Receipt, Pencil } from "lucide-react";
import AddItemPopup from "./AddItemPopup";
import AddPaymentDialog from "./AddPaymentDialog";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { calculateWeightedBill, PricingTier, SessionSegment } from "@/utils/pricing";

interface Device {
  id: string;
  name: string;
  type: "PS5" | "BILLIARDS" | "CARROM";
}

interface Session {
  id: string;
  start_time: string;
  rate_profile_id: string;
  transfer_amount: number;
  transfer_session_id: string | null;
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

interface GroupedItem {
  product_id: string;
  product_name: string;
  total_quantity: number;
  price_at_order: number;
  original_ids: string[];
}

interface RateProfile {
  id: string;
  name: string;
  pricing_tiers: PricingTier[];
}

interface Payment {
  id: string;
  amount: number;
  method: "CASH" | "UPI";
  created_at: string;
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
  
  const [groupedItems, setGroupedItems] = useState<GroupedItem[]>([]);
  const [itemsTotal, setItemsTotal] = useState(0);
  const [finalAmount, setFinalAmount] = useState<string>("");
  
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "UPI" | "SPLIT" | "CARRY_FORWARD" | null>(null);
  const [cashAmount, setCashAmount] = useState<string>("");
  
  const [payments, setPayments] = useState<Payment[]>([]);
  const [totalPaid, setTotalPaid] = useState(0);
  const [paymentToEdit, setPaymentToEdit] = useState<Payment | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  
  const [rateProfiles, setRateProfiles] = useState<RateProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");

  useEffect(() => {
    if (open) {
      const interval = setInterval(() => {
        updateDuration();
      }, 1000);

      fetchSessionItems();
      fetchPayments();
      fetchRateProfiles();
      fetchActiveLog();

      setPaymentMethod(null);
      return () => clearInterval(interval);
    }
  }, [open, session]);

  // Recalculate bill whenever duration changes or profiles load
  useEffect(() => {
    if (rateProfiles.length > 0) {
      calculateBill();
    }
  }, [duration, groupedItems, rateProfiles]);

  const updateDuration = () => {
    const start = new Date(session.start_time);
    const now = new Date();
    const diff = Math.floor((now.getTime() - start.getTime()) / 1000 / 60);
    setDuration(diff);
  };

  const fetchSessionItems = async () => {
    const { data } = await supabase
      .from("session_items")
      .select("*, products(name)")
      .eq("session_id", session.id);
    
    const rawItems = (data || []) as SessionItem[];
    
    const groupedMap = new Map<string, GroupedItem>();
    rawItems.forEach(item => {
      const existing = groupedMap.get(item.product_id);
      if (existing) {
        existing.total_quantity += item.quantity;
        existing.original_ids.push(item.id);
      } else {
        groupedMap.set(item.product_id, {
          product_id: item.product_id,
          product_name: item.products.name,
          total_quantity: item.quantity,
          price_at_order: item.price_at_order,
          original_ids: [item.id]
        });
      }
    });

    setGroupedItems(Array.from(groupedMap.values()));
    const total = rawItems.reduce((sum, item) => sum + item.price_at_order * item.quantity, 0);
    setItemsTotal(total);
  };

  const fetchPayments = async () => {
    const { data } = await supabase
      .from("session_payments")
      .select("*")
      .eq("session_id", session.id)
      .order("created_at", { ascending: true });
    
    setPayments((data || []) as Payment[]);
    const paid = (data || []).reduce((sum, p) => sum + p.amount, 0);
    setTotalPaid(paid);
  };

  const fetchRateProfiles = async () => {
    const { data } = await supabase
      .from("rate_profiles")
      .select("*")
      .eq("device_type", device.type)
      .order("name");
    
    if (data) {
      const profiles = data.map(p => ({
        ...p,
        pricing_tiers: p.pricing_tiers as unknown as PricingTier[]
      }));
      setRateProfiles(profiles);
    }
  };

  const fetchActiveLog = async () => {
    const { data } = await supabase
      .from("session_logs")
      .select("rate_profile_id")
      .eq("session_id", session.id)
      .is("end_time", null)
      .maybeSingle();
    
    if (data && data.rate_profile_id) {
      setSelectedProfileId(data.rate_profile_id);
    } else {
      setSelectedProfileId(session.rate_profile_id);
    }
  };

  const handleProfileSwitch = async (newProfileId: string) => {
    if (newProfileId === selectedProfileId) return;
    
    const { error: closeError } = await supabase
      .from("session_logs")
      .update({ end_time: new Date().toISOString() })
      .eq("session_id", session.id)
      .is("end_time", null);
    
    if (closeError) console.error("Error closing log:", closeError);
    
    const { error: openError } = await supabase
      .from("session_logs")
      .insert({
        session_id: session.id,
        rate_profile_id: newProfileId,
        start_time: new Date().toISOString(),
      });
    
    if (openError) {
      toast.error("Failed to switch profile");
    } else {
      toast.success("Rate profile updated");
      setSelectedProfileId(newProfileId);
      await supabase.from("sessions").update({ rate_profile_id: newProfileId }).eq("id", session.id);
    }
  };

  // --- SAFE BILL CALCULATION ---
  const calculateBill = async () => {
    // 1. Fetch History Logs from REAL table
    const { data: logs } = await supabase
      .from("session_logs")
      .select("*")
      .eq("session_id", session.id)
      .order("start_time", { ascending: true });

    let calculatedTimeCharge = 0;

    // Helper: Find a profile, fallback to first available if ID is broken
    const getSafeProfile = (id: string) => {
        const match = rateProfiles.find(p => p.id === id);
        if (match) return match;
        // Fallback Mechanism: Use the first valid profile for this device
        if (rateProfiles.length > 0) return rateProfiles[0];
        return undefined;
    };

    // If no logs exist (legacy/broken session), fallback to basic calculation
    if (!logs || logs.length === 0) {
      const targetId = selectedProfileId || session.rate_profile_id;
      const currentProfile = getSafeProfile(targetId);

      if (currentProfile) {
        // Fix the UI state if we had to fallback
        if (currentProfile.id !== selectedProfileId) {
            setSelectedProfileId(currentProfile.id);
        }

        const segments: SessionSegment[] = [{
          durationMins: duration,
          pricingTiers: currentProfile.pricing_tiers
        }];
        calculatedTimeCharge = calculateWeightedBill(segments);
      }
    } else {
      // 2. Build Segments from Logs
      const segments: SessionSegment[] = [];
      const now = new Date();

      logs.forEach(log => {
        const profile = getSafeProfile(log.rate_profile_id);
        if (profile) {
          const startTime = new Date(log.start_time);
          const endTime = log.end_time ? new Date(log.end_time) : now;
          const mins = (endTime.getTime() - startTime.getTime()) / 1000 / 60;
          
          segments.push({
            durationMins: mins,
            pricingTiers: profile.pricing_tiers
          });
        }
      });

      // 3. Calculate Weighted Bill
      calculatedTimeCharge = calculateWeightedBill(segments);
    }

    const grandTotal = calculatedTimeCharge + itemsTotal + (session.transfer_amount || 0);

    setCalculatedAmount(calculatedTimeCharge);
    setFinalAmount(grandTotal.toString());
  };

  const handleRemoveOneItem = async (group: GroupedItem) => {
    const idToRemove = group.original_ids[group.original_ids.length - 1];
    if (!idToRemove) return;
    const { error } = await supabase.from("session_items").delete().eq("id", idToRemove);
    if (!error) {
      fetchSessionItems();
      toast.success(`Removed 1 ${group.product_name}`);
    } else {
      toast.error("Failed to remove item");
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    const { error } = await supabase.from("session_payments").delete().eq("id", paymentId);
    if (!error) {
      toast.success("Payment removed");
      fetchPayments();
    } else {
      toast.error("Failed to delete payment");
    }
  };

  const handleEditPayment = (payment: Payment) => {
    setPaymentToEdit(payment);
    setShowAddPayment(true);
  };

  const handleCheckout = async () => {
    if (!paymentMethod) {
      toast.error("Please select a payment method");
      return;
    }
    setLoading(true);
    try {
      // Close log in REAL table
      await supabase
        .from("session_logs")
        .update({ end_time: new Date().toISOString() })
        .eq("session_id", session.id)
        .is("end_time", null);

      const finalAmountNum = parseFloat(finalAmount) || 0;
      const isCarryForward = paymentMethod === "CARRY_FORWARD";
      let totalCash = 0;
      let totalUpi = 0;

      if (!isCarryForward) {
        const cashInput = parseFloat(cashAmount) || 0;
        const remainingBalance = finalAmountNum - totalPaid;
        const finalTxAmount = Math.max(0, remainingBalance);
        let currentTxCash = 0;
        let currentTxUpi = 0;

        if (paymentMethod === "CASH") currentTxCash = finalTxAmount;
        else if (paymentMethod === "UPI") currentTxUpi = finalTxAmount;
        else if (paymentMethod === "SPLIT") {
          currentTxCash = cashInput;
          currentTxUpi = finalTxAmount - cashInput;
        }

        const prevCash = payments.filter(p => p.method === "CASH").reduce((s, p) => s + p.amount, 0);
        const prevUpi = payments.filter(p => p.method === "UPI").reduce((s, p) => s + p.amount, 0);
        totalCash = prevCash + currentTxCash;
        totalUpi = prevUpi + currentTxUpi;
      }

      const { error: sessionError } = await supabase
        .from("sessions")
        .update({
          end_time: new Date().toISOString(),
          status: "COMPLETED",
          payment_method: paymentMethod,
          amount_cash: totalCash,
          amount_upi: totalUpi,
          final_amount: finalAmountNum,
          calculated_amount: calculatedAmount,
        })
        .eq("id", session.id);
      if (sessionError) throw sessionError;

      const { error: deviceError } = await supabase
        .from("devices")
        .update({ status: "AVAILABLE", current_session_id: null })
        .eq("id", device.id);
      if (deviceError) throw deviceError;

      toast.success(isCarryForward ? "Bill moved to pending" : "Session completed!");
      onSessionEnded();
    } catch (error) {
      console.error("Error ending session:", error);
      toast.error("Failed to end session");
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const totalBillDisplay = parseFloat(finalAmount) || 0;
  const balanceDue = Math.max(0, totalBillDisplay - totalPaid);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-4 gap-4">
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="font-orbitron flex justify-between items-center pr-8 text-lg">
              <span>{device.name}</span>
              <div className="w-[160px]">
                <Select value={selectedProfileId} onValueChange={handleProfileSwitch}>
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="Select Rate" />
                  </SelectTrigger>
                  <SelectContent>
                    {rateProfiles.map((p) => (
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
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 bg-muted/50 rounded-lg border border-border/50 text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Duration</p>
                <p className="text-lg font-orbitron text-primary">{formatDuration(duration)}</p>
              </div>
              <div className="p-2 bg-muted/50 rounded-lg border border-border/50 text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Total Bill</p>
                <p className="text-lg font-orbitron text-foreground">₹{totalBillDisplay}</p>
              </div>
              <div className="p-2 bg-muted/50 rounded-lg border border-border/50 text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Paid</p>
                <p className="text-lg font-orbitron text-emerald-500">₹{totalPaid}</p>
              </div>
            </div>

            {(session.transfer_amount || 0) > 0 && (
              <div className="bg-primary/10 border border-primary/20 rounded-md p-2 flex justify-between items-center px-4">
                <span className="text-xs font-bold text-primary uppercase flex items-center gap-2">
                  <Forward className="h-4 w-4" /> Previous Balance
                </span>
                <span className="text-lg font-mono font-bold text-primary">₹{session.transfer_amount}</span>
              </div>
            )}

            {/* Payments List */}
            {totalPaid > 0 && (
              <div className="bg-emerald-500/10 rounded-md p-2 border border-emerald-500/20">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-emerald-500 uppercase flex items-center gap-1">
                    <History className="h-3 w-3" /> Deposits
                  </span>
                </div>
                <div className="space-y-1">
                  {payments.map(p => (
                    <div key={p.id} className="flex justify-between items-center text-xs text-muted-foreground bg-white/5 p-1 rounded">
                      <span>{new Date(p.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} ({p.method})</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-foreground font-bold">₹{p.amount}</span>
                        <div className="flex gap-1">
                          <button onClick={() => handleEditPayment(p)} className="p-1 hover:text-blue-400 transition-colors">
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button onClick={() => handleDeletePayment(p.id)} className="p-1 hover:text-red-400 transition-colors">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center bg-card border border-primary/20 p-3 rounded-lg shadow-sm">
                <span className="text-sm font-bold text-muted-foreground uppercase">Balance Due</span>
                <span className="text-2xl font-black font-orbitron text-primary">₹{balanceDue}</span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-xs text-muted-foreground uppercase">Order Items</Label>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-6 text-[10px] gap-1 border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-500"
                    onClick={() => {
                      setPaymentToEdit(null);
                      setShowAddPayment(true);
                    }}
                    disabled={balanceDue <= 0}
                  >
                    <Plus className="h-3 w-3" /> Deposit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAddItem(true)}
                    className="h-6 text-[10px]"
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add
                  </Button>
                </div>
              </div>
              
              <div className="space-y-1 max-h-[100px] overflow-y-auto bg-muted/20 rounded p-1">
                {groupedItems.map((group) => (
                  <div key={group.product_id} className="flex justify-between items-center p-1 px-2 text-sm">
                    <span className="text-xs">{group.product_name} <span className="font-bold text-primary">x{group.total_quantity}</span></span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono">₹{group.price_at_order * group.total_quantity}</span>
                      <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => handleRemoveOneItem(group)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase">Override Total (Optional)</Label>
              <Input
                type="number"
                value={finalAmount}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setFinalAmount(e.target.value)}
                className="bg-muted/50 h-9 text-sm"
                placeholder="Enter final amount"
              />
            </div>

            {balanceDue > 0 && (
              <div className="space-y-2 pt-2 border-t border-border/50">
                <Label className="text-xs text-muted-foreground uppercase">Checkout Action</Label>
                <div className="grid grid-cols-4 gap-2">
                  <Button
                    variant={paymentMethod === "CASH" ? "default" : "outline"}
                    className={cn("h-12 flex-col gap-0", paymentMethod === "CASH" && "ring-2 ring-primary")}
                    onClick={() => setPaymentMethod("CASH")}
                  >
                    <Wallet className="h-4 w-4 mb-1" />
                    <span className="text-[10px]">CASH</span>
                  </Button>
                  <Button
                    variant={paymentMethod === "UPI" ? "default" : "outline"}
                    className={cn("h-12 flex-col gap-0", paymentMethod === "UPI" && "ring-2 ring-primary")}
                    onClick={() => setPaymentMethod("UPI")}
                  >
                    <Smartphone className="h-4 w-4 mb-1" />
                    <span className="text-[10px]">UPI</span>
                  </Button>
                  <Button
                    variant={paymentMethod === "SPLIT" ? "default" : "outline"}
                    className={cn("h-12 flex-col gap-0", paymentMethod === "SPLIT" && "ring-2 ring-primary")}
                    onClick={() => setPaymentMethod("SPLIT")}
                  >
                    <Split className="h-4 w-4 mb-1" />
                    <span className="text-[10px]">SPLIT</span>
                  </Button>
                  <Button
                    variant={paymentMethod === "CARRY_FORWARD" ? "default" : "outline"}
                    className={cn(
                      "h-12 flex-col gap-0 border-amber-500/50 hover:bg-amber-500/10 hover:text-amber-500", 
                      paymentMethod === "CARRY_FORWARD" && "bg-amber-500 hover:bg-amber-600 ring-2 ring-amber-500 text-white"
                    )}
                    onClick={() => setPaymentMethod("CARRY_FORWARD")}
                  >
                    <Forward className="h-4 w-4 mb-1" />
                    <span className="text-[9px]">TRANSFER</span>
                  </Button>
                </div>

                {paymentMethod === "SPLIT" && (
                  <div className="space-y-1 animate-in slide-in-from-top-2">
                    <div className="flex gap-2 items-center">
                      <Input
                        type="number"
                        value={cashAmount}
                        onChange={(e) => setCashAmount(e.target.value)}
                        placeholder="Cash Amount"
                        className="h-9 text-sm"
                      />
                      <div className="text-xs whitespace-nowrap">
                        UPI: <span className="font-bold text-primary">₹{Math.max(0, balanceDue - (parseFloat(cashAmount) || 0))}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="pt-2 mt-auto flex gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 h-10 text-sm">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
            <Button
              onClick={handleCheckout}
              disabled={loading || (balanceDue > 0 && !paymentMethod)}
              className="flex-[2] h-10 text-sm font-orbitron"
            >
              {loading ? "Processing..." : paymentMethod === "CARRY_FORWARD" ? "Transfer Bill" : "Complete Session"}
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
      <AddPaymentDialog
        open={showAddPayment}
        onOpenChange={setShowAddPayment}
        sessionId={session.id}
        onPaymentSaved={fetchPayments}
        balanceDue={balanceDue}
        paymentToEdit={paymentToEdit}
      />
    </>
  );
};

export default SessionManagerModal;