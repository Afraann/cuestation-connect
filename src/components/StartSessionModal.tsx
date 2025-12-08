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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Gamepad2, Receipt } from "lucide-react";
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchRateProfiles();
      fetchPendingBills();
      setSelectedRate("");
      setSelectedBillId("none");
    }
  }, [open, device.type]);

  const fetchRateProfiles = async () => {
    // Fetch from the TEST table to ensure we have the correct IDs for the new logic
    const { data } = await supabase
      .from("rate_profiles_test")
      .select("*")
      .eq("device_type", device.type)
      .order("name");
    setRateProfiles(data || []);
    
    // Auto-select if only one option (useful for Billiards/Carrom)
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
          // We assume selectedRate is a valid ID from rate_profiles_test now
          // For the actual `rate_profile_id` column in `sessions`, we might need a real ID 
          // or we can store the test ID if we don't mind foreign key constraint errors 
          // (assuming you dropped the FK or we are just testing).
          // Ideally, we'd sync them, but for this test, we store it.
          rate_profile_id: selectedRate, 
          status: "ACTIVE",
          transfer_session_id: transferSessionId,
          transfer_amount: transferAmount,
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // 2. Create Initial Log Entry (The History Tracker)
      const { error: logError } = await supabase
        .from("session_logs_test")
        .insert({
          session_id: session.id,
          rate_profile_id: selectedRate,
          start_time: new Date().toISOString(),
          // end_time is null, meaning it's currently active
        });

      if (logError) {
        console.error("Log error:", logError);
        // We don't stop the flow, but we log it
      }

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md min-h-[400px] flex flex-col justify-center gap-6">
        <DialogHeader>
          <DialogTitle className="font-orbitron text-2xl text-center">
            Start Session
            <span className="block text-muted-foreground text-lg mt-2 font-sans font-normal">{device.name}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 flex-1 flex flex-col justify-center">
          {device.type === "PS5" ? (
            <div className="grid grid-cols-2 gap-4">
              {rateProfiles.map((profile) => (
                <Button
                  key={profile.id}
                  variant={selectedRate === profile.id ? "default" : "outline"}
                  className={cn(
                    "h-28 flex flex-col gap-2 hover:scale-105 transition-all duration-200",
                    selectedRate === profile.id ? "border-primary ring-2 ring-primary ring-offset-2" : "border-2"
                  )}
                  onClick={() => setSelectedRate(profile.id)}
                >
                  <Gamepad2 className={cn("h-10 w-10", getIconColor(profile.name))} />
                  <span className="font-orbitron text-sm">{profile.name}</span>
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

          {pendingBills.length > 0 && (
            <div className="space-y-3 pt-2 border-t">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Receipt className="h-4 w-4 text-primary" /> Carry Forward Bill (Optional)
              </Label>
              <Select value={selectedBillId} onValueChange={setSelectedBillId}>
                <SelectTrigger className="h-12 bg-muted/20">
                  <SelectValue placeholder="Select a pending bill..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Previous Bill</SelectItem>
                  {pendingBills.map((bill) => (
                    <SelectItem key={bill.id} value={bill.id}>
                      {bill.devices.name} - ₹{bill.final_amount} 
                      <span className="text-muted-foreground ml-2 text-xs">
                        ({new Date(bill.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button
            onClick={handleStartSession}
            disabled={loading || !selectedRate}
            className="w-full h-14 text-lg font-orbitron mt-2"
          >
            {loading ? "Starting..." : "Start Session"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StartSessionModal;