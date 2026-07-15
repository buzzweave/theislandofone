import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

// Sends email notifications to the prayer team / admins when a
// prayer request or a decision-style experience response is submitted.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const type = body?.type as 'prayer' | 'response';
    const record = body?.record;
    if (!type || !record) {
      return new Response(JSON.stringify({ error: 'type and record required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Recipients: users with role admin or prayer_team
    const { data: roles } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .in('role', ['admin', 'prayer_team']);

    const userIds = Array.from(new Set((roles ?? []).map((r: any) => r.user_id)));
    if (userIds.length === 0) {
      return new Response(JSON.stringify({ ok: true, notified: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profiles } = await supabase
      .from('profiles').select('id, email').in('id', userIds);

    const emails = (profiles ?? []).map((p: any) => p.email).filter(Boolean);
    if (emails.length === 0) {
      return new Response(JSON.stringify({ ok: true, notified: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const RESEND = Deno.env.get('RESEND_API_KEY');
    if (!RESEND) {
      return new Response(JSON.stringify({ ok: false, error: 'RESEND_API_KEY missing' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const subject = type === 'prayer'
      ? `🙏 New Prayer Request${record.urgency === 'urgent' ? ' (URGENT)' : ''}`
      : `✨ New Response: ${record.kind ?? 'decision'}`;

    const rows: [string, string][] = [];
    if (type === 'prayer') {
      rows.push(['Name', record.name || 'Anonymous']);
      rows.push(['Contact', record.contact || '—']);
      rows.push(['Urgency', record.urgency || 'normal']);
      rows.push(['Visibility', record.visibility]);
      rows.push(['Message', record.message]);
    } else {
      rows.push(['Kind', record.kind]);
      rows.push(['Payload', JSON.stringify(record.payload ?? {}, null, 2)]);
    }
    const html = `
      <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;padding:24px;background:#0f1115;color:#f5f5f5;">
        <h2 style="color:#d4af37;margin:0 0 16px;">${subject}</h2>
        <table style="width:100%;border-collapse:collapse;">
          ${rows.map(([k, v]) => `
            <tr>
              <td style="padding:8px 12px;border-bottom:1px solid #333;color:#aaa;vertical-align:top;width:120px;">${k}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #333;white-space:pre-wrap;">${String(v)
                .replace(/</g, '&lt;')}</td>
            </tr>
          `).join('')}
        </table>
        <p style="margin-top:24px;font-size:12px;color:#888;">The Island of One · Response Notification</p>
      </div>
    `;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND}` },
      body: JSON.stringify({
        from: 'The Island of One <notifications@theislandofone.com>',
        to: emails,
        reply_to: 'support@buzzweave.com',
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return new Response(JSON.stringify({ ok: false, error: text }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true, notified: emails.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
