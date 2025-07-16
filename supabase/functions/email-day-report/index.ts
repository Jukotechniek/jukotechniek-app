 /// <reference lib="deno.ns" />
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const { date, recipient, webhookUrl } = await req.json();

    if (!date || !recipient || !webhookUrl) {
      return new Response(
        JSON.stringify({ error: "date, recipient, and webhookUrl are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Supabase credentials missing" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Project data ophalen
    const { data: projects, error } = await supabase
      .from("projects")
      .select("id, title, description, hours_spent, images, technician_id, customer_id, date")
      .eq("date", date);

    if (error) throw error;

    // Data posten naar n8n webhook
    const webhookResp = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        recipient,
        projects,
        count: projects?.length || 0,
        requestedAt: new Date().toISOString(),
      }),
    });

    const webhookResult = await webhookResp.text();

    if (!webhookResp.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to call n8n webhook", webhookResult }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Eventueel logging in Supabase
    await supabase.from("project_report_logs").insert({
      date,
      email: recipient,
      webhook: webhookUrl,
      project_count: projects?.length || 0,
      sent_at: new Date().toISOString(),
      webhook_response: webhookResult,
    });

    return new Response(
      JSON.stringify({ ok: true, count: projects?.length || 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Project report email error", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
