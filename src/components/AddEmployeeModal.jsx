import { useState } from 'react'

export function AddEmployeeModal({ onAdd, onClose }) {
  const [formData, setFormData] = useState({
    employeeId: `MWK-${Math.floor(1000 + Math.random() * 9000)}`,
    firstName: '',
    middleName: '',
    lastName: '',
    workEmail: '',
    phoneNumber: '',
    department: 'Engineering',
    jobTitle: '',
    employmentDate: '',
    status: 'active',
  })

  const handleSubmit = (e) => {
    e.preventDefault()

    // Ensure email ends with @mowatek.com if user didn't type it
    let email = formData.workEmail.trim().toLowerCase()
    if (email && !email.endsWith('@mowatek.com')) {
      email = `${email.split('@')[0]}@mowatek.com`
    }

    const payload = {
      ...formData,
      workEmail: email,
      fullName: [formData.firstName, formData.middleName, formData.lastName]
        .filter(Boolean)
        .join(' '),
    }

    onAdd(payload)
    onClose()
  }

  return (
    <div className="add-modal-card" style={{ background: '#1e293b', padding: '24px', borderRadius: '12px', marginBottom: '24px' }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#f8fafc' }}>Add New Employee</h3>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Employee ID *</label>
          <input
            required
            type="text"
            value={formData.employeeId}
            onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>First Name *</label>
          <input
            required
            type="text"
            placeholder="e.g. John"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Middle Name</label>
          <input
            type="text"
            placeholder="Optional"
            value={formData.middleName}
            onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Last Name *</label>
          <input
            required
            type="text"
            placeholder="e.g. Doe"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Work Email (@mowatek.com) *</label>
          <input
            required
            type="email"
            placeholder="username@mowatek.com"
            value={formData.workEmail}
            onChange={(e) => setFormData({ ...formData, workEmail: e.target.value })}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Phone Number *</label>
          <input
            required
            type="tel"
            placeholder="+234..."
            value={formData.phoneNumber}
            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Department *</label>
          <select
            value={formData.department}
            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
          >
            <option value="Administrative">Administrative</option>
            <option value="Business Development">Business Development</option>
            <option value="Engineering">Engineering</option>
            <option value="Finance">Finance</option>
            <option value="Human Resources">Human Resources</option>
            <option value="IT">IT</option>
            <option value="Management">Management</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Operations">Operations</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Job Title *</label>
          <input
            required
            type="text"
            placeholder="e.g. Business Development Lead"
            value={formData.jobTitle}
            onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Employment Date (Optional)</label>
          <input
            type="date"
            value={formData.employmentDate}
            onChange={(e) => setFormData({ ...formData, employmentDate: e.target.value })}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Employment Status *</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          >
            <option value="active">Active</option>
            <option value="on-leave">On-Leave</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
          <button type="button" onClick={onClose} style={{ padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" style={{ padding: '8px 20px' }}>
            Save Employee
          </button>
        </div>
      </form>
    </div>
  )
}