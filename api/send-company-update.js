import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const resend = new Resend(process.env.RESEND_API_KEY)
const FROM_ADDRESS = 'Mowatek Updates <updates@reminder.mowatek.com>'

function escapeHtml(value = '') {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;')
}

function companyUpdateHtml(subject, message) {
  return `<div style="font-family:Arial,sans-serif;padding:32px 20px;background:#f8fafc;color:#0f172a">
    <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
      <div style="padding:24px;background:#0f172a;color:#ffffff"><div style="font-size:12px;letter-spacing:1px;color:#67e8f9;font-weight:700">MOWATEK PORTAL</div><h1 style="font-size:22px;margin:8px 0 0">${escapeHtml(subject)}</h1></div>
      <div style="padding:26px;font-size:15px;line-height:1.65;color:#334155">${escapeHtml(message).replaceAll('\n', '<br />')}</div>
      <div style="padding:16px 26px;background:#f8fafc;color:#64748b;font-size:12px">This is an official company update from Mowatek.</div>
    </div>
  </div>`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.RESEND_API_KEY) {
    console.error('Company updates service is missing required server environment variables.')
    return res.status(500).json({ error: 'Company updates service is not configured.' })
  }

  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '')
  if (!token) return res.status(401).json({ error: 'Sign in again before sending an update.' })

  try {
    const { data: userData, error: userError } = await supabase.auth.getUser(token)
    if (userError || !userData.user) return res.status(401).json({ error: 'Your sign-in session could not be verified.' })

    const { data: sender, error: senderError } = await supabase
      .from('company_update_senders')
      .select('user_id')
      .eq('user_id', userData.user.id)
      .maybeSingle()
    if (senderError) throw senderError
    if (!sender) return res.status(403).json({ error: 'You are not authorised to send company updates.' })

    const subject = String(req.body?.subject || '').trim()
    const message = String(req.body?.message || '').trim()
    if (!subject || !message || subject.length > 180 || message.length > 12000) {
      return res.status(400).json({ error: 'Enter a subject (up to 180 characters) and message (up to 12,000 characters).' })
    }

    const { data: employees, error: employeeError } = await supabase
      .from('employees')
      .select('work_email, email')
      .ilike('status', 'active')
    if (employeeError) throw employeeError
    const recipients = [...new Set((employees || []).map((employee) => employee.work_email || employee.email).filter(Boolean).map((email) => email.toLowerCase()))]
    if (!recipients.length) return res.status(400).json({ error: 'There are no active employee email addresses to receive this update.' })

    const { data: update, error: updateError } = await supabase
      .from('company_updates')
      .insert({ subject, message, recipient_count: recipients.length, created_by: userData.user.id })
      .select('id')
      .single()
    if (updateError) throw updateError

    const results = await Promise.all(recipients.map(async (email) => {
      try {
        const { data, error } = await resend.emails.send(
          { from: FROM_ADDRESS, to: email, subject, html: companyUpdateHtml(subject, message) },
          { headers: { 'Idempotency-Key': `mowatek-company-update-${update.id}-${email}` } }
        )
        if (error || !data?.id) throw new Error(error?.message || 'Resend did not return an email ID.')
        return { recipient_email: email, resend_email_id: data.id, status: 'accepted' }
      } catch (error) {
        return { recipient_email: email, status: 'failed', error_message: error instanceof Error ? error.message : 'Unknown delivery error.' }
      }
    }))

    const acceptedCount = results.filter((result) => result.status === 'accepted').length
    const failedCount = results.length - acceptedCount
    const status = failedCount === 0 ? 'sent' : acceptedCount ? 'partial' : 'failed'
    const [{ error: deliveryError }, { error: finalUpdateError }] = await Promise.all([
      supabase.from('company_update_deliveries').insert(results),
      supabase.from('company_updates').update({ accepted_count: acceptedCount, failed_count: failedCount, status, sent_at: new Date().toISOString() }).eq('id', update.id),
    ])
    if (deliveryError) throw deliveryError
    if (finalUpdateError) throw finalUpdateError

    return res.status(200).json({ success: true, recipientCount: recipients.length, acceptedCount, failedCount })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown company update error.'
    console.error('Failed to send company update:', message)
    return res.status(500).json({ error: 'Company update could not be sent. No retry was sent automatically.' })
  }
}
