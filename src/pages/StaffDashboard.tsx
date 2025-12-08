import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, User, Menu, BarChart3, Receipt, RotateCcw, Refrigerator, Gamepad, LayoutGrid, Settings, FileText, ShoppingCart, UserCircle, ChevronRight } from "lucide-react";
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
import { useNavigate } from "react-router-dom";

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
  transfer_amount: number;
  transfer_session_id: string | null;
  planned_duration: number | null;
}

interface SessionData {
  startTime: string;
  plannedDuration: number | null;
  profileName?: string;
}

const StaffDashboard = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceSessions, setDeviceSessions] = useState<Record<string, SessionData>>({});
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [layout, setLayout] = useState<"default" | "rotated">("default");
  
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
      .on("postgres_changes", { event: "*", schema: "public", table: "devices" }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
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
      .select(`
        device_id, 
        start_time, 
        planned_duration,
        rate_profiles (
          name
        )
      `)
      .eq("status", "ACTIVE");

    if (sessionsError) {
      console.error("Error fetching active sessions:", sessionsError);
    }

    const sessionsMap: Record<string, SessionData> = {};
    if (sessionsData) {
      sessionsData.forEach((session: any) => {
        sessionsMap[session.device_id] = {
          startTime: session.start_time,
          plannedDuration: session.planned_duration,
          profileName: session.rate_profiles?.name
        };
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
      const { data } = await supabase
        .from("sessions")
        .select("*")
        .eq("id", device.current_session_id)
        .single();
      setCurrentSession(data);
      setIsSessionModalOpen(true);
    }
  };

  const getDevice = (namePart: string) => devices.find(d => d.name.toLowerCase().includes(namePart.toLowerCase()));
  const billiards = devices.filter((d) => d.type === "BILLIARDS");
  const ps5s = devices.filter((d) => d.type === "PS5");
  const carroms = devices.filter((d) => d.type === "CARROM");

  // STRICT Logic for 1P, 2P, 3P, 4P
  const getPlayerCountBadge = (deviceId: string) => {
    const name = deviceSessions[deviceId]?.profileName || "";
    const lowerName = name.toLowerCase();
    
    if (lowerName.includes("4")) return "4P";
    if (lowerName.includes("3")) return "3P";
    if (lowerName.includes("2") || lowerName.includes("multi") || lowerName.includes("double")) return "2P";
    if (lowerName.includes("1") || lowerName.includes("single")) return "1P";
    
    return undefined;
  };

  const renderCard = (device: Device, className?: string) => (
    <DeviceCard
      key={device.id}
      device={device}
      startTime={deviceSessions[device.id]?.startTime}
      plannedDuration={deviceSessions[device.id]?.plannedDuration}
      playerCount={getPlayerCountBadge(device.id)}
      onClick={() => handleDeviceClick(device)}
      className={className || "[&_svg]:text-white"}
    />
  );

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />

      {/* Header */}
      <div className="relative z-50 mb-4 flex justify-between items-center bg-card/40 backdrop-blur-md p-3 px-4 rounded-xl border border-white/5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-primary/20 rounded-lg flex items-center justify-center text-primary overflow-hidden">
             <img src="/logo.jpg" className="h-full w-full object-cover opacity-90" alt="Logo" />
          </div>
          <div>
             <h1 className="text-base font-orbitron font-bold text-foreground">THE CUESTATION</h1>
             <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Logged in as {user?.username || 'Staff'}</p>
          </div>
        </div>

        <div className="flex gap-2">
           <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setLayout(prev => prev === "default" ? "rotated" : "default")}
                className="hover:bg-zinc-800 h-9 w-9"
              >
                <RotateCcw className={`h-4 w-4 transition-transform duration-500 ${layout === "rotated" ? "text-primary -rotate-90" : "text-muted-foreground"}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Switch Layout</p></TooltipContent>
          </Tooltip>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-md hover:bg-white/5">
                <Menu className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-2">
              
              {/* Profile Section */}
              <div className="flex items-center gap-3 p-2 mb-2 rounded-lg bg-white/5 border border-white/5">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-blue-600/20 flex items-center justify-center border border-white/10">
                   <UserCircle className="h-6 w-6 text-primary" />
                </div>
                <div className="flex flex-col flex-1 overflow-hidden">
                   <span className="text-sm font-bold truncate text-foreground">{user?.username}</span>
                   <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{user?.role?.toLowerCase() || 'Access Level'}</span>
                </div>
              </div>

              <DropdownMenuLabel className="px-2 mt-2">Operations</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setIsDailyStatsOpen(true)} className="gap-3">
                <div className="h-6 w-6 rounded bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <BarChart3 className="h-3.5 w-3.5" />
                </div>
                <span>Daily Stats</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsExpenseModalOpen(true)} className="gap-3">
                <div className="h-6 w-6 rounded bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <Receipt className="h-3.5 w-3.5" />
                </div>
                <span>Expenses</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsDirectSaleOpen(true)} className="gap-3">
                <div className="h-6 w-6 rounded bg-blue-500/10 flex items-center justify-center text-blue-500">
                  <ShoppingCart className="h-3.5 w-3.5" />
                </div>
                <span>Counter Sale</span>
              </DropdownMenuItem>

              {user?.role === 'ADMIN' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="px-2">Administration</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => navigate("/admin")} className="gap-3 group">
                    <div className="h-6 w-6 rounded bg-purple-500/10 flex items-center justify-center text-purple-500 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                      <Settings className="h-3.5 w-3.5" />
                    </div>
                    <span className="flex-1">Admin Panel</span>
                    <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:text-foreground" />
                  </DropdownMenuItem>
                </>
              )}

              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-red-400 focus:text-red-400 hover:bg-red-500/10 focus:bg-red-500/10 gap-3">
                <LogOut className="h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="relative z-10 flex-1 pt-4"> {/* Increased Spacing from Header */}
        {layout === "default" ? (
          /* "Lil Bigger Width" - Increased max-w to 7xl */
          <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-500 pt-6">
            <div className="grid grid-cols-2 gap-4">
              {billiards.map((device) => renderCard(device))}
            </div>
            
            <div className="grid grid-cols-3 gap-4">
               {/* Left Column */}
               <div className="space-y-4">
                  {ps5s[0] && renderCard(ps5s[0], "[&_svg]:text-white")}
                  {ps5s[1] && renderCard(ps5s[1], "[&_svg]:text-white")}
               </div>
               
               {/* Middle Column */}
               <div className="space-y-4">
                  {ps5s[2] && renderCard(ps5s[2], "[&_svg]:text-white")}
                  {carroms[0] && renderCard(carroms[0], "[&_svg]:text-white")}
               </div>

               {/* Right Column */}
               <div className="space-y-4">
                  {ps5s[3] && renderCard(ps5s[3], "[&_svg]:text-white")}
                  {ps5s[4] && renderCard(ps5s[4], "[&_svg]:text-white")}
               </div>
            </div>
          </div>
        ) : (
          /* Rotated Layout */
          <div className="flex justify-center gap-6 h-full pt-8 overflow-x-auto">
            <div className="flex flex-col gap-4 min-w-[240px]">
              <div className="text-xs text-center uppercase tracking-widest text-muted-foreground">Pool</div>
              {getDevice("Pool-02") && renderCard(getDevice("Pool-02")!)}
              {getDevice("Pool-01") && renderCard(getDevice("Pool-01")!)}
            </div>
            <div className="flex flex-col gap-4 min-w-[240px]">
              <div className="text-xs text-center uppercase tracking-widest text-muted-foreground">Row A</div>
              {getDevice("PS5-04") && renderCard(getDevice("PS5-04")!)}
              {getDevice("PS5-03") && renderCard(getDevice("PS5-03")!)}
              {getDevice("PS5-02") && renderCard(getDevice("PS5-02")!)}
            </div>
            <div className="flex flex-col gap-4 min-w-[240px]">
              <div className="text-xs text-center uppercase tracking-widest text-muted-foreground">Row B</div>
              {getDevice("PS5-05") && renderCard(getDevice("PS5-05")!)}
              {getDevice("Carrom") && renderCard(getDevice("Carrom")!)}
              {getDevice("PS5-01") && renderCard(getDevice("PS5-01")!)}
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

      <DailyStatsModal open={isDailyStatsOpen} onOpenChange={setIsDailyStatsOpen} />
      <AddExpenseModal open={isExpenseModalOpen} onOpenChange={setIsExpenseModalOpen} />
      <DirectSaleModal open={isDirectSaleOpen} onOpenChange={setIsDirectSaleOpen} />
      
      <div className="fixed bottom-4 right-4 z-40">
          <Button 
              className="h-14 px-10 shadow-lg bg-primary/10 backdrop-blur-md border border-primary/20 hover:bg-primary/20 text-primary flex gap-2 items-center transition-all"
              onClick={() => setIsDirectSaleOpen(true)}
          >
              <Refrigerator className="h-5 w-5" />
              <span className="font-orbitron font-bold text-[10px] tracking-wide">Juice/Snacks Counter</span>
          </Button>
      </div>
    </div>
  );
};

export default StaffDashboard;