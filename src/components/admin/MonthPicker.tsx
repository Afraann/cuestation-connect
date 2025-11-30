import { format, addMonths, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MonthPickerProps {
  date: Date;
  setDate: (date: Date) => void;
  minDate: Date;
  maxDate: Date;
}

export function MonthPicker({ date, setDate, minDate, maxDate }: MonthPickerProps) {
  const handlePrevious = () => {
    const newDate = subMonths(date, 1);
    // Allow going back as long as the END of the previous month is after minDate
    if (endOfMonth(newDate) >= minDate) {
      setDate(newDate);
    } else {
      setDate(minDate);
    }
  };

  const handleNext = () => {
    const newDate = addMonths(date, 1);
    // Allow going forward as long as the START of the next month is before maxDate
    if (startOfMonth(newDate) <= maxDate) {
      setDate(newDate);
    }
  };

  // Logic to disable buttons
  const isPrevDisabled = startOfMonth(date) <= startOfMonth(minDate);
  const isNextDisabled = endOfMonth(date) >= endOfMonth(maxDate);

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
      
      <span className="text-sm font-medium w-32 text-center">
        {format(date, "MMMM yyyy")}
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