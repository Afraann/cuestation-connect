import { format, addMonths, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MonthPickerProps {
  date: Date;
  setDate: (date: Date) => void;
  minDate?: Date;
  className?: string;
}

export function MonthPicker({ date, setDate, minDate, className }: MonthPickerProps) {
  const effectiveMinDate = minDate || new Date(1970, 0, 1);
  const today = new Date();

  const handlePrevious = () => {
    const newDate = subMonths(date, 1);
    if (endOfMonth(newDate) >= effectiveMinDate) {
      setDate(newDate);
    }
  };

  const handleNext = () => {
    const newDate = addMonths(date, 1);
    if (startOfMonth(newDate) <= today) {
      setDate(newDate);
    }
  };

  // Disable logic
  const isPrevDisabled = endOfMonth(subMonths(date, 1)) < effectiveMinDate;
  const isNextDisabled = startOfMonth(addMonths(date, 1)) > today;

  return (
    <div className={cn("flex items-center gap-2 bg-[#0f1115] border border-white/10 rounded-md p-1", className)}>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 hover:bg-white/5 text-muted-foreground hover:text-white"
        onClick={handlePrevious}
        disabled={isPrevDisabled}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      <div className="flex items-center gap-2 px-2 min-w-[120px] justify-center">
        <Calendar className="h-4 w-4 text-primary" />
        <span className="text-xs font-orbitron font-medium text-white">
          {format(date, "MMMM yyyy")}
        </span>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 hover:bg-white/5 text-muted-foreground hover:text-white"
        onClick={handleNext}
        disabled={isNextDisabled}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}