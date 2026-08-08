export function MaintenancePage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <span className="page-eyebrow">MOWATEK INTERNAL SYSTEM</span>
        <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '4px 0 8px 0', color: '#fff' }}>
          Maintenance Log
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
          Track upcoming equipment servicing and maintenance schedules.
        </p>
      </div>

      <div className="content-card" style={{ padding: '30px', textAlign: 'center' }}>
        <span style={{ fontSize: '36px' }}>🔧</span>
        <h3 style={{ color: '#fff', margin: '12px 0 6px 0' }}>No Active Maintenance Tasks</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
          All registered equipment and tools are currently fully operational.
        </p>
      </div>
    </div>
  )
}

export default MaintenancePage