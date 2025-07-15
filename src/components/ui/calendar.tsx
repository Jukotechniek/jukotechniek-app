import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  onDayClick,
  ...props
}: CalendarProps) {
  const handleDayClick = React.useCallback(
    (day: Date, modifiers: any, e: React.MouseEvent) => {
      if (modifiers.outside && props.onMonthChange) {
        props.onMonthChange(day);
      }
      if (modifiers.outside && props.onSelect) {
        if (props.mode === "single") {
          props.onSelect(day as any, day, modifiers, e);
        } else if (props.mode === "multiple") {
          const current = Array.isArray(props.selected) ? props.selected : [];
          const exists = current.some(d => d && d.toDateString() === day.toDateString());
          const next = exists
            ? current.filter(d => d && d.toDateString() !== day.toDateString())
            : [...current, day];
          props.onSelect(next as any, day, modifiers, e);
        } else if (props.mode === "range") {
          const range = props.selected as any;
          if (!range || (range.from && range.to)) {
            props.onSelect({ from: day, to: undefined } as any, day, modifiers, e);
          } else if (range.from && !range.to) {
            if (day < range.from) {
              props.onSelect({ from: day, to: range.from } as any, day, modifiers, e);
            } else {
              props.onSelect({ from: range.from, to: day } as any, day, modifiers, e);
            }
          }
        }
      }
      onDayClick?.(day, modifiers, e);
    },
    [onDayClick, props]
  );
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      onDayClick={handleDayClick}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell:
          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
