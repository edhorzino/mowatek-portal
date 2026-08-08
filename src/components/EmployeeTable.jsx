import { useState, useMemo } from 'react'

const DEFAULT_DEPARTMENTS = [
  'Administrative',
  'Business Development',
  'Engineering',
  'Finance',
  'Human Resources',
  'IT',
  'Management',
  'Maintenance',
  'Operations',
]

export function EmployeeTable({ employees, loading, onUpdateEmployee, onDeleteEmployee }) {
  const [search, setSearch] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('ALL')
  const [positionFilter, setPositionFilter] = useState('ALL')

  // Edit state track
  const [editingId, setEditingId] = useState(null)
  const [editFormData, setEditFormData] = useState({})

  const departments = useMemo(() => {
    const fetchedDepts = employees.map(e => e.department).filter(Boolean)
    const combined = new Set([...DEFAULT_DEPARTMENTS, ...fetchedDepts])
    return ['ALL', ...Array.from(combined).sort()]
  }, [employees])

  const positions = useMemo(() => {
    const set = new Set(employees.map(e => e.jobTitle || e.job_title || e.position).filter(Boolean))
    return ['ALL', ...Array.from(set).sort()]
  }, [employees])

  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      const query = search.trim().toLowerCase()
      const title = employee.jobTitle || employee.job_title || employee.position || ''

      const nameMatch = !query || [
        employee.employeeId || employee.id || employee.employee_id,
        employee.firstName,
        employee.middleName,
        employee.lastName,
        employee.name,
        employee.full_name,
        employee.workEmail || employee.email,
        employee.phoneNumber || employee.phone,
        title,
      ].some(val => String(val || '').toLowerCase().includes(query))

      const deptMatch = departmentFilter === 'ALL' || employee.department === departmentFilter
      const posMatch = positionFilter === 'ALL' || title === positionFilter

      return nameMatch && deptMatch && posMatch
    })
  }, [employees, search, departmentFilter, positionFilter])

  // --- Handlers ---
  const handleStartEdit = (emp) => {
    const empId = emp.employeeId || emp.id
    setEditingId(empId)
    setEditFormData({
      employeeId: empId,
      firstName: emp.firstName || emp.name?.split(' ')[0] || '',
      middleName: emp.middleName || '',
      lastName: emp.lastName || emp.name?.split(' ')[1] || '',
      workEmail: emp.workEmail || emp.email || '',
      phoneNumber: emp.phoneNumber || emp.phone || '',
      department: emp.department || 'Engineering',
      jobTitle: emp.jobTitle || emp.job_title || emp.position || '',
      employmentDate: emp.employmentDate || emp.hire_date || '',
      status: (emp.status || 'active').toLowerCase(),
    })
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditFormData({})
  }

  const handleSaveEdit = (originalId) => {
    let email = (editFormData.workEmail || '').trim().toLowerCase()
    if (email && !email.endsWith('@mowatek.com')) {
      email = `${email.split('@')[0]}@mowatek.com`
    }

    const updatedRecord = {
      ...editFormData,
      workEmail: email,
      fullName: [editFormData.firstName, editFormData.middleName, editFormData.lastName]
        .filter(Boolean)
        .join(' '),
    }

    if (onUpdateEmployee) {
      onUpdateEmployee(originalId, updatedRecord)
    }
    setEditingId(null)
  }

  const handleDelete = (emp) => {
    const empId = emp.employeeId || emp.id
    const name = [emp.firstName, emp.lastName].filter(Boolean).join(' ') || emp.name || 'this employee'
    if (window.confirm(`Are you sure you want to delete ${name} (${empId})?`)) {
      if (onDeleteEmployee) {
        onDeleteEmployee(empId)
      }
    }
  }

  if (loading) return <div className="empty-state">Loading employee records...</div>
  if (!employees.length) return <div className="empty-state">No employee records were returned.</div>

  return (
    <>
      <div className="table-toolbar" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <input
          type="search"
          placeholder="Search by name, ID, email, or job title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: '1', minWidth: '240px' }}
        />

        <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}>
          <option value="ALL">All Departments</option>
          {departments.filter(d => d !== 'ALL').map(dept => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>

        <select value={positionFilter} onChange={(e) => setPositionFilter(e.target.value)}>
          <option value="ALL">All Job Titles</option>
          {positions.filter(p => p !== 'ALL').map(pos => (
            <option key={pos} value={pos}>{pos}</option>
          ))}
        </select>

        <span style={{ alignSelf: 'center', fontSize: '13px', color: '#94a3b8' }}>
          {filteredEmployees.length} of {employees.length} records
        </span>
      </div>

      <div className="table-wrapper" style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>First Name</th>
              <th>Middle Name</th>
              <th>Last Name</th>
              <th>Work Email</th>
              <th>Phone</th>
              <th>Department</th>
              <th>Job Title</th>
              <th>Start Date</th>
              <th>Status</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredEmployees.map((emp, index) => {
              const currentId = emp.employeeId || emp.id || index
              const isEditing = editingId === currentId

              if (isEditing) {
                return (
                  <tr key={currentId} style={{ background: '#0f172a' }}>
                    <td>
                      <input
                        style={{ width: '90px' }}
                        value={editFormData.employeeId}
                        onChange={(e) => setEditFormData({ ...editFormData, employeeId: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        style={{ width: '100px' }}
                        value={editFormData.firstName}
                        onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        style={{ width: '80px' }}
                        value={editFormData.middleName}
                        onChange={(e) => setEditFormData({ ...editFormData, middleName: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        style={{ width: '100px' }}
                        value={editFormData.lastName}
                        onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        style={{ width: '160px' }}
                        value={editFormData.workEmail}
                        onChange={(e) => setEditFormData({ ...editFormData, workEmail: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        style={{ width: '110px' }}
                        value={editFormData.phoneNumber}
                        onChange={(e) => setEditFormData({ ...editFormData, phoneNumber: e.target.value })}
                      />
                    </td>
                    <td>
                      <select
                        value={editFormData.department}
                        onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                      >
                        {DEFAULT_DEPARTMENTS.map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        style={{ width: '130px' }}
                        value={editFormData.jobTitle}
                        onChange={(e) => setEditFormData({ ...editFormData, jobTitle: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        type="date"
                        style={{ width: '125px' }}
                        value={editFormData.employmentDate}
                        onChange={(e) => setEditFormData({ ...editFormData, employmentDate: e.target.value })}
                      />
                    </td>
                    <td>
                      <select
                        value={editFormData.status}
                        onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                      >
                        <option value="active">Active</option>
                        <option value="on-leave">On-Leave</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </td>
                    <td style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                      <button
                        onClick={() => handleSaveEdit(currentId)}
                        style={{ background: '#059669', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        style={{ background: '#475569', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                )
              }

              const statusVal = (emp.status || 'active').toLowerCase()

              return (
                <tr key={currentId}>
                  <td><strong>{emp.employeeId || emp.id || '—'}</strong></td>
                  <td>{emp.firstName || emp.name?.split(' ')[0] || '—'}</td>
                  <td>{emp.middleName || '—'}</td>
                  <td>{emp.lastName || emp.name?.split(' ')[1] || '—'}</td>
                  <td>{emp.workEmail || emp.email || '—'}</td>
                  <td>{emp.phoneNumber || emp.phone || '—'}</td>
                  <td>{emp.department || '—'}</td>
                  <td>{emp.jobTitle || emp.job_title || emp.position || '—'}</td>
                  <td>{emp.employmentDate || emp.hire_date || '—'}</td>
                  <td>
                    <span className={`status-badge status-${statusVal}`} style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      background: statusVal === 'active' ? '#064e3b' : statusVal === 'on-leave' ? '#78350f' : '#3f3f46',
                      color: statusVal === 'active' ? '#6ee7b7' : statusVal === 'on-leave' ? '#fde047' : '#a1a1aa',
                    }}>
                      {statusVal}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                      <button
                        onClick={() => handleStartEdit(emp)}
                        style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(emp)}
                        style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                      >
                        Delete
                      </button>
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