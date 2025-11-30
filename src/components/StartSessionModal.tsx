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
import { Gamepad2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Device {
  id: string;
  name: string;
  type: "PS5" | "BILLIARDS";
}

interface RateProfile {
  id: string;
  name: string;
  device_type: string;
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchRateProfiles();
      setSelectedRate(""); // Reset selection on open
    }
  }, [open, device.type]);

  const fetchRateProfiles = async () => {
    const { data, error } = await supabase
      .from("rate_profiles")
      .select("*")
      .eq("device_type", device.type)
      .order("name");

    if (error) {
      console.error("Error fetching rate profiles:", error);
      return;
    }

    setRateProfiles(data || []);
    
    // Auto-select if only one option (useful for Billiards)
    if (device.type === "BILLIARDS" && data && data.length === 1) {
      setSelectedRate(data[0].id);
    }
  };

  const handleStartSession = async () => {
    if (!selectedRate) {
      toast.error("Please select a rate profile");
      return;
    }

    setLoading(true);

    try {
      // Create session
      const { data: session, error: sessionError } = await supabase
        .from("sessions")
        .insert({
          device_id: device.id,
          rate_profile_id: selectedRate,
          status: "ACTIVE",
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Update device status
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

  // Helper to get icon color based on player count in name
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
      <DialogContent className="sm:max-w-md min-h-[400px] flex flex-col justify-center gap-8">
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
                    "h-32 flex flex-col gap-3 hover:scale-105 transition-all duration-200",
                    selectedRate === profile.id ? "border-primary ring-2 ring-primary ring-offset-2" : "border-2"
                  )}
                  onClick={() => setSelectedRate(profile.id)}
                >
                  <Gamepad2 className={cn("h-12 w-12", getIconColor(profile.name))} />
                  <span className="font-orbitron text-lg">{profile.name}</span>
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

          <Button
            onClick={handleStartSession}
            disabled={loading || !selectedRate}
            className="w-full h-14 text-lg font-orbitron mt-4"
          >
            {loading ? "Starting..." : "Start Session"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StartSessionModal;