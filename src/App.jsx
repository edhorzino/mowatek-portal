import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LoginPage } from './components/LoginPage'
import { DashboardHome } from './components/DashboardHome'
import { EmployeesPage } from './components/EmployeesPage'
import { EquipmentPage } from './components/EquipmentPage'
import { MaintenancePage } from './components/MaintenancePage'
import { DocumentsPage } from './components/DocumentsPage'
import { TasksPage } from './components/TasksPage'
import { BrandLogo } from './components/BrandLogo'
import { supabase } from './lib/supabase'
import "./App.css";

const navigationIconPaths = {
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  profile: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  tasks: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  equipment: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.12 2.12-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.04 1.56V20.5h-3v-.28A1.7 1.7 0 0 0 10.66 18.7a1.7 1.7 0 0 0-1.88.34l-.06.06L6.6 16.98l.06-.06A1.7 1.7 0 0 0 7 15.04a1.7 1.7 0 0 0-1.56-1.04H5.16v-3h.28A1.7 1.7 0 0 0 7 9.96a1.7 1.7 0 0 0-.34-1.88L6.6 8.02 8.72 5.9l.06.06a1.7 1.7 0 0 0 1.88.34 1.7 1.7 0 0 0 1.04-1.56V4.46h3v.28a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.12 2.12-.06.06A1.7 1.7 0 0 0 19.4 9.96a1.7 1.7 0 0 0 1.56 1.04h.28v3h-.28A1.7 1.7 0 0 0 19.4 15Z" /></>,
  documents: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></>,
  maintenance: <path d="m14.7 6.3 3-3a5 5 0 0 1-6.3 6.3L5 16a2.1 2.1 0 0 0 3 3l6.4-6.4a5 5 0 0 1 6.3-6.3l-3 3" />,
  employees: <><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0M14 20a4 4 0 0 1 6.5-3.1" /></>,
}

function NavigationIcon({ name }) {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {navigationIconPaths[name]}
    </svg>
  )
}

// Global error handler to suppress harmless browser extension promise rejections (like MetaMask/Web3 ports)
window.addEventListener('unhandledrejection', (event) => {
  if (
    event.reason && 
    (event.reason.message?.includes('ObjectMultiplex') || 
     event.reason.message?.includes('message channel closed') ||
     event.reason.message?.includes('liveness'))
  ) {
    event.preventDefault()
  }
})

// Helper component for Individual Employee Profile View
function EmployeeProfilePage({ user, employees }) {
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
  const { user, profile, logout } = useAuth()
  const [activePage, setActivePage] = useState('dashboard')
  const [mobileOpen, setMobileOpen] = useState(false)

  const [employees, setEmployees] = useState([])
  const [loadingEmployees, setLoadingEmployees] = useState(true)

  const isAdmin = profile?.role === 'admin'

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
        return <DashboardHome user={user} employees={employees} loadingEmployees={loadingEmployees} />
      case 'tasks':
        return <TasksPage user={user} />
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
        return <EquipmentPage isAdmin={isAdmin} />
      case 'maintenance':
        return <MaintenancePage user={user} />
      case 'documents':
        return <DocumentsPage />
      default:
        return <DashboardHome user={user} employees={employees} loadingEmployees={loadingEmployees} />
    }
  }

  return (
    <div className="dashboard-layout">
      <header className="mobile-topbar">
        <button className="hamburger-btn" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle Menu">
          ☰
        </button>
        <span style={{ fontWeight: 800, fontSize: '16px' }}>MOWATEK</span>
        <span style={{ fontSize: '11px', color: '#06b6d4' }}>PORTAL</span>
      </header>

      <div
        className={`sidebar-overlay ${mobileOpen ? 'mobile-open' : ''}`}
        onClick={() => setMobileOpen(false)}
      />

      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div>
          <div className="brand-section">
            <div className="sidebar-brand-lockup">
              <BrandLogo size={40} />
              <div>
                <div className="brand-title">MOWATEK</div>
                <div className="brand-subtitle">{isAdmin ? 'ADMIN PORTAL V1.0' : 'EMPLOYEE PORTAL'}</div>
              </div>
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
              <NavigationIcon name="dashboard" />
              Dashboard
            </button>

            <button
              className={`nav-item ${activePage === 'profile' ? 'active' : ''}`}
              onClick={() => handleNavClick('profile')}
            >
              <NavigationIcon name="profile" />
              My Profile
            </button>

            <div className="nav-section-title" style={{ marginTop: '16px' }}>Operations</div>
            
            <button
              className={`nav-item ${activePage === 'tasks' ? 'active' : ''}`}
              onClick={() => handleNavClick('tasks')}
            >
              <NavigationIcon name="tasks" />
              Tasks & Reminders
            </button>
            
            <button
              className={`nav-item ${activePage === 'equipment' ? 'active' : ''}`}
              onClick={() => handleNavClick('equipment')}
            >
              <NavigationIcon name="equipment" />
              Equipment
            </button>
            
            <button
              className={`nav-item ${activePage === 'documents' ? 'active' : ''}`}
              onClick={() => handleNavClick('documents')}
            >
              <NavigationIcon name="documents" />
              Documents
            </button>

            <button
              className={`nav-item ${activePage === 'maintenance' ? 'active' : ''}`}
              onClick={() => handleNavClick('maintenance')}
            >
              <NavigationIcon name="maintenance" />
              Maintenance
            </button>

            {isAdmin && (
              <>
                <div className="nav-section-title" style={{ marginTop: '16px' }}>Management</div>
                <button
                  className={`nav-item ${activePage === 'employees' ? 'active' : ''}`}
                  onClick={() => handleNavClick('employees')}
                >
                  <NavigationIcon name="employees" />
                  Employees
                </button>
              </>
            )}
          </nav>
        </div>

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
