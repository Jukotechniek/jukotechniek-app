import { serve } from "std/server";
import { createClient } from "supabase";

serve(async (req) => {
  const { date, recipient } = await req.json();

  // Fetch all projects for the given date (adjust field names as needed)
  const supabase = createClient();
  const { data: projects, error } = await supabase
    .from("projects")
    .select("id, title, description, technician_id, customer_id, date, images")
    .eq("date", date);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  // Send the data to your n8n webhook
  const webhookUrl = Deno.env.get("N8N_WEBHOOK_URL");

  const webhookResp = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      date,
      recipient,
      projects // includes images and all relevant info
    }),
  });

  if (!webhookResp.ok) {
    return new Response(JSON.stringify({ error: "Failed to call n8n webhook" }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }));
}); 