import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, max, min } from "date-fns";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WeekPickerProps {
  date: Date;
  setDate: (date: Date) => void;
  minDate?: Date;
  className?: string;
}

export function WeekPicker({ date, setDate, minDate, className }: WeekPickerProps) {
  // Ensure we don't go before minDate (Nov 28, 2025)
  const effectiveMinDate = minDate || new Date(1970, 0, 1);
  const today = new Date();

  // Calculate start/end of the currently selected week
  const currentWeekStart = startOfWeek(date, { weekStartsOn: 1 }); // Monday start
  const currentWeekEnd = endOfWeek(date, { weekStartsOn: 1 });

  const handlePrevious = () => {
    const newDate = subWeeks(date, 1);
    // Prevent going back if the *end* of the previous week is before the start date
    if (endOfWeek(newDate, { weekStartsOn: 1 }) >= effectiveMinDate) {
      setDate(newDate);
    }
  };

  const handleNext = () => {
    const newDate = addWeeks(date, 1);
    if (startOfWeek(newDate, { weekStartsOn: 1 }) <= today) {
      setDate(newDate);
    }
  };

  // Disable buttons logic
  const isPrevDisabled = endOfWeek(subWeeks(date, 1), { weekStartsOn: 1 }) < effectiveMinDate;
  const isNextDisabled = startOfWeek(addWeeks(date, 1), { weekStartsOn: 1 }) > today;

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
      
      <div className="flex items-center gap-2 px-2 min-w-[140px] justify-center">
        <CalendarDays className="h-4 w-4 text-primary" />
        <span className="text-xs font-orbitron font-medium text-white">
          {format(currentWeekStart, "MMM dd")} - {format(currentWeekEnd, "MMM dd")}
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