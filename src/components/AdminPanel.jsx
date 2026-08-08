import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export function AdminPanel() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    // Fetch employee profiles / registrations
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching profiles:', error.message)
    } else {
      setUsers(data || [])
    }
    setLoading(false)
  }

  const toggleApproval = async (userId, currentStatus) => {
    setActionLoading(userId)
    const { error } = await supabase
      .from('profiles')
      .update({ is_approved: !currentStatus })
      .eq('id', userId)

    if (error) {
      alert('Error updating approval status: ' + error.message)
    } else {
      setUsers(users.map(u => u.id === userId ? { ...u, is_approved: !currentStatus } : u))
    }
    setActionLoading(null)
  }

  const updateRole = async (userId, newRole) => {
    setActionLoading(userId)
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)

    if (error) {
      alert('Error updating role: ' + error.message)
    } else {
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u))
    }
    setActionLoading(null)
  }

  return (
    <div style={{ padding: '24px', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: '0 0 6px 0', fontSize: '22px' }}>🛡️ Admin Staff & Access Control</h2>
        <p style={{ margin: 0, color: '#94a3b8', fontSize: '13px' }}>
          Manage employee account approvals, toggle security clearance, and assign administrative roles.
        </p>
      </div>

      {loading ? (
        <p style={{ color: '#64748b' }}>Loading staff directories...</p>
      ) : users.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', background: 'rgba(30,41,59,0.3)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
          <p style={{ color: '#94a3b8', margin: 0 }}>No registered staff profiles found.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}>
                <th style={{ padding: '12px' }}>Staff Name / Email</th>
                <th style={{ padding: '12px' }}>Department</th>
                <th style={{ padding: '12px' }}>Approval Status</th>
                <th style={{ padding: '12px' }}>Access Role</th>
                <th style={{ padding: '12px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '12px' }}>
                    <div style={{ fontWeight: 600, color: '#fff' }}>{user.full_name || 'Unnamed Employee'}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{user.email}</div>
                  </td>
                  <td style={{ padding: '12px', color: '#cbd5e1' }}>{user.department || 'Mowatek Operations'}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ 
                      padding: '4px 8px', 
                      borderRadius: '4px', 
                      background: user.is_approved ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', 
                      color: user.is_approved ? '#34d399' : '#f87171', 
                      fontSize: '11px',
                      fontWeight: 600
                    }}>
                      {user.is_approved ? 'Active / Approved' : 'Pending Approval'}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <select
                      value={user.role || 'staff'}
                      onChange={(e) => updateRole(user.id, e.target.value)}
                      disabled={actionLoading === user.id}
                      style={{
                        padding: '6px 10px',
                        background: 'rgba(15,23,42,0.8)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '12px',
                        outline: 'none',
                        cursor: 'pointer',
                        WebkitAppearance: 'none'
                      }}
                    >
                      <option value="staff">Staff</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <button
                      onClick={() => toggleApproval(user.id, user.is_approved)}
                      disabled={actionLoading === user.id}
                      style={{
                        padding: '6px 12px',
                        background: user.is_approved ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
border: `1px solid ${user.is_approved ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,                        borderRadius: '6px',
                        color: user.is_approved ? '#f87171' : '#34d399',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {actionLoading === user.id ? 'Updating...' : user.is_approved ? 'Revoke Access' : 'Approve Account'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}