import { useState } from 'react'
import { EmployeeTable } from './EmployeeTable'
import { AddEmployeeModal } from './AddEmployeeModal'

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

export function EmployeesPage({
  employees = [],
  loading = false,
  error = '',
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
}) {
  const [showAddModal, setShowAddModal] = useState(false)

  // Quick stats calculations
  const totalEmployees = employees.length
  const activeEmployees = employees.filter(
    (emp) => (emp.status || 'Active').toLowerCase() === 'active'
  ).length

  return (
    <>
      <PageHeader
        eyebrow="HUMAN RESOURCES"
        title="Employee Directory"
        description="Manage company personnel, departmental assignments, and contact profiles."
        action={
          <button
            className="btn-primary"
            onClick={() => setShowAddModal(!showAddModal)}
          >
            {showAddModal ? 'Cancel' : '+ Add Employee'}
          </button>
        }
      />

      {/* Error Banner */}
      {error && (
        <div
          style={{
            background: '#7f1d1d',
            color: '#fca5a5',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '14px',
          }}
        >
          {error}
        </div>
      )}

      {/* Quick Summary Cards */}
      <div
        className="module-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div
          className="mini-stat"
          style={{ padding: '16px', background: '#1e293b', borderRadius: '8px' }}
        >
          <span style={{ color: '#94a3b8', fontSize: '12px' }}>Total Staff</span>
          <strong
            style={{
              display: 'block',
              fontSize: '24px',
              color: '#f8fafc',
              marginTop: '4px',
            }}
          >
            {totalEmployees}
          </strong>
        </div>

        <div
          className="mini-stat"
          style={{ padding: '16px', background: '#1e293b', borderRadius: '8px' }}
        >
          <span style={{ color: '#94a3b8', fontSize: '12px' }}>Active Staff</span>
          <strong
            style={{
              display: 'block',
              fontSize: '24px',
              color: '#4ade80',
              marginTop: '4px',
            }}
          >
            {activeEmployees}
          </strong>
        </div>
      </div>

      {/* Add Employee Form / Modal */}
      {showAddModal && (
        <AddEmployeeModal
          onAdd={(newEmp) => {
            if (onAddEmployee) onAddEmployee(newEmp)
            setShowAddModal(false)
          }}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* Employee Table */}
      <section className="content-card">
        <EmployeeTable
          employees={employees}
          loading={loading}
          onUpdate={onUpdateEmployee}
          onDelete={onDeleteEmployee}
        />
      </section>
    </>
  )
}

// Default Export Fallback
export default EmployeesPage