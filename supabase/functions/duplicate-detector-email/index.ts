import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

/**
 * Daily email digest for the scheduled duplicate detector.
 * For every household with email alerts enabled, counts review-only flags
 * added since the last email and sends a summary via Resend.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const resendKey = Deno.env.get('RESEND_API_KEY')

    const { data: settings, error } = await supabase
      .from('duplicate_detector_settings')
      .select('*')
      .eq('email_enabled', true)
      .not('email', 'is', null)
    if (error) throw error

    let sent = 0
    for (const s of settings || []) {
      const since = s.last_email_sent_at || '1970-01-01T00:00:00Z'
      const { count } = await supabase
        .from('categorization_audit')
        .select('id', { count: 'exact', head: true })
        .eq('household_id', s.household_id)
        .eq('source', 'duplicate-scheduler')
        .is('reverted_at', null)
        .gt('created_at', since)

      if (!count) continue

      if (resendKey) {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'PrismMoney <onboarding@resend.dev>',
            to: s.email,
            subject: `Duplicate detector: ${count} new transaction(s) flagged for review`,
            html: `
              <div style="font-family:system-ui,sans-serif;max-width:520px">
                <h2 style="margin:0 0 8px">New duplicate flags to review</h2>
                <p>The scheduled duplicate detector flagged <strong>${count}</strong> transaction(s) in new same-day clusters since your last alert.</p>
                <p>Nothing was changed — these are review-only flags. Open the categorization audit to remove confirmed duplicates or dismiss the flags:</p>
                <p><a href="https://prismbudget.com/cleanup/audit" style="display:inline-block;background:#0d9488;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Review flags</a></p>
                <p style="color:#666;font-size:12px">You can turn these emails off under Import Rules → Detector settings.</p>
              </div>`,
          }),
        })
        if (!res.ok) {
          console.error('Resend failed', res.status, await res.text())
          continue
        }
      }

      await supabase
        .from('duplicate_detector_settings')
        .update({ last_email_sent_at: new Date().toISOString() })
        .eq('id', s.id)
      sent++
    }

    return new Response(JSON.stringify({ sent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
