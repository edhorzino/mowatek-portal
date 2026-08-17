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
  
  // Navigation views: 'recent', 'folders', 'search', 'upload', 'admin'
  const [activeTab, setActiveTab] = useState('recent')
  
  // Folder navigation state inside 'folders' view
  const [selectedFolderType, setSelectedFolderType] = useState(null) // 'INTERNAL' or 'CLIENTS'
  const [selectedClientFolder, setSelectedClientFolder] = useState(null) // e.g. 'Dangote', 'NOV'

  // Filter & Search states
  const [folderSearchQuery, setFolderSearchQuery] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterClient, setFilterClient] = useState('ALL')
  const [filterCategory, setFilterCategory] = useState('ALL')

  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Mass Upload Modal State
  const [isMassUploadOpen, setIsMassUploadOpen] = useState(false)

  // Upload Form & Codebook State
  const [title, setTitle] = useState('')
  const [selectedClient, setSelectedClient] = useState('')
  const [newClientInput, setNewClientInput] = useState('')
  const [isAddingNewClient, setIsAddingNewClient] = useState(false)
  const [isInternal, setIsInternal] = useState(false)
  const [category, setCategory] = useState('TECH') // Category serves as Document Type code for MWT
  const [documentYear, setDocumentYear] = useState(new Date().getFullYear().toString())
  const [serialNumber, setSerialNumber] = useState('001')
  const [generatedCode, setGeneratedCode] = useState('')
  const [file, setFile] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  // Automatically compute and generate document code: MWT-[DocType]-[Year]-[Serial]
  useEffect(() => {
    const fetchNextSerialAndGenerateCode = async () => {
      try {
        const prefix = `MWT-${category}-${documentYear}`
        
        // Query database to get the latest sequence serial number for this type and year
        const { data, error } = await supabase
          .from('documents')
          .select('serial_number')
          .ilike('document_code', `${prefix}%`)
          .order('created_at', { ascending: false })
          .limit(1)

        let nextNum = 1
        if (data && data.length > 0 && data[0].serial_number) {
          const parsed = parseInt(data[0].serial_number, 10)
          if (!isNaN(parsed)) {
            nextNum = parsed + 1
          }
        }

        const paddedSerial = String(nextNum).padStart(3, '0')
        setSerialNumber(paddedSerial)
        setGeneratedCode(`${prefix}-${paddedSerial}`)
      } catch (err) {
        console.error('Error fetching serial number sequence:', err)
        const fallbackSerial = '001'
        setSerialNumber(fallbackSerial)
        setGeneratedCode(`MWT-${category}-${documentYear}-${fallbackSerial}`)
      }
    }

    fetchNextSerialAndGenerateCode()
  }, [category, documentYear])

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
      const fileName = `${generatedCode}_${Date.now()}.${fileExt}`
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

      // 2. Save metadata & MWT codebook identifiers to database table
      const { error: dbError } = await supabase.from('documents').insert([
        {
          document_code: generatedCode,
          title,
          client_name: targetClient,
          category,
          year: documentYear,
          serial_number: serialNumber,
          file_url: publicURLData.publicUrl,
          file_path: filePath,
          file_size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
          uploaded_by: user?.email || 'Employee'
        }
      ])

      if (dbError) throw dbError

      alert(`Document successfully registered and uploaded under code: ${generatedCode}`)
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
                         doc.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (doc.document_code && doc.document_code.toLowerCase().includes(searchQuery.toLowerCase()))
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
      doc.category.toLowerCase().includes(folderSearchQuery.toLowerCase()) ||
      (doc.document_code && doc.document_code.toLowerCase().includes(folderSearchQuery.toLowerCase()))
    )
  }

  const tabButtonStyle = (isActive, isSpecial = false) => ({
    background: isActive 
      ? (isSpecial ? '#06b6d4' : '#3b82f6') 
      : 'rgba(255,255,255,0.03)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.08)',
    padding: '10px 18px',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'all 0.2s ease'
  })

  return (
    <div style={{ padding: '32px', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif', maxWidth: '1300px', margin: '0 auto', background: '#090d16', minHeight: '100vh', boxSizing: 'border-box' }}>
      
      {/* Top Navigation Header & Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '750' }}>📁 Document Vault & MWT Codebook Directory</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>Manage, categorize, and search through controlled company records with automated MWT coding.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => setIsMassUploadOpen(true)}
            style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: '650', cursor: 'pointer', fontSize: '13px', boxShadow: '0 4px 12px rgba(6, 182, 212, 0.2)' }}
          >
            ⚡ Mass Upload Past Docs
          </button>
        </div>
      </div>

      {/* Navigation Sub-Bar */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '28px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <button 
          onClick={() => { setActiveTab('recent'); setSelectedFolderType(null); }}
          style={tabButtonStyle(activeTab === 'recent')}
        >
          Recent Uploads (Last 10)
        </button>
        <button 
          onClick={() => { setActiveTab('folders'); setSelectedFolderType(null); }}
          style={tabButtonStyle(activeTab === 'folders')}
        >
          📁 Master Folders View
        </button>
        <button 
          onClick={() => { setActiveTab('search'); setSelectedFolderType(null); }}
          style={tabButtonStyle(activeTab === 'search')}
        >
          🔍 Advanced Search & Filters
        </button>
        <button 
          onClick={() => { setActiveTab('upload'); setSelectedFolderType(null); }}
          style={tabButtonStyle(activeTab === 'upload', true)}
        >
          + Register & Upload Document
        </button>
        <button 
          onClick={() => { setActiveTab('admin'); setSelectedFolderType(null); }}
          style={tabButtonStyle(activeTab === 'admin')}
        >
          ⚙️ Admin Panel
        </button>
      </div>

      {/* VIEW 1: RECENT 10 DOCUMENTS */}
      {activeTab === 'recent' && (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>Recent Document Additions</h3>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '2px 0 0 0' }}>Showing the last 10 ingested files.</p>
          </div>
          <DocumentTable docs={recentDocuments} loading={loading} />
        </div>
      )}

      {/* VIEW 2: MASTER FOLDERS (Internal vs Client Folders) */}
      {activeTab === 'folders' && (
        <div>
          {!selectedFolderType ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>Master Document Vault Folders</h3>
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: '2px 0 0 0' }}>Select a directory or search across all repositories.</p>
                </div>
                {/* Global Search Bar inside Folders View */}
                <input 
                  type="text"
                  value={folderSearchQuery}
                  onChange={(e) => setFolderSearchQuery(e.target.value)}
                  placeholder="🔍 Search any document across all folders..."
                  style={{ padding: '10px 16px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', width: '320px', fontSize: '13px', outline: 'none' }}
                />
              </div>

              {folderSearchQuery.trim() ? (
                <div>
                  <p style={{ color: '#06b6d4', fontSize: '13px', marginBottom: '12px' }}>Search results for "{folderSearchQuery}":</p>
                  <DocumentTable docs={getFolderFilteredDocs(documents)} loading={loading} />
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginTop: '16px' }}>
                  <div 
                    onClick={() => setSelectedFolderType('INTERNAL')}
                    style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255,255,255,0.08)', padding: '24px', borderRadius: '12px', cursor: 'pointer', transition: 'border-color 0.2s' }}
                  >
                    <div style={{ fontSize: '36px', marginBottom: '12px' }}>📁</div>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', margin: '0 0 4px 0' }}>Internal Documents</h3>
                    <p style={{ color: '#94a3b8', fontSize: '12px', margin: 0 }}>
                      {documents.filter(d => d.client_name === 'Internal').length} items • Company-wide records
                    </p>
                  </div>
                  <div 
                    onClick={() => setSelectedFolderType('CLIENTS')}
                    style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255,255,255,0.08)', padding: '24px', borderRadius: '12px', cursor: 'pointer', transition: 'border-color 0.2s' }}
                  >
                    <div style={{ fontSize: '36px', marginBottom: '12px' }}>🗂️</div>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', margin: '0 0 4px 0' }}>Client Folders</h3>
                    <p style={{ color: '#94a3b8', fontSize: '12px', margin: 0 }}>
                      {clients.length} active client profiles & vaults
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : selectedFolderType === 'INTERNAL' ? (
            <div>
              <button onClick={() => setSelectedFolderType(null)} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', marginBottom: '16px', fontWeight: '600', fontSize: '13px', padding: 0 }}>← Back to Folders</button>
              <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>📁 Internal Documents Directory</h3>
              <DocumentTable docs={getFolderFilteredDocs(documents.filter(d => d.client_name === 'Internal'))} loading={loading} />
            </div>
          ) : (
            <div>
              <button onClick={() => { setSelectedFolderType(null); setSelectedClientFolder(null); }} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', marginBottom: '16px', fontWeight: '600', fontSize: '13px', padding: 0 }}>← Back to Folders</button>
              <ClientFoldersView />
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: ADMIN ACCESS CONTROL */}
      {activeTab === 'admin' && <AdminPanel />}

      {/* VIEW 4: ADVANCED SEARCH & FILTERS */}
      {activeTab === 'search' && (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>Advanced Search & Filters</h3>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '2px 0 0 0' }}>Filter documents precisely by keyword, MWT code, client vault, or category.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px 220px', gap: '16px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '20px' }}>
            <input 
              type="text" 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              placeholder="🔍 Search by title, MWT code, or keyword..." 
              style={{ padding: '12px 16px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none' }}
            />
            <select 
              value={filterClient} 
              onChange={(e) => setFilterClient(e.target.value)}
              style={{ padding: '12px 16px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none' }}
            >
              <option value="ALL">All Clients / Internal</option>
              <option value="Internal">Internal</option>
              {clients.map((c) => <option key={c.id} value={c.client_name}>{c.client_name}</option>)}
            </select>
            <select 
              value={filterCategory} 
              onChange={(e) => setFilterCategory(e.target.value)}
              style={{ padding: '12px 16px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none' }}
            >
              <option value="ALL">All Document Types</option>
              <option value="TECH">TECH - Technical Specifications</option>
              <option value="COMM">COMM - Commercial & Tenders</option>
              <option value="CORP">CORP - Corporate Records</option>
              <option value="DRW">DRW - Engineering Drawings</option>
              <option value="RPT">RPT - Reports & Audits</option>
            </select>
          </div>
          <DocumentTable docs={searchFilteredDocs} loading={loading} />
        </div>
      )}

      {/* VIEW 5: REGISTER & UPLOAD FORM WITH AUTOMATED MWT CODEBOOK */}
      {activeTab === 'upload' && (
        <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '28px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', maxWidth: '650px', margin: '0 auto' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '6px' }}>Register & Upload New Document</h3>
          <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '20px' }}>Automatically generates the official MWT structured file code upon classification.</p>
          
          <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Document Title / Project Description</label>
              <input 
                type="text" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                placeholder="e.g., Mechanical Toolbox Procurement Tender" 
                required
                style={{ width: '100%', padding: '12px 14px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
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
                        style={{ width: '100%', padding: '12px 14px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none' }}
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
                        placeholder="Enter new client name (e.g. Heritage Energy)..." 
                        style={{ width: '100%', padding: '12px 14px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none' }}
                      />
                      <button 
                        type="button" 
                        onClick={handleCreateClient}
                        style={{ padding: '0 16px', background: '#06b6d4', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}
                      >
                        Save
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setIsAddingNewClient(false)}
                        style={{ padding: '0 12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#94a3b8', cursor: 'pointer', fontSize: '13px' }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Document Type Code</label>
                <select 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)}
                  style={{ width: '100%', padding: '12px 14px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none' }}
                >
                  <option value="TECH">TECH - Technical Specifications</option>
                  <option value="COMM">COMM - Commercial & Tenders</option>
                  <option value="CORP">CORP - Corporate Records</option>
                  <option value="DRW">DRW - Engineering Drawings</option>
                  <option value="RPT">RPT - Reports & Audits</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Year</label>
                <input 
                  type="text" 
                  value={documentYear} 
                  onChange={(e) => setDocumentYear(e.target.value)} 
                  maxLength={4}
                  required
                  style={{ width: '100%', padding: '12px 14px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Generated Code Preview Box */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Generated MWT Document Code (Auto-Sequenced)</label>
              <div style={{ width: '100%', background: 'rgba(6, 182, 212, 0.08)', border: '1px solid rgba(6, 182, 212, 0.4)', borderRadius: '8px', padding: '12px 14px', fontFamily: 'monospace', color: '#06b6d4', fontWeight: 'bold', fontSize: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box' }}>
                <span>{generatedCode}</span>
                <span style={{ fontSize: '11px', background: 'rgba(6, 182, 212, 0.2)', padding: '2px 8px', borderRadius: '4px' }}>Serial: {serialNumber}</span>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Select File</label>
              <input type="file" onChange={(e) => setFile(e.target.files[0])} required style={{ width: '100%', color: '#94a3b8', fontSize: '13px', padding: '8px 0' }} />
            </div>

            <button type="submit" disabled={uploading} style={{ background: '#3b82f6', border: 'none', color: '#fff', padding: '12px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', marginTop: '8px', fontSize: '14px' }}>
              {uploading ? 'Registering Code & Uploading...' : 'Register & Upload Document'}
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

// Reusable Table Subcomponent with Modern Styling & MWT Code display
function DocumentTable({ docs, loading }) {
  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>Loading vault documents...</div>
  if (docs.length === 0) return <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>No documents found matching your criteria.</div>

  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', overflowX: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
        <thead>
          <tr style={{ background: 'rgba(255,255,255,0.04)', color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <th style={{ padding: '14px 16px' }}>MWT Code</th>
            <th style={{ padding: '14px 16px' }}>Document Title / Project</th>
            <th style={{ padding: '14px 16px' }}>Client / Vault</th>
            <th style={{ padding: '14px 16px' }}>Type</th>
            <th style={{ padding: '14px 16px' }}>Uploaded Date</th>
            <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {docs.map((doc) => (
            <tr key={doc.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <td style={{ padding: '14px 16px', fontFamily: 'monospace', color: '#06b6d4', fontWeight: '600' }}>{doc.document_code || '—'}</td>
              <td style={{ padding: '14px 16px', fontWeight: '600', color: '#fff' }}>{doc.title}</td>
              <td style={{ padding: '16px', color: '#38bdf8', fontWeight: '500' }}>📁 {doc.client_name}</td>
              <td style={{ padding: '14px 16px' }}>
                <span style={{ padding: '4px 10px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>
                  {doc.category || 'General'}
                </span>
              </td>
              <td style={{ padding: '14px 16px', color: '#94a3b8' }}>
                {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : '—'}
              </td>
              <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                <a 
                  href={doc.file_url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '6px', textDecoration: 'none', fontWeight: '600', fontSize: '12px' }}
                >
                  View / Download
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}