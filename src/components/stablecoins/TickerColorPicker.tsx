import { useState, useEffect } from 'react';
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
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface TickerColorPickerProps {
  tickers: string[];
  customColors: Record<string, string>;
  onSave: (colors: Record<string, string>) => void;
}

export function useTickerColors() {
  const { user } = useAuth();
  const [customColors, setCustomColors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Fetch colors from database on mount
  useEffect(() => {
    const fetchColors = async () => {
      if (!user) {
        setCustomColors({});
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_ticker_colors')
          .select('ticker, color')
          .eq('user_id', user.id);

        if (error) throw error;

        const colorsMap: Record<string, string> = {};
        data?.forEach((row) => {
          colorsMap[row.ticker] = row.color;
        });
        setCustomColors(colorsMap);
      } catch (err) {
        console.error('Failed to fetch ticker colors:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchColors();
  }, [user]);

  const saveColors = async (colors: Record<string, string>) => {
    if (!user) {
      toast.error('You must be logged in to save colors');
      return;
    }

    try {
      // Upsert each ticker color
      const upserts = Object.entries(colors).map(([ticker, color]) => ({
        user_id: user.id,
        ticker,
        color,
      }));

      const { error } = await supabase
        .from('user_ticker_colors')
        .upsert(upserts, { onConflict: 'user_id,ticker' });

      if (error) throw error;

      setCustomColors(colors);
      toast.success('Ticker colors saved');
    } catch (err) {
      console.error('Failed to save ticker colors:', err);
      toast.error('Failed to save colors');
    }
  };

  const resetColors = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_ticker_colors')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setCustomColors({});
      toast.success('Colors reset to defaults');
    } catch (err) {
      console.error('Failed to reset ticker colors:', err);
      toast.error('Failed to reset colors');
    }
  };

  const getColor = (ticker: string) => {
    return customColors[ticker] || TICKER_COLORS[ticker] || 'hsl(var(--institutional-blue))';
  };

  return { customColors, saveColors, resetColors, getColor, isLoading };
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
          
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {tickers.map((ticker) => {
              const currentColor = editColors[ticker] || TICKER_COLORS[ticker] || '#4a90d9';
              return (
                <div key={ticker} className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={currentColor}
                    onChange={(e) => handleColorChange(ticker, e.target.value)}
                    className="w-8 h-7 p-0.5 cursor-pointer flex-shrink-0"
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-medium">{ticker}</span>
                    <span className="text-[10px] text-muted-foreground font-mono uppercase">{currentColor}</span>
                  </div>
                </div>
              );
            })}
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
