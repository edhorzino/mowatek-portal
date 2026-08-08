import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LoginPage } from './components/LoginPage'
import { DashboardHome } from './components/DashboardHome'
import { EmployeesPage } from './components/EmployeesPage'
import { EquipmentPage } from './components/EquipmentPage'
import { MaintenancePage } from './components/MaintenancePage'
import { DocumentsPage } from './components/DocumentsPage'
import { supabase } from './lib/supabase' // Ensure your supabase client is imported
import "./App.css";

function LoginScreen() {
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Unable to sign in.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="brand-mark">M</div>
          <div>
            <h1>Mowatek</h1>
            <p>Employee Portal</p>
          </div>
        </div>

        <div className="login-heading">
          <h2>Welcome back</h2>
          <p>Sign in to access the Mowatek employee portal.</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <label>
            Work Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@mowatek.com"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              required
            />
          </label>

          {error && <div className="error-box">{error}</div>}

          <button type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}

const NAV_ITEMS = [
  {
    section: 'MAIN',
    items: [
      { id: 'dashboard', icon: '▦', label: 'Dashboard' },
      { id: 'employees', icon: '👥', label: 'Employees' },
      { id: 'equipment', icon: '⚙', label: 'Equipment' },
      { id: 'maintenance', icon: '🔧', label: 'Maintenance' },
      { id: 'supplies', icon: '▤', label: 'Supplies' },
      { id: 'documents', icon: '▣', label: 'Documents' },
    ],
  },
  {
    section: 'MANAGEMENT',
    items: [
      { id: 'projects', icon: '◉', label: 'Projects' },
      { id: 'reports', icon: '▥', label: 'Reports' },
    ],
  },
]

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

function EmptyModule({ icon, title, description }) {
  return (
    <section className="module-empty">
      <div className="module-empty-icon">{icon}</div>
      <h2>{title}</h2>
      <p>{description}</p>
      <span className="coming-soon">MODULE READY FOR DATABASE CONNECTION</span>
    </section>
  )
}





function calculateNextDate(startDateStr, frequency) {
  const date = new Date(startDateStr || new Date());
  const freq = (frequency || '').toLowerCase();
  if (freq === 'weekly') date.setDate(date.getDate() + 7);
  else if (freq === 'bi-weekly') date.setDate(date.getDate() + 14);
  else if (freq === 'monthly') date.setMonth(date.getMonth() + 1);
  else if (freq === 'quarterly') date.setMonth(date.getMonth() + 3);
  else if (freq === 'semi-annually') date.setMonth(date.getMonth() + 6);
  else if (freq === 'annually') date.setFullYear(date.getFullYear() + 1);
  else date.setDate(date.getDate() + 30);
  return date.toISOString().split('T')[0];
}

const INITIAL_EQUIPMENT = [
  { id: 'EQ-001', name: 'High-Pressure Water Pump', category: 'Pumps', status: 'Operational', lastMaintenance: '2026-07-01', frequency: 'Bi-Weekly', nextMaintenance: '2026-07-15' },
  { id: 'EQ-002', name: 'Diesel Generator 500kVA', category: 'Power', status: 'Operational', lastMaintenance: '2026-06-20', frequency: 'Monthly', nextMaintenance: '2026-07-20' },
  { id: 'EQ-003', name: 'Industrial Water Filter Unit', category: 'Filtration', status: 'Under Maintenance', lastMaintenance: '2026-05-10', frequency: 'Bi-Weekly', nextMaintenance: '2026-05-24' }
];





function SuppliesPage() {
  return (
    <>
      <PageHeader
        eyebrow="INVENTORY MANAGEMENT"
        title="Supplies"
        description="Monitor stock, inventory levels and material availability."
      />

      <div className="module-grid">
        <div className="mini-stat"><span>Total Items</span><strong>—</strong></div>
        <div className="mini-stat"><span>In Stock</span><strong>—</strong></div>
        <div className="mini-stat"><span>Low Stock</span><strong>—</strong></div>
        <div className="mini-stat"><span>Out of Stock</span><strong>—</strong></div>
      </div>

      <EmptyModule
        icon="▤"
        title="Inventory Register"
        description="The supplies and inventory interface is ready for connection to the inventory database."
      />
    </>
  )
}



function ProjectsPage() {
  return (
    <>
      <PageHeader
        eyebrow="PROJECT MANAGEMENT"
        title="Projects"
        description="Monitor projects, assignments, progress and project documentation."
      />

      <div className="module-grid">
        <div className="mini-stat"><span>Active Projects</span><strong>—</strong></div>
        <div className="mini-stat"><span>In Progress</span><strong>—</strong></div>
        <div className="mini-stat"><span>Completed</span><strong>—</strong></div>
        <div className="mini-stat"><span>On Hold</span><strong>—</strong></div>
      </div>

      <EmptyModule
        icon="◉"
        title="Project Register"
        description="Project information and project-level reporting will be connected here."
      />
    </>
  )
}

function ReportsPage() {
  return (
    <>
      <PageHeader
        eyebrow="BUSINESS INTELLIGENCE"
        title="Reports"
        description="Generate management reports from the Mowatek database."
      />

      <div className="report-grid">
        <div className="report-card">
          <span>01</span>
          <h3>Employee Report</h3>
          <p>Employee records, departments and positions.</p>
          <button disabled>Generate Report</button>
        </div>

        <div className="report-card">
          <span>02</span>
          <h3>Equipment Report</h3>
          <p>Equipment register and operational status.</p>
          <button disabled>Generate Report</button>
        </div>

        <div className="report-card">
          <span>03</span>
          <h3>Maintenance Report</h3>
          <p>Maintenance schedules and service history.</p>
          <button disabled>Generate Report</button>
        </div>

        <div className="report-card">
          <span>04</span>
          <h3>Document Report</h3>
          <p>Document register, revisions and status.</p>
          <button disabled>Generate Report</button>
        </div>
      </div>
    </>
  )
}

function Dashboard() {
  const { user, attributes, groups, logout } = useAuth()

  const [activePage, setActivePage] = useState('dashboard')
  const [employees, setEmployees] = useState([])
  const [loadingEmployees, setLoadingEmployees] = useState(true)
  const [employeeError, setEmployeeError] = useState('')

  // --- PERSISTENT HANDLERS CONNECTED TO API ---

// 1. Add Employee
  const handleAddEmployee = async (newEmp) => {
    try {
      const savedEmployee = await createEmployee(newEmp)
      setEmployees((prev) => [savedEmployee || newEmp, ...prev])
    } catch (err) {
      console.warn('Backend create skipped or failed, saving locally:', err)
      setEmployees((prev) => [newEmp, ...prev])
    }
  }

  // 2. Update Employee
  const handleUpdateEmployee = async (targetId, updatedRecord) => {
    try {
      await updateEmployeeApi(targetId, updatedRecord)
    } catch (err) {
      console.warn('Backend update skipped or failed, updating UI locally:', err)
    } finally {
      // Always update UI state
      setEmployees((prev) =>
        prev.map((emp) =>
          (emp.employeeId || emp.id) === targetId ? { ...emp, ...updatedRecord } : emp
        )
      )
    }
  }

  // 3. Delete Employee
  const handleDeleteEmployee = async (targetId) => {
    try {
      await deleteEmployeeApi(targetId)
    } catch (err) {
      console.warn('Backend delete skipped or failed, removing from UI locally:', err)
    } finally {
      // Always update UI state
      setEmployees((prev) =>
        prev.filter((emp) => (emp.employeeId || emp.id) !== targetId)
      )
    }
  }

  useEffect(() => {
    async function loadEmployees() {
      try {
        const data = await getEmployees()

        const list = Array.isArray(data)
          ? data
          : data?.employees || data?.items || []

        setEmployees(list)
      } catch (err) {
        console.error(err)
        setEmployeeError(err.message || 'Unable to load employees.')
      } finally {
        setLoadingEmployees(false)
      }
    }

    loadEmployees()
  }, [])

  const displayName =
    attributes?.name ||
    attributes?.email ||
    user?.username ||
    'Employee'

  function renderPage() {
    if (employeeError && activePage === 'dashboard') {
      return (
        <>
          <PageHeader
            eyebrow="MOWATEK INTERNAL SYSTEM"
            title="Dashboard"
            description={`Welcome back, ${displayName}.`}
          />
          <div className="error-box">{employeeError}</div>
        </>
      )
    }

    switch (activePage) {
      case 'employees':
    return (
    <EmployeesPage
      employees={employees}
      loadingEmployees={loadingEmployees}
      onAddEmployee={handleAddEmployee}
      onUpdateEmployee={handleUpdateEmployee}
      onDeleteEmployee={handleDeleteEmployee}
    />
  )

      case 'equipment':
        return <EquipmentPage />

      case 'maintenance':
        return <MaintenancePage />

      case 'supplies':
        return <SuppliesPage />

      case 'documents':
        return <DocumentsPage />

      case 'projects':
        return <ProjectsPage />

      case 'reports':
        return <ReportsPage />

      case 'dashboard':
      default:
        return (
          <DashboardHome
            displayName={displayName}
            employees={employees}
            loadingEmployees={loadingEmployees}
          />
        )
    }
  }

  return (
    <div className="portal">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">M</div>

          <div>
            <strong>MOWATEK</strong>
            <span>Employee Portal</span>
          </div>
        </div>

        <div className="user-area">
          <div className="user-info">
            <strong>{displayName}</strong>
            <span>{groups?.join(', ') || 'Employee'}</span>
          </div>

          <button className="logout-button" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>

      <div className="portal-body">
        <aside className="sidebar">
          {NAV_ITEMS.map((section) => (
            <div className="nav-section" key={section.section}>
              <span className="nav-label">{section.section}</span>

              {section.items.map((item) => (
                <button
                  key={item.id}
                  className={`nav-item ${
                    activePage === item.id ? 'active' : ''
                  }`}
                  onClick={() => setActivePage(item.id)}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-text">{item.label}</span>
                </button>
              ))}
            </div>
          ))}

          <div className="sidebar-footer">
            <span>MOWATEK INTERNAL</span>
            <small>Portal v1.0</small>
          </div>
        </aside>

        <main className="dashboard">
          {renderPage()}
        </main>
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

        // Map database snake_case columns to frontend camelCase properties
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

  // If user is not authenticated, display the Login Page
  if (!user) {
    return <LoginPage />
  }

  const handleNavClick = (page) => {
    setActivePage(page)
    setMobileOpen(false) // Auto close drawer on select
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

      {/* Sidebar Navigation */}
      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div>
          <div className="brand-section">
            <div>
              <div className="brand-title">MOWATEK</div>
              <div className="brand-subtitle">EMPLOYEE PORTAL V1.0</div>
            </div>
            {mobileOpen && (
              <button className="hamburger-btn" onClick={() => setMobileOpen(false)}>
                ✕
              </button>
            )}
          </div>

          <div className="nav-section-title">Main Navigation</div>
          <nav className="nav-menu">
            <button
              className={`nav-item ${activePage === 'dashboard' ? 'active' : ''}`}
              onClick={() => handleNavClick('dashboard')}
            >
              📊 Dashboard
            </button>

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
          </nav>
        </div>

        {/* User Card with functional Sign Out */}
        <div className="user-profile-card">
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff', wordBreak: 'break-all' }}>
            {user?.email || user?.username || 'User'}
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>Employee</div>
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