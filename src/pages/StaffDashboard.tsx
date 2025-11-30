import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut } from "lucide-react";
import DeviceCard from "@/components/DeviceCard";
import StartSessionModal from "@/components/StartSessionModal";
import SessionManagerModal from "@/components/SessionManagerModal";

interface Device {
  id: string;
  name: string;
  type: "PS5" | "BILLIARDS";
  status: "AVAILABLE" | "OCCUPIED";
  current_session_id: string | null;
  sort_order: number;
}

interface Session {
  id: string;
  start_time: string;
  rate_profile_id: string;
}

const StaffDashboard = () => {
  const { logout, user } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);

  useEffect(() => {
    fetchDevices();
    
    // Subscribe to device changes
    const channel = supabase
      .channel("devices-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "devices",
        },
        () => {
          fetchDevices();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchDevices = async () => {
    const { data, error } = await supabase
      .from("devices")
      .select("*")
      .order("sort_order");

    if (error) {
      console.error("Error fetching devices:", error);
      return;
    }

    setDevices(data || []);
  };

  const handleDeviceClick = async (device: Device) => {
    setSelectedDevice(device);
    
    if (device.status === "AVAILABLE") {
      setIsStartModalOpen(true);
    } else {
      // Fetch current session
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("id", device.current_session_id)
        .single();

      if (error) {
        console.error("Error fetching session:", error);
        return;
      }

      setCurrentSession(data);
      setIsSessionModalOpen(true);
    }
  };

  const billiards = devices.filter((d) => d.type === "BILLIARDS");
  const ps5s = devices.filter((d) => d.type === "PS5");

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-orbitron text-gradient-ps5">
          THE CUESTATION
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground">
            {user?.username} ({user?.role})
          </span>
          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Spatial Layout */}
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Billiard Tables - Top */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {billiards.map((device) => (
            <DeviceCard
              key={device.id}
              device={device}
              onClick={() => handleDeviceClick(device)}
            />
          ))}
        </div>

        {/* PS5 Stations - U-Shape Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {ps5s.slice(0, 2).map((device) => (
              <DeviceCard
                key={device.id}
                device={device}
                onClick={() => handleDeviceClick(device)}
              />
            ))}
          </div>

          {/* Center */}
          <div className="flex flex-col justify-start">
            {ps5s[2] && (
              <DeviceCard
                device={ps5s[2]}
                onClick={() => handleDeviceClick(ps5s[2])}
              />
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {ps5s.slice(3, 5).map((device) => (
              <DeviceCard
                key={device.id}
                device={device}
                onClick={() => handleDeviceClick(device)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      {selectedDevice && (
        <>
          <StartSessionModal
            open={isStartModalOpen}
            onOpenChange={setIsStartModalOpen}
            device={selectedDevice}
            onSessionStarted={() => {
              setIsStartModalOpen(false);
              fetchDevices();
            }}
          />

          {currentSession && (
            <SessionManagerModal
              open={isSessionModalOpen}
              onOpenChange={setIsSessionModalOpen}
              device={selectedDevice}
              session={currentSession}
              onSessionEnded={() => {
                setIsSessionModalOpen(false);
                fetchDevices();
              }}
            />
          )}
        </>
      )}
    </div>
  );
};

export default StaffDashboard;
