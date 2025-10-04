-- Create donations table
CREATE TABLE public.donations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  donor_name TEXT NOT NULL DEFAULT 'Anonymous',
  amount NUMERIC NOT NULL,
  razorpay_payment_id TEXT,
  razorpay_order_id TEXT NOT NULL,
  razorpay_signature TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

-- Anyone can view successful donations (for public tracker)
CREATE POLICY "Anyone can view successful donations"
ON public.donations
FOR SELECT
USING (status = 'successful');

-- Only system can insert donations (via edge functions)
CREATE POLICY "System can insert donations"
ON public.donations
FOR INSERT
WITH CHECK (true);

-- Only system can update donations (via edge functions)
CREATE POLICY "System can update donations"
ON public.donations
FOR UPDATE
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_donations_updated_at
BEFORE UPDATE ON public.donations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_donations_status ON public.donations(status);
CREATE INDEX idx_donations_created_at ON public.donations(created_at DESC);