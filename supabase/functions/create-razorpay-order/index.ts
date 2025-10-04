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
    const { amount } = await req.json();

    if (!amount || amount < 1) {
      throw new Error('Invalid amount');
    }

    // TODO: Integrate with Razorpay when RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are available
    // const razorpay = new Razorpay({
    //   key_id: Deno.env.get('RAZORPAY_KEY_ID'),
    //   key_secret: Deno.env.get('RAZORPAY_KEY_SECRET'),
    // });
    
    // For now, generate a mock order_id
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log(`Order created: ${orderId} for amount: ${amount}`);

    return new Response(
      JSON.stringify({ 
        orderId,
        amount,
        currency: 'INR',
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Error creating order:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});