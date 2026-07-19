// Purchases a USPS Certified Mail Return Receipt label via EasyPost.
// Requires EASYPOST_API_KEY.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

interface Address {
  name: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
  phone?: string;
}
interface Body {
  from: Address;
  to: Address;
  weight_oz?: number;
  return_receipt?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const apiKey = Deno.env.get('EASYPOST_API_KEY');
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: 'EASYPOST_API_KEY not configured',
        fallback_url: 'https://cns.usps.com/labelInformation.shtml',
        message: 'EasyPost API key not set. Use USPS Click-N-Ship as fallback, then paste tracking # manually.',
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  if (!body.from?.street1 || !body.to?.street1) {
    return new Response(JSON.stringify({ error: 'Missing from/to address' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const auth = 'Basic ' + btoa(apiKey + ':');

  const buildAddr = (a: Address) => ({
    name: a.name, street1: a.street1, street2: a.street2 ?? '',
    city: a.city, state: a.state, zip: a.zip, country: a.country ?? 'US', phone: a.phone ?? '',
  });

  try {
    // 1. Create shipment (USPS Certified w/ Return Receipt)
    const shipRes = await fetch('https://api.easypost.com/v2/shipments', {
      method: 'POST',
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shipment: {
          from_address: buildAddr(body.from),
          to_address: buildAddr(body.to),
          parcel: { weight: body.weight_oz ?? 2, predefined_package: 'Letter' },
          options: {
            certified_mail: true,
            registered_mail: false,
            delivery_confirmation: body.return_receipt === false ? 'SIGNATURE' : 'ADULT_SIGNATURE',
          },
          service: 'First',
        },
      }),
    });
    const shipment = await shipRes.json();
    if (!shipRes.ok) throw new Error(shipment?.error?.message || 'EasyPost shipment create failed');

    // Find a USPS Certified rate
    const rate = (shipment.rates || []).find((r: any) => r.carrier === 'USPS' && /First/i.test(r.service));
    if (!rate) throw new Error('No USPS Certified rate returned');

    // 2. Buy label
    const buyRes = await fetch(`https://api.easypost.com/v2/shipments/${shipment.id}/buy`, {
      method: 'POST',
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ rate: { id: rate.id } }),
    });
    const bought = await buyRes.json();
    if (!buyRes.ok) throw new Error(bought?.error?.message || 'EasyPost label buy failed');

    return new Response(JSON.stringify({
      tracking_code: bought.tracking_code,
      label_url: bought.postage_label?.label_url,
      rate: Number(bought.selected_rate?.rate ?? rate.rate),
      carrier: 'USPS',
      shipment_id: bought.id,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message ?? String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
