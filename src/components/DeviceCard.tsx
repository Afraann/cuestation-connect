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
        "cursor-pointer transition-all duration-300 hover:scale-105",
        "border-2 p-6 min-h-[200px] flex flex-col justify-between",
        isOccupied
          ? "bg-occupied/10 border-occupied/50"
          : isPS5
          ? "bg-card border-ps5/30 hover:border-ps5/50 glow-ps5"
          : "bg-card border-billiard/30 hover:border-billiard/50 glow-billiard"
      )}
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          {isPS5 ? (
            <Gamepad2 className="h-8 w-8 text-ps5" />
          ) : (
            <Circle className="h-8 w-8 text-billiard" />
          )}
          <div>
            <h3 className="text-xl font-orbitron">{device.name}</h3>
            <p className="text-sm text-muted-foreground">
              {device.type === "PS5" ? "PlayStation 5" : "Billiard Table"}
            </p>
          </div>
        </div>
        <Badge
          variant={isOccupied ? "destructive" : "secondary"}
          className={cn(
            "font-orbitron",
            isOccupied && "animate-pulse-slow"
          )}
        >
          {isOccupied ? "BUSY" : "TAP TO START"}
        </Badge>
      </div>

      {isOccupied && device.current_session_id && (
        <div className="mt-4 text-sm text-muted-foreground">
          <p>Session in progress</p>
        </div>
      )}
    </Card>
  );
};

export default DeviceCard;
