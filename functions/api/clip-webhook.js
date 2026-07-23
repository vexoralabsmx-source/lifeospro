// Cloudflare Pages Function for Clip Payment Webhooks
// Route: POST /api/clip-webhook

export async function onRequestPost(context) {
  const { request, env } = context;

  const SUPABASE_URL = env?.VITE_SUPABASE_URL || 'https://svamiluhtvvbgjaciiqu.supabase.co';
  const SUPABASE_ANON_KEY = env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2YW1pbHVodHZ2YmdqYWNpaXF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4NDk0NTIsImV4cCI6MjA5OTQyNTQ1Mn0.JcynGPo8N579tX7Bmm0ZmayeraskAkBLYJR_v6zm2mU';

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Content-Type': 'application/json'
  };

  try {
    const payload = await request.json();

    const email = (
      payload.customer?.email ||
      payload.email ||
      payload.payment?.customer?.email ||
      payload.user_email ||
      ''
    ).trim().toLowerCase();

    const amount = payload.amount || payload.payment?.amount || 0;

    if (!email) {
      return new Response(
        JSON.stringify({ message: 'Webhook recibido pero no contenía email de usuario' }),
        { status: 200, headers: corsHeaders }
      );
    }

    const plan = (amount >= 1000 || payload.description?.toLowerCase().includes('vitalicio')) ? 'lifetime' : 'premium';

    // Actualizar Supabase Cloud vía REST API
    const response = await fetch(`${SUPABASE_URL}/rest/v1/user_settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        user_id: email,
        plan: plan,
        updated_at: new Date().toISOString()
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(
        JSON.stringify({ error: 'Error actualizando Supabase desde Cloudflare Function', details: errText }),
        { status: 500, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Plan ${plan} activado correctamente para ${email}`,
        user: email,
        plan: plan
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Internal Server Error', details: err.message }),
      { status: 500, headers: corsHeaders }
    );
  }
}
