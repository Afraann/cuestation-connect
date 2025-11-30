import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, max, min } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WeekPickerProps {
  date: Date;
  setDate: (date: Date) => void;
  minDate: Date;
  maxDate: Date;
}

export function WeekPicker({ date, setDate, minDate, maxDate }: WeekPickerProps) {
  // Calculate the effective start and end of the current week view
  // Week starts on Sunday (default for startOfWeek)
  const weekStart = max([startOfWeek(date), minDate]);
  const weekEnd = min([endOfWeek(date), maxDate]);

  const handlePrevious = () => {
    const newDate = subWeeks(date, 1);
    if (endOfWeek(newDate) >= minDate) {
      setDate(newDate);
    } else {
      // If subtracting a week goes strictly before minDate, snap to minDate
      setDate(minDate); 
    }
  };

  const handleNext = () => {
    const newDate = addWeeks(date, 1);
    if (startOfWeek(newDate) <= maxDate) {
      setDate(newDate);
    }
  };

  // Disable "Previous" if the current week's start is already at or before the business start
  const isPrevDisabled = weekStart <= minDate;
  
  // Disable "Next" if the current week's end is today or in the future
  const isNextDisabled = weekEnd >= maxDate;

  return (
    <div className="flex items-center justify-center gap-2 bg-background/50 p-1 rounded-md border border-input shadow-sm">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={handlePrevious}
        disabled={isPrevDisabled}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      <span className="text-sm font-medium w-32 text-center tabular-nums">
        {format(weekStart, "MMM dd")} - {format(weekEnd, "MMM dd")}
      </span>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={handleNext}
        disabled={isNextDisabled}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}