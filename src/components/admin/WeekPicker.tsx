import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, max, min } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WeekPickerProps {
  date: Date;
  setDate: (date: Date) => void;
  minDate: Date;
  maxDate: Date;
  className?: string;
}

export function WeekPicker({ date, setDate, minDate, maxDate, className }: WeekPickerProps) {
  const weekStart = max([startOfWeek(date, { weekStartsOn: 0 }), minDate]);
  const weekEnd = min([endOfWeek(date, { weekStartsOn: 0 }), maxDate]);

  const handlePrevious = () => {
    const newDate = subWeeks(date, 1);
    if (endOfWeek(newDate, { weekStartsOn: 0 }) >= minDate) {
      setDate(newDate);
    } else {
      setDate(minDate); 
    }
  };

  const handleNext = () => {
    const newDate = addWeeks(date, 1);
    if (startOfWeek(newDate, { weekStartsOn: 0 }) <= maxDate) {
      setDate(newDate);
    }
  };

  const isPrevDisabled = weekStart <= minDate;
  const isNextDisabled = weekEnd >= maxDate;

  return (
    <div className={cn("flex items-center justify-between gap-2 bg-background p-1 rounded-md border border-input", className)}>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 hover:bg-zinc-800 hover:text-zinc-50"
        onClick={handlePrevious}
        disabled={isPrevDisabled}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      <span className="text-sm font-medium flex-1 text-center tabular-nums truncate px-2">
        {format(weekStart, "MMM dd")} - {format(weekEnd, "MMM dd")}
      </span>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 hover:bg-zinc-800 hover:text-zinc-50"
        onClick={handleNext}
        disabled={isNextDisabled}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}