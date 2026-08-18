import { useState } from 'react'
import { supabase } from '../supabaseClient'

export function MassUploadModal({ clients, onClose, onUploadComplete }) {
  const [selectedFiles, setSelectedFiles] = useState([])
  const [targetClient, setTargetClient] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [defaultCategory, setDefaultCategory] = useState('Technical Report')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')

  // Map UI category names to Mowatek Master Codebook document type codes
  const categoryToTypeCode = (category) => {
    const mapping = {
      'Quotation': 'QTN',
      'Invoice': 'INV',
      'Technical Report': 'RPT',
      'Tender Spec': 'SPEC',
      'Contract': 'CON',
      'Certificate': 'CERT',
      'Request for Quotation': 'RFQ',
      'Tender': 'TND',
      'Invitation to Quote': 'ITQ',
      'Invitation to Bid': 'ITB',
      'Bill of Quantities': 'BOQ',
      'Purchase Order': 'PO',
      'Purchase Requisition': 'PR',
      'Scope of Work': 'SOW',
      'Specification': 'SPEC',
      'Datasheet': 'DAT',
      'Drawing': 'DRW',
      'Calculation': 'CAL',
      'Material Take-Off': 'MTO',
      'Material Test Report': 'MTR',
      'Technical Proposal': 'TP',
      'Commercial Proposal': 'CP',
      'General Proposal': 'PROP',
      'Report': 'RPT',
      'Minutes of Meeting': 'MOM',
      'Meeting Minutes': 'MIN',
      'Meeting/Visit Report': 'MVR',
      'Agreement': 'AGR',
      'Non-Disclosure Agreement': 'NDA',
      'Letter': 'LTR',
      'Memorandum': 'MEM',
      'Health, Safety & Env.': 'HSE',
      'Quality Assurance': 'QA',
      'Quality Control': 'QC',
      'Non-Conformance Report': 'NCR',
      'Method Statement': 'MS',
      'Inspection & Test Plan': 'ITP'
    }
    return mapping[category] || 'RPT'
  }

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files)
    processFiles(files)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    processFiles(files)
  }

  const processFiles = (files) => {
    const formattedFiles = files.map((file) => {
      const cleanName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name
      const formattedTitle = cleanName.replace(/[_]/g, ' ')

      return {
        id: Math.random().toString(36).substring(2),
        file: file,
        title: formattedTitle,
        category: defaultCategory,
        size: `${(file.size / 1024 / 1024).toFixed(2)} MB`
      }
    })
    setSelectedFiles(prev => [...prev, ...formattedFiles])
  }

  const updateFileField = (id, field, value) => {
    setSelectedFiles(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item))
  }

  const removeFile = (id) => {
    setSelectedFiles(prev => prev.filter(item => item.id !== id))
  }

  const getNextSequenceNumber = async (typeCode, year) => {
    const prefix = `MWT-${typeCode}-${year}-`
    const { data, error } = await supabase
      .from('documents')
      .select('doc_number, document_code')

    if (error) {
      console.error('Error fetching existing document numbers:', error)
      return Math.floor(100 + Math.random() * 900)
    }

    let maxSeq = 0
    if (data && data.length > 0) {
      data.forEach(row => {
        const val = row.doc_number || row.document_code
        if (val && val.startsWith(prefix)) {
          const parts = val.split('-')
          const seqStr = parts[parts.length - 1]
          const seqNum = parseInt(seqStr, 10)
          if (!isNaN(seqNum) && seqNum > maxSeq) {
            maxSeq = seqNum
          }
        }
      })
    }
    return maxSeq + 1
  }

  const executeMassUpload = async () => {
    const destination = isInternal ? 'Internal' : targetClient
    if (!destination || selectedFiles.length === 0) {
      alert('Please select a destination folder and at least one file.')
      return
    }

    setUploading(true)
    let successCount = 0

    try {
      const currentYear = new Date().getFullYear()
      const batchCounters = {}

      for (let i = 0; i < selectedFiles.length; i++) {
        const item = selectedFiles[i]
        setUploadProgress(`Processing file ${i + 1} of ${selectedFiles.length}: ${item.title}`)

        const typeCode = categoryToTypeCode(item.category)
        
        if (!batchCounters[typeCode]) {
          const nextDbSeq = await getNextSequenceNumber(typeCode, currentYear)
          batchCounters[typeCode] = nextDbSeq
        } else {
          batchCounters[typeCode] += 1
        }

        const sequentialId = String(batchCounters[typeCode]).padStart(3, '0')
        const docNumber = `MWT-${typeCode}-${currentYear}-${sequentialId}`

        const fileExt = item.file.name.split('.').pop()
        const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`
        const folderSlug = isInternal ? 'internal_documents' : destination.toLowerCase().replace(/\s+/g, '_')
        const filePath = `${folderSlug}/${uniqueFileName}`

        const { error: storageError } = await supabase.storage
          .from('mowatek-documents')
          .upload(filePath, item.file)

        if (storageError) throw storageError

        const { data: publicURLData } = supabase.storage
          .from('mowatek-documents')
          .getPublicUrl(filePath)

        // Insert metadata satisfying all identified unique sequence and code constraints
        const { error: dbError } = await supabase.from('documents').insert([
          {
            doc_number: docNumber,
            document_code: docNumber,
            serial_number: sequentialId,
            year: currentYear,
            doc_type: typeCode,
            title: item.title,
            client_name: destination,
            category: item.category,
            file_url: publicURLData.publicUrl,
            file_path: filePath,
            file_size: item.size,
            uploaded_by: 'Staff (Batch Upload)'
          }
        ])

        if (dbError) throw dbError
        successCount++
      }

      alert(`Successfully uploaded ${successCount} documents to the vault!`)
      onUploadComplete()
      onClose()
    } catch (err) {
      console.error('Mass upload error:', err.message)
      alert(`Upload interrupted: ${err.message}`)
    } finally {
      setUploading(false)
      setUploadProgress('')
    }
  }

  return (
    <div style={{ position: 'fixed', inset: '0', background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
      <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px', width: '100%', maxWidth: '900px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', color: '#fff' }}>
        
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>⚡ Mass Document Ingestion & Batch Upload</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Target Vault / Folder *</label>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} />
                  Internal Documents
                </label>
              </div>
              {!isInternal && (
                <select 
                  value={targetClient} 
                  onChange={(e) => setTargetClient(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff' }}
                >
                  <option value="">-- Select Client Folder --</option>
                  {clients && clients.map(c => <option key={c.id} value={c.client_name}>{c.client_name}</option>)}
                </select>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Default Category for Batch</label>
              <select 
                value={defaultCategory} 
                onChange={(e) => {
                  setDefaultCategory(e.target.value)
                  setSelectedFiles(prev => prev.map(f => ({ ...f, category: e.target.value })))
                }}
                style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff' }}
              >
                <option value="Quotation">Quotation</option>
                <option value="Invoice">Invoice</option>
                <option value="Technical Report">Technical Report</option>
                <option value="Tender Spec">Tender Spec</option>
                <option value="Contract">Contract</option>
                <option value="Certificate">Certificate</option>
                <option value="Request for Quotation">Request for Quotation</option>
                <option value="Tender">Tender</option>
                <option value="Invitation to Quote">Invitation to Quote</option>
                <option value="Invitation to Bid">Invitation to Bid</option>
                <option value="Bill of Quantities">Bill of Quantities</option>
                <option value="Purchase Order">Purchase Order</option>
                <option value="Purchase Requisition">Purchase Requisition</option>
                <option value="Scope of Work">Scope of Work</option>
                <option value="Specification">Specification</option>
                <option value="Datasheet">Datasheet</option>
                <option value="Drawing">Drawing</option>
                <option value="Calculation">Calculation</option>
                <option value="Material Take-Off">Material Take-Off</option>
                <option value="Material Test Report">Material Test Report</option>
                <option value="Technical Proposal">Technical Proposal</option>
                <option value="Commercial Proposal">Commercial Proposal</option>
                <option value="General Proposal">General Proposal</option>
                <option value="Report">Report</option>
                <option value="Minutes of Meeting">Minutes of Meeting</option>
                <option value="Meeting Minutes">Meeting Minutes</option>
                <option value="Meeting/Visit Report">Meeting/Visit Report</option>
                <option value="Agreement">Agreement</option>
                <option value="Non-Disclosure Agreement">Non-Disclosure Agreement</option>
                <option value="Letter">Letter</option>
                <option value="Memorandum">Memorandum</option>
                <option value="Health, Safety & Env.">Health, Safety & Env.</option>
                <option value="Quality Assurance">Quality Assurance</option>
                <option value="Quality Control">Quality Control</option>
                <option value="Non-Conformance Report">Non-Conformance Report</option>
                <option value="Method Statement">Method Statement</option>
                <option value="Inspection & Test Plan">Inspection & Test Plan</option>  
              </select>
            </div>
          </div>

          <div 
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            style={{ border: '2px dashed rgba(59, 130, 246, 0.4)', borderRadius: '12px', padding: '30px', textAlign: 'center', background: 'rgba(59, 130, 246, 0.03)' }}
          >
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>📂</div>
            <p style={{ fontWeight: '600', marginBottom: '4px' }}>Drag & drop multiple files here, or browse</p>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '16px' }}>Supports PDF, Word, Excel, Images, and CAD files</p>
            <input 
              type="file" 
              multiple 
              onChange={handleFileSelect} 
              style={{ display: 'none' }} 
              id="mass-file-input" 
            />
            <label htmlFor="mass-file-input" style={{ background: '#3b82f6', color: '#fff', padding: '10px 20px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '13px', display: 'inline-block' }}>
              Select Files from Computer
            </label>
          </div>

          {selectedFiles.length > 0 && (
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '10px', color: '#06b6d4' }}>
                Staged Files Ready for Ingestion ({selectedFiles.length})
              </h4>
              <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', overflowX: 'auto', maxHeight: '250px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <th style={{ padding: '10px' }}>Editable Document Title</th>
                      <th style={{ padding: '10px' }}>Category</th>
                      <th style={{ padding: '10px' }}>Size</th>
                      <th style={{ padding: '10px', textAlign: 'right' }}>Remove</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedFiles.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '8px' }}>
                          <input 
                            type="text" 
                            value={item.title} 
                            onChange={(e) => updateFileField(item.id, 'title', e.target.value)}
                            style={{ width: '100%', padding: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', color: '#fff', fontSize: '12px' }}
                          />
                        </td>
                        <td style={{ padding: '8px' }}>
                          <select 
                            value={item.category}
                            onChange={(e) => updateFileField(item.id, 'category', e.target.value)}
                            style={{ padding: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', color: '#fff', fontSize: '12px' }}
                          >
                            <option value="Quotation">Quotation</option>
                            <option value="Invoice">Invoice</option>
                            <option value="Technical Report">Technical Report</option>
                            <option value="Tender Spec">Tender Spec</option>
                            <option value="Contract">Contract</option>
                            <option value="Certificate">Certificate</option>
                            <option value="Request for Quotation">Request for Quotation</option>
                            <option value="Tender">Tender</option>
                            <option value="Invitation to Quote">Invitation to Quote</option>
                            <option value="Invitation to Bid">Invitation to Bid</option>
                            <option value="Bill of Quantities">Bill of Quantities</option>
                            <option value="Purchase Order">Purchase Order</option>
                            <option value="Purchase Requisition">Purchase Requisition</option>
                            <option value="Scope of Work">Scope of Work</option>
                            <option value="Specification">Specification</option>
                            <option value="Datasheet">Datasheet</option>
                            <option value="Drawing">Drawing</option>
                            <option value="Calculation">Calculation</option>
                            <option value="Material Take-Off">Material Take-Off</option>
                            <option value="Material Test Report">Material Test Report</option>
                            <option value="Technical Proposal">Technical Proposal</option>
                            <option value="Commercial Proposal">Commercial Proposal</option>
                            <option value="General Proposal">General Proposal</option>
                            <option value="Report">Report</option>
                            <option value="Minutes of Meeting">Minutes of Meeting</option>
                            <option value="Meeting Minutes">Meeting Minutes</option>
                            <option value="Meeting/Visit Report">Meeting/Visit Report</option>
                            <option value="Agreement">Agreement</option>
                            <option value="Non-Disclosure Agreement">Non-Disclosure Agreement</option>
                            <option value="Letter">Letter</option>
                            <option value="Memorandum">Memorandum</option>
                            <option value="Health, Safety & Env.">Health, Safety & Env.</option>
                            <option value="Quality Assurance">Quality Assurance</option>
                            <option value="Quality Control">Quality Control</option>
                            <option value="Non-Conformance Report">Non-Conformance Report</option>
                            <option value="Method Statement">Method Statement</option>
                            <option value="Inspection & Test Plan">Inspection & Test Plan</option>
                          </select>
                        </td>
                        <td style={{ padding: '8px', color: '#94a3b8' }}>{item.size}</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>
                          <button onClick={() => removeFile(item.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: '600' }}>Remove</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)' }}>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>{uploadProgress}</span>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={onClose} disabled={uploading} style={{ padding: '10px 16px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#94a3b8', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
            <button onClick={executeMassUpload} disabled={uploading || selectedFiles.length === 0} style={{ padding: '10px 20px', background: '#06b6d4', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: '700', cursor: 'pointer' }}>
              {uploading ? 'Processing Batch...' : `Upload All (${selectedFiles.length}) Files`}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}