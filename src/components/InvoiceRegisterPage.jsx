import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'

const statuses = ['ISSUED', 'PART_PAID', 'PAID', 'CANCELLED']
const money = (amount, currency = 'NGN') => amount == null ? '—' : new Intl.NumberFormat('en-NG', { style: 'currency', currency }).format(amount)
const slugify = (value) => String(value || 'client').toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')

export function InvoiceRegisterPage() {
  const { user } = useAuth()
  const [invoices, setInvoices] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ invoiceNumber: '', clientName: '', issuedDate: new Date().toISOString().slice(0, 10), amount: '', currency: 'NGN', status: 'ISSUED', notes: '' })
  const [file, setFile] = useState(null)

  const load = async () => {
    setLoading(true)
    const [invoiceResult, clientResult] = await Promise.all([
      supabase.from('company_invoices').select('*').order('issued_date', { ascending: false }),
      supabase.from('clients').select('*').order('client_name'),
    ])
    if (invoiceResult.error) alert(`Could not load invoices: ${invoiceResult.error.message}`)
    else setInvoices(invoiceResult.data || [])
    if (!clientResult.error) setClients(clientResult.data || [])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  const submit = async (event) => {
    event.preventDefault()
    if (!file || !form.invoiceNumber.trim() || !form.clientName) {
      alert('Invoice number, client, and invoice file are required.')
      return
    }
    setSaving(true)
    try {
      const extension = file.name.includes('.') ? file.name.split('.').pop() : 'file'
      const safeInvoice = slugify(form.invoiceNumber)
      const fileName = `${safeInvoice}_${Date.now()}.${extension}`
      const filePath = `documents/${user.id}/${slugify(form.clientName)}/invoices/${fileName}`
      const { error: uploadError } = await supabase.storage.from('mowatek-documents').upload(filePath, file, { upsert: false })
      if (uploadError) throw uploadError

      const { error: insertError } = await supabase.from('company_invoices').insert({
        invoice_number: form.invoiceNumber.trim(),
        client_name: form.clientName,
        issued_date: form.issuedDate,
        amount: form.amount === '' ? null : Number(form.amount),
        currency: form.currency,
        status: form.status,
        notes: form.notes.trim() || null,
        invoice_file_path: filePath,
        file_name: fileName,
        created_by: user.id,
      })
      if (insertError) throw insertError
      setForm({ invoiceNumber: '', clientName: '', issuedDate: new Date().toISOString().slice(0, 10), amount: '', currency: 'NGN', status: 'ISSUED', notes: '' })
      setFile(null)
      await load()
      alert('Invoice registered. It will enter the client vault automatically when marked as cashed.')
    } catch (error) {
      alert(`Could not register invoice: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const updateStatus = async (invoice, status) => {
    const { error } = await supabase.from('company_invoices').update({ status }).eq('id', invoice.id)
    if (error) alert(`Could not update status: ${error.message}`)
    else await load()
  }

  const cash = async (invoice) => {
    if (!window.confirm(`Mark invoice ${invoice.invoice_number} as cashed? It will be permanently registered in the ${invoice.client_name} vault.`)) return
    setSaving(true)
    const { error } = await supabase.rpc('cash_company_invoice', { p_invoice_id: invoice.id })
    setSaving(false)
    if (error) alert(`Could not cash invoice: ${error.message}`)
    else { await load(); alert('Invoice cashed and added to the client document vault with its next MWT sequence number.') }
  }

  const fieldStyle = { width: '100%', boxSizing: 'border-box', padding: '10px 12px', background: '#020617', color: '#fff', border: '1px solid rgba(255,255,255,.14)', borderRadius: 7 }

  return <div>
    <div className="page-heading"><div><span className="page-eyebrow">FINANCE CONTROL</span><h1>Invoice Register</h1><p>Track company invoices from issue through cashing. Cashed invoices are filed automatically in the relevant client vault.</p></div></div>
    <section className="content-card" style={{ marginBottom: 20 }}>
      <h3 style={{ marginTop: 0, color: '#fff' }}>Register new invoice</h3>
      <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14 }}>
        <label>Invoice number *<input required value={form.invoiceNumber} onChange={e => setForm({ ...form, invoiceNumber: e.target.value })} style={fieldStyle} /></label>
        <label>Client company *<select required value={form.clientName} onChange={e => setForm({ ...form, clientName: e.target.value })} style={fieldStyle}><option value="">Select client</option>{clients.map(client => <option key={client.id} value={client.client_name}>{client.client_name}</option>)}</select></label>
        <label>Issue date *<input required type="date" value={form.issuedDate} onChange={e => setForm({ ...form, issuedDate: e.target.value })} style={fieldStyle} /></label>
        <label>Amount (optional)<input type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} style={fieldStyle} /></label>
        <label>Current status<select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={fieldStyle}>{statuses.map(status => <option key={status} value={status}>{status.replace('_', ' ')}</option>)}</select></label>
        <label>Invoice file *<input required type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" onChange={e => setFile(e.target.files?.[0] || null)} style={fieldStyle} /></label>
        <label style={{ gridColumn: '1 / -1' }}>Notes (optional)<textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows="2" style={fieldStyle} /></label>
        <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}><button className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Register invoice'}</button></div>
      </form>
    </section>
    <section className="content-card" style={{ overflowX: 'auto' }}>
      <h3 style={{ marginTop: 0, color: '#fff' }}>All company invoices</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}><thead><tr style={{ color: '#94a3b8', textAlign: 'left' }}><th>Invoice</th><th>Client</th><th>Issued</th><th>Amount</th><th>Status</th><th>Vault</th><th>Action</th></tr></thead><tbody>
        {loading ? <tr><td colSpan="7" style={{ padding: 20 }}>Loading invoices…</td></tr> : invoices.length === 0 ? <tr><td colSpan="7" style={{ padding: 20 }}>No invoices registered yet.</td></tr> : invoices.map(invoice => <tr key={invoice.id} style={{ borderTop: '1px solid rgba(255,255,255,.08)' }}><td style={{ padding: 12, color: '#fff', fontWeight: 600 }}>{invoice.invoice_number}</td><td>{invoice.client_name}</td><td>{invoice.issued_date}</td><td>{money(invoice.amount, invoice.currency)}</td><td><select disabled={invoice.status === 'CASHED' || saving} value={invoice.status} onChange={e => updateStatus(invoice, e.target.value)} style={{ ...fieldStyle, minWidth: 130 }}>{invoice.status === 'CASHED' && <option value="CASHED">CASHED</option>}{statuses.map(status => <option key={status} value={status}>{status.replace('_', ' ')}</option>)}</select></td><td>{invoice.vault_document_id ? <span style={{ color: '#34d399' }}>Filed in vault</span> : '—'}</td><td>{invoice.status === 'CASHED' ? <span style={{ color: '#94a3b8' }}>Cashed</span> : <button onClick={() => cash(invoice)} disabled={saving} style={{ background: '#0f766e', color: '#fff', border: 0, borderRadius: 6, padding: '7px 10px', cursor: 'pointer' }}>Mark cashed & file</button>}</td></tr>)}
      </tbody></table>
    </section>
  </div>
}
