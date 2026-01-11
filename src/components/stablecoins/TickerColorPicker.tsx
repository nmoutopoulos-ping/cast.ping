import { useState } from 'react';
import { Palette, Save, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { TICKER_COLORS } from './PriceStabilityChart';

interface TickerColorPickerProps {
  tickers: string[];
  customColors: Record<string, string>;
  onSave: (colors: Record<string, string>) => void;
}

const STORAGE_KEY = 'stablecoin-custom-colors';

export function useTickerColors() {
  const [customColors, setCustomColors] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {};
      }
    }
    return {};
  });

  const saveColors = (colors: Record<string, string>) => {
    setCustomColors(colors);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(colors));
  };

  const resetColors = () => {
    setCustomColors({});
    localStorage.removeItem(STORAGE_KEY);
  };

  const getColor = (ticker: string) => {
    return customColors[ticker] || TICKER_COLORS[ticker] || 'hsl(var(--institutional-blue))';
  };

  return { customColors, saveColors, resetColors, getColor };
}

export function TickerColorPicker({ tickers, customColors, onSave }: TickerColorPickerProps) {
  const [open, setOpen] = useState(false);
  const [editColors, setEditColors] = useState<Record<string, string>>({});

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      // Initialize with current custom colors or defaults
      const initial: Record<string, string> = {};
      tickers.forEach((ticker) => {
        initial[ticker] = customColors[ticker] || TICKER_COLORS[ticker] || '#4a90d9';
      });
      setEditColors(initial);
    }
    setOpen(isOpen);
  };

  const handleColorChange = (ticker: string, color: string) => {
    setEditColors((prev) => ({ ...prev, [ticker]: color }));
  };

  const handleSave = () => {
    onSave(editColors);
    setOpen(false);
  };

  const handleReset = () => {
    // Reset to defaults
    const defaults: Record<string, string> = {};
    tickers.forEach((ticker) => {
      defaults[ticker] = TICKER_COLORS[ticker] || '#4a90d9';
    });
    setEditColors(defaults);
  };

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <button
          className="text-[10px] p-1.5 rounded bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
          title="Configure ticker colors"
        >
          <Palette className="w-3.5 h-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold uppercase tracking-wide">
              Ticker Colors
            </Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-6 px-2 text-[10px] gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            {tickers.map((ticker) => (
              <div key={ticker} className="flex items-center gap-2">
                <Input
                  type="color"
                  value={editColors[ticker] || TICKER_COLORS[ticker] || '#4a90d9'}
                  onChange={(e) => handleColorChange(ticker, e.target.value)}
                  className="w-8 h-7 p-0.5 cursor-pointer"
                />
                <span className="text-xs font-medium">{ticker}</span>
              </div>
            ))}
          </div>

          <Button
            size="sm"
            onClick={handleSave}
            className="w-full h-8 text-xs gap-1.5"
          >
            <Save className="w-3 h-3" />
            Save Colors
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
