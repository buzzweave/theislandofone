import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Map member plan names to Stripe product IDs so the frontend tier logic works unchanged
const PLAN_TO_PRODUCT: Record<string, string> = {
  "Reader": "prod_U0P10UqgQoHMC1",
  "Pastor": "prod_U0P1BekfHAyBdT",
  "Inner Circle": "prod_U0P1B7ICDjNhyK",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(userError.message);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");

    // --- 1. Check Stripe first ---
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length > 0) {
      const customerId = customers.data[0].id;
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        const sub = subscriptions.data[0];
        const productId = sub.items.data[0].price.product;
        const subscriptionEnd = new Date(sub.current_period_end * 1000).toISOString();

        return new Response(JSON.stringify({
          subscribed: true,
          product_id: productId,
          subscription_end: subscriptionEnd,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // --- 2. Fallback: check members table ---
    const { data: member } = await supabaseClient
      .from("members")
      .select("plan, status")
      .eq("email", user.email)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (member && member.plan !== "Free") {
      const productId = PLAN_TO_PRODUCT[member.plan] || null;
      if (productId) {
        return new Response(JSON.stringify({
          subscribed: true,
          product_id: productId,
          subscription_end: null, // no expiry for admin-assigned members
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // No subscription found
    return new Response(JSON.stringify({ subscribed: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
