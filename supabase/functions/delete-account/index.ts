import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create client with user's JWT to get their identity
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Confirm the request body contains confirmation
    const body = await req.json().catch(() => ({}));
    if (body.confirm !== true) {
      return new Response(
        JSON.stringify({ error: "Must confirm deletion with { confirm: true }" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role to delete user data and auth account
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // 1. Find all households owned solely by this user
    const { data: memberships } = await admin
      .from("household_members")
      .select("household_id, role")
      .eq("user_id", user.id);

    const ownedHouseholds = (memberships || [])
      .filter((m) => m.role === "owner")
      .map((m) => m.household_id);

    // 2. Delete household data for owned households (cascades via FK)
    for (const hhId of ownedHouseholds) {
      // Check if there are other members
      const { count } = await admin
        .from("household_members")
        .select("*", { count: "exact", head: true })
        .eq("household_id", hhId);

      if ((count ?? 0) <= 1) {
        // Sole member — delete the household (cascades all data)
        await admin.from("households").delete().eq("id", hhId);
      } else {
        // Transfer ownership or just remove this member
        await admin
          .from("household_members")
          .delete()
          .eq("household_id", hhId)
          .eq("user_id", user.id);
      }
    }

    // 3. Delete profile
    await admin.from("profiles").delete().eq("user_id", user.id);

    // 4. Delete the auth user
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error("Failed to delete auth user:", deleteError);
      return new Response(
        JSON.stringify({ error: "Failed to delete account. Please contact support." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Account deleted successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("delete-account error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
