import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export function DocumentsPage() {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFolder, setSelectedFolder] = useState('all')

  // Folders structure
  const folders = [
    { id: 'all', name: 'All Documents', icon: '📁', count: documents.length },
    { id: 'technical', name: 'Technical Tenders & Proposals', icon: '📐', category: 'Technical' },
    { id: 'compliance', name: 'SOPs & Compliance', icon: '🛡️', category: 'Compliance' },
    { id: 'hr', name: 'HR & Personnel', icon: '👥', category: 'HR' },
    { id: 'procurement', name: 'Procurement & Equipment', icon: '📦', category: 'Procurement' }
  ]

  useEffect(() => {
    fetchDocuments()
  }, [])

  const fetchDocuments = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setDocuments(data || [])
    } catch (err) {
      console.error('Error fetching documents:', err.message)
    } finally {
      setLoading(false)
    }
  }

  // Filter documents based on active folder and search query
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = 
      (doc.name || doc.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.description || '').toLowerCase().includes(searchTerm.toLowerCase())

    if (selectedFolder === 'all') return matchesSearch

    const docCategory = (doc.category || '').toLowerCase()
    const matchesCategory = docCategory.includes(selectedFolder)
    return matchesSearch && matchesCategory
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', boxSizing: 'border-box' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <span className="page-eyebrow">DOCUMENT CONTROL VAULT</span>
          <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '4px 0 8px 0', color: '#fff' }}>
            Vault & Directory
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
            Manage, categorize, and search through Mowatek controlled documentation.
          </p>
        </div>
      </div>

      {/* Search & Action Bar */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 300px' }}>
          <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
            🔍
          </span>
          <input
            type="text"
            placeholder="Search documents by name, category, or keyword..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 14px 12px 40px',
              background: 'rgba(0,0,0,0.2)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>
      </div>

      {/* Folder Grid Navigation */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        {folders.map(folder => {
          const isSelected = selectedFolder === folder.id
          return (
            <div
              key={folder.id}
              onClick={() => setSelectedFolder(folder.id)}
              style={{
                background: isSelected ? 'rgba(6, 182, 212, 0.15)' : 'rgba(0,0,0,0.2)',
                border: `1px solid ${isSelected ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: '10px',
                padding: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <span style={{ fontSize: '24px' }}>{folder.icon}</span>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: isSelected ? 'var(--accent-cyan)' : '#fff' }}>
                  {folder.name}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {folder.id === 'all' ? `${documents.length} files total` : 'Category folder'}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Documents Table / List Section */}
      <div className="content-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '16px', color: '#fff' }}>
            {selectedFolder === 'all' ? 'All Directory Files' : `${selectedFolder.toUpperCase()} Files`}
          </h3>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Showing {filteredDocuments.length} records
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading document vault records...
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No documents found matching your filter criteria.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.3)', color: 'var(--text-muted)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <th style={{ padding: '12px 20px' }}>Document Name</th>
                  <th style={{ padding: '12px 16px' }}>Category</th>
                  <th style={{ padding: '12px 16px' }}>Version</th>
                  <th style={{ padding: '12px 16px' }}>Date Added</th>
                  <th style={{ padding: '12px 20px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.map((doc, idx) => (
                  <tr key={doc.id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '14px 20px', color: '#fff', fontWeight: 500 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span>📄</span>
                        <div>
                          <div>{doc.name || doc.title || 'Unnamed Document'}</div>
                          {doc.description && (
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{doc.description}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                        {doc.category || 'General'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>
                      {doc.version || 'v1.0'}
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>
                      {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      {doc.file_url || doc.url ? (
                        <a
                          href={doc.file_url || doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ background: 'rgba(6, 182, 212, 0.1)', color: 'var(--accent-cyan)', padding: '6px 12px', borderRadius: '6px', textDecoration: 'none', fontWeight: 600, fontSize: '12px' }}
                        >
                          View / Download
                        </a>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Stored in Vault</span>
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