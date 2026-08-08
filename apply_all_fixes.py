import re, os

app_path = os.path.expanduser("~/mowatek-portal/src/App.jsx")
index_css_path = os.path.expanduser("~/mowatek-portal/src/index.css")

# --- 1. FORCE DARK GLASS & CONTRAST STYLES IN INDEX.CSS ---
dark_glass_styles = """
/* FORCE GLASSMORPHISM & TABLE READABILITY */
:root {
  --bg-dark: #0f172a;
  --panel-glass: rgba(30, 41, 59, 0.85);
  --glass-border: rgba(255, 255, 255, 0.12);
  --text-main: #f8fafc;
  --text-dim: #94a3b8;
}

body, html, #root {
  background-color: var(--bg-dark) !important;
  background-image: radial-gradient(at 15% 15%, rgba(56, 189, 248, 0.12) 0px, transparent 50%),
                    radial-gradient(at 85% 85%, rgba(59, 130, 246, 0.1) 0px, transparent 50%) !important;
  background-attachment: fixed !important;
  color: var(--text-main) !important;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
}

/* Panel and Card Overrides */
.dashboard-panel, .content-panel, .stat-card, .dashboard-kpi-card, .card, div[class*="card"], main {
  background: var(--panel-glass) !important;
  backdrop-filter: blur(16px) !important;
  -webkit-backdrop-filter: blur(16px) !important;
  border: 1px solid var(--glass-border) !important;
  border-radius: 12px !important;
  color: var(--text-main) !important;
}

/* Force Table Visibility */
table { width: 100% !important; border-collapse: collapse !important; background: transparent !important; }
th { color: #94a3b8 !important; background: rgba(15, 23, 42, 0.6) !important; padding: 12px 16px !important; border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important; font-weight: 600 !important; }
td { color: #f1f5f9 !important; border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important; padding: 14px 16px !important; font-size: 14px !important; font-weight: 500 !important; }
tr:hover td { background: rgba(56, 189, 248, 0.06) !important; }

/* Input and Select Fixes */
input, select, textarea {
  background: rgba(15, 23, 42, 0.8) !important;
  color: #f8fafc !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  border-radius: 6px !important;
  padding: 8px 12px !important;
}
"""

with open(index_css_path, "a") as f:
    f.write("\n" + dark_glass_styles)

# --- 2. UPDATE EQUIPMENT LOGIC IN APP.JSX ---
with open(app_path, "r") as f:
    content = f.read()

# Date calculation function & Maintenance Complete Handler
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
    # Insert near top of main component function
    content = re.sub(r'(function App\s*\(.*?\)\s*\{|const App\s*=\s*\(\)\s*=>\s*\{)', r'\1\n' + calc_logic, content, count=1)

# Add bi-weekly option
if "bi-weekly" not in content.lower():
    content = content.replace(
        '<option value="weekly">Weekly</option>',
        '<option value="weekly">Weekly</option>\n<option value="bi-weekly">Bi-Weekly</option>'
    ).replace(
        '<option value="Weekly">Weekly</option>',
        '<option value="Weekly">Weekly</option>\n<option value="Bi-Weekly">Bi-Weekly</option>'
    )

with open(app_path, "w") as f:
    f.write(content)

print("Patch applied to index.css and App.jsx successfully!")
