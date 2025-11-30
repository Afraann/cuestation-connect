import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, User, Menu } from "lucide-react";
import DeviceCard from "@/components/DeviceCard";
import StartSessionModal from "@/components/StartSessionModal";
import SessionManagerModal from "@/components/SessionManagerModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
    <div className="min-h-screen bg-background p-4 relative">
      
      {/* Floating Header / Menu Icon */}
      <div className="fixed top-4 right-4 z-50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="rounded-full h-10 w-10 bg-background/80 backdrop-blur border-primary/20 hover:bg-primary/10 shadow-lg">
              <Menu className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2">
              <User className="h-4 w-4" />
              <div className="flex flex-col">
                <span className="font-medium">{user?.username}</span>
                <span className="text-xs text-muted-foreground capitalize">{user?.role?.toLowerCase()}</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive gap-2 cursor-pointer">
              <LogOut className="h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Spatial Layout - Compact & Centered */}
      <div className="max-w-5xl mx-auto space-y-4 pt-12 md:pt-8">
        
        {/* Billiard Tables - Top Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {billiards.map((device) => (
            <DeviceCard
              key={device.id}
              device={device}
              onClick={() => handleDeviceClick(device)}
            />
          ))}
        </div>

        {/* PS5 Stations - U-Shape Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Left Column (PS5 1 & 2) */}
          <div className="space-y-4">
            {ps5s.slice(0, 2).map((device) => (
              <DeviceCard
                key={device.id}
                device={device}
                onClick={() => handleDeviceClick(device)}
              />
            ))}
          </div>

          {/* Center (PS5 3) - Aligned to top */}
          <div className="flex flex-col justify-start">
            {ps5s[2] && (
              <DeviceCard
                device={ps5s[2]}
                onClick={() => handleDeviceClick(ps5s[2])}
              />
            )}
          </div>

          {/* Right Column (PS5 4 & 5) */}
          <div className="space-y-4">
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