import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function TasksPage({ user }) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [reminderDate, setReminderDate] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Fetch tasks for current user
  useEffect(() => {
    async function fetchTasks() {
      if (!user?.email) return
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('user_email', user.email.toLowerCase())
          .order('reminder_date', { ascending: true })

        if (error) throw error
        setTasks(data || [])
      } catch (err) {
        console.error('Error loading tasks:', err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchTasks()
  }, [user])

  // Quick reminder day calculators (sets target date formatted as YYYY-MM-DD)
  const setQuickReminder = (daysAhead) => {
    const target = new Date()
    target.setDate(target.getDate() + daysAhead)
    const localDateString = target.toISOString().split('T')[0]
    setReminderDate(localDateString)
  }

  const handleAddTask = async (e) => {
    e.preventDefault()
    if (!title || !reminderDate) {
      alert('Please provide a task title and reminder date.')
      return
    }

    try {
      setSubmitting(true)
      // Automatically lock every reminder time to 09:00:00 AM
      const lockedDateTime = `${reminderDate}T09:00:00.000Z`

      const newTaskPayload = {
        user_email: user.email.toLowerCase(),
        title,
        description,
        reminder_date: lockedDateTime,
        status: 'Pending'
      }

      const { data, error } = await supabase
        .from('tasks')
        .insert([newTaskPayload])
        .select()

      if (error) throw error

      if (data && data.length > 0) {
        setTasks([data[0], ...tasks])
      }

      setTitle('')
      setDescription('')
      setReminderDate('')
    } catch (err) {
      console.error('Error saving task:', err.message)
      alert('Failed to save task: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteTask = async (id) => {
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', id)
      if (error) throw error
      setTasks(tasks.filter(t => t.id !== id))
    } catch (err) {
      console.error('Error deleting task:', err.message)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1000px' }}>
      <div>
        <span className="page-eyebrow">PROJECT ALPHA • AUTOMATED WORKFLOWS</span>
        <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '4px 0 8px 0', color: '#fff' }}>
          Smart Task Reminders
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
          Create tasks, pick a reminder day, and receive morning email digests at 9:00 AM.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        
        {/* Task Creation Form */}
        <div className="content-card" style={{ height: 'fit-content' }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#fff', fontSize: '18px' }}>Create New Reminder</h3>
          <form onSubmit={handleAddTask} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Task Title / Client Follow-up</label>
              <input
                type="text"
                placeholder="e.g. Call client regarding quotation feedback"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Notes / Details (Optional)</label>
              <textarea
                placeholder="Add context, phone numbers, or RFQ reference codes..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows="3"
                style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', resize: 'vertical' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Quick Frequency Select</label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                <button type="button" onClick={() => setQuickReminder(1)} style={{ padding: '6px 10px', background: 'rgba(6,182,212,0.1)', border: '1px solid var(--accent-cyan)', color: 'var(--accent-cyan)', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>Tomorrow</button>
                <button type="button" onClick={() => setQuickReminder(2)} style={{ padding: '6px 10px', background: 'rgba(6,182,212,0.1)', border: '1px solid var(--accent-cyan)', color: 'var(--accent-cyan)', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>In 2 Days</button>
                <button type="button" onClick={() => setQuickReminder(7)} style={{ padding: '6px 10px', background: 'rgba(6,182,212,0.1)', border: '1px solid var(--accent-cyan)', color: 'var(--accent-cyan)', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>In 1 Week</button>
              </div>

              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Reminder Date (Delivers at 9:00 AM)</label>
              <input
                type="date"
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
                style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff' }}
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{ background: 'var(--accent-cyan)', color: '#0f172a', border: 'none', padding: '12px', fontWeight: 700, borderRadius: '6px', cursor: 'pointer', marginTop: '8px' }}
            >
              {submitting ? 'Scheduling...' : 'Set Task & Automated Email'}
            </button>
          </form>
        </div>

        {/* Task List View */}
        <div className="content-card">
          <h3 style={{ margin: '0 0 16px 0', color: '#fff', fontSize: '18px' }}>Your Scheduled Reminders</h3>
          {loading ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Loading tasks...</p>
          ) : tasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '14px', margin: 0 }}>No active reminders set.</p>
              <p style={{ fontSize: '12px', marginTop: '6px' }}>Create a task on the left to start tracking follow-ups.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '500px', overflowY: 'auto' }}>
              {tasks.map((task) => (
                <div key={task.id} style={{ background: 'rgba(0,0,0,0.25)', padding: '14px', borderRadius: '8px', borderLeft: '4px solid var(--accent-cyan)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <strong style={{ color: '#fff', fontSize: '14px' }}>{task.title}</strong>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', color: '#10b981', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}
                        title="Mark Complete & Delete"
                      >
                        Complete ✓
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '13px' }}
                        title="Delete Task"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  {task.description && (
                    <p style={{ margin: '0 0 8px 0', color: 'var(--text-muted)', fontSize: '13px' }}>{task.description}</p>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#94a3b8', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
                    <span>⏰ Reminder: {new Date(task.reminder_date).toLocaleString()}</span>
                    <span style={{ color: '#10b981', fontWeight: 600 }}>● Active</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}