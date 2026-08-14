import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import { MassUploadModal } from './MassUploadModal'

// Document Types from Mowatek Codebook (Section 1.0)
const DOC_TYPES = [
  { code: 'RFQ', name: 'Request for Quotation' },
  { code: 'QTN', name: 'Quotation' },
  { code: 'TND', name: 'Tender' },
  { code: 'ITQ', name: 'Invitation to Quote' },
  { code: 'ITB', name: 'Invitation to Bid' },
  { code: 'BOQ', name: 'Bill of Quantities' },
  { code: 'PO', name: 'Purchase Order' },
  { code: 'PR', name: 'Purchase Requisition' },
  { code: 'INV', name: 'Invoice' },
  { code: 'PRJ', name: 'Project Record' },
  { code: 'SOW', name: 'Scope of Work' },
  { code: 'SPEC', name: 'Specification' },
  { code: 'DAT', name: 'Datasheet' },
  { code: 'DRW', name: 'Drawing' },
  { code: 'CAL', name: 'Calculation' },
  { code: 'MTO', name: 'Material Take-Off' },
  { code: 'MTR', name: 'Material Test Report' },
  { code: 'TP', name: 'Technical Proposal' },
  { code: 'CP', name: 'Commercial Proposal' },
  { code: 'PROP', name: 'General Proposal' },
  { code: 'CON', name: 'Contract' },
  { code: 'AGR', name: 'Agreement' },
  { code: 'NDA', name: 'Non-Disclosure Agreement' },
  { code: 'LTR', name: 'Letter' },
  { code: 'RPT', name: 'Report' },
  { code: 'MOM', name: 'Minutes of Meeting' },
  { code: 'MIN', name: 'Meeting Minutes' },
  { code: 'MVR', name: 'Visit / Meeting Report' },
  { code: 'MEM', name: 'Memorandum' },
  { code: 'HSE', name: 'Health, Safety & Environment' },
  { code: 'QA', name: 'Quality Assurance' },
  { code: 'QC', name: 'Quality Control' },
  { code: 'NCR', name: 'Non-Conformance Report' },
  { code: 'CERT', name: 'Certificate' },
  { code: 'MS', name: 'Method Statement' },
  { code: 'ITP', name: 'Inspection & Test Plan' }
]

// Department Codes (Section 2.0)
const DEPARTMENTS = [
  { code: 'ENG', name: 'Engineering' },
  { code: 'PRC', name: 'Procurement' },
  { code: 'OPS', name: 'Operations' },
  { code: 'HSE', name: 'Health, Safety & Environment' },
  { code: 'QA', name: 'Quality Assurance' },
  { code: 'BD', name: 'Business Development' },
  { code: 'SAL', name: 'Sales' },
  { code: 'FIN', name: 'Finance' },
  { code: 'HR', name: 'Human Resources' },
  { code: 'ADM', name: 'Administration' },
  { code: 'IT', name: 'Information Technology' },
  { code: 'MGT', name: 'Management' }
]

const STATUS_CODES = [
  { code: 'DRF', label: 'Draft' },
  { code: 'REV', label: 'Under Review' },
  { code: 'PAP', label: 'Pending Approval' },
  { code: 'APP', label: 'Approved' },
  { code: 'ISS', label: 'Issued' }
]

const ACCESS_CODES = [
  { code: 'INT', label: 'Internal (All Staff)' },
  { code: 'PUB', label: 'Public Release' },
  { code: 'DEP', label: 'Department Restricted' },
  { code: 'RES', label: 'Restricted Project Team' },
  { code: 'CON', label: 'Confidential (Leads)' },
  { code: 'STR', label: 'Strictly Confidential' }
]

export function DocumentsPage() {
  const [documents, setDocuments] = useState([])
  const [clients, setClients] = useState([])
  const [title, setTitle] = useState('')
  const [docType, setDocType] = useState('RFQ')
  const [department, setDepartment] = useState('ENG')
  const [client, setClient] = useState('')
  const [project, setProject] = useState('')
  const [status, setStatus] = useState('DRF')
  const [access, setAccess] = useState('INT')
  const [selectedFile, setSelectedFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)

  // Mass Upload Modal State
  const [isMassUploadOpen, setIsMassUploadOpen] = useState(false)

  const currentYear = new Date().getFullYear()

  // Fetch documents and clients from Supabase on load
  const fetchData = async () => {
    try {
      const [docRes, clientRes] = await Promise.all([
        supabase.from('documents').select('*').order('created_at', { ascending: false }),
        supabase.from('clients').select('*').order('client_name', { ascending: true })
      ])

      if (docRes.error) throw docRes.error

      const formatted = (docRes.data || []).map(doc => ({
        id: doc.id,
        docNumber: doc.doc_number,
        docType: doc.doc_type,
        year: doc.year,
        title: doc.title,
        department: doc.department,
        client: doc.client,
        project: doc.project,
        version: doc.version,
        status: doc.status,
        access: doc.access,
        fileName: doc.file_name,
        fileSize: doc.file_size,
        fileUrl: doc.file_url,
        uploadedAt: new Date(doc.created_at).toLocaleDateString()
      }))
      setDocuments(formatted)

      if (!clientRes.error) {
        setClients(clientRes.data || [])
      }
    } catch (err) {
      console.error('Error fetching data:', err.message)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const generatedDocId = useMemo(() => {
    const matchingDocs = documents.filter((doc) => doc.docType === docType && doc.year === currentYear)
    const nextSeq = String(matchingDocs.length + 1).padStart(3, '0')
    return `MWT-${docType}-${currentYear}-${nextSeq}`
  }, [docType, currentYear, documents])

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setSelectedFile(file)
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ''))
      }
    }
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!selectedFile) return

    setIsUploading(true)

    try {
      // 1. Upload file to Supabase Storage bucket 'mowatek-documents'
      const fileExt = selectedFile.name.split('.').pop()
      const fileNameClean = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`
      const filePath = `${department}/${fileNameClean}`

      const { error: uploadError } = await supabase.storage
        .from('mowatek-documents')
        .upload(filePath, selectedFile)

      if (uploadError) throw uploadError

      // Get Public URL
      const { data: publicUrlData } = supabase.storage
        .from('mowatek-documents')
        .getPublicUrl(filePath)

      const fileUrl = publicUrlData?.publicUrl || ''

      // 2. Insert metadata into 'documents' table
      const payload = {
        doc_number: generatedDocId,
        doc_type: docType,
        year: currentYear,
        title: title || selectedFile.name,
        department,
        client: client.trim() || 'Internal / N/A',
        project: project.trim() || 'General Operations',
        version: 'V01',
        status,
        access,
        file_name: selectedFile.name,
        file_size: (selectedFile.size / (1024 * 1024)).toFixed(2) + ' MB',
        file_url: fileUrl
      }

      const { data, error: dbError } = await supabase
        .from('documents')
        .insert([payload])
        .select()

      if (dbError) throw dbError

      await fetchData()

      // Reset form
      setTitle('')
      setClient('')
      setProject('')
      setSelectedFile(null)
      e.target.reset()
    } catch (err) {
      console.error('Upload failed:', err.message)
      alert('Failed to upload document: ' + err.message)
    } finally {
      setIsUploading(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id)

      if (error) throw error

      setDocuments(documents.filter((doc) => doc.id !== id))
    } catch (err) {
      console.error('Delete failed:', err.message)
      alert('Failed to delete document record: ' + err.message)
    }
  }

  return (
    <div>
      <div className="page-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <span className="page-eyebrow">MWT-SOP-2026-001 COMPLIANT</span>
          <h1>Controlled Document Vault</h1>
          <p>Enterprise document registration and metadata tracking.</p>
        </div>

        {/* Mass Upload Action Button */}
        <button 
          onClick={() => setIsMassUploadOpen(true)}
          style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(6, 182, 212, 0.3)' }}
        >
          ⚡ Mass Upload Past Docs
        </button>
      </div>

      <div className="content-card" style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '16px', marginBottom: '16px', color: '#fff' }}>
          Register Controlled Document
        </h3>
        
        <form onSubmit={handleUpload} style={{ display: 'grid', gap: '16px', maxWidth: '800px' }}>
          <div style={{
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid var(--accent-blue)',
            borderRadius: '8px',
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
              AUTO-ASSIGNED DOCUMENT ID
            </span>
            <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent-cyan)', letterSpacing: '1px' }}>
              {generatedDocId}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Document Type
              </label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: '#0f172a', color: '#fff' }}
              >
                {DOC_TYPES.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.code} — {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: '#0f172a', color: '#fff' }}
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.code} — {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Document Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Mechanical Toolbox Procurement Tender"
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', color: '#fff' }}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Client / Organization
              </label>
              <input
                type="text"
                value={client}
                onChange={(e) => setClient(e.target.value)}
                placeholder="e.g. Heritage Energy (HEOSL)"
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', color: '#fff' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Project Name
              </label>
              <input
                type="text"
                value={project}
                onChange={(e) => setProject(e.target.value)}
                placeholder="e.g. Mechanical Toolbox"
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', color: '#fff' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Initial Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: '#0f172a', color: '#fff' }}
              >
                {STATUS_CODES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.code} ({s.label})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Access Level
              </label>
              <select
                value={access}
                onChange={(e) => setAccess(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: '#0f172a', color: '#fff' }}
              >
                {ACCESS_CODES.map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.code} — {a.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Attach File (Single)
              </label>
              <input
                type="file"
                onChange={handleFileChange}
                style={{ color: 'var(--text-muted)', fontSize: '12px' }}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={isUploading || !selectedFile}
            style={{ width: 'fit-content', marginTop: '8px' }}
          >
            {isUploading ? 'Registering Document...' : '📁 Register & Upload Document'}
          </button>
        </form>
      </div>

      <div className="content-card">
        <h3 style={{ fontSize: '16px', marginBottom: '16px', color: '#fff' }}>
          Controlled Document Master Register
        </h3>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Document ID</th>
                <th>Title / Project</th>
                <th>Dept</th>
                <th>Client</th>
                <th>Ver</th>
                <th>Status</th>
                <th>Access</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', color: '#94a3b8', padding: '24px' }}>
                    No controlled documents registered yet.
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc.id}>
                    <td>
                      <strong style={{ color: 'var(--accent-cyan)' }}>{doc.docNumber}</strong>
                    </td>
                    <td>
                      <div><strong>{doc.title}</strong></div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{doc.project}</div>
                    </td>
                    <td>{doc.department}</td>
                    <td>{doc.client}</td>
                    <td><span style={{ color: '#f59e0b', fontWeight: 600 }}>{doc.version}</span></td>
                    <td>
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        background: doc.status === 'APP' || doc.status === 'ISS' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                        color: doc.status === 'APP' || doc.status === 'ISS' ? '#10b981' : '#f59e0b'
                      }}>
                        {doc.status}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{doc.access}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {doc.fileUrl && (
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-primary"
                            style={{ padding: '4px 8px', fontSize: '12px', textDecoration: 'none' }}
                            title="Download Document"
                          >
                            ⬇️
                          </a>
                        )}
                        <button
                          onClick={() => handleDelete(doc.id)}
                          className="btn-signout"
                          style={{ margin: 0, padding: '4px 8px', width: 'auto' }}
                          title="Delete Record"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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

export default DocumentsPage