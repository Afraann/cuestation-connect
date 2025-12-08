import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, User, Menu, BarChart3, Receipt, Refrigerator, RotateCcw } from "lucide-react";
import DeviceCard from "@/components/DeviceCard";
import StartSessionModal from "@/components/StartSessionModal";
import SessionManagerModal from "@/components/SessionManagerModal";
import DailyStatsModal from "@/components/DailyStatsModal";
import AddExpenseModal from "@/components/AddExpenseModal";
import DirectSaleModal from "@/components/DirectSaleModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Device {
  id: string;
  name: string;
  type: "PS5" | "BILLIARDS" | "CARROM";
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
  const [layout, setLayout] = useState<"default" | "rotated">("default");
  
  // Modals state
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [isDailyStatsOpen, setIsDailyStatsOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
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

    setDevices((devicesData as unknown as Device[]) || []);
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

  // Helper to safely get device by name (fuzzy match)
  const getDevice = (namePart: string) => devices.find(d => d.name.toLowerCase().includes(namePart.toLowerCase()));

  // Categorized lists for Default View
  const billiards = devices.filter((d) => d.type === "BILLIARDS");
  const ps5s = devices.filter((d) => d.type === "PS5");
  const carroms = devices.filter((d) => d.type === "CARROM");

  return (
    <div className="min-h-screen bg-background p-4 relative overflow-x-hidden">
      
      <div className="fixed top-4 right-4 z-50 flex gap-3 items-center">
        {/* Layout Toggle Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="outline" 
              size="icon" 
              className="rounded-full h-10 w-10 bg-background/80 backdrop-blur border-primary/20 shadow-lg hover:bg-zinc-800"
              onClick={() => setLayout(prev => prev === "default" ? "rotated" : "default")}
            >
              <RotateCcw className={`h-5 w-5 transition-transform duration-500 ${layout === "rotated" ? "-rotate-90 text-primary" : ""}`} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Rotate Layout</p>
          </TooltipContent>
        </Tooltip>

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

      <div className="pt-16 md:pt-8 pb-20">
        {layout === "default" ? (
          /* ================= DEFAULT LAYOUT (Horizontal) ================= */
          <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-500">
            {/* Billiards Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {billiards.map((device) => (
                <DeviceCard
                  key={device.id}
                  device={device}
                  startTime={deviceSessions[device.id]}
                  onClick={() => handleDeviceClick(device)}
                  className="[&_svg]:text-white h-full"
                />
              ))}
            </div>

            {/* Consoles Section */}
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

              <div className="flex flex-col gap-4 justify-start">
                {ps5s[2] && (
                  <DeviceCard
                    device={ps5s[2]}
                    startTime={deviceSessions[ps5s[2].id]}
                    onClick={() => handleDeviceClick(ps5s[2])}
                    className="[&_svg]:text-white"
                  />
                )}
                {carroms[0] && (
                  <DeviceCard
                    device={carroms[0]}
                    startTime={deviceSessions[carroms[0].id]}
                    onClick={() => handleDeviceClick(carroms[0])}
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
        ) : (
          /* ================= ROTATED LAYOUT (Vertical) ================= */
          /* Logic: Centered, Specific Stacking */
          <div className="max-w-7xl mx-auto flex flex-row justify-center gap-8 h-full animate-in fade-in slide-in-from-right-4 duration-500 p-4 overflow-x-auto">
            
            {/* 1. Billiards Column (Stacked Vertically: Pool-2 Top -> Pool-1 Bottom) */}
            <div className="flex flex-col gap-4 min-w-[280px] w-full max-w-sm">
               <div className="bg-card/30 border border-border/30 rounded-lg p-2 text-center shrink-0">
                <span className="text-xs font-orbitron text-muted-foreground uppercase tracking-widest text-[10px]">Billiards</span>
              </div>
              
              {[getDevice("Pool-02"), getDevice("Pool-01")].map((dev) => 
                dev && (
                  <div key={dev.id} className="flex-1 min-h-[160px]">
                    <DeviceCard
                      device={dev}
                      startTime={deviceSessions[dev.id]}
                      onClick={() => handleDeviceClick(dev)}
                      className="[&_svg]:text-white h-full w-full"
                    />
                  </div>
                )
              )}
            </div>

            {/* 2. Consoles Area (2 Columns) */}
            <div className="flex gap-4 min-w-[580px]">
               {/* Left Stack: PS5-04 -> PS5-03 -> PS5-02 */}
               <div className="flex flex-col gap-4 w-full max-w-sm">
                  <div className="bg-card/30 border border-border/30 rounded-lg p-2 text-center shrink-0">
                    <span className="text-xs font-orbitron text-muted-foreground uppercase tracking-widest text-[10px]">Row A</span>
                  </div>
                  {[getDevice("PS5-04"), getDevice("PS5-03"), getDevice("PS5-02")].map((dev) => 
                    dev && (
                      <div key={dev.id} className="flex-1 min-h-[140px]">
                        <DeviceCard
                          device={dev}
                          startTime={deviceSessions[dev.id]}
                          onClick={() => handleDeviceClick(dev)}
                          className="[&_svg]:text-white h-full w-full"
                        />
                      </div>
                    )
                  )}
               </div>

               {/* Right Stack: PS5-05 -> Carrom-01 -> PS5-01 */}
               <div className="flex flex-col gap-4 w-full max-w-sm">
                  <div className="bg-card/30 border border-border/30 rounded-lg p-2 text-center shrink-0">
                    <span className="text-xs font-orbitron text-muted-foreground uppercase tracking-widest text-[10px]">Row B</span>
                  </div>
                  {[getDevice("PS5-05"), getDevice("Carrom"), getDevice("PS5-01")].map((dev) => 
                    dev && (
                      <div key={dev.id} className="flex-1 min-h-[140px]">
                        <DeviceCard
                          device={dev}
                          startTime={deviceSessions[dev.id]}
                          onClick={() => handleDeviceClick(dev)}
                          className="[&_svg]:text-white h-full w-full"
                        />
                      </div>
                    )
                  )}
               </div>
            </div>

          </div>
        )}
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
              className="h-14 px-6 rounded-xl shadow-xl bg-primary hover:bg-primary/90 glow-ps5 flex gap-2 items-center"
              onClick={() => setIsDirectSaleOpen(true)}
          >
              <Refrigerator className="h-5 w-5 text-primary-foreground" />
              <span className="font-orbitron text-primary-foreground">Juice/Snacks Counter</span>
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