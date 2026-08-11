import { useState, useMemo } from 'react'

export function EquipmentTable({ equipmentList = [], loading, onUpdate, onDelete }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [editingId, setEditingId] = useState(null)
  const [editFormData, setEditFormData] = useState({})

  // Modal State for Confirming Maintenance & File Uploads
  const [confirmModalItem, setConfirmModalItem] = useState(null)
  const [reportFile, setReportFile] = useState(null)
  const [invoiceFile, setInvoiceFile] = useState(null)
  const [uploading, setUploading] = useState(false)

  // Compute status based on exact interval rules
  const calculateStatus = (nextDateStr) => {
    if (!nextDateStr) return 'OK'
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const next = new Date(nextDateStr)
    if (isNaN(next)) return 'OK'

    const diffDays = Math.ceil((next - today) / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return 'OVERDUE'
    if (diffDays <= 7) return 'DUE SOON' // refined window
    return 'OK'
  }

  const calculateNextDate = (fromDate, frequency) => {
    const date = new Date(fromDate)
    const freq = frequency?.toUpperCase() || 'MONTHLY'

    if (freq === 'BIWEEKLY') {
      date.setDate(date.getDate() + 14)
    } else if (freq === 'WEEKLY') {
      date.setDate(date.getDate() + 7)
    } else if (freq === 'MONTHLY') {
      date.setMonth(date.getMonth() + 1)
    } else if (freq === 'BIMONTHLY') {
      date.setMonth(date.getMonth() + 2)
    } else if (freq === 'QUARTERLY') {
      date.setMonth(date.getMonth() + 3)
    } else if (freq === 'ANNUALLY' || freq === 'YEARLY') {
      date.setFullYear(date.getFullYear() + 1)
    } else {
      date.setMonth(date.getMonth() + 1)
    }

    return date.toISOString().split('T')[0]
  }

  const handleOpenConfirmModal = (item) => {
    setConfirmModalItem(item)
    setReportFile(null)
    setInvoiceFile(null)
  }

  const handleConfirmMaintenanceSubmit = async (e) => {
    e.preventDefault()
    if (!reportFile) {
      alert('Maintenance Report document is mandatory to confirm maintenance completion.')
      return
    }

    setUploading(true)
    try {
      const todayStr = new Date().toISOString().split('T')[0]
      const nextStr = calculateNextDate(todayStr, confirmModalItem.maintenance_frequency || confirmModalItem.maintenanceFrequency)
      
      const hasInvoice = Boolean(invoiceFile)

      if (onUpdate) {
        await onUpdate(confirmModalItem.id, {
          last_maintenance: todayStr,
          next_maintenance: nextStr,
          maintenance_report_url: reportFile.name, // Replace with Supabase storage bucket URL if uploading to bucket
          invoice_url: hasInvoice ? invoiceFile.name : null,
          invoice_status: hasInvoice ? 'UPLOADED' : 'PENDING',
          invoice_cashed: false
        })
      }

      setConfirmModalItem(null)
      setReportFile(null)
      setInvoiceFile(null)
      alert('Maintenance successfully confirmed, logged, and report archived.')
    } catch (err) {
      console.error(err)
      alert('Error updating maintenance record.')
    } finally {
      setUploading(false)
    }
  }

  const handleToggleInvoiceCashed = (item) => {
    const newCashedState = !item.invoice_cashed
    if (onUpdate) {
      onUpdate(item.id, {
        invoice_cashed: newCashedState,
        invoice_status: newCashedState ? 'CASHED' : 'UPLOADED'
      })
    }
  }

  const filteredItems = useMemo(() => {
    return equipmentList.filter((item) => {
      const q = search.trim().toLowerCase()
      const matchesSearch =
        !q ||
        [item.asset_id, item.client, item.site, item.equipment, item.site_engineer]
          .some((val) => String(val || '').toLowerCase().includes(q))

      const nextMaint = item.next_maintenance || item.nextMaintenance
      const currentStatus = calculateStatus(nextMaint)
      const matchesStatus = statusFilter === 'ALL' || currentStatus === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [equipmentList, search, statusFilter])

  const pendingInvoicesCount = useMemo(() => {
    return equipmentList.filter(i => i.invoice_status === 'PENDING' || !i.invoice_status).length
  }, [equipmentList])

  const handleStartEdit = (item) => {
    setEditingId(item.id)
    setEditFormData({ 
      asset_id: item.asset_id || '',
      client: item.client || '',
      site: item.site || '',
      equipment: item.equipment || '',
      installation_date: item.installation_date || '',
      maintenance_frequency: item.maintenance_frequency || 'MONTHLY',
      last_maintenance: item.last_maintenance || '',
      next_maintenance: item.next_maintenance || '',
      client_contact: item.client_contact || '',
      site_engineer: item.site_engineer || ''
    })
  }

  const handleSaveEdit = (id) => {
    if (onUpdate) onUpdate(id, editFormData)
    setEditingId(null)
  }

  if (loading) return <div className="empty-state">Loading equipment records...</div>

  return (
    <>
      {/* Reminder Notification Banner for Pending Invoices */}
      {pendingInvoicesCount > 0 && (
        <div style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.4)', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fde047', fontSize: '13px' }}>
            <span>⚠️</span>
            <span><strong>Administrative Notice:</strong> {pendingInvoicesCount} equipment asset(s) have pending invoice uploads.</span>
          </div>
        </div>
      )}

      <div className="table-toolbar" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <input
          type="search"
          placeholder="Search by Asset ID, Client, Site, or Equipment..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: '1', minWidth: '240px', padding: '8px 12px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff' }}
        />

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: '8px 12px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff' }}>
          <option value="ALL">All Statuses</option>
          <option value="OK">OK</option>
          <option value="DUE SOON">DUE SOON</option>
          <option value="OVERDUE">OVERDUE</option>
        </select>

        <span style={{ alignSelf: 'center', fontSize: '13px', color: '#94a3b8' }}>
          {filteredItems.length} of {equipmentList.length} assets
        </span>
      </div>

      {/* Confirmation Modal with File Uploads */}
      {confirmModalItem && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.2)', padding: '24px', borderRadius: '12px', width: '450px', maxWidth: '90%' }}>
            <h3 style={{ color: '#fff', margin: '0 0 10px 0' }}>Confirm Maintenance Completion</h3>
            <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '16px' }}>
              Are you sure you want to mark maintenance as completed for asset <strong>{confirmModalItem.asset_id}</strong> ({confirmModalItem.equipment})?
            </p>

            <form onSubmit={handleConfirmMaintenanceSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#38bdf8', marginBottom: '4px' }}>
                  Maintenance Report Document (Required) *
                </label>
                <input 
                  type="file" 
                  accept=".pdf,.doc,.docx,.jpg,.png"
                  onChange={(e) => setReportFile(e.target.files[0])}
                  required
                  style={{ width: '100%', fontSize: '12px', color: '#fff' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>
                  Invoice Document (Optional - Marks Invoice Pending if omitted)
                </label>
                <input 
                  type="file" 
                  accept=".pdf,.doc,.docx,.jpg,.png"
                  onChange={(e) => setInvoiceFile(e.target.files[0])}
                  style={{ width: '100%', fontSize: '12px', color: '#fff' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => setConfirmModalItem(null)}
                  style={{ background: '#475569', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={uploading}
                  style={{ background: '#059669', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                >
                  {uploading ? 'Processing...' : 'Yes, Confirm Maintenance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="table-wrapper" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}>
              <th style={{ padding: '12px' }}>Asset ID</th>
              <th style={{ padding: '12px' }}>Client</th>
              <th style={{ padding: '12px' }}>Site</th>
              <th style={{ padding: '12px' }}>Equipment</th>
              <th style={{ padding: '12px' }}>Frequency</th>
              <th style={{ padding: '12px' }}>Next Maint.</th>
              <th style={{ padding: '12px' }}>Status</th>
              <th style={{ padding: '12px' }}>Invoice Status</th>
              <th style={{ padding: '12px' }}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredItems.map((item) => {
              const isEditing = editingId === item.id
              const nextMaintDate = item.next_maintenance || item.nextMaintenance
              const status = calculateStatus(nextMaintDate)
              const invoiceStatus = item.invoice_status || 'PENDING'

              if (isEditing) {
                return (
                  <tr key={item.id} style={{ background: '#0f172a', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '8px' }}><input value={editFormData.asset_id} onChange={(e) => setEditFormData({ ...editFormData, asset_id: e.target.value })} style={{ width: '80px', padding: '4px' }} /></td>
                    <td style={{ padding: '8px' }}><input value={editFormData.client} onChange={(e) => setEditFormData({ ...editFormData, client: e.target.value })} style={{ width: '110px', padding: '4px' }} /></td>
                    <td style={{ padding: '8px' }}><input value={editFormData.site} onChange={(e) => setEditFormData({ ...editFormData, site: e.target.value })} style={{ width: '90px', padding: '4px' }} /></td>
                    <td style={{ padding: '8px' }}><input value={editFormData.equipment} onChange={(e) => setEditFormData({ ...editFormData, equipment: e.target.value })} style={{ width: '90px', padding: '4px' }} /></td>
                    <td style={{ padding: '8px' }}>
                      <select value={editFormData.maintenance_frequency} onChange={(e) => setEditFormData({ ...editFormData, maintenance_frequency: e.target.value })} style={{ padding: '4px' }}>
                        <option value="BIWEEKLY">BIWEEKLY</option>
                        <option value="WEEKLY">WEEKLY</option>
                        <option value="MONTHLY">MONTHLY</option>
                        <option value="BIMONTHLY">BIMONTHLY</option>
                        <option value="QUARTERLY">QUARTERLY</option>
                        <option value="ANNUALLY">ANNUALLY</option>
                      </select>
                    </td>
                    <td style={{ padding: '8px' }}><input type="date" value={editFormData.next_maintenance} onChange={(e) => setEditFormData({ ...editFormData, next_maintenance: e.target.value })} style={{ width: '120px', padding: '4px' }} /></td>
                    <td style={{ padding: '8px' }}><strong>{status}</strong></td>
                    <td style={{ padding: '8px' }} colSpan="2">
                      <button onClick={() => handleSaveEdit(item.id)} style={{ background: '#059669', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', marginRight: '4px' }}>Save</button>
                      <button onClick={() => setEditingId(null)} style={{ background: '#475569', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                    </td>
                  </tr>
                )
              }

              return (
                <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '12px', fontWeight: 600, color: '#06b6d4' }}>{item.asset_id}</td>
                  <td style={{ padding: '12px', color: '#fff' }}>{item.client}</td>
                  <td style={{ padding: '12px', color: '#cbd5e1' }}>{item.site || '—'}</td>
                  <td style={{ padding: '12px', color: '#cbd5e1' }}>{item.equipment || '—'}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ padding: '4px 8px', background: 'rgba(59,130,246,0.15)', color: '#60a5fa', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                      {item.maintenance_frequency || 'MONTHLY'}
                    </span>
                  </td>
                  <td style={{ padding: '12px', color: '#f59e0b', fontWeight: 600 }}>{item.next_maintenance || '—'}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      background: status === 'OK' ? '#064e3b' : status === 'DUE SOON' ? '#78350f' : '#7f1d1d',
                      color: status === 'OK' ? '#6ee7b7' : status === 'DUE SOON' ? '#fde047' : '#fca5a5',
                    }}>
                      {status}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        width: 'fit-content',
                        background: invoiceStatus === 'CASHED' ? '#064e3b' : invoiceStatus === 'UPLOADED' ? '#1e3a8a' : '#78350f',
                        color: invoiceStatus === 'CASHED' ? '#6ee7b7' : invoiceStatus === 'UPLOADED' ? '#93c5fd' : '#fde047',
                      }}>
                        {invoiceStatus === 'CASHED' ? 'INVOICE CASHED' : invoiceStatus === 'UPLOADED' ? 'INVOICE UPLOADED' : 'INVOICE PENDING'}
                      </span>
                      
                      {/* Admin Toggle for Cashed Status */}
                      <button 
                        onClick={() => handleToggleInvoiceCashed(item)}
                        style={{ background: 'transparent', border: 'none', color: '#38bdf8', fontSize: '10px', cursor: 'pointer', textAlign: 'left', padding: 0, textDecoration: 'underline' }}
                      >
                        {item.invoice_cashed ? 'Mark Uncashed' : 'Mark Cashed (Admin)'}
                      </button>
                    </div>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      <button 
                        onClick={() => handleOpenConfirmModal(item)} 
                        style={{ background: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#34d399', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}
                        title="Mark maintenance done and attach verification report"
                      >
                        ✓ Maint. Done
                      </button>
                      <button onClick={() => handleStartEdit(item)} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Edit</button>
                      <button onClick={() => onDelete && onDelete(item.id)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Delete</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}