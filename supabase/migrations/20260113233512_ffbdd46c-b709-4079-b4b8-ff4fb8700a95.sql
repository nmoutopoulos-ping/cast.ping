-- Create table for user ticker color preferences
CREATE TABLE public.user_ticker_colors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  ticker VARCHAR(20) NOT NULL,
  color VARCHAR(20) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, ticker)
);

-- Enable RLS
ALTER TABLE public.user_ticker_colors ENABLE ROW LEVEL SECURITY;

-- Users can view their own colors
CREATE POLICY "Users can view their own ticker colors"
ON public.user_ticker_colors
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own colors
CREATE POLICY "Users can insert their own ticker colors"
ON public.user_ticker_colors
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own colors
CREATE POLICY "Users can update their own ticker colors"
ON public.user_ticker_colors
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own colors
CREATE POLICY "Users can delete their own ticker colors"
ON public.user_ticker_colors
FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_user_ticker_colors_updated_at
BEFORE UPDATE ON public.user_ticker_colors
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();