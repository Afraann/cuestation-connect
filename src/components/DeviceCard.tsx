import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gamepad2, Circle } from "lucide-react";
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
  onClick: () => void;
}

const DeviceCard = ({ device, onClick }: DeviceCardProps) => {
  const isOccupied = device.status === "OCCUPIED";
  const isPS5 = device.type === "PS5";

  return (
    <Card
      onClick={onClick}
      className={cn(
        "cursor-pointer transition-all duration-300", // Removed hover:scale-105
        // Increased padding (p-6) and min-height (min-h-[160px])
        "border-2 p-6 min-h-[160px] flex flex-col justify-between", 
        isOccupied
          ? "bg-occupied/10 border-occupied/50"
          : isPS5
          ? "bg-card border-ps5/30 hover:border-ps5/50 glow-ps5"
          : "bg-card border-billiard/30 hover:border-billiard/50 glow-billiard"
      )}
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4"> {/* Increased gap */}
          {isPS5 ? (
            <Gamepad2 className="h-8 w-8 text-ps5" /> // Increased icon size
          ) : (
            <Circle className="h-8 w-8 text-billiard" /> // Increased icon size
          )}
          <div>
            <h3 className="text-xl font-orbitron leading-none">{device.name}</h3> {/* Increased font size */}
            <p className="text-sm text-muted-foreground mt-1"> {/* Increased font size */}
              {device.type === "PS5" ? "PlayStation 5" : "Billiard Table"}
            </p>
          </div>
        </div>
        <Badge
          variant={isOccupied ? "destructive" : "secondary"}
          className={cn(
            "font-orbitron text-xs px-2.5 py-1", // Increased badge size
            isOccupied && "animate-pulse-slow"
          )}
        >
          {isOccupied ? "BUSY" : "START"}
        </Badge>
      </div>

      {isOccupied && device.current_session_id && (
        <div className="mt-3 text-sm text-muted-foreground font-medium"> {/* Increased margin and font size */}
          <p>Session in progress</p>
        </div>
      )}
    </Card>
  );
};

export default DeviceCard;