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
import { Plus, Trash2, ArrowLeft, History, Forward, Pencil, ShoppingCart, Coffee, CheckCircle2 } from "lucide-react";
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

  const calculateBill = async () => {
    const { data: logs } = await supabase
      .from("session_logs")
      .select("*")
      .eq("session_id", session.id)
      .order("start_time", { ascending: true });

    let calculatedTimeCharge = 0;

    const getSafeProfile = (id: string) => {
        const match = rateProfiles.find(p => p.id === id);
        if (match) return match;
        if (rateProfiles.length > 0) return rateProfiles[0];
        return undefined;
    };

    if (!logs || logs.length === 0) {
      const targetId = selectedProfileId || session.rate_profile_id;
      const currentProfile = getSafeProfile(targetId);

      if (currentProfile) {
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
    const finalAmountNum = parseFloat(finalAmount) || 0;
    const balanceDueCheck = Math.max(0, finalAmountNum - totalPaid);

    if (balanceDueCheck > 0 && !paymentMethod) {
      toast.error("Select payment method to complete");
      return;
    }

    setLoading(true);
    try {
      await supabase
        .from("session_logs")
        .update({ end_time: new Date().toISOString() })
        .eq("session_id", session.id)
        .is("end_time", null);

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
        <DialogContent className="max-w-fit bg-transparent border-0 p-0 shadow-none sm:max-w-fit outline-none [&>button]:hidden">
          
          {/* Constrain height and add internal scrolling logic */}
          <div className="flex flex-col md:flex-row gap-4 items-start max-h-[90vh]">
            
            {/* --- LEFT PANEL: MAIN SESSION CONTROL --- */}
            <div className="w-full md:w-[400px] bg-[#0f1115] border border-white/10 rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-full">
              <DialogHeader className="p-4 border-b border-white/5 bg-white/5 shrink-0">
                <DialogTitle className="font-orbitron flex justify-between items-center text-lg">
                  <span>{device.name}</span>
                  <div className="w-[140px]">
                    <Select value={selectedProfileId} onValueChange={handleProfileSwitch}>
                      <SelectTrigger className="h-8 text-xs bg-black/40 border-white/10 text-muted-foreground hover:text-white transition-colors">
                        <SelectValue placeholder="Select Rate" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0f1115] border-white/10">
                        {rateProfiles.map((p) => (
                          <SelectItem key={p.id} value={p.id} className="text-xs text-muted-foreground focus:bg-white/10 focus:text-white">
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </DialogTitle>
              </DialogHeader>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                
                {/* Receipt Card */}
                <div className="rounded-lg p-4 space-y-3 border border-white/5 bg-black/20 backdrop-blur-md">
                  <div className="flex justify-between items-end border-b border-white/10 pb-3">
                    <div className="text-left">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5 font-medium">Session Time</p>
                      <p className="text-xl font-orbitron text-white">{formatDuration(duration)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5 font-medium">Total Bill</p>
                      <p className="text-3xl font-orbitron font-bold text-primary">₹{totalBillDisplay}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col p-2.5 rounded-md bg-emerald-500/5 border border-emerald-500/10">
                      <span className="text-[9px] uppercase font-bold text-emerald-500/70 tracking-wider">Paid / Advance</span>
                      <span className="text-lg font-mono text-emerald-400">₹{totalPaid}</span>
                    </div>
                    
                    {/* Split Due Box */}
                    <div className="flex flex-col p-2.5 rounded-md bg-red-500/5 border border-red-500/10 justify-between">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] uppercase font-bold text-red-500/70 tracking-wider">Net Due</span>
                        <span className="text-lg font-mono text-red-400 font-bold">₹{balanceDue}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 mt-1 border-t border-red-500/10 text-[9px] text-red-300/50 font-medium">
                        <span className="flex items-center gap-1">Time: <span className="font-mono text-white">₹{calculatedAmount}</span></span>
                        <span className="flex items-center gap-1">Items: <span className="font-mono text-white">₹{itemsTotal}</span></span>
                      </div>
                    </div>
                  </div>
                </div>

                {(session.transfer_amount || 0) > 0 && (
                  <div className="bg-primary/10 border border-primary/20 rounded-md p-2 flex justify-between items-center px-3">
                    <span className="text-[10px] font-bold text-primary uppercase flex items-center gap-1.5">
                      <Forward className="h-3 w-3" /> Prev. Due
                    </span>
                    <span className="text-sm font-mono font-bold text-primary">₹{session.transfer_amount}</span>
                  </div>
                )}

                {/* Payments List */}
                {totalPaid > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase px-1">Recent Payments</p>
                    <div className="space-y-1 bg-white/5 rounded-lg p-1">
                      {payments.map(p => (
                        <div key={p.id} className="flex justify-between items-center text-xs text-muted-foreground hover:bg-white/5 p-2 rounded transition-colors group">
                          <span>{new Date(p.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} ({p.method})</span>
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-foreground font-bold">₹{p.amount}</span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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

                {/* Override & Deposit - Side by Side */}
                <div className="flex gap-3 items-end">
                  <div className="space-y-1.5 flex-1">
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Override Total</Label>
                    <Input
                      type="number"
                      value={finalAmount}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setFinalAmount(e.target.value)}
                      className="bg-black/20 border-white/10 h-10 text-sm focus-visible:ring-primary/50 text-white placeholder:text-muted-foreground/50"
                      placeholder="Amount"
                    />
                  </div>
                  <Button 
                      variant="outline" 
                      className="h-10 px-4 text-[10px] gap-2 bg-emerald-500/5 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 transition-colors uppercase font-bold tracking-wider"
                      onClick={() => {
                        setPaymentToEdit(null);
                        setShowAddPayment(true);
                      }}
                  >
                      <Plus className="h-3 w-3" /> Deposit
                  </Button>
                </div>

                {/* Checkout Actions */}
                {balanceDue > 0 ? (
                  <div className="space-y-3 pt-3 border-t border-white/10">
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Payment Method</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {["CASH", "UPI", "SPLIT", "CARRY_FORWARD"].map((method) => (
                        <Button
                          key={method}
                          variant="outline"
                          className={cn(
                            "h-11 text-[10px] font-bold tracking-wider uppercase transition-all duration-300",
                            paymentMethod === method 
                              ? "bg-primary/20 border-primary text-primary shadow-[0_0_15px_-3px_hsl(var(--primary)/0.3)]" 
                              : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10 hover:text-white hover:border-white/20"
                          )}
                          onClick={() => setPaymentMethod(method as any)}
                        >
                          {method === "CARRY_FORWARD" ? "TRANSFER" : method}
                        </Button>
                      ))}
                    </div>

                    {paymentMethod === "SPLIT" && (
                      <div className="animate-in slide-in-from-top-2 pt-1">
                        <div className="flex gap-3 items-center bg-black/40 p-2.5 rounded-lg border border-white/10">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase whitespace-nowrap">Cash Received:</span>
                          <Input
                            type="number"
                            value={cashAmount}
                            onChange={(e) => setCashAmount(e.target.value)}
                            placeholder="0"
                            className="h-7 w-24 text-sm bg-transparent border-0 border-b border-white/20 rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary text-center font-mono text-white"
                          />
                          <div className="flex-1 text-right">
                            <span className="text-[10px] text-muted-foreground mr-2">UPI Balance:</span>
                            <span className="font-bold text-primary font-mono text-sm">₹{Math.max(0, balanceDue - (parseFloat(cashAmount) || 0))}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Fully Paid State */
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-center gap-2 my-2 animate-in fade-in zoom-in-95">
                     <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                     <p className="text-emerald-500 font-bold text-xs uppercase tracking-wider">Fully Paid</p>
                  </div>
                )}
              </div>

              {/* Footer Actions - Fixed */}
              <div className="p-4 border-t border-white/10 flex gap-3 bg-black/20 backdrop-blur-sm shrink-0">
                <Button 
                  variant="outline" 
                  onClick={() => onOpenChange(false)} 
                  className="flex-1 h-11 text-xs border-white/10 bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCheckout}
                  disabled={loading || (balanceDue > 0 && !paymentMethod)}
                  className="flex-[2] h-11 text-xs font-orbitron font-bold tracking-wide bg-gradient-to-r from-primary to-blue-600 hover:scale-[1.02] transition-transform shadow-lg shadow-primary/20 text-white border-0 disabled:opacity-50 disabled:hover:scale-100"
                >
                  {loading ? "Processing..." : paymentMethod === "CARRY_FORWARD" ? "Transfer to Tab" : "Complete & Close"}
                </Button>
              </div>
            </div>

            {/* --- RIGHT PANEL: ITEMS MANAGER --- */}
            <div className="w-full md:w-[320px] flex flex-col gap-4 animate-in fade-in slide-in-from-left-4 duration-300">
                {groupedItems.length > 0 ? (
                    <div className="bg-[#0f1115] border border-white/10 rounded-xl shadow-2xl flex flex-col overflow-hidden h-full max-h-[500px]">
                        <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
                            <span className="text-xs font-bold font-orbitron uppercase tracking-wider text-muted-foreground">Order Items <span className="text-primary ml-1">({groupedItems.reduce((a,b)=>a+b.total_quantity,0)})</span></span>
                            <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => setShowAddItem(true)}
                                className="h-7 w-7 p-0 rounded-full bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary transition-colors"
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {groupedItems.map((group) => (
                                <div key={group.product_id} className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 transition-colors group">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-gray-200">{group.product_name}</span>
                                        <span className="text-[10px] text-muted-foreground font-mono">x{group.total_quantity} @ ₹{group.price_at_order}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-mono font-bold text-gray-300">₹{group.price_at_order * group.total_quantity}</span>
                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-red-400 hover:bg-red-400/10 rounded-full opacity-0 group-hover:opacity-100 transition-all" onClick={() => handleRemoveOneItem(group)}>
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 bg-black/20 border-t border-white/10 flex justify-between items-center">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Subtotal</span>
                            <span className="text-lg font-orbitron font-bold text-primary">₹{itemsTotal}</span>
                        </div>
                    </div>
                ) : (
                    <div 
                        className="bg-[#0f1115] border border-dashed border-white/10 rounded-xl shadow-xl flex flex-col items-center justify-center p-6 gap-4 cursor-pointer hover:bg-white/5 hover:border-white/20 transition-all group h-[140px]"
                        onClick={() => setShowAddItem(true)}
                    >
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-white/5 to-white/10 flex items-center justify-center group-hover:scale-110 transition-transform border border-white/10 shadow-inner">
                            <Coffee className="h-5 w-5 text-gray-400 group-hover:text-primary transition-colors" />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-bold font-orbitron text-gray-300 group-hover:text-white transition-colors">Add Snacks</p>
                            <p className="text-[10px] text-muted-foreground mt-1 tracking-wide">Tap to open menu</p>
                        </div>
                    </div>
                )}
            </div>

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