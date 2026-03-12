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

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");

    const { frequency, designations, totalAmount } = await req.json();
    if (!totalAmount || totalAmount <= 0) throw new Error("Invalid donation amount");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Find or create customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) customerId = customers.data[0].id;

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
                  interval: frequency === "monthly" ? "month" : "week",
                  interval_count: frequency === "bi-weekly" ? 2 : 1,
                },
              }
            : {}),
        },
        quantity: 1,
      }));

    const mode = frequency === "one-time" ? "payment" : "subscription";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: lineItems,
      mode,
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/donate`,
      metadata: { donation: "true", frequency },
    });

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
