import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const WAT_TIME_SUFFIX = 'T08:00:00.000Z'
const inputStyle = { display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 6, padding: 10, background: 'rgba(0,0,0,.3)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 6, color: '#fff' }
const primaryButtonStyle = { background: 'var(--accent-cyan)', color: '#0f172a', border: 'none', padding: 12, fontWeight: 700, borderRadius: 6, cursor: 'pointer' }
const quickButtonStyle = { padding: '6px 10px', background: 'rgba(6,182,212,.1)', border: '1px solid var(--accent-cyan)', color: 'var(--accent-cyan)', borderRadius: 4, fontSize: 11, cursor: 'pointer' }
const actionButtonStyle = { background: 'rgba(6,182,212,.1)', border: '1px solid var(--accent-cyan)', color: 'var(--accent-cyan)', padding: '5px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 600 }

function toReminderTimestamp(date) { return `${date}${WAT_TIME_SUFFIX}` }
function formatReminderDate(value) { return new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Lagos' }).format(new Date(value)) }
function employeeName(employee) { return [employee.first_name, employee.middle_name, employee.last_name].filter(Boolean).join(' ') || employee.work_email }
function deliveryLabel(task) {
  if (task.delivery_status === 'sent') return 'Email sent'
  if (task.delivery_status === 'failed') return 'Delivery needs attention'
  if (task.delivery_status === 'sending') return 'Delivery in progress'
  return 'Email queued'
}

export function TasksPage({ user }) {
  const [tasks, setTasks] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [reminderDate, setReminderDate] = useState('')
  const [sharedEmails, setSharedEmails] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [editDate, setEditDate] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [rescheduling, setRescheduling] = useState(false)

  const currentEmail = user?.email?.toLowerCase() || ''
  const shareableEmployees = useMemo(() => employees.filter((employee) => employee.work_email?.toLowerCase() !== currentEmail), [employees, currentEmail])

  const fetchPageData = async () => {
    if (!currentEmail) return
    try {
      setLoading(true)
      const [tasksResult, employeesResult] = await Promise.all([
        supabase.from('tasks').select('*, task_participants(user_email, participant_role)').order('reminder_date', { ascending: true }),
        supabase.from('employees').select('work_email, first_name, middle_name, last_name, department, status').ilike('status', 'active').order('first_name', { ascending: true }),
      ])
      if (tasksResult.error) throw tasksResult.error
      if (employeesResult.error) throw employeesResult.error
      setTasks(tasksResult.data || [])
      setEmployees(employeesResult.data || [])
    } catch (error) {
      console.error('Error loading reminders:', error.message)
      alert(`Unable to load reminders: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void fetchPageData() }, [currentEmail])

  const setQuickReminder = (daysAhead, editing = false) => {
    const target = new Date()
    target.setDate(target.getDate() + daysAhead)
    const date = target.toISOString().split('T')[0]
    if (editing) setEditDate(date)
    else setReminderDate(date)
  }

  const toggleSharedEmail = (email) => setSharedEmails((current) => current.includes(email) ? current.filter((item) => item !== email) : [...current, email])

  const handleAddTask = async (event) => {
    event.preventDefault()
    if (!title.trim() || !reminderDate) return
    try {
      setSubmitting(true)
      const { data: createdTask, error: taskError } = await supabase.from('tasks').insert({ user_email: currentEmail, creator_email: currentEmail, title: title.trim(), description: description.trim() || null, reminder_date: toReminderTimestamp(reminderDate), status: 'Pending' }).select().single()
      if (taskError) throw taskError
      if (sharedEmails.length) {
        const { error: participantError } = await supabase.from('task_participants').insert(sharedEmails.map((email) => ({ task_id: createdTask.id, user_email: email, participant_role: 'cc', added_by_email: currentEmail })))
        if (participantError) throw participantError
      }
      setTitle(''); setDescription(''); setReminderDate(''); setSharedEmails([])
      await fetchPageData()
    } catch (error) {
      console.error('Error saving reminder:', error.message)
      alert(`Failed to schedule reminder: ${error.message}`)
    } finally { setSubmitting(false) }
  }

  const openRescheduleModal = (task) => {
    setEditingTask(task)
    setEditNotes(task.description || '')
    setEditDate(task.reminder_date?.split('T')[0] || '')
  }

  const handleReschedule = async (event) => {
    event.preventDefault()
    if (!editingTask || !editDate) return
    try {
      setRescheduling(true)
      const { error } = await supabase.from('tasks').update({ reminder_date: toReminderTimestamp(editDate), description: editNotes.trim() || null, status: 'Pending' }).eq('id', editingTask.id)
      if (error) throw error
      setEditingTask(null)
      await fetchPageData()
    } catch (error) { alert(`Failed to reschedule reminder: ${error.message}`) } finally { setRescheduling(false) }
  }

  const updateTaskStatus = async (task, status) => {
    const action = status === 'Completed' ? 'complete' : 'cancel'
    if (!window.confirm(`Are you sure you want to ${action} “${task.title}”?`)) return
    try {
      const { error } = await supabase.from('tasks').update({ status, ...(status === 'Completed' ? { completed_by_email: currentEmail } : {}) }).eq('id', task.id)
      if (error) throw error
      await fetchPageData()
    } catch (error) { alert(`Failed to update reminder: ${error.message}`) }
  }

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1080, position: 'relative' }}>
    <div><span className="page-eyebrow">PROJECT ALPHA • AUTOMATED WORKFLOWS</span><h1 style={{ fontSize: 28, fontWeight: 800, margin: '4px 0 8px', color: '#fff' }}>Smart Task Reminders</h1><p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>Schedule a 9:00 AM Lagos-time reminder and share it with approved Mowatek colleagues.</p></div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
      <div className="content-card" style={{ height: 'fit-content' }}><h3 style={{ margin: '0 0 16px', color: '#fff', fontSize: 18 }}>Create New Reminder</h3><form onSubmit={handleAddTask} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Task Title / Client Follow-up<input value={title} onChange={(event) => setTitle(event.target.value)} required placeholder="e.g. Call client regarding quotation feedback" style={inputStyle} /></label>
        <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Notes / Details (Optional)<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows="3" style={{ ...inputStyle, resize: 'vertical' }} /></label>
        <div><span style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Reminder Date (9:00 AM Lagos time)</span><div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>{[['Tomorrow', 1], ['In 2 Days', 2], ['In 1 Week', 7]].map(([label, days]) => <button key={label} type="button" onClick={() => setQuickReminder(days)} style={quickButtonStyle}>{label}</button>)}</div><input type="date" value={reminderDate} onChange={(event) => setReminderDate(event.target.value)} required style={inputStyle} /></div>
        <div><span style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Copy Mowatek Colleagues (Optional)</span><p style={{ fontSize: 11, color: '#64748b', margin: '0 0 8px' }}>Selected active employees receive the email and can manage this shared reminder in their task page.</p><div style={{ maxHeight: 150, overflowY: 'auto', border: '1px solid rgba(255,255,255,.1)', borderRadius: 6, padding: 8 }}>{shareableEmployees.length ? shareableEmployees.map((employee) => { const email = employee.work_email.toLowerCase(); return <label key={email} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 2px', color: '#cbd5e1', fontSize: 12 }}><input type="checkbox" checked={sharedEmails.includes(email)} onChange={() => toggleSharedEmail(email)} /> <span>{employeeName(employee)} <small style={{ color: '#64748b' }}>({email})</small></span></label> }) : <span style={{ color: '#64748b', fontSize: 12 }}>No other active employees are available to copy.</span>}</div></div>
        <button type="submit" disabled={submitting} style={primaryButtonStyle}>{submitting ? 'Scheduling…' : 'Set Shared Reminder'}</button>
      </form></div>
      <div className="content-card"><h3 style={{ margin: '0 0 16px', color: '#fff', fontSize: 18 }}>Your Reminders</h3>{loading ? <p style={{ color: 'var(--text-muted)' }}>Loading reminders…</p> : !tasks.length ? <p style={{ color: 'var(--text-muted)' }}>No reminders scheduled yet.</p> : <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 650, overflowY: 'auto' }}>{tasks.map((task) => { const isCreator = task.creator_email === currentEmail; const copiedEmails = (task.task_participants || []).map((participant) => participant.user_email).filter((email) => email !== task.creator_email); const terminal = ['Completed', 'Cancelled'].includes(task.status); return <div key={task.id} style={{ background: 'rgba(0,0,0,.25)', padding: 14, borderRadius: 8, borderLeft: `4px solid ${terminal ? '#64748b' : 'var(--accent-cyan)'}` }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><strong style={{ color: '#fff', fontSize: 14 }}>{task.title}</strong><span style={{ color: task.status === 'Completed' ? '#10b981' : task.status === 'Sent' ? '#f59e0b' : '#67e8f9', fontSize: 11, fontWeight: 700 }}>{task.status}</span></div>{task.description && <p style={{ margin: '8px 0', color: 'var(--text-muted)', fontSize: 13 }}>{task.description}</p>}<p style={{ margin: '8px 0', color: '#94a3b8', fontSize: 11 }}>⏰ {formatReminderDate(task.reminder_date)} · {deliveryLabel(task)}</p>{copiedEmails.length > 0 && <p style={{ margin: '8px 0', color: '#cbd5e1', fontSize: 11 }}>Copied: {copiedEmails.join(', ')}</p>}{task.status === 'Completed' && <p style={{ margin: '8px 0', color: '#86efac', fontSize: 11 }}>Completed by {task.completed_by_email || 'a participant'}{task.completed_at ? ` on ${formatReminderDate(task.completed_at)}` : ''}</p>}{!terminal && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}><button onClick={() => updateTaskStatus(task, 'Completed')} style={actionButtonStyle}>Complete ✓</button><button onClick={() => openRescheduleModal(task)} style={actionButtonStyle}>Reschedule</button>{isCreator && <button onClick={() => updateTaskStatus(task, 'Cancelled')} style={{ ...actionButtonStyle, color: '#fca5a5', borderColor: 'rgba(239,68,68,.5)' }}>Cancel</button>}</div>}</div> })}</div>}</div>
    </div>
    {editingTask && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}><div className="content-card" style={{ width: '100%', maxWidth: 480, background: '#1e293b' }}><h3 style={{ margin: '0 0 14px', color: '#fff' }}>Reschedule Reminder</h3><form onSubmit={handleReschedule} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{[['Tomorrow', 1], ['In 3 Days', 3], ['In 1 Week', 7]].map(([label, days]) => <button key={label} type="button" onClick={() => setQuickReminder(days, true)} style={quickButtonStyle}>{label}</button>)}</div><input type="date" value={editDate} onChange={(event) => setEditDate(event.target.value)} required style={inputStyle} /><textarea value={editNotes} onChange={(event) => setEditNotes(event.target.value)} rows="3" style={{ ...inputStyle, resize: 'vertical' }} /><div style={{ display: 'flex', gap: 10 }}><button type="button" onClick={() => setEditingTask(null)} style={{ ...actionButtonStyle, flex: 1 }}>Cancel</button><button type="submit" disabled={rescheduling} style={{ ...primaryButtonStyle, flex: 1 }}>{rescheduling ? 'Saving…' : 'Confirm Reschedule'}</button></div></form></div></div>}
  </div>
}
