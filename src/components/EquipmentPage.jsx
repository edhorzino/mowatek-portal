import { useState, useEffect } from 'react'
import { EquipmentTable } from './EquipmentTable'
import { AddEquipmentModal } from './AddEquipmentModal'
import { supabase } from '../supabaseClient'

// --- PageHeader Helper Component ---
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

export function EquipmentPage() {
  const [equipmentList, setEquipmentList] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)

  // Fetch equipment records from Supabase on load
  useEffect(() => {
    fetchEquipment()
  }, [])

  const fetchEquipment = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('equipment')
      .select('*')
      .order('asset_id', { ascending: true })

    if (error) {
      console.error('Error fetching equipment from Supabase:', error.message)
    } else {
      setEquipmentList(data || [])
    }
    setLoading(false)
  }

  const handleAdd = async (newItem) => {
    // Insert into Supabase
    const { data, error } = await supabase
      .from('equipment')
      .insert([newItem])
      .select()

    if (error) {
      alert('Error adding equipment: ' + error.message)
    } else if (data) {
      setEquipmentList([data[0], ...equipmentList])
      setShowAddForm(false)
    }
  }

  const handleUpdate = async (id, updatedFields) => {
    const { error } = await supabase
      .from('equipment')
      .update(updatedFields)
      .eq('id', id)

    if (error) {
      alert('Error updating equipment: ' + error.message)
    } else {
      setEquipmentList(equipmentList.map(e => e.id === id ? { ...e, ...updatedFields } : e))
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this equipment record?')) return

    const { error } = await supabase
      .from('equipment')
      .delete()
      .eq('id', id)

    if (error) {
      alert('Error deleting equipment: ' + error.message)
    } else {
      setEquipmentList(equipmentList.filter(e => e.id !== id))
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="ASSET MANAGEMENT"
        title="Equipment Registry"
        description="Track client asset installations, maintenance schedules, and site contacts from Supabase."
        action={
          <button className="btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? 'Cancel' : '+ Add Equipment'}
          </button>
        }
      />

      {showAddForm && <AddEquipmentModal onAdd={handleAdd} onClose={() => setShowAddForm(false)} />}

      <section className="content-card">
        {loading ? (
          <p style={{ padding: '24px', color: '#94a3b8' }}>Loading equipment from Supabase...</p>
        ) : (
          <EquipmentTable
            equipmentList={equipmentList}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        )}
      </section>
    </>
  )
}