/// <reference lib="deno.ns" />
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { date, email } = await req.json();
    console.log('Project report email', { date, email });
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: projects, error } = await supabase
      .from('projects')
      .select('title, description, hours_spent, images, profiles(full_name)')
      .eq('date', date);
    if (error) throw error;

    // Here you could integrate with an email service
    await supabase.from('project_report_logs').insert({
      date,
      email,
      project_count: projects?.length || 0,
    });

    return new Response(
      JSON.stringify({ ok: true, count: projects?.length || 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Project report email error', error);
    return new Response(
      JSON.stringify({ error: 'failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
