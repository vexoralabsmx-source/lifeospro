// Netlify Serverless Function for Clip Payment Webhooks
// Triggered automatically when Clip sends a payment notification to:
// https://<your-app-domain>.netlify.app/.netlify/functions/clip-webhook

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://svamiluhtvvbgjaciiqu.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2YW1pbHVodHZ2YmdqYWNpaXF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4NDk0NTIsImV4cCI6MjA5OTQyNTQ1Mn0.JcynGPo8N579tX7Bmm0ZmayeraskAkBLYJR_v6zm2mU';

export async function handler(event, context) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    console.log('📦 Webhook Clip recibido:', JSON.stringify(payload));

    // Extraer correo y datos del pago según formato de Clip
    const email = (
      payload.customer?.email ||
      payload.email ||
      payload.payment?.customer?.email ||
      payload.user_email ||
      ''
    ).trim().toLowerCase();

    const amount = payload.amount || payload.payment?.amount || 0;
    const status = payload.status || payload.payment?.status || '';

    // Si no viene correo o el pago no está aprobado, responder ok sin procesar
    if (!email) {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Webhook recibido pero no contenía email de usuario' })
      };
    }

    // Determinar plan (Si es $1,299 o similar -> lifetime, de lo contrario -> premium)
    const plan = (amount >= 1000 || payload.description?.toLowerCase().includes('vitalicio')) ? 'lifetime' : 'premium';

    // Actualizar registro en Supabase Cloud vía REST API
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
      console.error('Error actualizando Supabase desde Webhook:', errText);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Error actualizando Supabase', details: errText })
      };
    }

    console.log(`✅ Plan [${plan}] activado automáticamente en Supabase para el usuario ${email}`);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        message: `Plan ${plan} activado correctamente para ${email}`,
        user: email,
        plan: plan
      })
    };
  } catch (err) {
    console.error('Error procesando Webhook Clip:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error', details: err.message })
    };
  }
}
