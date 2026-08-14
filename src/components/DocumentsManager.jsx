import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { ClientFoldersView } from './ClientFoldersView'
import { AdminPanel } from './AdminPanel'
import { MassUploadModal } from './MassUploadModal'

export function DocumentsManager() {
  const { user } = useAuth()
  const [documents, setDocuments] = useState([])
  const [clients, setClients] = useState([])
  
  // Navigation views: 'recent', 'folders', 'search', 'upload'
  const [activeTab, setActiveTab] = useState('recent')
  
  // Folder navigation state inside 'folders' view
  const [selectedFolderType, setSelectedFolderType] = useState(null) // 'INTERNAL' or 'CLIENTS'
  const [selectedClientFolder, setSelectedClientFolder] = useState(null) // e.g. 'Dangote', 'NOV'

  // Filter & Search states (Global search added to folders and search tab)
  const [folderSearchQuery, setFolderSearchQuery] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterClient, setFilterClient] = useState('ALL')
  const [filterCategory, setFilterCategory] = useState('ALL')

  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Mass Upload Modal State
  const [isMassUploadOpen, setIsMassUploadOpen] = useState(false)

  // Form State
  const [title, setTitle] = useState('')
  const [selectedClient, setSelectedClient] = useState('')
  const [newClientInput, setNewClientInput] = useState('')
  const [isAddingNewClient, setIsAddingNewClient] = useState(false)
  const [isInternal, setIsInternal] = useState(false)
  const [category, setCategory] = useState('Quotation')
  const [file, setFile] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const [docRes, clientRes] = await Promise.all([
      supabase.from('documents').select('*').order('created_at', { ascending: false }),
      supabase.from('clients').select('*').order('client_name', { ascending: true })
    ])

    if (docRes.error) {
      console.error('Error fetching documents:', docRes.error.message)
    } else {
      setDocuments(docRes.data || [])
    }

    if (clientRes.error) {
      console.error('Error fetching clients:', clientRes.error.message)
    } else {
      setClients(clientRes.data || [])
    }
    setLoading(false)
  }

  // Handle on-the-fly client creation from the upload form
  const handleCreateClient = async () => {
    if (!newClientInput.trim()) return
    const clientName = newClientInput.trim()

    const { error } = await supabase.from('clients').insert([{ client_name: clientName }])
    if (error) {
      alert('Error creating client: ' + error.message)
    } else {
      await fetchData()
      setSelectedClient(clientName)
      setNewClientInput('')
      setIsAddingNewClient(false)
    }
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    const targetClient = isInternal ? 'Internal' : selectedClient
    if (!file || !title || (!targetClient && !isInternal)) {
      alert('Please fill in all required fields and select a file.')
      return
    }

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`
      const folderSlug = isInternal ? 'internal_documents' : targetClient.toLowerCase().replace(/\s+/g, '_')
      const filePath = `${folderSlug}/${fileName}`

      // 1. Upload to Supabase storage
      const { error: storageError } = await supabase.storage
        .from('mowatek-documents')
        .upload(filePath, file)

      if (storageError) throw storageError

      const { data: publicURLData } = supabase.storage
        .from('mowatek-documents')
        .getPublicUrl(filePath)

      // 2. Save metadata to database table
      const { error: dbError } = await supabase.from('documents').insert([
        {
          title,
          client_name: targetClient,
          category,
          file_url: publicURLData.publicUrl,
          file_path: filePath,
          file_size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
          uploaded_by: user?.email || 'Employee'
        }
      ])

      if (dbError) throw dbError

      alert('Document uploaded successfully to database & storage!')
      setTitle('')
      setFile(null)
      setSelectedClient('')
      setIsInternal(false)
      fetchData()
      setActiveTab('recent')
    } catch (err) {
      console.error('Upload failed:', err.message)
      alert(`Upload failed: ${err.message}`)
    } finally {
      setUploading(false)
    }
  }

  // Last 10 documents added
  const recentDocuments = documents.slice(0, 10)

  // Filtered list for search view
  const searchFilteredDocs = documents.filter(doc => {
    const matchesQuery = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         doc.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.category.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesClient = filterClient === 'ALL' || doc.client_name === filterClient
    const matchesCategory = filterCategory === 'ALL' || doc.category === filterCategory
    return matchesQuery && matchesClient && matchesCategory
  })

  // Filtered documents inside Master / Client folders using global folder search query
  const getFolderFilteredDocs = (docsList) => {
    if (!folderSearchQuery.trim()) return docsList
    return docsList.filter(doc => 
      doc.title.toLowerCase().includes(folderSearchQuery.toLowerCase()) ||
      doc.client_name.toLowerCase().includes(folderSearchQuery.toLowerCase()) ||
      doc.category.toLowerCase().includes(folderSearchQuery.toLowerCase())
    )
  }

  return (
    <div style={{ padding: '32px', color: '#fff', fontFamily: 'system-ui, sans-serif', maxWidth: '1300px', margin: '0 auto' }}>
      
      {/* Top Navigation Tabs */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '28px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <button 
          onClick={() => { setActiveTab('recent'); setSelectedFolderType(null); }}
          style={{ background: activeTab === 'recent' ? '#3b82f6' : 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
        >
          Recent Uploads (Last 10)
        </button>
        <button 
          onClick={() => { setActiveTab('folders'); setSelectedFolderType(null); }}
          style={{ background: activeTab === 'folders' ? '#3b82f6' : 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
        >
          📁 Master Folders View
        </button>
        <button 
          onClick={() => { setActiveTab('search'); setSelectedFolderType(null); }}
          style={{ background: activeTab === 'search' ? '#3b82f6' : 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
        >
          🔍 Advanced Search & Filters
        </button>
        <button 
          onClick={() => { setActiveTab('upload'); setSelectedFolderType(null); }}
          style={{ background: activeTab === 'upload' ? '#06b6d4' : 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
        >
          + Register & Upload Document
        </button>

        {/* Mass Upload Action Button */}
        <button 
          onClick={() => setIsMassUploadOpen(true)}
          style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', marginLeft: 'auto' }}
        >
          ⚡ Mass Upload Past Docs
        </button>
      </div>

      {/* VIEW 1: RECENT 10 DOCUMENTS */}
      {activeTab === 'recent' && (
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px' }}>Recent Document Additions (Last 10)</h2>
          <DocumentTable docs={recentDocuments} loading={loading} />
        </div>
      )}

      {/* VIEW 2: MASTER FOLDERS (Internal vs Client Folders) */}
      {activeTab === 'folders' && (
        <div>
          {!selectedFolderType ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>Master Document Vault Folders</h2>
                {/* Global Search Bar inside Folders View */}
                <input 
                  type="text"
                  value={folderSearchQuery}
                  onChange={(e) => setFolderSearchQuery(e.target.value)}
                  placeholder="Search any document across all folders..."
                  style={{ padding: '10px 14px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', width: '300px' }}
                />
              </div>

              {folderSearchQuery.trim() ? (
                <div>
                  <p style={{ color: '#06b6d4', fontSize: '13px', marginBottom: '12px' }}>Search results for "{folderSearchQuery}":</p>
                  <DocumentTable docs={getFolderFilteredDocs(documents)} loading={loading} />
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginTop: '16px' }}>
                  <div 
                    onClick={() => setSelectedFolderType('INTERNAL')}
                    style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.1)', padding: '24px', borderRadius: '12px', cursor: 'pointer', textAlign: 'center' }}
                  >
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>📁</div>
                    <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Internal Documents</h3>
                    <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '6px' }}>
                      {documents.filter(d => d.client_name === 'Internal').length} items • Company-wide records
                    </p>
                  </div>
                  <div 
                    onClick={() => setSelectedFolderType('CLIENTS')}
                    style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.1)', padding: '24px', borderRadius: '12px', cursor: 'pointer', textAlign: 'center' }}
                  >
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>🗂️</div>
                    <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Client Folders</h3>
                    <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '6px' }}>
                      {clients.length} active client profiles & vaults
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : selectedFolderType === 'INTERNAL' ? (
            <div>
              <button onClick={() => setSelectedFolderType(null)} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', marginBottom: '16px', fontWeight: '600' }}>← Back to Folders</button>
              <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px' }}>📁 Internal Documents</h2>
              <DocumentTable docs={getFolderFilteredDocs(documents.filter(d => d.client_name === 'Internal'))} loading={loading} />
            </div>
          ) : (
            <div>
              <button onClick={() => { setSelectedFolderType(null); setSelectedClientFolder(null); }} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', marginBottom: '16px', fontWeight: '600' }}>← Back to Folders</button>
              <ClientFoldersView />
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: ADMIN ACCESS CONTROL */}
      {activeTab === 'admin' && <AdminPanel />}

      {/* VIEW 3 (Alternate): ADVANCED SEARCH & FILTERS */}
      {activeTab === 'search' && (
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px' }}>Advanced Search & Filters</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            <input 
              type="text" 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              placeholder="Search by title, project, or keyword..." 
              style={{ padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff' }}
            />
            <select 
              value={filterClient} 
              onChange={(e) => setFilterClient(e.target.value)}
              style={{ padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff' }}
            >
              <option value="ALL">All Clients / Internal</option>
              <option value="Internal">Internal</option>
              {clients.map((c) => <option key={c.id} value={c.client_name}>{c.client_name}</option>)}
            </select>
            <select 
              value={filterCategory} 
              onChange={(e) => setFilterCategory(e.target.value)}
              style={{ padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff' }}
            >
              <option value="ALL">All Document Types</option>
              <option value="Quotation">Quotation</option>
              <option value="Invoice">Invoice</option>
              <option value="Technical Report">Technical Report</option>
              <option value="Tender Spec">Tender Spec</option>
              <option value="Contract">Contract</option>
            </select>
          </div>
          <DocumentTable docs={searchFilteredDocs} loading={loading} />
        </div>
      )}

      {/* VIEW 4: UPLOAD FORM */}
      {activeTab === 'upload' && (
        <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '28px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', maxWidth: '600px', margin: '0 auto' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>Register & Upload New Document</h3>
          
          <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Document Title / Project</label>
              <input 
                type="text" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                placeholder="e.g., Pump Spare Quotation_v02" 
                required
                style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Destination Classification</label>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                  <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} />
                  Save to Internal Documents Folder
                </label>
              </div>

              {!isInternal && (
                <div>
                  {!isAddingNewClient ? (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <select 
                        value={selectedClient} 
                        onChange={(e) => {
                          if (e.target.value === '__add_new__') {
                            setIsAddingNewClient(true)
                          } else {
                            setSelectedClient(e.target.value)
                          }
                        }}
                        required={!isInternal}
                        style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff' }}
                      >
                        <option value="">-- Select Client Folder --</option>
                        {clients.map((c) => <option key={c.id} value={c.client_name}>{c.client_name}</option>)}
                        <option value="__add_new__" style={{ color: '#06b6d4', fontWeight: '600' }}>+ Add New Client Folder...</option>
                      </select>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input 
                        type="text" 
                        value={newClientInput} 
                        onChange={(e) => setNewClientInput(e.target.value)} 
                        placeholder="Enter new client name (e.g. Chevron)..." 
                        style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff' }}
                      />
                      <button 
                        type="button" 
                        onClick={handleCreateClient}
                        style={{ padding: '0 16px', background: '#06b6d4', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: '600', cursor: 'pointer' }}
                      >
                        Save
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setIsAddingNewClient(false)}
                        style={{ padding: '0 12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#94a3b8', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Document Type / Category</label>
              <select 
                value={category} 
                onChange={(e) => setCategory(e.target.value)}
                style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff' }}
              >
                <option value="Quotation">Quotation</option>
                <option value="Invoice">Invoice</option>
                <option value="Technical Report">Technical Report</option>
                <option value="Tender Spec">Tender Spec</option>
                <option value="Contract">Contract</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Select File</label>
              <input type="file" onChange={(e) => setFile(e.target.files[0])} required style={{ width: '100%', color: '#94a3b8', fontSize: '12px' }} />
            </div>

            <button type="submit" disabled={uploading} style={{ background: '#3b82f6', border: 'none', color: '#fff', padding: '12px', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', marginTop: '8px' }}>
              {uploading ? 'Uploading to Database & Storage...' : 'Upload Document'}
            </button>
          </form>
        </div>
      )}

      {/* Mass Upload Modal Popup */}
      {isMassUploadOpen && (
        <MassUploadModal 
          clients={clients} 
          onClose={() => setIsMassUploadOpen(false)} 
          onUploadComplete={() => {
            fetchData()
            setIsMassUploadOpen(false)
          }} 
        />
      )}

    </div>
  )
}

// Reusable Table Subcomponent matching Master Register Layout
function DocumentTable({ docs, loading }) {
  if (loading) return <p style={{ color: '#94a3b8', textAlign: 'center', padding: '40px' }}>Loading documents from database...</p>
  if (docs.length === 0) return <p style={{ color: '#94a3b8', textAlign: 'center', padding: '40px' }}>No documents found.</p>

  return (
    <div style={{ background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}>
            <th style={{ padding: '16px' }}>DOCUMENT TITLE / PROJECT</th>
            <th style={{ padding: '16px' }}>CLIENT / FOLDER</th>
            <th style={{ padding: '16px' }}>TYPE</th>
            <th style={{ padding: '16px' }}>UPLOADED DATE</th>
            <th style={{ padding: '16px' }}>UPLOADED BY</th>
            <th style={{ padding: '16px', textAlign: 'right' }}>ACTION</th>
          </tr>
        </thead>
        <tbody>
          {docs.map((doc) => (
            <tr key={doc.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <td style={{ padding: '16px', fontWeight: '600' }}>{doc.title}</td>
              <td style={{ padding: '16px', color: '#06b6d4', fontWeight: '500' }}>📁 {doc.client_name}</td>
              <td style={{ padding: '16px' }}>{doc.category}</td>
              <td style={{ padding: '16px', color: '#94a3b8' }}>{new Date(doc.created_at).toLocaleDateString()}</td>
              <td style={{ padding: '16px', color: '#94a3b8' }}>{doc.uploaded_by}</td>
              <td style={{ padding: '16px', textAlign: 'right' }}>
                <a 
                  href={doc.file_url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  style={{ background: 'rgba(59, 130, 246, 0.2)', border: '1px solid #3b82f6', color: '#60a5fa', padding: '6px 12px', borderRadius: '6px', textDecoration: 'none', fontWeight: '600', fontSize: '12px' }}
                >
                  Download / View
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}