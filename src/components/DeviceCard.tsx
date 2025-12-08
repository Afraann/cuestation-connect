import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gamepad2, Circle, Clock, LayoutGrid, Hourglass } from "lucide-react";
import { cn } from "@/lib/utils";

interface Device {
  id: string;
  name: string;
  type: "PS5" | "BILLIARDS" | "CARROM";
  status: "AVAILABLE" | "OCCUPIED";
  current_session_id: string | null;
}

interface DeviceCardProps {
  device: Device;
  startTime?: string;
  plannedDuration?: number | null; // NEW PROP
  onClick: () => void;
  className?: string;
}

const DeviceCard = ({ device, startTime, plannedDuration, onClick, className }: DeviceCardProps) => {
  const isOccupied = device.status === "OCCUPIED";
  const isPS5 = device.type === "PS5";
  const isCarrom = device.type === "CARROM";
  
  const [displayTime, setDisplayTime] = useState("");
  const [isOvertime, setIsOvertime] = useState(false);
  const [isLowTime, setIsLowTime] = useState(false);

  useEffect(() => {
    if (!isOccupied || !startTime) {
      setDisplayTime("");
      setIsOvertime(false);
      setIsLowTime(false);
      return;
    }

    const updateTimer = () => {
      const start = new Date(startTime);
      const now = new Date();
      const elapsedMinutes = (now.getTime() - start.getTime()) / 60000;

      if (plannedDuration) {
        // --- FIXED DURATION LOGIC ---
        const remaining = plannedDuration - elapsedMinutes;
        
        // Low Time Warning: Less than 5 mins remaining, but not yet expired
        setIsLowTime(remaining <= 5 && remaining > 0);

        if (remaining >= 0) {
          // Normal Countdown
          const hours = Math.floor(remaining / 60);
          const minutes = Math.floor(remaining % 60);
          const seconds = Math.floor((remaining * 60) % 60); // Optional: add seconds for urgency if needed
          setDisplayTime(`${hours}h ${minutes}m`);
          setIsOvertime(false);
        } else {
          // Overtime (Count UP)
          const overtime = Math.abs(remaining);
          const hours = Math.floor(overtime / 60);
          const minutes = Math.floor(overtime % 60);
          setDisplayTime(`+ ${hours}h ${minutes}m`);
          setIsOvertime(true);
          setIsLowTime(true); // Keep visual alert active during overtime
        }
      } else {
        // --- OPEN DURATION LOGIC (Standard Count Up) ---
        const hours = Math.floor(elapsedMinutes / 60);
        const minutes = Math.floor(elapsedMinutes % 60);
        setDisplayTime(`${hours}h ${minutes}m`);
        setIsOvertime(false);
        setIsLowTime(false);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 30000); // Update every 30s is enough for minutes

    return () => clearInterval(interval);
  }, [isOccupied, startTime, plannedDuration]);

  // Visual Styles
  const getBorderColor = () => {
    if (!isOccupied) return isPS5 ? "border-ps5/30 hover:border-ps5/50" : isCarrom ? "border-amber-500/30 hover:border-amber-500/50" : "border-billiard/30 hover:border-billiard/50";
    if (isOvertime) return "border-destructive animate-pulse"; // Red Alert
    if (isLowTime) return "border-orange-500 animate-pulse"; // Warning
    return "border-occupied/50";
  };

  return (
    <Card
      onClick={onClick}
      className={cn(
        "cursor-pointer transition-all duration-300",
        "border-2 p-4 min-h-[140px] flex flex-col justify-between",
        // Background Logic
        isOccupied ? "bg-occupied/10" : "bg-card",
        // Dynamic Border
        getBorderColor(),
        // Glow effects
        !isOccupied && isPS5 && "glow-ps5",
        !isOccupied && !isPS5 && !isCarrom && "glow-billiard",
        !isOccupied && isCarrom && "shadow-[0_0_15px_rgba(245,158,11,0.15)]",
        className
      )}
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          {isPS5 ? (
            <Gamepad2 className="h-6 w-6" />
          ) : isCarrom ? (
            <LayoutGrid className="h-6 w-6 text-amber-500" />
          ) : (
            <Circle className="h-6 w-6" />
          )}
          <div>
            <h3 className="text-lg font-orbitron leading-none">{device.name}</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {isPS5 ? "PlayStation 5" : isCarrom ? "Carrom Board" : "Billiard Table"}
            </p>
          </div>
        </div>
        <Badge
          variant={isOccupied ? "destructive" : "secondary"}
          className={cn(
            "font-orbitron text-[10px] px-1.5 py-0.5",
            isOccupied && "animate-pulse-slow"
          )}
        >
          {isOccupied ? "BUSY" : "START"}
        </Badge>
      </div>

      {isOccupied && device.current_session_id && (
        <div className="mt-2">
          <div className={cn(
            "flex items-center gap-1.5 font-orbitron text-base transition-colors duration-300",
            isOvertime ? "text-destructive font-bold" : isLowTime ? "text-orange-400" : "text-white"
          )}>
            {plannedDuration ? <Hourglass className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
            <span>{displayTime}</span>
            {isOvertime && <span className="text-[10px] ml-1">OVERDUE</span>}
          </div>
          <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
            {plannedDuration ? "TIME REMAINING" : "PLAYING"}
          </p>
        </div>
      )}
    </Card>
  );
};

export default DeviceCard;