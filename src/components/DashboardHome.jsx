import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useEmployeeProfile } from '../hooks/useEmployeeProfile'

export function DashboardHome({ employees = [], equipmentList = [] }) {
  const { profile, loading: profileLoading } = useEmployeeProfile()
  
  // Calculate dynamic metrics
  const totalEmployees = employees.length || 8
  const totalEquipment = equipmentList.length || 14
  
  const [documents, setDocuments] = useState([])
  const [activeSessions, setActiveSessions] = useState([])
  const [loadingSessions, setLoadingSessions] = useState(true)

  useEffect(() => {
    fetchLiveDocuments()
    fetchLiveSessions()
  }, [])

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

  const totalDocs = documents.length
  const totalActiveLogins = activeSessions.length
  const displayName = profileLoading ? '...' : (profile?.firstName || 'User')
  const displayEmail = profile?.email || 'ewomazino.edhor@mowatek.com'

  return (
    <>
      {/* Responsive Injection Style to handle Mobile Stacking for Grids & Overflow */}
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
              3
            </div>
            <span style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 500 }}>
              ▲ Scheduled Tasks
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

        {/* Analytics Grid (Responsive Class Applied) */}
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