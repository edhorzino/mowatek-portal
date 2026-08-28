import { useState, useEffect } from 'react'
import { EquipmentTable } from './EquipmentTable'
import { AddEquipmentModal } from './AddEquipmentModal'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { addSignedMaintenanceUrls, completeMaintenance, createMaintenanceFileUrl } from '../services/maintenanceService'

const DATE_FIELDS = ['installation_date', 'last_maintenance', 'next_maintenance']
const OPTIONAL_TEXT_FIELDS = ['client_contact', 'site_engineer', 'site_engr_contact']
const REQUIRED_TEXT_FIELDS = ['asset_id', 'client', 'site', 'equipment']

function normaliseEquipmentPayload(record) {
  const payload = { ...record }

  for (const field of DATE_FIELDS) {
    if (Object.hasOwn(payload, field)) payload[field] = payload[field] || null
  }

  for (const field of OPTIONAL_TEXT_FIELDS) {
    if (Object.hasOwn(payload, field)) payload[field] = String(payload[field] || '').trim() || null
  }

  for (const field of REQUIRED_TEXT_FIELDS) {
    if (!Object.hasOwn(payload, field)) continue
    payload[field] = String(payload[field] || '').trim()
    if (!payload[field]) throw new Error(`${field.replace('_', ' ')} is required.`)
  }

  if (Object.hasOwn(payload, 'asset_id')) payload.asset_id = payload.asset_id.toUpperCase()
  return payload
}

// --- PageHeader Helper Component ---
function PageHeader({ eyebrow, title, description, action }) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <span className="page-eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="page-heading-action">{action}</div>}
    </div>
  )
}

export function EquipmentPage({ isAdmin = false }) {
  const { user } = useAuth()
  const [equipmentList, setEquipmentList] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  
  // State for Equipment Detail & Vault History Modal
  const [selectedAssetHistory, setSelectedAssetHistory] = useState(null)
  const [assetLogs, setAssetLogs] = useState([])

  // Fetch equipment records from Supabase on load
  useEffect(() => {
    fetchEquipment()
  }, [])

  const fetchEquipment = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('equipment')
      .select('*')
      .order('asset_id', { ascending: true })

    if (error) {
      console.error('Error fetching equipment from Supabase:', error.message)
    } else {
      setEquipmentList(data || [])
    }
    setLoading(false)
  }

  const handleAdd = async (newItem) => {
    const payload = normaliseEquipmentPayload(newItem)
    const { data, error } = await supabase
      .from('equipment')
      .insert([payload])
      .select()

    if (error) {
      if (error.code === '23505') {
        throw new Error(`Asset ID ${payload.asset_id} already exists. Use the next manually assigned asset ID.`)
      }
      throw error
    } else if (data) {
      setEquipmentList(prev => [data[0], ...prev])
      setShowAddForm(false)
    }
  }

  const handleUpdate = async (id, updatedFields) => {
    const payload = normaliseEquipmentPayload(updatedFields)
    const { error } = await supabase
      .from('equipment')
      .update(payload)
      .eq('id', id)

    if (error) {
      if (error.code === '23505') throw new Error(`Asset ID ${payload.asset_id} already exists. Use a different manually assigned asset ID.`)
      throw error
    }
    setEquipmentList(prev => prev.map(e => e.id === id ? { ...e, ...payload } : e))
    if (selectedAssetHistory && selectedAssetHistory.id === id) {
      setSelectedAssetHistory(prev => ({ ...prev, ...payload }))
    }
  }

  const handleCompleteMaintenance = async (asset, { reportFile, invoiceFile, notes }) => {
    await completeMaintenance({ asset, user, reportFile, invoiceFile, notes })
    await fetchEquipment()
  }

  const openAssetHistory = async (asset) => {
    const maintenanceReportLink = asset.maintenance_report_path
      ? await createMaintenanceFileUrl(asset.maintenance_report_path)
      : asset.maintenance_report_url || null
    setSelectedAssetHistory({ ...asset, maintenance_report_link: maintenanceReportLink })
    const { data, error } = await supabase
      .from('maintenance_logs')
      .select('*')
      .eq('equipment_record_id', asset.id)
      .order('completed_at', { ascending: false })
    if (error) console.error('Error loading asset history:', error.message)
    setAssetLogs(await addSignedMaintenanceUrls(data || []))
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this equipment record?')) return

    const { error } = await supabase
      .from('equipment')
      .delete()
      .eq('id', id)

    if (error) {
      alert('Error deleting equipment: ' + error.message)
    } else {
      setEquipmentList(prev => prev.filter(e => e.id !== id))
      setSelectedAssetHistory(null)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="ASSET MANAGEMENT"
        title="Equipment Registry"
        description="Track client asset installations, maintenance schedules, and site contacts from Supabase."
        action={isAdmin ? (
          <button className="btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? 'Cancel' : '+ Add Equipment'}
          </button>
        ) : null}
      />

      {showAddForm && <AddEquipmentModal onAdd={handleAdd} onClose={() => setShowAddForm(false)} />}

      <section className="content-card">
        {loading ? (
          <p style={{ padding: '24px', color: '#94a3b8' }}>Loading equipment from Supabase...</p>
        ) : (
          <EquipmentTable
            equipmentList={equipmentList}
            isAdmin={isAdmin}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onSelectAsset={openAssetHistory}
            onCompleteMaintenance={handleCompleteMaintenance}
          />
        )}
      </section>

      {/* Equipment Detail & Vault History Modal */}
      {selectedAssetHistory && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 }}>
          <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.2)', padding: '24px', borderRadius: '12px', width: '650px', maxWidth: '90%', maxHeight: '85vh', overflowY: 'auto' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ color: '#fff', margin: 0 }}>Asset Details & Vault History</h3>
              <button onClick={() => setSelectedAssetHistory(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>

            {/* Metadata Card */}
            <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '14px', borderRadius: '8px', marginBottom: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px', color: '#cbd5e1' }}>
              <div><strong>Asset ID:</strong> <span style={{ color: '#06b6d4' }}>{selectedAssetHistory.asset_id}</span></div>
              <div><strong>Equipment:</strong> {selectedAssetHistory.equipment || '—'}</div>
              <div><strong>Client:</strong> {selectedAssetHistory.client}</div>
              <div><strong>Site:</strong> {selectedAssetHistory.site || '—'}</div>
              <div><strong>Installation Date:</strong> {selectedAssetHistory.installation_date || 'Not specified (Pending verification)'}</div>
              <div><strong>Frequency:</strong> {selectedAssetHistory.maintenance_frequency || 'MONTHLY'}</div>
            </div>

            <h4 style={{ color: '#38bdf8', fontSize: '14px', marginBottom: '10px' }}>Past Maintenance Reports (Vault Archive)</h4>

            {selectedAssetHistory.maintenance_report_link && (
              <a href={selectedAssetHistory.maintenance_report_link} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginBottom: '12px', color: '#67e8f9', fontSize: '12px' }}>View latest maintenance report</a>
            )}
            
            {/* Historical Report Logs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {assetLogs.length === 0 ? <div style={{ color: '#94a3b8', fontSize: '12px' }}>No completed maintenance reports recorded yet.</div> : assetLogs.map(log => (
                <div key={log.id} style={{ background: 'rgba(15, 23, 42, 0.9)', padding: '10px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', gap: '10px' }}>
                  <div><div style={{ color: '#fff', fontWeight: 600 }}>{new Date(log.completed_at).toLocaleDateString()} — {log.performed_by}</div><div style={{ color: '#94a3b8' }}>{log.notes}</div></div>
                  {log.maintenance_report_link && <a href={log.maintenance_report_link} target="_blank" rel="noopener noreferrer" style={{ background: '#0284c7', color: '#fff', padding: '4px 8px', borderRadius: '4px', textDecoration: 'none', fontWeight: 600 }}>View Report</a>}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setSelectedAssetHistory(null)}
                style={{ background: '#475569', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  )
}
