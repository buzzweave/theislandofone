import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData.user) throw new Error("Invalid session");

    const user = userData.user;
    const { studioName } = await req.json();

    // Check if user already has an org
    const { data: existing } = await supabaseAdmin
      .from("organization_members")
      .select("org_id")
      .eq("user_id", user.id)
      .limit(1);

    if (existing && existing.length > 0) {
      return new Response(JSON.stringify({ org_id: existing[0].org_id, already_exists: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const slug = (studioName || "studio")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      + "-" + Date.now().toString(36);

    // Create organization
    const { data: org, error: orgErr } = await supabaseAdmin
      .from("organizations")
      .insert({ owner_id: user.id, name: studioName || "My Writing Studio", slug })
      .select()
      .single();

    if (orgErr) throw new Error(orgErr.message);

    // Add owner as member
    await supabaseAdmin.from("organization_members").insert({
      org_id: org.id,
      user_id: user.id,
      role: "owner",
    });

    // Create default branding
    await supabaseAdmin.from("workspace_branding").insert({
      org_id: org.id,
      studio_name: studioName || "My Writing Studio",
      author_name: user.user_metadata?.full_name || "",
    });

    // Seed sample content
    const { data: sampleProject } = await supabaseAdmin
      .from("workspace_projects")
      .insert({ org_id: org.id, title: "My First Book", description: "A sample book project to get you started.", status: "draft" })
      .select()
      .single();

    if (sampleProject) {
      await supabaseAdmin.from("workspace_chapters").insert([
        { project_id: sampleProject.id, org_id: org.id, title: "Introduction", content: "Welcome to your writing studio! This is a sample chapter to show you how the editor works.\n\nYou can edit this content, add new chapters, and organize your book here.", sort_order: 0 },
        { project_id: sampleProject.id, org_id: org.id, title: "Chapter 1: Getting Started", content: "This is where your story begins. Replace this text with your own writing.\n\nTip: Use the chapter sidebar to navigate between chapters and add new ones.", sort_order: 1 },
        { project_id: sampleProject.id, org_id: org.id, title: "Chapter 2: Building Your Story", content: "Continue your narrative here. Each chapter is saved independently, so you can work on any section at any time.", sort_order: 2 },
      ]);
    }

    // Seed sample notes
    await supabaseAdmin.from("workspace_notes").insert([
      { org_id: org.id, title: "Research Ideas", content: "Use this space to store research notes, character ideas, plot outlines, and reference materials.", category: "general" },
      { org_id: org.id, title: "Publishing Checklist", content: "1. Finish manuscript\n2. Self-edit and revise\n3. Hire a professional editor\n4. Design book cover\n5. Format for publishing\n6. Choose distribution platform\n7. Set pricing\n8. Launch!", category: "publishing" },
    ]);

    // Seed sample teaching material
    await supabaseAdmin.from("workspace_materials").insert([
      { org_id: org.id, title: "Sample Teaching Outline", content: "Topic: [Your Topic]\n\nObjective: [What learners will achieve]\n\nKey Points:\n1. Point one\n2. Point two\n3. Point three\n\nDiscussion Questions:\n- Question 1\n- Question 2", category: "teaching" },
    ]);

    // Create subscription record
    await supabaseAdmin.from("workspace_subscriptions").insert({
      org_id: org.id,
      user_id: user.id,
      status: "active",
    });

    return new Response(JSON.stringify({ org_id: org.id, slug }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
