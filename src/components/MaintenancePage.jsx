import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const nextDateFor = (date, frequency) => {
  const next = new Date(date)
  const value = (frequency || 'MONTHLY').toUpperCase()
  if (value === 'WEEKLY') next.setDate(next.getDate() + 7)
  else if (value === 'BIWEEKLY') next.setDate(next.getDate() + 14)
  else if (value === 'BIMONTHLY') next.setMonth(next.getMonth() + 2)
  else if (value === 'QUARTERLY') next.setMonth(next.getMonth() + 3)
  else if (value === 'ANNUALLY' || value === 'YEARLY') next.setFullYear(next.getFullYear() + 1)
  else next.setMonth(next.getMonth() + 1)
  return next.toISOString().split('T')[0]
}

export function MaintenancePage({ user }) {
  const [logs, setLogs] = useState([])
  const [equipment, setEquipment] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [assetId, setAssetId] = useState('')
  const [notes, setNotes] = useState('')
  const [performedBy, setPerformedBy] = useState('')
  const [reportFile, setReportFile] = useState(null)
  const [invoiceFile, setInvoiceFile] = useState(null)
  const [saving, setSaving] = useState(false)

  const loadData = async () => {
    const [logResult, equipmentResult] = await Promise.all([
      supabase.from('maintenance_logs').select('*').order('completed_at', { ascending: false }),
      supabase.from('equipment').select('*').order('client').order('asset_id'),
    ])
    if (logResult.error) console.error('Error loading maintenance history:', logResult.error.message)
    if (equipmentResult.error) console.error('Error loading equipment:', equipmentResult.error.message)
    setLogs(logResult.data || [])
    setEquipment(equipmentResult.data || [])
  }

  useEffect(() => { loadData() }, [])

  const upload = async (asset, file, type) => {
    if (!file) return null
    const extension = file.name.split('.').pop()
    const path = `${asset.asset_id.replace(/[^a-zA-Z0-9_-]/g, '_')}/${Date.now()}-${type}.${extension}`
    const { error } = await supabase.storage.from('maintenance-reports').upload(path, file)
    if (error) throw error
    return supabase.storage.from('maintenance-reports').getPublicUrl(path).data.publicUrl
  }

  const submit = async (event) => {
    event.preventDefault()
    const asset = equipment.find(item => String(item.id) === assetId)
    if (!asset || !reportFile) return
    setSaving(true)
    try {
      const reportUrl = await upload(asset, reportFile, 'report')
      const invoiceUrl = await upload(asset, invoiceFile, 'invoice')
      const invoiceStatus = invoiceUrl ? 'UPLOADED' : 'PENDING'
      const completedAt = new Date().toISOString()
      const completedDate = completedAt.split('T')[0]
      const { error: logError } = await supabase.from('maintenance_logs').insert([{
        equipment_record_id: asset.id, equipment_id: asset.asset_id, asset_name: asset.equipment || asset.asset_id,
        client_name: asset.client, notes: notes || 'Routine scheduled service completed.',
        performed_by: performedBy || user?.email || 'Technician', completed_at: completedAt,
        maintenance_report_url: reportUrl, invoice_url: invoiceUrl, invoice_status: invoiceStatus,
      }])
      if (logError) throw logError
      const { error: equipmentError } = await supabase.from('equipment').update({
        last_maintenance: completedDate, next_maintenance: nextDateFor(completedDate, asset.maintenance_frequency),
        maintenance_report_url: reportUrl, invoice_url: invoiceUrl, invoice_status: invoiceStatus, invoice_cashed: false,
      }).eq('id', asset.id)
      if (equipmentError) throw equipmentError
      setAssetId(''); setNotes(''); setPerformedBy(''); setReportFile(null); setInvoiceFile(null); setShowForm(false)
      await loadData()
      alert('Maintenance has been completed and added to the history log.')
    } catch (error) {
      alert(`Unable to complete maintenance: ${error.message}`)
    } finally { setSaving(false) }
  }

  return <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
      <div><span className="page-eyebrow">OPERATIONS HISTORY</span><h1 style={{ fontSize: '28px', fontWeight: 800, margin: '4px 0 8px', color: '#fff' }}>Maintenance Log</h1><p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>Completed maintenance is recorded here with its required report.</p></div>
      <button className="btn-primary" onClick={() => setShowForm(value => !value)}>{showForm ? 'Cancel' : '+ Complete Maintenance'}</button>
    </div>
    {showForm && <form onSubmit={submit} className="content-card" style={{ display: 'grid', gap: '14px', maxWidth: '720px' }}>
      <select required value={assetId} onChange={e => setAssetId(e.target.value)} style={{ padding: '10px', background: '#020617', color: '#fff', borderRadius: '6px' }}><option value="">Select an asset</option>{equipment.map(item => <option key={item.id} value={item.id}>{item.client} — {item.asset_id} ({item.equipment || 'Equipment'})</option>)}</select>
      <input value={performedBy} onChange={e => setPerformedBy(e.target.value)} placeholder="Technician / performed by" style={{ padding: '10px', background: '#020617', color: '#fff', borderRadius: '6px' }} />
      <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Service notes and work performed" rows="3" style={{ padding: '10px', background: '#020617', color: '#fff', borderRadius: '6px' }} />
      <label style={{ color: '#38bdf8', fontSize: '13px' }}>Maintenance report (required) <input required type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={e => setReportFile(e.target.files[0])} /></label>
      <label style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Invoice (optional) <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={e => setInvoiceFile(e.target.files[0])} /></label>
      <button className="btn-primary" disabled={saving} type="submit">{saving ? 'Saving maintenance…' : 'Complete & add to history'}</button>
    </form>}
    <div className="content-card" style={{ padding: 0, overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}><thead><tr style={{ color: 'var(--text-muted)', textAlign: 'left' }}><th style={{ padding: '14px' }}>Completed</th><th style={{ padding: '14px' }}>Asset</th><th style={{ padding: '14px' }}>Client</th><th style={{ padding: '14px' }}>Report</th><th style={{ padding: '14px' }}>Invoice</th><th style={{ padding: '14px' }}>Performed by</th></tr></thead><tbody>{logs.length ? logs.map(log => <tr key={log.id} style={{ borderTop: '1px solid rgba(255,255,255,.08)' }}><td style={{ padding: '14px' }}>{new Date(log.completed_at).toLocaleString()}</td><td style={{ padding: '14px', color: '#fff' }}>{log.equipment_id}<div style={{ color: 'var(--text-muted)' }}>{log.asset_name}</div></td><td style={{ padding: '14px' }}>{log.client_name}</td><td style={{ padding: '14px' }}>{log.maintenance_report_url ? <a href={log.maintenance_report_url} target="_blank" rel="noreferrer">View report</a> : '—'}</td><td style={{ padding: '14px' }}>{log.invoice_url ? <a href={log.invoice_url} target="_blank" rel="noreferrer">View invoice</a> : 'Pending'}</td><td style={{ padding: '14px' }}>{log.performed_by}</td></tr>) : <tr><td colSpan="6" style={{ padding: '28px', textAlign: 'center', color: 'var(--text-muted)' }}>No maintenance history yet.</td></tr>}</tbody></table></div>
  </div>
}

export default MaintenancePage
