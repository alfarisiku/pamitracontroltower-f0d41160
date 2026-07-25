import { useEffect, useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { format, isValid, parse } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const toISO = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
};
const fromISO = (iso?: string) => (iso ? new Date(iso + "T00:00:00") : undefined);

const DISPLAY_FMT = "dd/MM/yyyy";

function tryParse(txt: string): Date | undefined {
  const d = parse(txt.trim(), DISPLAY_FMT, new Date());
  return isValid(d) ? d : undefined;
}
function formatRange(from?: string, to?: string) {
  const f = fromISO(from);
  const t = fromISO(to);
  return `${f ? format(f, DISPLAY_FMT) : ""}${t || f ? " - " : ""}${t ? format(t, DISPLAY_FMT) : ""}`;
}

export interface DateRangeInputProps {
  startISO?: string;
  endISO?: string;
  onChange: (start: string, end: string) => void;
  className?: string;
  placeholder?: string;
  numberOfMonths?: number;
  compact?: boolean;
}

/** Reusable date range picker: text input `dd/MM/yyyy - dd/MM/yyyy` + popover calendar
 *  navigating to the existing range when opened. */
export function DateRangeInput({
  startISO,
  endISO,
  onChange,
  className,
  placeholder = "dd/mm/yyyy - dd/mm/yyyy",
  numberOfMonths = 2,
  compact = false,
}: DateRangeInputProps) {
  const [text, setText] = useState(formatRange(startISO, endISO));
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setText(formatRange(startISO, endISO));
  }, [startISO, endISO]);

  const range: DateRange | undefined = startISO || endISO
    ? { from: fromISO(startISO), to: fromISO(endISO) }
    : undefined;

  const commitText = () => {
    const parts = text.split(/\s*[-–—]\s*/);
    const a = parts[0] ? tryParse(parts[0]) : undefined;
    const b = parts[1] ? tryParse(parts[1]) : undefined;
    if (a && b) onChange(toISO(a), toISO(b));
    else if (a && !parts[1]) onChange(toISO(a), toISO(a));
    else setText(formatRange(startISO, endISO)); // revert invalid
  };

  return (
    <div className={cn("flex items-stretch gap-1", className)}>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commitText}
        onKeyDown={(e) => { if (e.key === "Enter") { e.currentTarget.blur(); } }}
        placeholder={placeholder}
        className={cn(
          "flex-1 min-w-0 px-2 py-1.5 text-xs bg-card border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono-data",
          compact && "py-1"
        )}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="px-2 bg-card border border-border rounded hover:bg-muted flex items-center"
            aria-label="Pick date range"
          >
            <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={range}
            defaultMonth={range?.from ?? range?.to ?? new Date()}
            onSelect={(sel) => {
              const s = sel?.from ? toISO(sel.from) : "";
              const e = sel?.to ? toISO(sel.to) : (sel?.from ? toISO(sel.from) : "");
              onChange(s, e);
              if (sel?.from && sel?.to) setOpen(false);
            }}
            numberOfMonths={numberOfMonths}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
