import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const resend = new Resend(process.env.RESEND_API_KEY)
const MAX_DELIVERY_ATTEMPTS = 3

function escapeHtml(value = '') {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;')
}

function reminderEmailHtml(task) {
  const scheduledFor = new Intl.DateTimeFormat('en-NG', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Africa/Lagos' }).format(new Date(task.reminder_date))
  return `<div style="font-family:Arial,sans-serif;padding:24px;background:#0f172a;color:#f8fafc;border-radius:8px">
    <h2 style="color:#06b6d4;margin-top:0">Mowatek Task Reminder</h2>
    <p style="font-size:16px"><strong>${escapeHtml(task.title)}</strong></p>
    ${task.description ? `<p style="color:#cbd5e1">${escapeHtml(task.description)}</p>` : ''}
    <hr style="border:0;border-top:1px solid rgba(255,255,255,.12);margin:20px 0" />
    <p style="color:#94a3b8;font-size:12px;margin:0">Scheduled for: ${escapeHtml(scheduledFor)} (Lagos time)</p>
    <p style="color:#94a3b8;font-size:12px">Open the Mowatek portal to complete or reschedule this reminder.</p>
  </div>`
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  if (!process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.RESEND_API_KEY) {
    console.error('Reminder job is missing required server environment variables.')
    return res.status(500).json({ error: 'Reminder service is not configured.' })
  }

  try {
    const { data: dueTasks, error: fetchError } = await supabase
      .from('tasks')
      .select('id, user_email, title, description, reminder_date, reminder_version, delivery_status, delivery_attempts, task_participants(user_email)')
      .eq('status', 'Pending')
      .in('delivery_status', ['pending', 'failed'])
      .lte('reminder_date', new Date().toISOString())
      .order('reminder_date', { ascending: true })
      .limit(50)

    if (fetchError) throw fetchError

    let sent = 0
    let failed = 0
    let skipped = 0

    for (const task of dueTasks || []) {
      if (task.delivery_attempts >= MAX_DELIVERY_ATTEMPTS) {
        skipped += 1
        continue
      }

      const { data: claimedTask, error: claimError } = await supabase
        .from('tasks')
        .update({ delivery_status: 'sending', delivery_attempts: task.delivery_attempts + 1, last_delivery_error: null })
        .eq('id', task.id)
        .eq('status', 'Pending')
        .in('delivery_status', ['pending', 'failed'])
        .select('id')
        .maybeSingle()

      if (claimError) throw claimError
      if (!claimedTask) {
        skipped += 1
        continue
      }

      const recipientEmails = [...new Set([task.user_email, ...(task.task_participants || []).map((participant) => participant.user_email)].filter(Boolean).map((email) => email.toLowerCase()))]
      const [ownerEmail, ...ccEmails] = recipientEmails

      try {
        const { data: previousDelivery, error: lookupError } = await supabase
          .from('task_reminder_deliveries')
          .select('id, status')
          .eq('task_id', task.id)
          .eq('reminder_version', task.reminder_version)
          .maybeSingle()
        if (lookupError) throw lookupError
        if (previousDelivery?.status === 'processing' || previousDelivery?.status === 'sent') {
          skipped += 1
          continue
        }

        const deliveryPayload = { task_id: task.id, reminder_version: task.reminder_version, status: 'processing', attempt_count: task.delivery_attempts + 1, recipient_count: recipientEmails.length, error_message: null }
        const { data: delivery, error: deliveryError } = previousDelivery
          ? await supabase.from('task_reminder_deliveries').update(deliveryPayload).eq('id', previousDelivery.id).select('id').single()
          : await supabase.from('task_reminder_deliveries').insert(deliveryPayload).select('id').single()
        if (deliveryError) throw deliveryError

        const { data: emailData, error: emailError } = await resend.emails.send(
          {
            from: 'Mowatek Portal <notifications@reminder.mowatek.com>',
            to: ownerEmail,
            ...(ccEmails.length ? { cc: ccEmails } : {}),
            subject: `Reminder: ${task.title}`,
            html: reminderEmailHtml(task),
          },
          { headers: { 'Idempotency-Key': `mowatek-reminder-${task.id}-${task.reminder_version}` } }
        )
        if (emailError || !emailData?.id) throw new Error(emailError?.message || 'Resend did not return an email ID.')

        const sentAt = new Date().toISOString()
        const [deliveryUpdate, taskUpdate] = await Promise.all([
          supabase.from('task_reminder_deliveries').update({ status: 'sent', resend_email_id: emailData.id, sent_at: sentAt }).eq('id', delivery.id),
          supabase.from('tasks').update({ status: 'Sent', delivery_status: 'sent', last_delivery_error: null }).eq('id', task.id),
        ])
        if (deliveryUpdate.error) throw deliveryUpdate.error
        if (taskUpdate.error) throw taskUpdate.error
        sent += 1
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown reminder delivery error.'
        console.error(`Failed to send reminder for task ${task.id}:`, message)
        await Promise.all([
          supabase.from('task_reminder_deliveries').update({ status: 'failed', error_message: message }).eq('task_id', task.id).eq('reminder_version', task.reminder_version),
          supabase.from('tasks').update({ delivery_status: 'failed', last_delivery_error: message }).eq('id', task.id),
        ])
        failed += 1
      }
    }

    return res.status(200).json({ success: true, sent, failed, skipped })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown reminder job error.'
    console.error('Error in reminder cron job:', message)
    return res.status(500).json({ error: 'Reminder job failed.' })
  }
}
