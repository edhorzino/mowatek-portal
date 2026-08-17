import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useEmployeeProfile } from '../hooks/useEmployeeProfile'

export function DashboardHome({ employees = [] }) {
  const { profile, loading: profileLoading } = useEmployeeProfile()
  
  const totalEmployees = employees.length

  // State for equipment and documents
  const [equipmentList, setEquipmentList] = useState([])
  const [documents, setDocuments] = useState([])
  const [activeSessions, setActiveSessions] = useState([])
  const [loadingSessions, setLoadingSessions] = useState(true)

  // Fetch live equipment and documents directly from Supabase on load
  useEffect(() => {
    fetchLiveEquipment()
    fetchLiveDocuments()
    fetchLiveSessions()
  }, [])

  const fetchLiveEquipment = async () => {
    try {
      const { data, error } = await supabase
        .from('equipment')
        .select('*')

      if (error) throw error
      setEquipmentList(data || [])
    } catch (err) {
      console.error('Error fetching live equipment:', err.message)
    }
  }

  const fetchLiveDocuments = async () => {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
    
    if (error) {
      console.error('Error fetching live documents:', error.message)
    } else {
      setDocuments(data || [])
    }
  }

  const fetchLiveSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setActiveSessions(data || [])
    } catch (err) {
      console.error('Error fetching live sessions:', err.message)
    } finally {
      setLoadingSessions(false)
    }
  }

  // 1. Total Equipment: Counts all assets currently in the equipment directory
  const totalEquipment = equipmentList.length

  // 2. Dynamic Maintenance Due Soon Count based on Frequency Rules
  const upcomingMaintenanceCount = equipmentList.filter(item => {
    // Check various common date property names in your schema
    const dateStr = item.next_maintenance || item.nextMaintenance || item.maintenanceDate || item.due_date || item.next_service_date || item.lastServiceDate
    if (!dateStr) return false

    const dueDate = new Date(dateStr)
    if (isNaN(dueDate.getTime())) return false

    const today = new Date()
    
    // Determine threshold days based on maintenance frequency
    const frequency = (item.maintenance_frequency || item.frequency || item.maintenanceFrequency || '').toLowerCase()
    let thresholdDays = 30 // Default for quarterly, 6 months, annual, etc.

    if (frequency.includes('bi-weekly') || frequency.includes('biweekly') || frequency.includes('fortnight')) {
      thresholdDays = 7
    } else if (frequency.includes('monthly')) {
      thresholdDays = 15
    }

    const thresholdDate = new Date()
    thresholdDate.setDate(today.getDate() + thresholdDays)

    // Check if due date is between today and the dynamic threshold
    return dueDate >= today && dueDate <= thresholdDate
  }).length

  const totalDocs = documents.length
  const totalActiveLogins = activeSessions.length
  const displayName = profileLoading ? '...' : (profile?.firstName || 'User')
  const displayEmail = profile?.email || 'ewomazino.edhor@mowatek.com'

  return (
    <>
      <style>{`
        .dashboard-analytics-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 20px;
        }
        @media (max-width: 900px) {
          .dashboard-analytics-grid {
            grid-template-columns: 1fr !important;
          }
        }
        .metric-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
        }
        @media (max-width: 480px) {
          .metric-cards-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', boxSizing: 'border-box', maxWidth: '100%', overflowX: 'hidden' }}>
        {/* Header */}
        <div>
          <span className="page-eyebrow">MOWATEK INTERNAL SYSTEM</span>
          <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '4px 0 8px 0', color: '#fff', wordBreak: 'break-word' }}>
            Dashboard
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0, wordBreak: 'break-word' }}>
            Welcome back, {displayName}. Here's your operational overview. ({displayEmail})
          </p>
        </div>

        {/* 4-Column Compact Metric Cards */}
        <div className="metric-cards-grid">
          {/* Employees Metric */}
          <div className="metric-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>Employees</span>
              <span style={{ fontSize: '18px' }}>👥</span>
            </div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#fff', margin: '8px 0 4px 0' }}>
              {totalEmployees}
            </div>
            <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 500 }}>
              ● Active Personnel
            </span>
          </div>

          {/* Equipment Metric */}
          <div className="metric-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>Equipment</span>
              <span style={{ fontSize: '18px' }}>⚙️</span>
            </div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#fff', margin: '8px 0 4px 0' }}>
              {totalEquipment}
            </div>
            <span style={{ fontSize: '12px', color: 'var(--accent-cyan)', fontWeight: 500 }}>
              ● Inventory Items
            </span>
          </div>

          {/* Maintenance Metric */}
          <div className="metric-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>Maintenance</span>
              <span style={{ fontSize: '18px' }}>🔧</span>
            </div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#fff', margin: '8px 0 4px 0' }}>
              {upcomingMaintenanceCount}
            </div>
            <span style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 500 }}>
              ▲ Due Soon (Smart Thresholds)
            </span>
          </div>

          {/* Documents Metric */}
          <div className="metric-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>Documents</span>
              <span style={{ fontSize: '18px' }}>📄</span>
            </div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#fff', margin: '8px 0 4px 0' }}>
              {totalDocs}
            </div>
            <span style={{ fontSize: '12px', color: '#3b82f6', fontWeight: 500 }}>
              ● Live Vault Records
            </span>
          </div>
        </div>

        {/* Analytics Grid */}
        <div className="dashboard-analytics-grid">
          
          {/* Left Column: Live Staff Logins & Sessions */}
          <div className="content-card" style={{ margin: 0, boxSizing: 'border-box', overflowX: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h3 style={{ fontSize: '16px', margin: 0, color: '#fff' }}>Active Personnel Logins</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                  Live portal session tracking via Supabase
                </p>
              </div>
              <span style={{ fontSize: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '4px 10px', borderRadius: '12px', fontWeight: 600 }}>
                {loadingSessions ? 'Loading...' : `${totalActiveLogins} Active Logins`}
              </span>
            </div>

            {loadingSessions ? (
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '12px 0' }}>Fetching live sessions...</div>
            ) : activeSessions.length === 0 ? (
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '12px 0' }}>No active login records found.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '240px', overflowY: 'auto' }}>
                {activeSessions.map((session, index) => (
                  <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', gap: '8px' }}>
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                        {session.full_name || session.email}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Dept: {session.department || 'General'}
                      </div>
                    </div>
                    <span style={{ fontSize: '11px', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
                      ● Online
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Document Vault Metrics */}
          <div className="content-card" style={{ margin: 0, boxSizing: 'border-box' }}>
            <h3 style={{ fontSize: '16px', margin: '0 0 4px 0', color: '#fff' }}>Document Analytics</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 20px 0' }}>Vault storage allocation</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Total Vault Items</span>
                <strong style={{ color: '#fff' }}>{totalDocs} files</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Compliance Standard</span>
                <strong style={{ color: '#10b981' }}>MWT-SOP-2026</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>System Status</span>
                <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>● Supabase Live</span>
              </div>
            </div>
          </div>

        </div>

        {/* Activity Log Stream */}
        <div className="content-card" style={{ margin: 0, boxSizing: 'border-box' }}>
          <h3 style={{ fontSize: '16px', margin: '0 0 16px 0', color: '#fff' }}>Recent System Activity</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '13px', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ padding: '6px', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', flexShrink: 0 }}>📄</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ color: '#fff', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>Controlled Document Registered</strong>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Vault record synced with Supabase storage</div>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>Just now</span>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '13px' }}>
              <span style={{ padding: '6px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', flexShrink: 0 }}>🔑</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ color: '#fff', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>Admin Authentication Session</strong>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>User logged in successfully</div>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>Today</span>
            </div>

          </div>
        </div>
      </div>
    </>
  )
}

export default DashboardHome
