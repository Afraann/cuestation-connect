import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gamepad2, Circle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Device {
  id: string;
  name: string;
  type: "PS5" | "BILLIARDS";
  status: "AVAILABLE" | "OCCUPIED";
  current_session_id: string | null;
}

interface DeviceCardProps {
  device: Device;
  startTime?: string;
  onClick: () => void;
  className?: string; // Added className prop
}

const DeviceCard = ({ device, startTime, onClick, className }: DeviceCardProps) => {
  const isOccupied = device.status === "OCCUPIED";
  const isPS5 = device.type === "PS5";
  const [elapsedTime, setElapsedTime] = useState("");

  useEffect(() => {
    if (!isOccupied || !startTime) {
      setElapsedTime("");
      return;
    }

    const updateTimer = () => {
      const start = new Date(startTime);
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - start.getTime()) / 60000);
      
      const hours = Math.floor(diffInMinutes / 60);
      const minutes = diffInMinutes % 60;
      
      setElapsedTime(`${hours}h ${minutes}m`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [isOccupied, startTime]);

  return (
    <Card
      onClick={onClick}
      className={cn(
        "cursor-pointer transition-all duration-300",
        "border-2 p-6 min-h-[160px] flex flex-col justify-between", 
        isOccupied
          ? "bg-occupied/10 border-occupied/50"
          : isPS5
          ? "bg-card border-ps5/30 hover:border-ps5/50 glow-ps5"
          : "bg-card border-billiard/30 hover:border-billiard/50 glow-billiard",
        className // Apply className
      )}
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          {isPS5 ? (
            <Gamepad2 className="h-8 w-8" /> // Removed text-ps5, color will be inherited or overridden
          ) : (
            <Circle className="h-8 w-8" /> // Removed text-billiard, color will be inherited or overridden
          )}
          <div>
            <h3 className="text-xl font-orbitron leading-none">{device.name}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {device.type === "PS5" ? "PlayStation 5" : "Billiard Table"}
            </p>
          </div>
        </div>
        <Badge
          variant={isOccupied ? "destructive" : "secondary"}
          className={cn(
            "font-orbitron text-xs px-2.5 py-1",
            isOccupied && "animate-pulse-slow"
          )}
        >
          {isOccupied ? "BUSY" : "START"}
        </Badge>
      </div>

      {isOccupied && device.current_session_id && (
        <div className="mt-3">
          <div className="flex items-center gap-2 text-white font-orbitron text-lg">
            <Clock className="h-4 w-4" />
            <span>{elapsedTime}</span>
          </div>
          <p className="text-xs text-muted-foreground font-medium mt-1">PLAYING</p>
        </div>
      )}
    </Card>
  );
};

export default DeviceCard;