import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { frequency, designations, totalAmount } = await req.json();
    if (!totalAmount || totalAmount <= 0) throw new Error("Invalid donation amount");

    // Try to get authenticated user email (optional)
    let userEmail: string | undefined;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? ""
      );
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabaseClient.auth.getUser(token);
      if (data.user?.email) {
        userEmail = data.user.email;
      }
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Find existing customer if logged in
    let customerId: string | undefined;
    if (userEmail) {
      const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
      if (customers.data.length > 0) customerId = customers.data[0].id;
    }

    const origin = req.headers.get("origin") || "https://theislandofone.lovable.app";

    // Build line items from designations
    const lineItems = (designations as { fund: string; amount: number }[])
      .filter((d) => d.amount > 0)
      .map((d) => ({
        price_data: {
          currency: "usd",
          product_data: { name: `Donation — ${d.fund}` },
          unit_amount: Math.round(d.amount * 100),
          ...(frequency !== "one-time"
            ? {
                recurring: {
                  interval: frequency === "monthly" ? ("month" as const) : ("week" as const),
                  interval_count: frequency === "bi-weekly" ? 2 : 1,
                },
              }
            : {}),
        },
        quantity: 1,
      }));

    const mode = frequency === "one-time" ? "payment" : "subscription";

    const sessionParams: any = {
      line_items: lineItems,
      mode,
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/donate`,
      metadata: { donation: "true", frequency },
    };

    // Attach customer if known, otherwise let Stripe collect email
    if (customerId) {
      sessionParams.customer = customerId;
    } else if (userEmail) {
      sessionParams.customer_email = userEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
