import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, User, Menu, BarChart3, Receipt } from "lucide-react";
import DeviceCard from "@/components/DeviceCard";
import StartSessionModal from "@/components/StartSessionModal";
import SessionManagerModal from "@/components/SessionManagerModal";
import DailyStatsModal from "@/components/DailyStatsModal";
import AddExpenseModal from "@/components/AddExpenseModal"; // Import the new component
import DirectSaleModal from "@/components/DirectSaleModal";
import { ShoppingCart } from "lucide-react"; // Add icon
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
  const [deviceSessions, setDeviceSessions] = useState<Record<string, string>>({});
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  
  // Modals state
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [isDailyStatsOpen, setIsDailyStatsOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false); // New state
  const [isDirectSaleOpen, setIsDirectSaleOpen] = useState(false);

  const [currentSession, setCurrentSession] = useState<Session | null>(null);

  useEffect(() => {
    fetchData();
    
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
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    const { data: devicesData, error: devicesError } = await supabase
      .from("devices")
      .select("*")
      .order("sort_order");

    if (devicesError) {
      console.error("Error fetching devices:", devicesError);
      return;
    }

    const { data: sessionsData, error: sessionsError } = await supabase
      .from("sessions")
      .select("device_id, start_time")
      .eq("status", "ACTIVE");

    if (sessionsError) {
      console.error("Error fetching active sessions:", sessionsError);
    }

    const sessionsMap: Record<string, string> = {};
    if (sessionsData) {
      sessionsData.forEach((session) => {
        sessionsMap[session.device_id] = session.start_time;
      });
    }

    setDevices(devicesData || []);
    setDeviceSessions(sessionsMap);
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
      
      <div className="fixed top-4 right-4 z-50 flex gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="rounded-full h-10 w-10 bg-background/80 backdrop-blur border-primary/20 shadow-lg hover:bg-zinc-800">
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
            
            <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => setIsDailyStatsOpen(true)}>
              <BarChart3 className="h-4 w-4" />
              Today's Collection
            </DropdownMenuItem>

            <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => setIsExpenseModalOpen(true)}>
              <Receipt className="h-4 w-4" />
              Record Expense
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive gap-2 cursor-pointer">
              <LogOut className="h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="max-w-5xl mx-auto space-y-4 pt-12 md:pt-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {billiards.map((device) => (
            <DeviceCard
              key={device.id}
              device={device}
              startTime={deviceSessions[device.id]}
              onClick={() => handleDeviceClick(device)}
              className="[&_svg]:text-white"
            />
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-4">
            {ps5s.slice(0, 2).map((device) => (
              <DeviceCard
                key={device.id}
                device={device}
                startTime={deviceSessions[device.id]}
                onClick={() => handleDeviceClick(device)}
                className="[&_svg]:text-white"
              />
            ))}
          </div>

          <div className="flex flex-col justify-start">
            {ps5s[2] && (
              <DeviceCard
                device={ps5s[2]}
                startTime={deviceSessions[ps5s[2].id]}
                onClick={() => handleDeviceClick(ps5s[2])}
                className="[&_svg]:text-white"
              />
            )}
          </div>

          <div className="space-y-4">
            {ps5s.slice(3, 5).map((device) => (
              <DeviceCard
                key={device.id}
                device={device}
                startTime={deviceSessions[device.id]}
                onClick={() => handleDeviceClick(device)}
                className="[&_svg]:text-white"
              />
            ))}
          </div>
        </div>
      </div>

      {selectedDevice && (
        <>
          <StartSessionModal
            open={isStartModalOpen}
            onOpenChange={setIsStartModalOpen}
            device={selectedDevice}
            onSessionStarted={() => {
              setIsStartModalOpen(false);
              fetchData();
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
                fetchData();
              }}
            />
          )}
        </>
      )}

      {/* Stats Modal */}
      <DailyStatsModal 
        open={isDailyStatsOpen} 
        onOpenChange={setIsDailyStatsOpen} 
      />

      {/* Add Expense Modal */}
      <AddExpenseModal
        open={isExpenseModalOpen}
        onOpenChange={setIsExpenseModalOpen}
      />

      {/* Direct Sale Button - Floating Bottom Right for Mobile Access */}
      <div className="fixed bottom-6 right-6 z-40">
          <Button 
              className="h-14 w-14 rounded-full shadow-xl bg-primary hover:bg-primary/90 glow-ps5"
              onClick={() => setIsDirectSaleOpen(true)}
          >
              <ShoppingCart className="h-6 w-6 text-primary-foreground" />
          </Button>
      </div>

      {/* Direct Sale Modal */}
      <DirectSaleModal 
          open={isDirectSaleOpen} 
          onOpenChange={setIsDirectSaleOpen} 
      />

    </div>
  );
};

export default StaffDashboard;