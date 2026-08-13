import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

// Initialize Supabase with Service Role key to bypass RLS for background server checks
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res) {
  // Optional security check for Vercel Cron
  const authHeader = req.headers['authorization']
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const now = new Date().toISOString()

    // 1. Fetch pending tasks that are due
    const { data: dueTasks, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .eq('status', 'Pending')
      .lte('reminder_date', now)

    if (fetchError) throw fetchError

    if (!dueTasks || dueTasks.length === 0) {
      return res.status(200).json({ message: 'No pending reminders due at this time.' })
    }

    let processedCount = 0

    // 2. Loop through due tasks and dispatch via Resend
    for (const task of dueTasks) {
      if (!task.user_email) continue

      try {
        await resend.emails.send({
          from: 'Project Alpha <notifications@reminder.mowatek.com>',
          to: task.user_email,
          subject: `Reminder: ${task.title}`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 24px; background: #0f172a; color: #f8fafc; border-radius: 8px;">
              <h2 style="color: #06b6d4; margin-top: 0;">Task Reminder</h2>
              <p style="font-size: 16px;"><strong>${task.title}</strong></p>
              ${task.description ? `<p style="color: #94a3b8;">${task.description}</p>` : ''}
              <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.1); margin: 20px 0;" />
              <p style="color: #64748b; font-size: 12px; margin: 0;">Scheduled for: ${new Date(task.reminder_date).toLocaleString()}</p>
            </div>
          `
        })

        // 3. Update task status to 'Sent' so it doesn't repeat
        await supabase
          .from('tasks')
          .update({ status: 'Sent' })
          .eq('id', task.id)

        processedCount++
      } catch (emailErr) {
        console.error(`Failed to send email for task ${task.id}:`, emailErr.message)
      }
    }

    return res.status(200).json({ success: true, processed: processedCount })
  } catch (err) {
    console.error('Error in reminder cron job:', err.message)
    return res.status(500).json({ error: err.message })
  }
}