
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, userId, context } = await req.json();

    console.log('AI Chat Webhook called:', { message, userId, context });

    // Initialize Supabase client
    const supabaseUrl = req.headers.get('x-supabase-url') || (globalThis as any).SUPABASE_URL;
    const supabaseServiceKey = req.headers.get('x-supabase-service-role-key') || (globalThis as any).SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase credentials are missing');
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // For now, provide a simple response about JukoTechniek work hours system
    // This can be enhanced with actual AI integration later
    let response = '';

    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('uren') || lowerMessage.includes('werktijd')) {
      response = 'Ik kan je helpen met werkuren! Je kunt je werkuren invoeren via de "Uren" sectie. Daar kun je ook zien hoeveel overuren en weekenduren je hebt gewerkt. Heb je een specifieke vraag over je werkuren?';
    } else if (lowerMessage.includes('project')) {
      response = 'Voor projecten kun je naar de "Projecten" sectie gaan. Daar kun je nieuwe projecten aanmaken, bestaande projecten bekijken en de status bijwerken. Wat wil je weten over projecten?';
    } else if (lowerMessage.includes('klant') || lowerMessage.includes('customer')) {
      response = 'In de "Klanten" sectie kun je klantgegevens beheren en nieuwe klanten toevoegen. Je kunt ook de verschillende tarieven per klant instellen. Heb je vragen over klantbeheer?';
    } else if (lowerMessage.includes('rapport') || lowerMessage.includes('export')) {
      response = 'Je kunt rapporten genereren en data exporteren via de "Rapporten" sectie. Daar kun je Excel-bestanden downloaden met alle werkuren en projectgegevens. Welk rapport heb je nodig?';
    } else if (lowerMessage.includes('help') || lowerMessage.includes('hulp')) {
      response = 'Ik kan je helpen met vragen over:\n• Werkuren invoeren en bekijken\n• Projecten beheren\n• Klantgegevens\n• Rapporten genereren\n• Reiskosten\n• Gebruikersbeheer (voor admins)\n\nWaar kan ik je mee helpen?';
    } else {
      response = 'Bedankt voor je vraag! Ik ben gespecialiseerd in het JukoTechniek werkuren systeem. Ik kan je helpen met werkuren, projecten, klanten, rapporten en meer. Kun je je vraag specifieker maken zodat ik je beter kan helpen?';
    }

    // Log the interaction
    console.log('AI Response generated:', response);

    return new Response(JSON.stringify({ response }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in ai-chat-webhook function:', error);
    return new Response(JSON.stringify({ 
      error: 'Er ging iets mis bij het verwerken van je vraag.',
      response: 'Sorry, ik ondervind momenteel technische problemen. Probeer het later opnieuw.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
