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
    }
  }, [open, device.type]);

  const fetchRateProfiles = async () => {
    const { data, error } = await supabase
      .from("rate_profiles")
      .select("*")
      .eq("device_type", device.type);

    if (error) {
      console.error("Error fetching rate profiles:", error);
      return;
    }

    setRateProfiles(data || []);
    
    // Auto-select if only one option
    if (data && data.length === 1) {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-orbitron">
            Start Session - {device.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Select Rate Profile</Label>
            <Select value={selectedRate} onValueChange={setSelectedRate}>
              <SelectTrigger>
                <SelectValue placeholder="Choose rate type" />
              </SelectTrigger>
              <SelectContent>
                {rateProfiles.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleStartSession}
            disabled={loading || !selectedRate}
            className="w-full"
          >
            {loading ? "Starting..." : "Start Session"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StartSessionModal;
