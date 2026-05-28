import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Validate admin token against VPS auth
async function validateAdmin(token: string): Promise<boolean> {
  if (!token) return false;
  const apiUrl = Deno.env.get("VPS_API_URL");
  if (!apiUrl) {
    // Hard fail if not configured — never accept arbitrary tokens
    console.error("VPS_API_URL not configured; rejecting admin request");
    return false;
  }
  try {
    const res = await fetch(`${apiUrl}/api/auth/verify`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const adminToken = req.headers.get("x-admin-token") || "";
  const valid = await validateAdmin(adminToken);
  if (!valid) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/graphics-admin\/?/, "");

  try {
    // GET - list all graphics (admin sees all, including inactive)
    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("graphics")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST - create graphic
    if (req.method === "POST") {
      const body = await req.json();
      const { data, error } = await supabase
        .from("graphics")
        .insert(body)
        .select()
        .single();
      if (error) throw error;
      return new Response(JSON.stringify(data), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PUT - update graphic
    if (req.method === "PUT") {
      const body = await req.json();
      const { id, ...updates } = body;
      if (!id) throw new Error("Missing id");
      const { data, error } = await supabase
        .from("graphics")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DELETE
    if (req.method === "DELETE") {
      const body = await req.json();
      const { id } = body;
      if (!id) throw new Error("Missing id");
      const { error } = await supabase.from("graphics").delete().eq("id", id);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
