import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export function MaintenancePage() {
  const [logs, setLogs] = useState([])
  const [equipmentList, setEquipmentList] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCompleteModal, setShowCompleteModal] = useState(false)

  // Form state for logging a completed maintenance action
  const [selectedAsset, setSelectedAsset] = useState('')
  const [maintenanceNotes, setMaintenanceNotes] = useState('')
  const [performedBy, setPerformedBy] = useState('')

  useEffect(() => {
    fetchMaintenanceLogs()
    fetchEquipmentForDropdown()
  }, [])

  const fetchMaintenanceLogs = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('maintenance_logs')
        .select('*')
        .order('completed_at', { ascending: false })

      if (error) throw error
      setLogs(data || [])
    } catch (err) {
      console.error('Error fetching maintenance logs:', err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchEquipmentForDropdown = async () => {
    try {
      const { data, error } = await supabase
        .from('equipment')
        .select('*')
      if (error) throw error
      setEquipmentList(data || [])
    } catch (err) {
      console.error('Error fetching equipment list:', err.message)
    }
  }

  const handleLogMaintenance = async (e) => {
    e.preventDefault()
    if (!selectedAsset) {
      alert('Please select an equipment asset.')
      return
    }

    const assetObj = equipmentList.find(eq => eq.id === selectedAsset || eq.asset_id === selectedAsset)
    const assetName = assetObj ? (assetObj.equipmentName || assetObj.name || assetObj.asset_id) : 'Unknown Asset'
    const clientName = assetObj ? (assetObj.clientName || assetObj.client || 'Internal') : 'General'

    const newLog = {
      equipment_id: assetObj?.asset_id || selectedAsset,
      asset_name: assetName,
      client_name: clientName,
      notes: maintenanceNotes || 'Routine scheduled service completed.',
      performed_by: performedBy || 'Technician',
      completed_at: new Date().toISOString()
    }

    try {
      const { data, error } = await supabase
        .from('maintenance_logs')
        .insert([newLog])
        .select()

      if (error) throw error

      if (data && data.length > 0) {
        setLogs([data[0], ...logs])
      }
      
      // Reset form & close modal
      setSelectedAsset('')
      setMaintenanceNotes('')
      setPerformedBy('')
      setShowCompleteModal(false)
      alert('Maintenance successfully logged and archived in history.')
    } catch (err) {
      console.error('Error saving maintenance log:', err.message)
      alert('Failed to save log: ' + err.message)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <span className="page-eyebrow">MOWATEK INTERNAL SYSTEM</span>
          <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '4px 0 8px 0', color: '#fff' }}>
            Maintenance Log
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
            Track completed equipment servicing, timestamps, client assets, and historical maintenance logs.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowCompleteModal(!showCompleteModal)}>
          {showCompleteModal ? 'Cancel' : '+ Log Completed Maintenance'}
        </button>
      </div>

      {/* Modal for Logging Maintenance Done */}
      {showCompleteModal && (
        <div className="content-card" style={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#fff' }}>Record Completed Maintenance</h3>
          <form onSubmit={handleLogMaintenance} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Select Equipment Asset *</label>
              <select 
                value={selectedAsset} 
                onChange={(e) => setSelectedAsset(e.target.value)}
                style={{ width: '100%', padding: '10px', background: '#020617', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff' }}
                required
              >
                <option value="">-- Choose asset from registry --</option>
                {equipmentList.map((eq) => (
                  <option key={eq.id} value={eq.id}>
                    {eq.asset_id || eq.id} — {eq.equipmentName || eq.name} ({eq.clientName || eq.client || 'No client'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Technician / Performed By</label>
              <input 
                type="text" 
                value={performedBy} 
                onChange={(e) => setPerformedBy(e.target.value)} 
                placeholder="e.g. John Doe"
                style={{ width: '100%', padding: '10px', background: '#020617', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Service Notes & Actions Performed</label>
              <textarea 
                value={maintenanceNotes} 
                onChange={(e) => setMaintenanceNotes(e.target.value)} 
                placeholder="Describe parts replaced, diagnostics run, or service details..."
                rows="3"
                style={{ width: '100%', padding: '10px', background: '#020617', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowCompleteModal(false)} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '6px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" style={{ padding: '8px 16px' }}>
                Save to History Log
              </button>
            </div>
          </form>
        </div>
      )}

      {/* History Log Display */}
      {loading ? (
        <div className="content-card" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading maintenance history...
        </div>
      ) : logs.length === 0 ? (
        <div className="content-card" style={{ padding: '30px', textAlign: 'center' }}>
          <span style={{ fontSize: '36px' }}>🔧</span>
          <h3 style={{ color: '#fff', margin: '12px 0 6px 0' }}>No Maintenance Logs Recorded Yet</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
            Click "+ Log Completed Maintenance" above to record completed servicing history.
          </p>
        </div>
      ) : (
        <div className="content-card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '14px 16px' }}>Timestamp</th>
                <th style={{ padding: '14px 16px' }}>Asset ID & Name</th>
                <th style={{ padding: '14px 16px' }}>Client</th>
                <th style={{ padding: '14px 16px' }}>Service Notes</th>
                <th style={{ padding: '14px 16px' }}>Performed By</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '14px 16px', color: '#38bdf8', whiteSpace: 'nowrap' }}>
                    {new Date(log.completed_at).toLocaleString()}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#fff', fontWeight: 600 }}>
                    {log.equipment_id} <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>({log.asset_name})</span>
                  </td>
                  <td style={{ padding: '14px 16px', color: '#e2e8f0' }}>
                    {log.client_name}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#cbd5e1', maxWidth: '300px' }}>
                    {log.notes}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#10b981', fontWeight: 500 }}>
                    {log.performed_by}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default MaintenancePage