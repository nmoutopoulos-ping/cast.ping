import { CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface DateRange {
  start: Date | null;
  end: Date | null;
}

interface DateRangeFilterProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
}

export function DateRangeFilter({ dateRange, onDateRangeChange }: DateRangeFilterProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={cn(
            "gap-2",
            (dateRange.start || dateRange.end) && "border-primary text-primary"
          )}
        >
          <CalendarIcon className="w-4 h-4" />
          {dateRange.start || dateRange.end ? (
            <span className="text-xs">
              {dateRange.start ? format(dateRange.start, "MMM d") : "Start"} 
              {" – "} 
              {dateRange.end ? format(dateRange.end, "MMM d") : "End"}
            </span>
          ) : (
            "Date Range"
          )}
          {(dateRange.start || dateRange.end) && (
            <X 
              className="w-3 h-3 ml-1 hover:text-destructive" 
              onClick={(e) => {
                e.stopPropagation();
                onDateRangeChange({ start: null, end: null });
              }}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-0">
        <div className="flex flex-col sm:flex-row">
          <div className="p-3 border-b sm:border-b-0 sm:border-r border-border">
            <p className="text-xs font-medium text-muted-foreground mb-2 px-1">Start Date</p>
            <Calendar
              mode="single"
              selected={dateRange.start || undefined}
              onSelect={(date) => onDateRangeChange({ ...dateRange, start: date || null })}
              initialFocus
              className="p-0 pointer-events-auto"
            />
          </div>
          <div className="p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2 px-1">End Date</p>
            <Calendar
              mode="single"
              selected={dateRange.end || undefined}
              onSelect={(date) => onDateRangeChange({ ...dateRange, end: date || null })}
              disabled={(date) => dateRange.start ? date < dateRange.start : false}
              className="p-0 pointer-events-auto"
            />
          </div>
        </div>
        {(dateRange.start || dateRange.end) && (
          <div className="border-t border-border p-2 flex justify-end">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onDateRangeChange({ start: null, end: null })}
              className="text-xs"
            >
              Clear dates
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
