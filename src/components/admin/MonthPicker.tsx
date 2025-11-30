import { format, addMonths, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MonthPickerProps {
  date: Date;
  setDate: (date: Date) => void;
  minDate: Date;
  maxDate: Date;
  className?: string;
}

export function MonthPicker({ date, setDate, minDate, maxDate, className }: MonthPickerProps) {
  const handlePrevious = () => {
    const newDate = subMonths(date, 1);
    if (endOfMonth(newDate) >= minDate) {
      setDate(newDate);
    } else {
      setDate(minDate);
    }
  };

  const handleNext = () => {
    const newDate = addMonths(date, 1);
    if (startOfMonth(newDate) <= maxDate) {
      setDate(newDate);
    }
  };

  const isPrevDisabled = startOfMonth(date) <= startOfMonth(minDate);
  const isNextDisabled = endOfMonth(date) >= endOfMonth(maxDate);

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
      
      <span className="text-sm font-medium flex-1 text-center truncate px-2">
        {format(date, "MMMM yyyy")}
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