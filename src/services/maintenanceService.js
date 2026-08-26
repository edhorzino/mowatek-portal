import { supabase } from '../supabaseClient'

const REPORT_BUCKET = 'maintenance-reports'

const safeFileExtension = (file) => {
  const extension = file?.name?.split('.').pop()?.toLowerCase()
  return extension || 'bin'
}

const safeAssetId = (assetId) => String(assetId || 'asset').replace(/[^a-zA-Z0-9_-]/g, '_')

const localDate = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

const buildFilePath = (assetId, userId, type, file) => {
  const uniqueId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `reports/${userId}/${safeAssetId(assetId)}/${uniqueId}-${type}.${safeFileExtension(file)}`
}

const removeFiles = async (paths) => {
  const existingPaths = paths.filter(Boolean)
  if (existingPaths.length) await supabase.storage.from(REPORT_BUCKET).remove(existingPaths)
}

export async function completeMaintenance({ asset, user, reportFile, invoiceFile, notes }) {
  if (!asset?.id || !user?.id || !reportFile) {
    throw new Error('Select an asset and attach the required maintenance report.')
  }

  const reportPath = buildFilePath(asset.asset_id, user.id, 'report', reportFile)
  const invoicePath = invoiceFile ? buildFilePath(asset.asset_id, user.id, 'invoice', invoiceFile) : null
  const uploadedPaths = []

  try {
    const { error: reportError } = await supabase.storage
      .from(REPORT_BUCKET)
      .upload(reportPath, reportFile, { upsert: false })
    if (reportError) throw reportError
    uploadedPaths.push(reportPath)

    if (invoiceFile) {
      const { error: invoiceError } = await supabase.storage
        .from(REPORT_BUCKET)
        .upload(invoicePath, invoiceFile, { upsert: false })
      if (invoiceError) throw invoiceError
      uploadedPaths.push(invoicePath)
    }
  } catch (error) {
    await removeFiles(uploadedPaths)
    throw error
  }

  const { data, error } = await supabase.rpc('complete_equipment_maintenance', {
    p_equipment_id: asset.id,
    p_completed_date: localDate(),
    p_notes: notes || null,
    p_report_path: reportPath,
    p_invoice_path: invoicePath,
  })

  if (error) throw error
  return data
}

export async function createMaintenanceFileUrl(path) {
  if (!path) return null
  const { data, error } = await supabase.storage
    .from(REPORT_BUCKET)
    .createSignedUrl(path, 15 * 60)
  if (error) throw error
  return data.signedUrl
}

export async function addSignedMaintenanceUrls(logs) {
  return Promise.all((logs || []).map(async (log) => ({
    ...log,
    maintenance_report_link: log.maintenance_report_path
      ? await createMaintenanceFileUrl(log.maintenance_report_path)
      : log.maintenance_report_url || null,
    invoice_link: log.invoice_path
      ? await createMaintenanceFileUrl(log.invoice_path)
      : log.invoice_url || null,
  })))
}
