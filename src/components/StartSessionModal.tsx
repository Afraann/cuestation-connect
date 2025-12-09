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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Gamepad2, Receipt, Infinity, Hourglass, Target, LayoutGrid, Clock, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Device {
  id: string;
  name: string;
  type: "PS5" | "BILLIARDS" | "CARROM";
}

interface RateProfile {
  id: string;
  name: string;
  device_type: string;
}

interface PendingBill {
  id: string;
  final_amount: number;
  devices: { name: string };
  created_at: string;
}

interface StartSessionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device: Device;
  onSessionStarted: () => void;
}

const StartSessionModal = ({
  open,
  onOpenChange,
  device,
  onSessionStarted,
}: StartSessionModalProps) => {
  const [rateProfiles, setRateProfiles] = useState<RateProfile[]>([]);
  const [selectedRate, setSelectedRate] = useState<string>("");
  const [pendingBills, setPendingBills] = useState<PendingBill[]>([]);
  const [selectedBillId, setSelectedBillId] = useState<string>("none");
  
  // Time Selection State
  const [timeMode, setTimeMode] = useState<"OPEN" | "FIXED">("OPEN");
  const [fixedDuration, setFixedDuration] = useState<number | null>(null);
  const [customDuration, setCustomDuration] = useState<string>("");

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchRateProfiles();
      fetchPendingBills();
      setSelectedRate("");
      setSelectedBillId("none");
      setTimeMode("OPEN");
      setFixedDuration(null);
      setCustomDuration("");
    }
  }, [open, device.type]);

  const fetchRateProfiles = async () => {
    const { data } = await supabase
      .from("rate_profiles")
      .select("*")
      .eq("device_type", device.type)
      .order("name");
    
    const profiles = data || [];
    setRateProfiles(profiles);
    
    // Auto-select if there's only one profile (Common for Pool/Carrom)
    if (profiles.length === 1) {
      setSelectedRate(profiles[0].id);
    }
  };

  const fetchPendingBills = async () => {
    const { data: usedBills } = await supabase
      .from("sessions")
      .select("transfer_session_id")
      .not("transfer_session_id", "is", null);
    
    const usedIds = usedBills?.map(b => b.transfer_session_id) || [];

    const { data } = await supabase
      .from("sessions")
      .select("id, final_amount, created_at, devices(name)")
      .eq("status", "COMPLETED")
      .eq("payment_method", "CARRY_FORWARD")
      .order("created_at", { ascending: false });

    if (data) {
      const availableBills = data.filter(bill => !usedIds.includes(bill.id)) as unknown as PendingBill[];
      setPendingBills(availableBills);
    }
  };

  const handleStartSession = async () => {
    if (!selectedRate) {
      toast.error("Please select a rate profile");
      return;
    }

    let finalDuration = null;
    if (timeMode === "FIXED") {
      if (customDuration) {
        finalDuration = parseInt(customDuration);
      } else if (fixedDuration) {
        finalDuration = fixedDuration;
      }
      
      if (!finalDuration || finalDuration <= 0) {
        toast.error("Please select a valid duration");
        return;
      }
    }

    setLoading(true);

    try {
      let transferSessionId = null;
      let transferAmount = 0;

      if (selectedBillId !== "none") {
        const bill = pendingBills.find(b => b.id === selectedBillId);
        if (bill) {
          transferSessionId = bill.id;
          transferAmount = bill.final_amount;
        }
      }

      const { data: session, error: sessionError } = await supabase
        .from("sessions")
        .insert({
          device_id: device.id,
          rate_profile_id: selectedRate,
          status: "ACTIVE",
          transfer_session_id: transferSessionId,
          transfer_amount: transferAmount,
          planned_duration: finalDuration,
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      await supabase.from("session_logs").insert({
        session_id: session.id,
        rate_profile_id: selectedRate,
        start_time: new Date().toISOString(),
      });

      const { error: deviceError } = await supabase
        .from("devices")
        .update({
          status: "OCCUPIED",
          current_session_id: session.id,
        })
        .eq("id", device.id);

      if (deviceError) throw deviceError;

      toast.success("Session started");
      onSessionStarted();
    } catch (error) {
      console.error("Error starting session:", error);
      toast.error("Failed to start session");
    } finally {
      setLoading(false);
    }
  };

  const getIcon = () => {
    if (device.type === "PS5") return <Gamepad2 className="h-5 w-5 text-ps5" />;
    if (device.type === "BILLIARDS") return <Target className="h-5 w-5 text-billiard" />;
    return <LayoutGrid className="h-5 w-5 text-amber-500" />;
  };

  // Helper for Fixed Time Buttons
  const DurationBtn = ({ mins, label }: { mins: number; label: string }) => (
    <button
      className={cn(
        "h-9 text-xs rounded-md border transition-all duration-200 font-medium",
        fixedDuration === mins && !customDuration
          ? "bg-primary/20 text-primary border-primary shadow-[0_0_15px_-5px_hsl(var(--primary))]"
          : "bg-white/5 border-white/10 hover:bg-white/10 text-muted-foreground hover:text-white"
      )}
      onClick={() => {
        setFixedDuration(mins);
        setCustomDuration("");
      }}
    >
      {label}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* ADDED: max-h-[90vh] and flex-col to enable scrolling for inner content */}
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col bg-[#0f1115] border border-white/10 p-0 gap-0 shadow-2xl [&>button]:hidden">
        
        {/* Header - Fixed */}
        <div className="p-6 pb-4 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent shrink-0">
          <DialogHeader className="flex flex-row items-center gap-3 space-y-0 text-left">
            <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shadow-inner">
              {getIcon()}
            </div>
            <div>
              <DialogTitle className="font-orbitron text-lg tracking-wide text-foreground">
                {device.name}
              </DialogTitle>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-0.5">
                Start New Session
              </p>
            </div>
          </DialogHeader>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          {/* 1. Rate Selection */}
          <div className="space-y-3">
            <Label className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Select Rate</Label>
            
            {/* Logic: If only 1 profile (Pool/Carrom), show static card. Else show grid. */}
            {rateProfiles.length === 1 ? (
              <div className="flex items-center justify-between p-3 rounded-xl border border-primary/30 bg-primary/10 shadow-[0_0_20px_-10px_hsl(var(--primary)/0.3)]">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                    <Check className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-orbitron font-bold text-foreground">
                    {rateProfiles[0].name}
                  </span>
                </div>
                <span className="text-[10px] uppercase font-bold text-primary tracking-wider bg-primary/20 px-2 py-1 rounded">Active</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {rateProfiles.map((profile) => {
                  const isSelected = selectedRate === profile.id;
                  return (
                    <button
                      key={profile.id}
                      onClick={() => setSelectedRate(profile.id)}
                      className={cn(
                        "relative flex flex-col items-start p-3 h-20 rounded-xl border transition-all duration-300 text-left group",
                        isSelected 
                          ? "bg-primary/20 border-primary shadow-[0_0_20px_-5px_hsl(var(--primary)/0.3)]" 
                          : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                      )}
                    >
                      <div className={cn(
                        "mb-auto p-1.5 rounded-md transition-colors",
                        isSelected ? "bg-primary text-primary-foreground" : "bg-black/40 text-muted-foreground group-hover:text-foreground"
                      )}>
                        <Gamepad2 className="h-4 w-4" />
                      </div>
                      <span className={cn(
                        "text-xs font-orbitron font-bold tracking-wide",
                        isSelected ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                      )}>
                        {profile.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Time Mode Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Session Duration</Label>
            </div>
            
            <Tabs value={timeMode} onValueChange={(v) => setTimeMode(v as "OPEN" | "FIXED")} className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-10 bg-black/40 p-1 border border-white/5 rounded-lg">
                <TabsTrigger 
                  value="OPEN" 
                  className="text-[10px] font-orbitron data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 data-[state=active]:border data-[state=active]:border-emerald-500/50 rounded-md transition-all"
                >
                  <Infinity className="h-3 w-3 mr-2" /> Open
                </TabsTrigger>
                <TabsTrigger 
                  value="FIXED" 
                  className="text-[10px] font-orbitron data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400 data-[state=active]:border data-[state=active]:border-blue-500/50 rounded-md transition-all"
                >
                  <Hourglass className="h-3 w-3 mr-2" /> Fixed
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="FIXED" className="space-y-3 mt-4 animate-in fade-in slide-in-from-top-2">
                <div className="grid grid-cols-3 gap-2">
                  <DurationBtn mins={30} label="30m" />
                  <DurationBtn mins={60} label="1h" />
                  <DurationBtn mins={90} label="1.5h" />
                  <DurationBtn mins={120} label="2h" />
                  <DurationBtn mins={180} label="3h" />
                  <div className="relative">
                    <Input 
                      placeholder="Min" 
                      type="number"
                      className="h-9 text-xs px-2 text-center bg-black/20 border-white/10 focus-visible:ring-primary/50"
                      value={customDuration}
                      onChange={(e) => {
                        setCustomDuration(e.target.value);
                        setFixedDuration(null);
                      }}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* 3. Pending Bills (Carry Forward) */}
          {pendingBills.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-white/10">
              <Label className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold flex items-center gap-2">
                <Receipt className="h-3 w-3 text-amber-500" /> Carry Forward
              </Label>
              <Select value={selectedBillId} onValueChange={setSelectedBillId}>
                <SelectTrigger className="h-10 bg-black/20 border-white/10 text-xs">
                  <SelectValue placeholder="Select a pending bill..." />
                </SelectTrigger>
                <SelectContent className="bg-[#0f1115] border-white/10">
                  <SelectItem value="none" className="text-xs">None</SelectItem>
                  {pendingBills.map((bill) => (
                    <SelectItem key={bill.id} value={bill.id} className="text-xs">
                      {bill.devices.name} <span className="text-muted-foreground ml-2">₹{bill.final_amount}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Footer Actions - Fixed */}
        <div className="p-4 bg-black/20 backdrop-blur-sm border-t border-white/5 flex gap-3 shrink-0">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            className="flex-1 h-12 text-xs border-white/10 bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleStartSession}
            disabled={loading || !selectedRate}
            className="flex-[2] w-full h-12 text-sm font-orbitron font-bold tracking-wide bg-gradient-to-r from-primary to-blue-600 hover:scale-[1.02] transition-transform shadow-lg shadow-primary/20 text-white border-0"
          >
            {loading ? <Clock className="h-4 w-4 animate-spin" /> : "Start Session"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StartSessionModal;