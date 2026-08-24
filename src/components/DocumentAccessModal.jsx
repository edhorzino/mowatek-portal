import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'

const fieldStyle = { width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.28)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '7px', color: '#fff', boxSizing: 'border-box' }

export function DocumentAccessModal({ document, onClose, onChanged }) {
  const [employees, setEmployees] = useState([])
  const [permissions, setPermissions] = useState([])
  const [selectedEmail, setSelectedEmail] = useState('')
  const [permissionType, setPermissionType] = useState('permanent')
  const [expiresAt, setExpiresAt] = useState('')
  const [saving, setSaving] = useState(false)

  const availableEmployees = useMemo(() => employees.filter((employee) => {
    const email = (employee.work_email || employee.email || '').toLowerCase()
    return email && email !== document.uploaded_by?.toLowerCase()
  }), [employees, document.uploaded_by])

  const load = async () => {
    const [employeeResult, permissionResult] = await Promise.all([
      supabase.from('employees').select('first_name, last_name, work_email, email, department, status').ilike('status', 'active').order('first_name'),
      supabase.from('document_permissions').select('*').eq('document_id', document.id).order('created_at', { ascending: false }),
    ])
    if (employeeResult.error) alert(`Could not load the employee directory: ${employeeResult.error.message}`)
    else setEmployees(employeeResult.data || [])
    if (permissionResult.error) alert(`Could not load document permissions: ${permissionResult.error.message}`)
    else setPermissions(permissionResult.data || [])
  }

  useEffect(() => { void load() }, [document.id])

  const grantAccess = async () => {
    if (!selectedEmail) return
    if (permissionType === 'temporary' && (!expiresAt || new Date(expiresAt) <= new Date())) {
      alert('Choose a future expiry date and time for temporary access.')
      return
    }
    setSaving(true)
    try {
      const existing = permissions.find((permission) => permission.employee_email === selectedEmail)
      const payload = { employee_email: selectedEmail, expires_at: permissionType === 'temporary' ? new Date(expiresAt).toISOString() : null, revoked_at: null }
      const result = existing
        ? await supabase.from('document_permissions').update(payload).eq('id', existing.id)
        : await supabase.from('document_permissions').insert([{ ...payload, document_id: document.id }])
      if (result.error) throw result.error
      setSelectedEmail('')
      setExpiresAt('')
      await load()
    } catch (error) {
      alert(`Could not save access: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const revokeAccess = async (permission) => {
    setSaving(true)
    try {
      const { error } = await supabase.from('document_permissions').update({ revoked_at: new Date().toISOString() }).eq('id', permission.id)
      if (error) throw error
      await load()
    } catch (error) {
      alert(`Could not revoke access: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const makeCompanyWide = async () => {
    if (!window.confirm('Make this document company-wide? Its current individual permissions will be revoked because every staff member will be able to open it.')) return
    setSaving(true)
    try {
      const { error } = await supabase.from('documents').update({ visibility: 'company', access_level: 'INT', access: 'INT' }).eq('id', document.id)
      if (error) throw error
      onChanged()
      onClose()
    } catch (error) {
      alert(`Could not update document access: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const activePermissions = permissions.filter((permission) => !permission.revoked_at)

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(2,6,23,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '650px', background: '#0f172a', border: '1px solid rgba(251,191,36,0.35)', borderRadius: '14px', color: '#fff', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ padding: '20px 22px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', gap: '18px' }}>
          <div><h3 style={{ margin: 0, fontSize: '18px' }}>Manage confidential access</h3><p style={{ margin: '5px 0 0', color: '#94a3b8', fontSize: '12px' }}>{document.title}</p></div>
          <button onClick={onClose} style={{ border: 0, background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '20px' }}>×</button>
        </div>
        <div style={{ padding: '22px', display: 'grid', gap: '18px' }}>
          <div style={{ padding: '13px', borderRadius: '8px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', fontSize: '12px', color: '#fde68a' }}>Only you and the staff listed below can open this file. You can grant permanent access or set a time limit.</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 145px', gap: '10px' }}>
            <select value={selectedEmail} onChange={(event) => setSelectedEmail(event.target.value)} style={fieldStyle}>
              <option value="">Select an active employee…</option>
              {availableEmployees.map((employee) => { const email = (employee.work_email || employee.email || '').toLowerCase(); return <option key={email} value={email}>{employee.first_name} {employee.last_name} — {email}</option> })}
            </select>
            <select value={permissionType} onChange={(event) => setPermissionType(event.target.value)} style={fieldStyle}><option value="permanent">Permanent</option><option value="temporary">Temporary</option></select>
          </div>
          {permissionType === 'temporary' && <input type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} style={fieldStyle} />}
          <button type="button" disabled={saving || !selectedEmail} onClick={grantAccess} style={{ border: 0, borderRadius: '7px', padding: '10px', color: '#0f172a', background: '#fbbf24', fontWeight: 750, cursor: 'pointer' }}>{saving ? 'Saving…' : 'Grant access'}</button>
          <div>
            <h4 style={{ margin: '0 0 8px', fontSize: '13px' }}>Current access</h4>
            {activePermissions.length === 0 ? <p style={{ margin: 0, color: '#94a3b8', fontSize: '12px' }}>No additional employees have access yet.</p> : activePermissions.map((permission) => <div key={permission.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: '12px' }}><span>{permission.employee_email}<span style={{ display: 'block', color: '#94a3b8', marginTop: '3px' }}>{permission.expires_at ? `Expires ${new Date(permission.expires_at).toLocaleString()}` : 'Permanent access'}</span></span><button disabled={saving} onClick={() => revokeAccess(permission)} style={{ background: 'transparent', color: '#fca5a5', border: '1px solid rgba(248,113,113,0.35)', borderRadius: '5px', cursor: 'pointer', padding: '5px 8px' }}>Revoke</button></div>)}
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '18px' }}><p style={{ margin: '0 0 8px', color: '#94a3b8', fontSize: '12px' }}>If this file no longer needs restrictions, you can publish it to all employees.</p><button disabled={saving} onClick={makeCompanyWide} style={{ background: 'transparent', color: '#67e8f9', border: '1px solid rgba(6,182,212,0.45)', borderRadius: '6px', padding: '8px 10px', cursor: 'pointer', fontWeight: 650 }}>Make company-wide</button></div>
        </div>
      </div>
    </div>
  )
}
