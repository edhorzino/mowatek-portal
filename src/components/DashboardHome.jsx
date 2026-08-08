import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useEmployeeProfile } from '../hooks/useEmployeeProfile'

export function DashboardHome({ employees = [], equipmentList = [] }) {
  const { profile, loading: profileLoading } = useEmployeeProfile()
  
  // Calculate dynamic metrics
  const totalEmployees = employees.length || 8
  const totalEquipment = equipmentList.length || 14
  
  const [documents, setDocuments] = useState([])

  useEffect(() => {
    fetchLiveDocuments()
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

  const totalDocs = documents.length
  const displayName = profileLoading ? '...' : (profile?.firstName || 'User')
  const displayEmail = profile?.email || 'ewomazino.edhor@mowatek.com'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <span className="page-eyebrow">MOWATEK INTERNAL SYSTEM</span>
        <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '4px 0 8px 0', color: '#fff' }}>
          Dashboard
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
          Welcome back, {displayName}. Here's your operational overview. ({displayEmail})
        </p>
      </div>

      {/* 4-Column Compact Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}
      >
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

      {/* Analytics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        
        {/* Left Column: Staff Logins & Department Breakdown */}
        <div className="content-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '16px', margin: 0, color: '#fff' }}>Today's Active Personnel Logins</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                Department attendance & portal sessions
              </p>
            </div>
            <span style={{ fontSize: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '4px 10px', borderRadius: '12px', fontWeight: 600 }}>
              6 Logged In Today
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                <span style={{ color: '#fff' }}>Engineering (ENG)</span>
                <span style={{ color: 'var(--text-muted)' }}>4 / 5 Staff Online</span>
              </div>
              <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '80%', height: '100%', background: 'var(--accent-cyan)' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                <span style={{ color: '#fff' }}>Procurement (PRC)</span>
                <span style={{ color: 'var(--text-muted)' }}>2 / 2 Staff Online</span>
              </div>
              <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '100%', height: '100%', background: '#3b82f6' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                <span style={{ color: '#fff' }}>Operations (OPS)</span>
                <span style={{ color: 'var(--text-muted)' }}>1 / 3 Staff Online</span>
              </div>
              <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '33%', height: '100%', background: '#f59e0b' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Document Vault Metrics */}
        <div className="content-card">
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
      <div className="content-card">
        <h3 style={{ fontSize: '16px', margin: '0 0 16px 0', color: '#fff' }}>Recent System Activity</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '13px', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ padding: '6px', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>📄</span>
            <div style={{ flex: 1 }}>
              <strong style={{ color: '#fff' }}>Controlled Document Registered</strong>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Vault record synced with Supabase storage</div>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Just now</span>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '13px' }}>
            <span style={{ padding: '6px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>🔑</span>
            <div style={{ flex: 1 }}>
              <strong style={{ color: '#fff' }}>Admin Authentication Session</strong>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>User logged in successfully</div>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Today</span>
          </div>

        </div>
      </div>
    </div>
  )
}

export default DashboardHome