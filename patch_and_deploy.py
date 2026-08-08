import re, os, json

# 1. Update main.jsx to include App.css
main_jsx = os.path.expanduser("~/mowatek-portal/src/main.jsx")
with open(main_jsx, "r") as f:
    content = f.read()
if "App.css" not in content:
    content = content.replace("import './index.css'", "import './index.css'\nimport './App.css'")
    with open(main_jsx, "w") as f:
        f.write(content)

# 2. Update index.css with Glassmorphism Dark CSS
index_css = os.path.expanduser("~/mowatek-portal/src/index.css")
dark_css = """
:root {
  font-family: Inter, system-ui, -apple-system, sans-serif;
  color: #f8fafc;
  background-color: #0f172a;
}

html, body, #root {
  margin: 0;
  padding: 0;
  min-height: 100vh;
  background-color: #0f172a !important;
  color: #f8fafc !important;
}

.portal {
  background: #0f172a !important;
  color: #f8fafc !important;
  min-height: 100vh;
}

.topbar, .sidebar {
  background: #1e293b !important;
  border-color: #334155 !important;
}

.dashboard-panel, .content-panel, .stat-card, .mini-stat, .empty-module, .report-card {
  background: rgba(30, 41, 59, 0.85) !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  color: #f8fafc !important;
  border-radius: 12px !important;
}

.stat-card strong, .mini-stat strong, h1, h2, h3, h4, .stat-title {
  color: #ffffff !important;
}

/* HIGH CONTRAST TABLES */
table { width: 100% !important; border-collapse: collapse !important; background: transparent !important; }
th { color: #94a3b8 !important; background: rgba(15, 23, 42, 0.8) !important; padding: 12px 16px !important; border-bottom: 2px solid #334155 !important; font-weight: 600 !important; text-align: left !important; }
td { color: #f8fafc !important; border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important; padding: 14px 16px !important; font-size: 14px !important; font-weight: 500 !important; }
tr:hover td { background: rgba(56, 189, 248, 0.08) !important; }

/* INPUTS & SELECTS */
input, select, textarea {
  background: #1e293b !important;
  color: #f8fafc !important;
  border: 1px solid #475569 !important;
  border-radius: 6px !important;
  padding: 8px 12px !important;
}

.btn-primary {
  background: #2563eb !important;
  color: #ffffff !important;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
}
.btn-primary:hover { background: #1d4ed8 !important; }
"""
with open(index_css, "w") as f:
    f.write(dark_css)

# 3. Update Equipment & Maintenance implementation in App.jsx
app_jsx = os.path.expanduser("~/mowatek-portal/src/App.jsx")
with open(app_jsx, "r") as f:
    app_content = f.read()

# Full functional replacement for EquipmentPage and MaintenancePage
new_equipment_modules = """
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

function EquipmentPage() {
  const [equipmentList, setEquipmentList] = useState(INITIAL_EQUIPMENT);
  const [showAdd, setShowAdd] = useState(false);
  const [newEq, setNewEq] = useState({ name: '', category: 'General', frequency: 'Bi-Weekly' });

  const handleAdd = (e) => {
    e.preventDefault();
    const today = new Date().toISOString().split('T')[0];
    const nextDate = calculateNextDate(today, newEq.frequency);
    const item = {
      id: `EQ-00${equipmentList.length + 1}`,
      name: newEq.name,
      category: newEq.category,
      status: 'Operational',
      lastMaintenance: today,
      frequency: newEq.frequency,
      nextMaintenance: nextDate
    };
    setEquipmentList([...equipmentList, item]);
    setNewEq({ name: '', category: 'General', frequency: 'Bi-Weekly' });
    setShowAdd(false);
  };

  const handleCompleteMaintenance = (id) => {
    const today = new Date().toISOString().split('T')[0];
    setEquipmentList(prev => prev.map(item => {
      if (item.id === id) {
        const nextDate = calculateNextDate(today, item.frequency);
        return { ...item, lastMaintenance: today, nextMaintenance: nextDate, status: 'Operational' };
      }
      return item;
    }));
  };

  return (
    <>
      <PageHeader
        eyebrow="ASSET MANAGEMENT"
        title="Equipment Register"
        description="Equipment records, operational status, and maintenance scheduling."
      />

      <div className="module-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div className="mini-stat" style={{ padding: '16px' }}><span>Total Equipment</span><strong style={{ display: 'block', fontSize: '24px' }}>{equipmentList.length}</strong></div>
        <div className="mini-stat" style={{ padding: '16px' }}><span>Operational</span><strong style={{ display: 'block', fontSize: '24px' }}>{equipmentList.filter(e => e.status === 'Operational').length}</strong></div>
        <div className="mini-stat" style={{ padding: '16px' }}><span>Under Maintenance</span><strong style={{ display: 'block', fontSize: '24px' }}>{equipmentList.filter(e => e.status === 'Under Maintenance').length}</strong></div>
        <div className="mini-stat" style={{ padding: '16px' }}><span>Inactive</span><strong style={{ display: 'block', fontSize: '24px' }}>0</strong></div>
      </div>

      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn-primary" onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? 'Cancel' : '+ Add Equipment'}
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', marginBottom: '20px', display: 'grid', gap: '12px', gridTemplateColumns: '1fr 1fr 1fr auto' }}>
          <input required placeholder="Equipment Name" value={newEq.name} onChange={e => setNewEq({...newEq, name: e.target.value})} />
          <input required placeholder="Category" value={newEq.category} onChange={e => setNewEq({...newEq, category: e.target.value})} />
          <select value={newEq.frequency} onChange={e => setNewEq({...newEq, frequency: e.target.value})}>
            <option value="Weekly">Weekly</option>
            <option value="Bi-Weekly">Bi-Weekly</option>
            <option value="Monthly">Monthly</option>
            <option value="Quarterly">Quarterly</option>
            <option value="Semi-Annually">Semi-Annually</option>
            <option value="Annually">Annually</option>
          </select>
          <button type="submit" className="btn-primary">Save</button>
        </form>
      )}

      <div className="dashboard-panel" style={{ padding: '20px' }}>
        <table>
          <thead>
            <tr>
              <th>Asset ID</th>
              <th>Name</th>
              <th>Category</th>
              <th>Status</th>
              <th>Frequency</th>
              <th>Last Serviced</th>
              <th>Next Due</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {equipmentList.map(eq => (
              <tr key={eq.id}>
                <td><strong>{eq.id}</strong></td>
                <td>{eq.name}</td>
                <td>{eq.category}</td>
                <td><span style={{ color: eq.status === 'Operational' ? '#4ade80' : '#f87171' }}>● {eq.status}</span></td>
                <td>{eq.frequency}</td>
                <td>{eq.lastMaintenance}</td>
                <td>{eq.nextMaintenance}</td>
                <td>
                  <button 
                    onClick={() => handleCompleteMaintenance(eq.id)} 
                    style={{ background: '#059669', color: '#fff', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                    Mark Maintenance Complete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function MaintenancePage() {
  return (
    <>
      <PageHeader
        eyebrow="MAINTENANCE MANAGEMENT"
        title="Maintenance Log"
        description="Preventive maintenance schedules and service completion history."
      />
      <div className="dashboard-panel" style={{ padding: '20px' }}>
        <p style={{ color: '#94a3b8' }}>Maintenance schedules are updated automatically when completed from the <strong>Equipment Register</strong> tab.</p>
      </div>
    </>
  );
}
"""

# Pattern to replace old EquipmentPage and MaintenancePage implementations
pattern = r'function EquipmentPage\(\)\s*\{[\s\S]*?function SuppliesPage\(\)'
replacement = new_equipment_modules + "\n\nfunction SuppliesPage()"
updated_app = re.sub(pattern, replacement, app_content)

with open(app_jsx, "w") as f:
    f.write(updated_app)

print("Patching completed successfully!")
