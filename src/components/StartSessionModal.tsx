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
import { Gamepad2, Receipt, Infinity, Hourglass, Clock } from "lucide-react";
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
  
  // NEW: Time Selection State
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
      // Reset Time Mode
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
    setRateProfiles(data || []);
    
    if (device.type !== "PS5" && data && data.length === 1) {
      setSelectedRate(data[0].id);
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

    // Validate Fixed Duration
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

      // 1. Create Session
      const { data: session, error: sessionError } = await supabase
        .from("sessions")
        .insert({
          device_id: device.id,
          rate_profile_id: selectedRate,
          status: "ACTIVE",
          transfer_session_id: transferSessionId,
          transfer_amount: transferAmount,
          planned_duration: finalDuration, // NEW: Save the duration
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // 2. Create Initial Log Entry
      await supabase.from("session_logs").insert({
        session_id: session.id,
        rate_profile_id: selectedRate,
        start_time: new Date().toISOString(),
      });

      // 3. Update Device
      const { error: deviceError } = await supabase
        .from("devices")
        .update({
          status: "OCCUPIED",
          current_session_id: session.id,
        })
        .eq("id", device.id);

      if (deviceError) throw deviceError;

      toast.success("Session started successfully!");
      onSessionStarted();
    } catch (error) {
      console.error("Error starting session:", error);
      toast.error("Failed to start session");
    } finally {
      setLoading(false);
    }
  };

  const getIconColor = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("1")) return "text-red-500";
    if (n.includes("2")) return "text-blue-500";
    if (n.includes("3")) return "text-yellow-500";
    if (n.includes("4")) return "text-purple-500";
    return "text-primary";
  };

  // Helper for Fixed Time Buttons
  const DurationBtn = ({ mins, label }: { mins: number; label: string }) => (
    <Button
      variant={fixedDuration === mins && !customDuration ? "default" : "outline"}
      className={cn("h-10 text-xs", fixedDuration === mins && !customDuration && "ring-2 ring-primary")}
      onClick={() => {
        setFixedDuration(mins);
        setCustomDuration("");
      }}
    >
      {label}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md min-h-[500px] flex flex-col gap-6">
        <DialogHeader>
          <DialogTitle className="font-orbitron text-2xl text-center">
            Start Session
            <span className="block text-muted-foreground text-lg mt-2 font-sans font-normal">{device.name}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 flex-1 overflow-y-auto pr-1">
          {/* 1. Rate Selection */}
          {device.type === "PS5" ? (
            <div className="grid grid-cols-2 gap-4">
              {rateProfiles.map((profile) => (
                <Button
                  key={profile.id}
                  variant={selectedRate === profile.id ? "default" : "outline"}
                  className={cn(
                    "h-24 flex flex-col gap-2 hover:scale-105 transition-all duration-200",
                    selectedRate === profile.id ? "border-primary ring-2 ring-primary ring-offset-2" : "border-2"
                  )}
                  onClick={() => setSelectedRate(profile.id)}
                >
                  <Gamepad2 className={cn("h-8 w-8", getIconColor(profile.name))} />
                  <span className="font-orbitron text-xs">{profile.name}</span>
                </Button>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <Label className="text-base">Select Rate Profile</Label>
              <Select value={selectedRate} onValueChange={setSelectedRate}>
                <SelectTrigger className="h-12 text-lg">
                  <SelectValue placeholder="Choose rate type" />
                </SelectTrigger>
                <SelectContent>
                  {rateProfiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id} className="text-base py-3">
                      {profile.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* 2. Time Mode Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Session Type</Label>
            <Tabs value={timeMode} onValueChange={(v) => setTimeMode(v as "OPEN" | "FIXED")} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="OPEN" className="gap-2">
                  <Infinity className="h-4 w-4" /> Open Time
                </TabsTrigger>
                <TabsTrigger value="FIXED" className="gap-2">
                  <Hourglass className="h-4 w-4" /> Fixed Time
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="FIXED" className="space-y-3 mt-3 animate-in fade-in zoom-in-95">
                <div className="grid grid-cols-3 gap-2">
                  <DurationBtn mins={30} label="30m" />
                  <DurationBtn mins={60} label="1h" />
                  <DurationBtn mins={90} label="1.5h" />
                  <DurationBtn mins={120} label="2h" />
                  <DurationBtn mins={180} label="3h" />
                  <div className="relative">
                    <Input 
                      placeholder="Custom" 
                      type="number"
                      className="h-10 text-xs px-2 text-center"
                      value={customDuration}
                      onChange={(e) => {
                        setCustomDuration(e.target.value);
                        setFixedDuration(null);
                      }}
                    />
                    <span className="absolute right-2 top-2.5 text-[10px] text-muted-foreground">min</span>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* 3. Pending Bills (Carry Forward) */}
          {pendingBills.length > 0 && (
            <div className="space-y-3 pt-2 border-t">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Receipt className="h-4 w-4 text-primary" /> Carry Forward Bill
              </Label>
              <Select value={selectedBillId} onValueChange={setSelectedBillId}>
                <SelectTrigger className="h-10 bg-muted/20 text-xs">
                  <SelectValue placeholder="Select a pending bill..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Previous Bill</SelectItem>
                  {pendingBills.map((bill) => (
                    <SelectItem key={bill.id} value={bill.id}>
                      {bill.devices.name} - ₹{bill.final_amount} 
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <Button
          onClick={handleStartSession}
          disabled={loading || !selectedRate}
          className="w-full h-12 text-lg font-orbitron"
        >
          {loading ? "Starting..." : "Start Session"}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default StartSessionModal;