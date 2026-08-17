import { useState, useEffect } from 'react'
import { EquipmentTable } from './EquipmentTable'
import { AddEquipmentModal } from './AddEquipmentModal'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'

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
  const [uploadingReport, setUploadingReport] = useState(false)

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
    const { data, error } = await supabase
      .from('equipment')
      .insert([newItem])
      .select()

    if (error) {
      alert('Error adding equipment: ' + error.message)
    } else if (data) {
      setEquipmentList([data[0], ...equipmentList])
      setShowAddForm(false)
    }
  }

  const handleUpdate = async (id, updatedFields) => {
    const { error } = await supabase
      .from('equipment')
      .update(updatedFields)
      .eq('id', id)

    if (error) {
      alert('Error updating equipment: ' + error.message)
    } else {
      setEquipmentList(equipmentList.map(e => e.id === id ? { ...e, ...updatedFields } : e))
      // Update selected asset view if currently open in modal
      if (selectedAssetHistory && selectedAssetHistory.id === id) {
        setSelectedAssetHistory(prev => ({ ...prev, ...updatedFields }))
      }
    }
  }

  const uploadMaintenanceFile = async (assetId, file, type) => {
    if (!file) return null
    const extension = file.name.split('.').pop()
    const safeAsset = String(assetId).replace(/[^a-zA-Z0-9_-]/g, '_')
    const path = `${safeAsset}/${Date.now()}-${type}.${extension}`
    const { error } = await supabase.storage.from('maintenance-reports').upload(path, file)
    if (error) throw error
    return supabase.storage.from('maintenance-reports').getPublicUrl(path).data.publicUrl
  }

  const handleCompleteMaintenance = async (asset, { reportFile, invoiceFile, completedDate, nextMaintenanceDate }) => {
    const reportUrl = await uploadMaintenanceFile(asset.asset_id, reportFile, 'report')
    const invoiceUrl = await uploadMaintenanceFile(asset.asset_id, invoiceFile, 'invoice')
    const invoiceStatus = invoiceUrl ? 'UPLOADED' : 'PENDING'

    const { error: logError } = await supabase.from('maintenance_logs').insert([{
      equipment_record_id: asset.id,
      equipment_id: asset.asset_id,
      asset_name: asset.equipment || asset.asset_id,
      client_name: asset.client,
      notes: 'Maintenance completed from the equipment registry.',
      performed_by: user?.email || 'Technician',
      completed_at: new Date(`${completedDate}T12:00:00`).toISOString(),
      maintenance_report_url: reportUrl,
      invoice_url: invoiceUrl,
      invoice_status: invoiceStatus,
    }])
    if (logError) throw logError

    await handleUpdate(asset.id, {
      last_maintenance: completedDate,
      next_maintenance: nextMaintenanceDate,
      maintenance_report_url: reportUrl,
      invoice_url: invoiceUrl,
      invoice_status: invoiceStatus,
      invoice_cashed: false,
    })
  }

  const openAssetHistory = async (asset) => {
    setSelectedAssetHistory(asset)
    const { data, error } = await supabase
      .from('maintenance_logs')
      .select('*')
      .eq('equipment_record_id', asset.id)
      .order('completed_at', { ascending: false })
    if (error) console.error('Error loading asset history:', error.message)
    setAssetLogs(data || [])
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
      setEquipmentList(equipmentList.filter(e => e.id !== id))
      setSelectedAssetHistory(null)
    }
  }

  // Handle Vault Report Upload from Equipment History Modal
  const handleUploadVaultReport = async (assetId, file) => {
    if (!file) return
    setUploadingReport(true)

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${assetId}_${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      // Upload to Supabase Storage bucket 'maintenance-reports'
      const { error: uploadError } = await supabase.storage
        .from('maintenance-reports')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Get Public URL
      const { data: publicURLData } = supabase.storage
        .from('maintenance-reports')
        .getPublicUrl(filePath)

      const reportUrl = publicURLData.publicUrl

      // Update equipment record with latest maintenance report URL
      const targetEquipment = equipmentList.find(e => e.asset_id === assetId || e.id === assetId)
      if (targetEquipment) {
        await handleUpdate(targetEquipment.id, { maintenance_report_url: reportUrl })
      }

      alert('Maintenance report successfully uploaded and saved to vault!')
    } catch (err) {
      alert('Error uploading report: ' + err.message)
    } finally {
      setUploadingReport(false)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="ASSET MANAGEMENT"
        title="Equipment Registry"
        description="Track client asset installations, maintenance schedules, and site contacts from Supabase."
        action={
          <button className="btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? 'Cancel' : '+ Add Equipment'}
          </button>
        }
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
            
            {/* Historical Report Logs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {assetLogs.length === 0 ? <div style={{ color: '#94a3b8', fontSize: '12px' }}>No completed maintenance reports recorded yet.</div> : assetLogs.map(log => (
                <div key={log.id} style={{ background: 'rgba(15, 23, 42, 0.9)', padding: '10px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', gap: '10px' }}>
                  <div><div style={{ color: '#fff', fontWeight: 600 }}>{new Date(log.completed_at).toLocaleDateString()} — {log.performed_by}</div><div style={{ color: '#94a3b8' }}>{log.notes}</div></div>
                  {log.maintenance_report_url && <a href={log.maintenance_report_url} target="_blank" rel="noopener noreferrer" style={{ background: '#0284c7', color: '#fff', padding: '4px 8px', borderRadius: '4px', textDecoration: 'none', fontWeight: 600 }}>View Report</a>}
                </div>
              ))}
            </div>

            {/* Direct Vault Upload Option */}
            <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '12px', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.2)', marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '6px' }}>Upload New Maintenance Report to Vault:</label>
              <input 
                type="file" 
                onChange={(e) => handleUploadVaultReport(selectedAssetHistory.asset_id, e.target.files[0])}
                style={{ fontSize: '12px', color: '#94a3b8' }}
                disabled={uploadingReport}
              />
              {uploadingReport && <div style={{ fontSize: '11px', color: '#38bdf8', marginTop: '4px' }}>Uploading report to vault...</div>}
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
