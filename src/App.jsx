import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LoginPage } from './components/LoginPage'
import { DashboardHome } from './components/DashboardHome'
import { EmployeesPage } from './components/EmployeesPage'
import { EquipmentPage } from './components/EquipmentPage'
import { MaintenancePage } from './components/MaintenancePage'
import { DocumentsPage } from './components/DocumentsPage'
import { supabase } from './lib/supabase'
import "./App.css";

// Helper component for Individual Employee Profile View (Step 4)
function EmployeeProfilePage({ user, employees }) {
  // Find current user's employee record if matched by email
  const currentEmployeeRecord = employees.find(
    (emp) => emp.workEmail?.toLowerCase() === user?.email?.toLowerCase()
  ) || {
    firstName: user?.email?.split('@')[0] || 'Employee',
    lastName: '',
    workEmail: user?.email || 'name@mowatek.com',
    department: 'General Operations',
    jobTitle: 'Staff Member',
    phoneNumber: '—',
    status: 'Active',
    employmentDate: '—',
    employeeId: 'MWK-SELF'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px' }}>
      <div>
        <span className="page-eyebrow">EMPLOYEE SELF-SERVICE</span>
        <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '4px 0 8px 0', color: '#fff' }}>
          My Profile
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
          View your personal personnel record registered in the Mowatek directory.
        </p>
      </div>

      <div className="content-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '20px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>
            {currentEmployeeRecord.firstName?.[0]}{currentEmployeeRecord.lastName?.[0] || ''}
          </div>
          <div>
            <h2 style={{ margin: '0 0 4px 0', color: '#fff', fontSize: '20px' }}>
              {currentEmployeeRecord.firstName} {currentEmployeeRecord.middleName || ''} {currentEmployeeRecord.lastName}
            </h2>
            <p style={{ margin: 0, color: 'var(--accent-cyan)', fontSize: '13px', fontWeight: 600 }}>
              {currentEmployeeRecord.jobTitle} • {currentEmployeeRecord.department}
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '14px', borderRadius: '8px' }}>
            <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Employee ID</span>
            <strong style={{ color: '#fff', fontSize: '14px' }}>{currentEmployeeRecord.employeeId}</strong>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '14px', borderRadius: '8px' }}>
            <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Work Email</span>
            <strong style={{ color: '#fff', fontSize: '14px' }}>{currentEmployeeRecord.workEmail}</strong>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '14px', borderRadius: '8px' }}>
            <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Phone Number</span>
            <strong style={{ color: '#fff', fontSize: '14px' }}>{currentEmployeeRecord.phoneNumber}</strong>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '14px', borderRadius: '8px' }}>
            <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Employment Status</span>
            <span style={{ color: '#10b981', fontWeight: 600, fontSize: '13px' }}>● {currentEmployeeRecord.status}</span>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '14px', borderRadius: '8px' }}>
            <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Employment Date</span>
            <strong style={{ color: '#fff', fontSize: '14px' }}>{currentEmployeeRecord.employmentDate || 'Standard Entry'}</strong>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '14px', borderRadius: '8px' }}>
            <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Compliance Policy</span>
            <strong style={{ color: '#3b82f6', fontSize: '14px' }}>MWT-HR-2026</strong>
          </div>
        </div>
      </div>
    </div>
  )
}

function AppContent() {
  const { user, logout } = useAuth()
  const [activePage, setActivePage] = useState('dashboard')
  const [mobileOpen, setMobileOpen] = useState(false)

  // State definitions
  const [employees, setEmployees] = useState([])
  const [loadingEmployees, setLoadingEmployees] = useState(true)
  const [equipmentList, setEquipmentList] = useState([])

  // Determine if user is an admin or executive manager
  const userEmail = user?.email?.toLowerCase() || ''
  const isAdmin = userEmail.includes('admin') || userEmail.includes('ewomazino') || userEmail.includes('management') || userEmail.includes('hr')

  // Fetch and map employees from Supabase on load
  useEffect(() => {
    async function fetchEmployees() {
      if (!user) return
      try {
        setLoadingEmployees(true)
        const { data, error } = await supabase
          .from('employees')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error

        const formattedData = (data || []).map(emp => ({
          id: emp.id,
          employeeId: emp.employee_id,
          firstName: emp.first_name,
          middleName: emp.middle_name,
          lastName: emp.last_name,
          workEmail: emp.work_email,
          phoneNumber: emp.phone_number,
          department: emp.department,
          jobTitle: emp.job_title,
          employmentDate: emp.employment_date,
          status: emp.status
        }))

        setEmployees(formattedData)
      } catch (err) {
        console.error('Error fetching employees from Supabase:', err.message)
      } finally {
        setLoadingEmployees(false)
      }
    }

    fetchEmployees()
  }, [user])

  if (!user) {
    return <LoginPage />
  }

  const handleNavClick = (page) => {
    setActivePage(page)
    setMobileOpen(false)
  }

  // Database-connected Add Employee handler
  const handleAddEmployee = async (newEmp) => {
    try {
      const payload = {
        employee_id: newEmp.employeeId || newEmp.id || `MWK-${Math.floor(1000 + Math.random() * 9000)}`,
        first_name: newEmp.firstName,
        middle_name: newEmp.middleName || '',
        last_name: newEmp.lastName,
        work_email: newEmp.workEmail,
        phone_number: newEmp.phoneNumber,
        department: newEmp.department,
        job_title: newEmp.jobTitle || newEmp.position,
        employment_date: newEmp.employmentDate || null,
        status: newEmp.status || 'Active'
      }

      const { data, error } = await supabase
        .from('employees')
        .insert([payload])
        .select()

      if (error) throw error

      if (data && data.length > 0) {
        const saved = data[0]
        const formattedNew = {
          id: saved.id,
          employeeId: saved.employee_id,
          firstName: saved.first_name,
          middleName: saved.middle_name,
          lastName: saved.last_name,
          workEmail: saved.work_email,
          phoneNumber: saved.phone_number,
          department: saved.department,
          jobTitle: saved.job_title,
          employmentDate: saved.employment_date,
          status: saved.status
        }
        setEmployees([formattedNew, ...employees])
      } else {
        setEmployees([newEmp, ...employees])
      }
    } catch (err) {
      console.error('Error saving employee to Supabase:', err.message)
      alert('Failed to save employee to database: ' + err.message)
    }
  }

  // Database-connected Update Employee handler
  const handleUpdateEmployee = async (targetId, updatedRecord) => {
    try {
      const { error } = await supabase
        .from('employees')
        .update({
          first_name: updatedRecord.firstName,
          middle_name: updatedRecord.middleName,
          last_name: updatedRecord.lastName,
          work_email: updatedRecord.workEmail,
          phone_number: updatedRecord.phoneNumber,
          department: updatedRecord.department,
          job_title: updatedRecord.jobTitle,
          employment_date: updatedRecord.employmentDate,
          status: updatedRecord.status
        })
        .or(`id.eq.${targetId},employee_id.eq.${targetId}`)

      if (error) throw error

      setEmployees(prev =>
        prev.map(emp =>
          (emp.employeeId || emp.id || emp.employee_id) === targetId
            ? { ...emp, ...updatedRecord }
            : emp
        )
      )
    } catch (err) {
      console.error('Error updating employee:', err.message)
      alert('Failed to update employee: ' + err.message)
    }
  }

  // Database-connected Delete Employee handler
  const handleDeleteEmployee = async (targetId) => {
    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .or(`id.eq.${targetId},employee_id.eq.${targetId}`)

      if (error) throw error

      setEmployees(prev =>
        prev.filter(emp => (emp.employeeId || emp.id || emp.employee_id) !== targetId)
      )
    } catch (err) {
      console.error('Error deleting employee:', err.message)
      alert('Failed to delete employee: ' + err.message)
    }
  }

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <DashboardHome user={user} employees={employees} equipmentList={equipmentList} loadingEmployees={loadingEmployees} />
      case 'profile':
        return <EmployeeProfilePage user={user} employees={employees} />
      case 'employees':
        return (
          <EmployeesPage
            employees={employees}
            loading={loadingEmployees}
            onAddEmployee={handleAddEmployee}
            onUpdateEmployee={handleUpdateEmployee}
            onDeleteEmployee={handleDeleteEmployee}
          />
        )
      case 'equipment':
        return <EquipmentPage equipmentList={equipmentList} setEquipmentList={setEquipmentList} />
      case 'maintenance':
        return <MaintenancePage />
      case 'documents':
        return <DocumentsPage />
      default:
        return <DashboardHome user={user} employees={employees} equipmentList={equipmentList} loadingEmployees={loadingEmployees} />
    }
  }

  return (
    <div className="dashboard-layout">
      {/* Top Header for Mobile Screens */}
      <header className="mobile-topbar">
        <button className="hamburger-btn" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle Menu">
          ☰
        </button>
        <span style={{ fontWeight: 800, fontSize: '16px' }}>MOWATEK</span>
        <span style={{ fontSize: '11px', color: '#06b6d4' }}>PORTAL</span>
      </header>

      {/* Dark Overlay for Mobile Drawer */}
      <div
        className={`sidebar-overlay ${mobileOpen ? 'mobile-open' : ''}`}
        onClick={() => setMobileOpen(false)}
      />

      {/* Sidebar Navigation with Role Restrictions */}
      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div>
          <div className="brand-section">
            <div>
              <div className="brand-title">MOWATEK</div>
              <div className="brand-subtitle">{isAdmin ? 'ADMIN PORTAL V1.0' : 'EMPLOYEE PORTAL'}</div>
            </div>
            {mobileOpen && (
              <button className="hamburger-btn" onClick={() => setMobileOpen(false)}>
                ✕
              </button>
            )}
          </div>

          <div className="nav-section-title">Navigation</div>
          <nav className="nav-menu">
            <button
              className={`nav-item ${activePage === 'dashboard' ? 'active' : ''}`}
              onClick={() => handleNavClick('dashboard')}
            >
              📊 Dashboard
            </button>

            <button
              className={`nav-item ${activePage === 'profile' ? 'active' : ''}`}
              onClick={() => handleNavClick('profile')}
            >
              🪪 My Profile
            </button>

            {/* Restricted Operational Links (Admin Only) */}
            {isAdmin && (
              <>
                <div className="nav-section-title" style={{ marginTop: '16px' }}>Management</div>
                <button
                  className={`nav-item ${activePage === 'employees' ? 'active' : ''}`}
                  onClick={() => handleNavClick('employees')}
                >
                  👥 Employees
                </button>

                <button
                  className={`nav-item ${activePage === 'equipment' ? 'active' : ''}`}
                  onClick={() => handleNavClick('equipment')}
                >
                  ⚙️ Equipment
                </button>
                
                <button
                  className={`nav-item ${activePage === 'documents' ? 'active' : ''}`}
                  onClick={() => handleNavClick('documents')}
                >
                  📄 Documents
                </button>

                <button
                  className={`nav-item ${activePage === 'maintenance' ? 'active' : ''}`}
                  onClick={() => handleNavClick('maintenance')}
                >
                  🔧 Maintenance
                </button>
              </>
            )}
          </nav>
        </div>

        {/* User Card with functional Sign Out */}
        <div className="user-profile-card">
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff', wordBreak: 'break-all' }}>
            {user?.email || user?.username || 'User'}
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>{isAdmin ? 'Administrator' : 'Employee'}</div>
          <button className="btn-signout" onClick={logout}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Content Render View */}
      <main className="content-main">
        {renderPage()}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}