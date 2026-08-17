import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export function ClientFoldersView() {
  const [clients, setClients] = useState([])
  const [documents, setDocuments] = useState([])
  const [selectedClientFolder, setSelectedClientFolder] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    const [clientRes, docRes] = await Promise.all([
      supabase.from('clients').select('*').order('client_name'),
      supabase.from('documents').select('*').order('created_at', { ascending: false })
    ])
    
    if (clientRes.data) setClients(clientRes.data)
    if (docRes.data) setDocuments(docRes.data)
    setLoading(false)
  }

  // Filter documents based on search query or active client folder
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = 
      doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.document_code || doc.doc_number)?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.client_name || doc.client)?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.project?.toLowerCase().includes(searchQuery.toLowerCase())

    if (selectedClientFolder) {
      return matchesSearch && (doc.client_name || doc.client)?.toLowerCase() === selectedClientFolder.toLowerCase()
    }
    return matchesSearch
  })

  return (
    <div style={{ padding: '24px', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: '0 0 6px 0', fontSize: '22px' }}>Client Vault & Folders</h2>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '13px' }}>Browse client folders or search across all registered documents.</p>
        </div>

        {/* Global Search Bar */}
        <div style={{ width: '320px' }}>
          <input
            type="text"
            placeholder="Search documents, IDs, projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(15,23,42,0.6)',
              color: '#fff',
              fontSize: '13px',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Breadcrumb / Active Folder indicator */}
      {selectedClientFolder && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', background: 'rgba(6,182,212,0.1)', padding: '10px 16px', borderRadius: '8px', border: '1px solid rgba(6,182,212,0.2)' }}>
          <span style={{ fontSize: '13px', color: '#06b6d4' }}>Active Folder: <strong>{selectedClientFolder}</strong></span>
          <button 
            onClick={() => setSelectedClientFolder(null)}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '12px' }}
          >
            ✕ Clear Folder View
          </button>
        </div>
      )}

      {/* Client Folders Grid (Shown only when no specific folder is clicked, or alongside) */}
      {!selectedClientFolder && (
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '15px', color: '#94a3b8', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Client Folders</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
            {clients.map(client => {
              const count = documents.filter(d => (d.client_name || d.client)?.toLowerCase() === client.client_name.toLowerCase()).length
              return (
                <div
                  key={client.id}
                  onClick={() => setSelectedClientFolder(client.client_name)}
                  style={{
                    padding: '20px',
                    background: 'rgba(30, 41, 59, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                  }}
                >
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>📁</div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#fff' }}>{client.client_name}</h4>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>{count} Document{count === 1 ? '' : 's'}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Documents Breakdown Table */}
      <div>
        <h3 style={{ fontSize: '15px', color: '#94a3b8', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {selectedClientFolder ? `Documents for ${selectedClientFolder}` : 'All Vault Documents'} ({filteredDocuments.length})
        </h3>

        {loading ? (
          <p style={{ color: '#64748b' }}>Loading vault records...</p>
        ) : filteredDocuments.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', background: 'rgba(30,41,59,0.3)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
            <p style={{ color: '#94a3b8', margin: 0 }}>No documents found matching your criteria.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}>
                  <th style={{ padding: '12px' }}>Doc Number</th>
                  <th style={{ padding: '12px' }}>Title</th>
                  <th style={{ padding: '12px' }}>Client</th>
                  <th style={{ padding: '12px' }}>Project</th>
                  <th style={{ padding: '12px' }}>Status</th>
                  <th style={{ padding: '12px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.map(doc => (
                  <tr key={doc.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '12px', fontWeight: 600, color: '#06b6d4' }}>{doc.document_code || doc.doc_number || '—'}</td>
                    <td style={{ padding: '12px', color: '#fff' }}>{doc.title}</td>
                    <td style={{ padding: '12px', color: '#cbd5e1' }}>{doc.client_name || doc.client || '—'}</td>
                    <td style={{ padding: '12px', color: '#cbd5e1' }}>{doc.project || '—'}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ padding: '4px 8px', borderRadius: '4px', background: 'rgba(59,130,246,0.15)', color: '#60a5fa', fontSize: '11px' }}>
                        {doc.status || 'DRF'}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      {doc.file_url ? (
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer" style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 600 }}>
                          Download ↗
                        </a>
                      ) : (
                        <span style={{ color: '#64748b' }}>No File</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
