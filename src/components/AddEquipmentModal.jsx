import { useState } from 'react'

export function AddEquipmentModal({ onAdd, onClose }) {
  const [formData, setFormData] = useState({
    asset_id: `MT${Math.floor(100 + Math.random() * 900)}`,
    client: '',
    site: '',
    equipment: 'PUMPS',
    installation_date: '',
    maintenance_frequency: 'MONTHLY',
    last_maintenance: '',
    next_maintenance: '',
    client_contact: '',
    site_engineer: '',
    site_engr_contact: '',
  })

  // Auto-calculate Next Maintenance Date based on Last Maintenance & Frequency
  const handleLastMaintenanceChange = (dateVal, freqVal) => {
    const last = dateVal ? new Date(dateVal) : null
    const freq = freqVal || formData.maintenance_frequency

    if (last && !isNaN(last)) {
      const next = new Date(last)
      const f = freq.toUpperCase()

      if (f === 'BIWEEKLY') next.setDate(next.getDate() + 14)
      else if (f === 'WEEKLY') next.setDate(next.getDate() + 7)
      else if (f === 'MONTHLY') next.setMonth(next.getMonth() + 1)
      else if (f === 'BIMONTHLY') next.setMonth(next.getMonth() + 2)
      else if (f === 'QUARTERLY') next.setMonth(next.getMonth() + 3)
      else if (f === 'ANNUALLY') next.setFullYear(next.getFullYear() + 1)
      else next.setMonth(next.getMonth() + 1)

      setFormData((prev) => ({
        ...prev,
        last_maintenance: dateVal,
        next_maintenance: next.toISOString().split('T')[0],
      }))
    } else {
      setFormData((prev) => ({ ...prev, last_maintenance: dateVal }))
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onAdd(formData)
  }

  return (
    <div className="add-modal-card" style={{ background: '#1e293b', padding: '24px', borderRadius: '12px', marginBottom: '24px', border: '1px solid rgba(255,255,255,0.1)' }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#f8fafc', fontSize: '16px' }}>Add Equipment Record</h3>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Asset ID *</label>
          <input
            required
            type="text"
            value={formData.asset_id}
            onChange={(e) => setFormData({ ...formData, asset_id: e.target.value })}
            style={{ width: '100%', padding: '8px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Client *</label>
          <input
            required
            type="text"
            placeholder="e.g. DANGOTE"
            value={formData.client}
            onChange={(e) => setFormData({ ...formData, client: e.target.value })}
            style={{ width: '100%', padding: '8px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Site Location *</label>
          <input
            required
            type="text"
            placeholder="e.g. APAPA"
            value={formData.site}
            onChange={(e) => setFormData({ ...formData, site: e.target.value })}
            style={{ width: '100%', padding: '8px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Equipment *</label>
          <select
            value={formData.equipment}
            onChange={(e) => setFormData({ ...formData, equipment: e.target.value })}
            style={{ width: '100%', padding: '8px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff' }}
          >
            <option value="PUMPS">PUMPS</option>
            <option value="CSTP">CSTP</option>
            <option value="PUMPS/CSTP">PUMPS/CSTP</option>
            <option value="GENERATOR">GENERATOR</option>
            <option value="COMPRESSOR">COMPRESSOR</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Installation Date</label>
          <input
            type="date"
            value={formData.installation_date}
            onChange={(e) => setFormData({ ...formData, installation_date: e.target.value })}
            style={{ width: '100%', padding: '8px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Frequency *</label>
          <select
            value={formData.maintenance_frequency}
            onChange={(e) => {
              setFormData({ ...formData, maintenance_frequency: e.target.value })
              handleLastMaintenanceChange(formData.last_maintenance, e.target.value)
            }}
            style={{ width: '100%', padding: '8px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff' }}
          >
            <option value="BIWEEKLY">BIWEEKLY</option>
            <option value="WEEKLY">WEEKLY</option>
            <option value="MONTHLY">MONTHLY</option>
            <option value="BIMONTHLY">BIMONTHLY</option>
            <option value="QUARTERLY">QUARTERLY</option>
            <option value="ANNUALLY">ANNUALLY</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Last Maintenance</label>
          <input
            type="date"
            value={formData.last_maintenance}
            onChange={(e) => handleLastMaintenanceChange(e.target.value, formData.maintenance_frequency)}
            style={{ width: '100%', padding: '8px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Next Maintenance</label>
          <input
            type="date"
            value={formData.next_maintenance}
            onChange={(e) => setFormData({ ...formData, next_maintenance: e.target.value })}
            style={{ width: '100%', padding: '8px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Client Contact</label>
          <input
            type="text"
            placeholder="Name / Phone"
            value={formData.client_contact}
            onChange={(e) => setFormData({ ...formData, client_contact: e.target.value })}
            style={{ width: '100%', padding: '8px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Site Engineer</label>
          <input
            type="text"
            placeholder="Mowatek Engineer"
            value={formData.site_engineer}
            onChange={(e) => setFormData({ ...formData, site_engineer: e.target.value })}
            style={{ width: '100%', padding: '8px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Site Engr Contact</label>
          <input
            type="text"
            placeholder="Phone Number"
            value={formData.site_engr_contact}
            onChange={(e) => setFormData({ ...formData, site_engr_contact: e.target.value })}
            style={{ width: '100%', padding: '8px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff' }}
          />
        </div>

        <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
          <button type="button" onClick={onClose} style={{ padding: '8px 16px', background: '#475569', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" style={{ padding: '8px 20px', background: '#059669', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>
            Save Asset Record
          </button>
        </div>
      </form>
    </div>
  )
}