import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gamepad2, Target, Clock, Hourglass, Zap, ArrowRight, Users, AlertTriangle } from "lucide-react";
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
  plannedDuration?: number | null;
  playerCount?: string; // Expecting "1P", "2P", "3P", "4P"
  onClick: () => void;
  className?: string;
}

const DeviceCard = ({ device, startTime, plannedDuration, playerCount, onClick, className }: DeviceCardProps) => {
  const isOccupied = device.status === "OCCUPIED";
  const isPS5 = device.type === "PS5";
  
  const [displayTime, setDisplayTime] = useState("0h 0m");
  const [isOvertime, setIsOvertime] = useState(false);
  const [isLowTime, setIsLowTime] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isOccupied || !startTime) {
      setDisplayTime("");
      setIsOvertime(false);
      setIsLowTime(false);
      setProgress(0);
      return;
    }

    const updateTimer = () => {
      const start = new Date(startTime);
      const now = new Date();
      const elapsedMinutes = (now.getTime() - start.getTime()) / 60000;

      if (plannedDuration) {
        const remaining = plannedDuration - elapsedMinutes;
        const progressVal = Math.min(100, (elapsedMinutes / plannedDuration) * 100);
        setProgress(progressVal);

        // Warning Logic: Less than 5 mins remaining, but not yet overtime
        const lowTime = remaining <= 5 && remaining > 0;
        setIsLowTime(lowTime);

        if (remaining >= 0) {
          const hours = Math.floor(remaining / 60);
          const minutes = Math.floor(remaining % 60);
          setDisplayTime(`${hours}h ${minutes}m`);
          setIsOvertime(false);
        } else {
          const overtime = Math.abs(remaining);
          const hours = Math.floor(overtime / 60);
          const minutes = Math.floor(overtime % 60);
          setDisplayTime(`+${hours}h ${minutes}m`);
          setIsOvertime(true);
          setIsLowTime(false); // Clear low time if we hit overtime
        }
      } else {
        // Open sessions just count up
        const hours = Math.floor(elapsedMinutes / 60);
        const minutes = Math.floor(elapsedMinutes % 60);
        setDisplayTime(`${hours}h ${minutes}m`);
        setIsOvertime(false);
        setIsLowTime(false);
        setProgress(0); 
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 30000);
    return () => clearInterval(interval);
  }, [isOccupied, startTime, plannedDuration]);

  // Dynamic Styles based on State
  const getCardStyles = () => {
    if (!isOccupied) return isPS5 ? "hover:border-blue-500/50" : "hover:border-emerald-500/50";
    if (isOvertime) return "bg-red-950/10 border-red-500/50 shadow-[0_0_20px_-10px_rgba(239,68,68,0.3)]";
    if (isLowTime) return "bg-amber-950/10 border-amber-500/60 shadow-[0_0_20px_-10px_rgba(245,158,11,0.3)] animate-pulse-slow";
    return "bg-card/90 border-white/10";
  };

  const progressBarColor = isOvertime ? "bg-red-500" : isLowTime ? "bg-amber-500" : "bg-primary";

  return (
    <div className="relative group w-full h-32"> {/* Increased Height to h-32 */}
      <Card
        onClick={onClick}
        className={cn(
          "relative h-full w-full cursor-pointer overflow-hidden border transition-all duration-300",
          "flex flex-col justify-between p-4 rounded-xl shadow-md bg-[#0f1115]", // Increased Padding
          !isOccupied && "bg-card hover:bg-accent/5",
          getCardStyles(),
          className
        )}
      >
        {/* Progress Bar */}
        {isOccupied && plannedDuration && (
          <div 
            className={cn("absolute bottom-0 left-0 h-1 transition-all duration-1000", progressBarColor)}
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        )}

        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-9 w-9 rounded-lg flex items-center justify-center border transition-colors bg-background/50 shrink-0",
              isPS5 ? "text-blue-400 border-blue-500/20" : "text-emerald-400 border-emerald-500/20"
            )}>
              {isPS5 ? <Gamepad2 className="h-5 w-5" /> : <Target className="h-5 w-5" />}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-base font-bold font-orbitron truncate leading-none text-foreground mb-1">
                {device.name}
              </span>
              <span className="text-[10px] text-muted-foreground/60 uppercase font-medium truncate tracking-wider">
                {isPS5 ? "Console" : "Table"}
              </span>
            </div>
          </div>

          {/* Status Badge */}
          <div className="shrink-0">
            {isOccupied ? (
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] px-2 h-5 font-orbitron tracking-wider border-0",
                  isOvertime ? "bg-red-500/20 text-red-400 animate-pulse" :
                  isLowTime ? "bg-amber-500/20 text-amber-400 animate-pulse" :
                  "bg-zinc-800 text-zinc-400"
                )}
              >
                {isOvertime ? "OVER" : isLowTime ? "CLOSING" : "BUSY"}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] px-2 h-5 font-mono tracking-wider border-white/10 bg-emerald-500/10 text-emerald-400">
                FREE
              </Badge>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-end justify-between mt-1">
          {isOccupied ? (
            <>
              <div className="flex flex-col">
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-tight flex items-center gap-1.5 mb-0.5 transition-colors",
                  isLowTime ? "text-amber-500/80" : "text-muted-foreground"
                )}>
                  {isLowTime ? <AlertTriangle className="h-3 w-3" /> : (plannedDuration ? <Hourglass className="h-3 w-3" /> : <Clock className="h-3 w-3" />)}
                  {isOvertime ? "Overdue" : isLowTime ? "Almost Time" : "Time"}
                </span>
                <span className={cn(
                  "text-2xl font-black font-orbitron leading-none tracking-tight",
                  isOvertime ? "text-red-500" : isLowTime ? "text-amber-400" : "text-foreground"
                )}>
                  {displayTime}
                </span>
              </div>
              
              {/* Player Count Badge (Only if occupied) */}
              {playerCount && (
                <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 px-2 py-1 rounded text-[10px] text-primary font-bold font-orbitron mb-1">
                  <Users className="h-3 w-3" />
                  {playerCount}
                </div>
              )}
              
              {/* Visual Icon if no player count */}
              {!playerCount && (
                <Zap className={cn("h-6 w-6 opacity-20", isOvertime ? "text-red-500" : isLowTime ? "text-amber-500" : "text-primary")} />
              )}
            </>
          ) : (
            <div className="w-full flex items-center justify-between text-muted-foreground/40 text-xs pt-2 group-hover:text-muted-foreground transition-colors">
              <span>Start Session</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default DeviceCard;