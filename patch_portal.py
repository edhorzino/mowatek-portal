import re, os

app_path = os.path.expanduser("~/mowatek-portal/src/App.jsx")
css_path = os.path.expanduser("~/mowatek-portal/src/App.css")

# --- 1. PERMANENT GLASS & TABLE CONTRAST STYLING ---
glass_css = """
/* Glassmorphism & Table Contrast Fixes */
:root {
  --bg-deep: #0a0f1d;
  --glass-bg: rgba(15, 23, 42, 0.75);
  --glass-border: rgba(255, 255, 255, 0.1);
  --text-primary: #f8fafc;
  --text-muted: #94a3b8;
  --accent-cyan: #38bdf8;
}

body {
  background-color: var(--bg-deep) !important;
  background-image: radial-gradient(at 10% 10%, rgba(56, 189, 248, 0.1) 0px, transparent 50%),
                    radial-gradient(at 90% 90%, rgba(59, 130, 246, 0.08) 0px, transparent 50%) !important;
  background-attachment: fixed !important;
  color: var(--text-primary) !important;
}

.dashboard-panel, .content-panel, .stat-card, .dashboard-kpi-card, .card {
  background: var(--glass-bg) !important;
  backdrop-filter: blur(16px) !important;
  -webkit-backdrop-filter: blur(16px) !important;
  border: 1px solid var(--glass-border) !important;
  border-radius: 16px !important;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.35) !important;
}

table { width: 100% !important; border-collapse: collapse !important; background: transparent !important; }
th { color: #94a3b8 !important; background: rgba(30, 41, 59, 0.6) !important; padding: 14px 16px !important; border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important; }
td { color: #f1f5f9 !important; border-bottom: 1px solid rgba(255, 255, 255, 0.07) !important; padding: 16px !important; font-size: 14px !important; }
tr:hover td { background: rgba(56, 189, 248, 0.05) !important; }
"""

with open(css_path, "a") as f:
    f.write("\n" + glass_css)

# --- 2. LOGIC IN App.jsx ---
with open(app_path, "r") as f:
    content = f.read()

calc_logic = """
  const calculateNextMaintenanceDate = (fromDateStr, frequency) => {
    const date = new Date(fromDateStr || new Date());
    switch (frequency?.toLowerCase()) {
      case "weekly": date.setDate(date.getDate() + 7); break;
      case "bi-weekly": date.setDate(date.getDate() + 14); break;
      case "monthly": date.setMonth(date.getMonth() + 1); break;
      case "quarterly": date.setMonth(date.getMonth() + 3); break;
      case "semi-annually": date.setMonth(date.getMonth() + 6); break;
      case "annually": date.setFullYear(date.getFullYear() + 1); break;
      default: date.setDate(date.getDate() + 30);
    }
    return date.toISOString().split("T")[0];
  };

  const handleCompleteMaintenance = (equipmentId) => {
    const today = new Date().toISOString().split("T")[0];
    setEquipments(prev => prev.map(item => {
      if (item.id === equipmentId || item.equipmentId === equipmentId) {
        const nextDate = calculateNextMaintenanceDate(today, item.frequency);
        return {
          ...item,
          lastMaintenanceDate: today,
          nextMaintenanceDate: nextDate,
          status: "ok"
        };
      }
      return item;
    }));
  };
"""

if "calculateNextMaintenanceDate" not in content:
    content = re.sub(r'(const\s+\[equipments.*?\n)', r'\1' + calc_logic, content, count=1)

if "bi-weekly" not in content.lower():
    content = content.replace(
        '<option value="weekly">Weekly</option>',
        '<option value="weekly">Weekly</option>\n                <option value="bi-weekly">Bi-Weekly</option>'
    ).replace(
        '<option value="Weekly">Weekly</option>',
        '<option value="Weekly">Weekly</option>\n                <option value="Bi-Weekly">Bi-Weekly</option>'
    )

complete_btn = """
            <button 
              className="primary-button" 
              style={{ background: "#16a34a", color: "#fff", border: "none", padding: "10px 16px", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}
              onClick={() => {
                if (selectedEquipment) {
                  handleCompleteMaintenance(selectedEquipment.id || selectedEquipment.equipmentId);
                  setSelectedEquipment(null);
                }
              }}
            >
              ✓ Mark Maintenance Complete
            </button>
"""

if "Mark Maintenance Complete" not in content:
    content = re.sub(
        r'(<div\s+className=["\']maintenance-detail-actions["\']>)([\s\S]*?)(</div>)',
        r'\1\n' + complete_btn + r'\2\3',
        content,
        count=1
    )

with open(app_path, "w") as f:
    f.write(content)

print("Successfully updated App.jsx and App.css!")
