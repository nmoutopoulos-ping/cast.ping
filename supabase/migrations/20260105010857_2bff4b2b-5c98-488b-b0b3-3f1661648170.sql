-- Create tags table with contract_address for filtering
CREATE TABLE public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3B82F6',
  contract_address text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- RLS policies for tags
CREATE POLICY "Users can view their own tags"
ON public.tags FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tags"
ON public.tags FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tags"
ON public.tags FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tags"
ON public.tags FOR DELETE
USING (auth.uid() = user_id);

-- Create entities table
CREATE TABLE public.entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;

-- RLS policies for entities
CREATE POLICY "Users can view their own entities"
ON public.entities FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own entities"
ON public.entities FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own entities"
ON public.entities FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own entities"
ON public.entities FOR DELETE
USING (auth.uid() = user_id);

-- Entity-wallet junction table
CREATE TABLE public.entity_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  wallet_address text NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.entity_wallets ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own entity wallets"
ON public.entity_wallets FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own entity wallets"
ON public.entity_wallets FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own entity wallets"
ON public.entity_wallets FOR DELETE
USING (auth.uid() = user_id);

-- Entity-tag junction table
CREATE TABLE public.entity_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(entity_id, tag_id)
);

-- Enable RLS
ALTER TABLE public.entity_tags ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own entity tags"
ON public.entity_tags FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own entity tags"
ON public.entity_tags FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own entity tags"
ON public.entity_tags FOR DELETE
USING (auth.uid() = user_id);

-- Add updated_at triggers
CREATE TRIGGER update_tags_updated_at
BEFORE UPDATE ON public.tags
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_entities_updated_at
BEFORE UPDATE ON public.entities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();