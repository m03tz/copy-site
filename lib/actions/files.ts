'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { FileType } from '@/lib/types/database'

// ─── Allowed MIME types ───────────────────────────────────────────────────────

const ALLOWED_MIME_TYPES: Record<string, FileType> = {
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
  'application/pdf': 'pdf',
}

// ─── Actions ─────────────────────────────────────────────────────────────────

/**
 * Upload a file to Supabase Storage and create a record in patient_files.
 * Only doctor or secretary can upload files.
 * Allowed types: JPEG, PNG, WebP, PDF.
 * On DB insert failure, rolls back by deleting the uploaded file from storage.
 */
export async function uploadFile(
  formData: FormData
): Promise<{ success?: boolean; filePath?: string; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  // Role check: only doctor or secretary can upload files
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (!profile || !['doctor', 'secretary'].includes(profile.role)) {
    return { error: 'Only doctor or secretary can upload files' }
  }

  // Extract fields from FormData
  const file = formData.get('file') as File | null
  const patient_id = formData.get('patient_id') as string | null
  const medical_record_id = formData.get('medical_record_id') as string | null

  if (!file || !(file instanceof File)) return { error: 'No file provided' }
  if (!patient_id) return { error: 'patient_id is required' }
  if (!medical_record_id) return { error: 'medical_record_id is required' }

  // Validate file type server-side
  const fileType = ALLOWED_MIME_TYPES[file.type]
  if (!fileType) {
    return { error: 'Invalid file type. Only JPEG, PNG, WebP, and PDF are allowed.' }
  }

  // Build storage path: {patient_id}/{medical_record_id}/{timestamp}-{filename}
  const storagePath = `${patient_id}/${medical_record_id}/${Date.now()}-${file.name}`

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('patient-files')
    .upload(storagePath, file) as { error: { message: string } | null }

  if (uploadError) return { error: uploadError.message }

  // Insert record into patient_files table
  const { error: dbError } = await supabase
    .from('patient_files')
    .insert({
      patient_id,
      medical_record_id,
      uploaded_by: user.id,
      file_name: file.name,
      file_type: fileType,
      file_path: storagePath,
    }) as { error: { message: string } | null }

  if (dbError) {
    // Rollback: remove the uploaded file from storage
    await supabase.storage.from('patient-files').remove([storagePath])
    return { error: dbError.message }
  }

  revalidatePath('/doctor/patients')
  revalidatePath('/secretary/patients')
  revalidatePath(`/doctor/patients/${patient_id}`)
  revalidatePath(`/secretary/patients/${patient_id}`)

  return { success: true, filePath: storagePath }
}

/**
 * Delete a file from Supabase Storage and remove its record from patient_files.
 * Only doctor or secretary can delete files.
 */
export async function deleteFile(
  fileId: string,
  filePath: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  // Role check: only doctor or secretary can delete files
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (!profile || !['doctor', 'secretary'].includes(profile.role)) {
    return { error: 'Only doctor or secretary can delete files' }
  }

  // Delete from Supabase Storage
  const { error: storageError } = await supabase.storage
    .from('patient-files')
    .remove([filePath]) as { error: { message: string } | null }

  if (storageError) return { error: storageError.message }

  // Delete from patient_files table
  const { error: dbError } = await supabase
    .from('patient_files')
    .delete()
    .eq('id', fileId) as { error: { message: string } | null }

  if (dbError) return { error: dbError.message }

  revalidatePath('/doctor/patients')
  revalidatePath('/secretary/patients')

  return { success: true }
}

/**
 * Generate a signed URL for a file in Supabase Storage with 1-hour expiry.
 * Returns the signed URL string or null on error.
 */
export async function getFileUrl(filePath: string): Promise<string | null> {
  const supabase = await createClient()

  const { data, error } = await supabase.storage
    .from('patient-files')
    .createSignedUrl(filePath, 3600) as {
      data: { signedUrl: string } | null
      error: { message: string } | null
    }

  if (error || !data) return null

  return data.signedUrl
}
