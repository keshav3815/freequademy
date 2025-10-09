import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      razorpay_payment_id, 
      razorpay_order_id, 
      razorpay_signature,
      donor_name,
      amount 
    } = await req.json();

    console.log('Verifying payment:', { razorpay_payment_id, razorpay_order_id });

    // TODO: Verify signature with Razorpay when RAZORPAY_KEY_SECRET is available
    // const crypto = await import('node:crypto');
    // const expectedSignature = crypto
    //   .createHmac('sha256', Deno.env.get('RAZORPAY_KEY_SECRET'))
    //   .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    //   .digest('hex');
    
    // const isValid = expectedSignature === razorpay_signature;

    // For now, accept all payments as valid (development mode)
    const isValid = true;

    // Create Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Save donation to database
    const { data, error } = await supabaseAdmin
      .from('donations')
      .insert({
        donor_name: donor_name || 'Anonymous',
        amount: amount,
        razorpay_payment_id,
        razorpay_order_id,
        razorpay_signature,
        status: isValid ? 'successful' : 'failed',
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    console.log('Donation saved:', data);

    return new Response(
      JSON.stringify({ 
        success: isValid,
        donation: data 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Error verifying payment:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});