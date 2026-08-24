import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '12px 14px', background: 'rgba(0,0,0,0.28)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none' }

export function CompanyUpdatesPage() {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [recipientCount, setRecipientCount] = useState(null)
  const [history, setHistory] = useState([])
  const [sending, setSending] = useState(false)

  const load = async () => {
    const [employeeResult, historyResult] = await Promise.all([
      supabase.from('employees').select('*', { count: 'exact', head: true }).ilike('status', 'active'),
      supabase.from('company_updates').select('*').order('created_at', { ascending: false }).limit(10),
    ])
    if (!employeeResult.error) setRecipientCount(employeeResult.count || 0)
    if (!historyResult.error) setHistory(historyResult.data || [])
  }

  useEffect(() => { void load() }, [])

  const sendUpdate = async (event) => {
    event.preventDefault()
    if (!subject.trim() || !message.trim()) return
    if (!window.confirm(`Send this update to ${recipientCount ?? 'all'} active staff members? This action cannot be recalled.`)) return
    setSending(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('Your session has ended. Please sign in again.')
      const response = await fetch('/api/send-company-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ subject, message }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Could not send company update.')
      alert(`Update accepted for ${payload.acceptedCount} of ${payload.recipientCount} active staff members.${payload.failedCount ? ` ${payload.failedCount} delivery attempt(s) failed; see the history below.` : ''}`)
      setSubject('')
      setMessage('')
      await load()
    } catch (error) {
      alert(error.message)
    } finally {
      setSending(false)
    }
  }

  return <div style={{ maxWidth: '900px', display: 'grid', gap: '24px' }}>
    <div><span className="page-eyebrow">PRIVATE ADMINISTRATION</span><h1 style={{ fontSize: '28px', fontWeight: 800, margin: '4px 0 8px', color: '#fff' }}>Company Updates</h1><p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '14px' }}>Send an official update from <strong style={{ color: '#67e8f9' }}>updates@reminder.mowatek.com</strong> to every active employee.</p></div>
    <form onSubmit={sendUpdate} className="content-card" style={{ margin: 0, display: 'grid', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '8px', background: 'rgba(6,182,212,0.09)', border: '1px solid rgba(6,182,212,0.2)' }}><span style={{ fontSize: '13px', color: '#cbd5e1' }}>Audience</span><strong style={{ fontSize: '13px', color: '#67e8f9' }}>{recipientCount === null ? 'Checking active staff…' : `${recipientCount} active staff member${recipientCount === 1 ? '' : 's'}`}</strong></div>
      <div><label style={{ display: 'block', marginBottom: '6px', color: '#94a3b8', fontSize: '12px' }}>Subject</label><input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={180} required placeholder="e.g. Portal maintenance scheduled for Friday" style={inputStyle} /></div>
      <div><label style={{ display: 'block', marginBottom: '6px', color: '#94a3b8', fontSize: '12px' }}>Message</label><textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={12000} required rows={9} placeholder="Write the company update here…" style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.55 }} /></div>
      <button type="submit" disabled={sending || recipientCount === 0} style={{ background: '#06b6d4', color: '#082f49', border: 0, borderRadius: '8px', padding: '12px 16px', fontWeight: 800, cursor: 'pointer' }}>{sending ? 'Sending update…' : `Preview & send to ${recipientCount ?? '…'} staff`}</button>
    </form>
    <div className="content-card" style={{ margin: 0 }}><h2 style={{ margin: '0 0 14px', fontSize: '17px', color: '#fff' }}>Recent sending history</h2>{history.length === 0 ? <p style={{ margin: 0, color: '#94a3b8', fontSize: '13px' }}>No company updates have been sent yet.</p> : <div style={{ display: 'grid', gap: '10px' }}>{history.map((update) => <div key={update.id} style={{ padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', gap: '16px' }}><div><strong style={{ color: '#fff', fontSize: '13px' }}>{update.subject}</strong><span style={{ display: 'block', color: '#94a3b8', fontSize: '11px', marginTop: '4px' }}>{new Date(update.created_at).toLocaleString()}</span></div><span style={{ color: update.status === 'sent' ? '#6ee7b7' : '#fcd34d', fontSize: '12px', fontWeight: 700, textTransform: 'capitalize' }}>{update.accepted_count}/{update.recipient_count} accepted</span></div>)}</div>}</div>
  </div>
}
