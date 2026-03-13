'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// ─── Schemas ─────────────────────────────────────────────────────────────────

const invoiceItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  amount_jod: z.coerce.number().positive('Amount must be positive'),
})

const createInvoiceSchema = z.object({
  patient_id: z.string().uuid(),
  notes: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, 'At least one item is required'),
})

// ─── Actions ─────────────────────────────────────────────────────────────────

/**
 * Create a new invoice with multiple line items for a patient.
 * Only doctors can create invoices.
 * Returns the new invoice id and invoice_number on success.
 */
export async function createInvoice(
  patientId: string,
  items: { description: string; amount_jod: number }[],
  notes?: string
): Promise<{ success?: boolean; invoiceId?: string; invoiceNumber?: number; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single() as { data: { id: string; role: string } | null }

  if (!profile || profile.role !== 'doctor') {
    return { error: 'Only the doctor can create invoices' }
  }

  const parsed = createInvoiceSchema.safeParse({ patient_id: patientId, items, notes })
  if (!parsed.success) {
    return { error: 'Invalid input' }
  }

  // Compute total amount from items
  const totalAmount = parsed.data.items.reduce((sum, item) => sum + item.amount_jod, 0)

  // Insert invoice header
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      patient_id: patientId,
      doctor_id: profile.id,
      amount_jod: totalAmount,
      notes: notes ?? null,
    })
    .select('id, invoice_number')
    .single() as {
      data: { id: string; invoice_number: number } | null
      error: { message: string } | null
    }

  if (invoiceError || !invoice) return { error: invoiceError?.message ?? 'Failed to create invoice' }

  // Insert line items
  const { error: itemsError } = await supabase
    .from('invoice_items')
    .insert(
      parsed.data.items.map((item) => ({
        invoice_id: invoice.id,
        description: item.description,
        amount_jod: item.amount_jod,
      }))
    )

  if (itemsError) {
    // Rollback invoice on items failure
    await supabase.from('invoices').delete().eq('id', invoice.id)
    return { error: itemsError.message }
  }

  revalidatePath(`/doctor/patients/${patientId}`)

  return { success: true, invoiceId: invoice.id, invoiceNumber: invoice.invoice_number }
}

/**
 * Fetch all invoices (with their items) for a patient.
 * Only doctors can view invoices.
 */
export async function getPatientInvoices(patientId: string): Promise<{
  invoices?: Array<{
    id: string
    invoice_number: number
    amount_jod: number | null
    notes: string | null
    created_at: string
    payment_status: 'paid' | 'unpaid'
    items: Array<{ id: string; description: string; amount_jod: number }>
  }>
  error?: string
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (!profile || profile.role !== 'doctor') {
    return { error: 'Only the doctor can view invoices' }
  }

  const { data, error } = await supabase
    .from('invoices')
    .select(`
      id,
      invoice_number,
      amount_jod,
      notes,
      created_at,
      payment_status,
      invoice_items (
        id,
        description,
        amount_jod
      )
    `)
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false }) as {
      data: Array<{
        id: string
        invoice_number: number
        amount_jod: number | null
        notes: string | null
        created_at: string
        payment_status: 'paid' | 'unpaid'
        invoice_items: Array<{ id: string; description: string; amount_jod: number }>
      }> | null
      error: { message: string } | null
    }

  if (error) return { error: error.message }

  return {
    invoices: (data ?? []).map((inv) => ({
      ...inv,
      items: inv.invoice_items ?? [],
    })),
  }
}

/**
 * Delete an invoice (and its items via CASCADE).
 * Only doctors can delete invoices.
 */
export async function deleteInvoice(
  invoiceId: string,
  patientId: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (!profile || profile.role !== 'doctor') {
    return { error: 'Only the doctor can delete invoices' }
  }

  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', invoiceId)

  if (error) return { error: error.message }

  revalidatePath(`/doctor/patients/${patientId}`)
  return { success: true }
}

/**
 * Get visitor counts: today, this month, and this year visit counts from medical_records.
 */
export async function getVisitorsSummary(): Promise<{
  todayCount?: number
  monthCount?: number
  yearCount?: number
  error?: string
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const yearStart = new Date(now.getFullYear(), 0, 1).toISOString()

  const [todayRes, monthRes, yearRes] = await Promise.all([
    supabase.from('medical_records').select('id', { count: 'exact', head: true }).eq('is_ended', true).gte('visit_date', todayStart).lte('visit_date', todayEnd) as unknown as Promise<{ count: number | null }>,
    supabase.from('medical_records').select('id', { count: 'exact', head: true }).eq('is_ended', true).gte('visit_date', monthStart) as unknown as Promise<{ count: number | null }>,
    supabase.from('medical_records').select('id', { count: 'exact', head: true }).eq('is_ended', true).gte('visit_date', yearStart) as unknown as Promise<{ count: number | null }>,
  ])

  return {
    todayCount: todayRes.count ?? 0,
    monthCount: monthRes.count ?? 0,
    yearCount: yearRes.count ?? 0,
  }
}

/**
 * Get visitor count for a specific day (YYYY-MM-DD).
 */
export async function getVisitorCountByDate(dateStr: string): Promise<{
  count?: number
  error?: string
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const dayStart = new Date(`${dateStr}T00:00:00.000`).toISOString()
  const dayEnd = new Date(`${dateStr}T23:59:59.999`).toISOString()

  const { count } = await supabase
    .from('medical_records')
    .select('id', { count: 'exact', head: true })
    .eq('is_ended', true)
    .gte('visit_date', dayStart)
    .lte('visit_date', dayEnd) as { count: number | null }

  return { count: count ?? 0 }
}

/**
 * Get financial summary: today, this month, and this year totals from ended visit fees + external costs.
 */
export async function getFinancialSummary(): Promise<{
  todayTotal?: number
  monthTotal?: number
  yearTotal?: number
  error?: string
}> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const yearStart = `${now.getFullYear()}-01-01`

  const [todayRes, monthRes, yearRes, extTodayRes, extMonthRes, extYearRes, opTodayRes, opMonthRes, opYearRes] = await Promise.all([
    supabase.from('medical_records').select('visit_fee').eq('is_ended', true).not('visit_fee', 'is', null).eq('visit_date', todayStr) as unknown as Promise<{ data: { visit_fee: number | null }[] | null }>,
    supabase.from('medical_records').select('visit_fee').eq('is_ended', true).not('visit_fee', 'is', null).gte('visit_date', monthStart) as unknown as Promise<{ data: { visit_fee: number | null }[] | null }>,
    supabase.from('medical_records').select('visit_fee').eq('is_ended', true).not('visit_fee', 'is', null).gte('visit_date', yearStart) as unknown as Promise<{ data: { visit_fee: number | null }[] | null }>,
    supabase.from('external_costs').select('amount').eq('cost_date', todayStr) as unknown as Promise<{ data: { amount: number }[] | null }>,
    supabase.from('external_costs').select('amount').gte('cost_date', monthStart) as unknown as Promise<{ data: { amount: number }[] | null }>,
    supabase.from('external_costs').select('amount').gte('cost_date', yearStart) as unknown as Promise<{ data: { amount: number }[] | null }>,
    supabase.from('operations').select('completion_amount').eq('is_completed', true).not('completion_amount', 'is', null).eq('completed_date', todayStr) as unknown as Promise<{ data: { completion_amount: number }[] | null }>,
    supabase.from('operations').select('completion_amount').eq('is_completed', true).not('completion_amount', 'is', null).gte('completed_date', monthStart) as unknown as Promise<{ data: { completion_amount: number }[] | null }>,
    supabase.from('operations').select('completion_amount').eq('is_completed', true).not('completion_amount', 'is', null).gte('completed_date', yearStart) as unknown as Promise<{ data: { completion_amount: number }[] | null }>,
  ])

  const sum = (rows: { visit_fee: number | null }[] | null) =>
    (rows ?? []).reduce((acc, r) => acc + (r.visit_fee ?? 0), 0)
  const extSum = (rows: { amount: number }[] | null) =>
    (rows ?? []).reduce((acc, r) => acc + r.amount, 0)
  const opSum = (rows: { completion_amount: number }[] | null) =>
    (rows ?? []).reduce((acc, r) => acc + r.completion_amount, 0)

  return {
    todayTotal: sum(todayRes.data) + extSum(extTodayRes.data) + opSum(opTodayRes.data),
    monthTotal: sum(monthRes.data) + extSum(extMonthRes.data) + opSum(opMonthRes.data),
    yearTotal: sum(yearRes.data) + extSum(extYearRes.data) + opSum(opYearRes.data),
  }
}

/**
 * Toggle invoice payment status between 'paid' and 'unpaid'.
 * Only doctors can update invoice status.
 */
export async function updateInvoicePaymentStatus(
  invoiceId: string,
  patientId: string,
  status: 'paid' | 'unpaid'
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (!profile || profile.role !== 'doctor') {
    return { error: 'Only the doctor can update invoice status' }
  }

  const { error } = await supabase
    .from('invoices')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update({ payment_status: status } as any)
    .eq('id', invoiceId)

  if (error) return { error: error.message }

  revalidatePath(`/doctor/patients/${patientId}`)
  revalidatePath('/doctor/financial')
  return { success: true }
}

/**
 * Get total visit fees + external costs for a specific day (YYYY-MM-DD).
 */
export async function getFinancialSummaryByDate(dateStr: string): Promise<{
  total?: number
  error?: string
}> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const [visitsRes, extRes, opRes] = await Promise.all([
    supabase.from('medical_records').select('visit_fee').eq('is_ended', true).not('visit_fee', 'is', null).eq('visit_date', dateStr) as unknown as Promise<{ data: { visit_fee: number | null }[] | null }>,
    supabase.from('external_costs').select('amount').eq('cost_date', dateStr) as unknown as Promise<{ data: { amount: number }[] | null }>,
    supabase.from('operations').select('completion_amount').eq('is_completed', true).not('completion_amount', 'is', null).eq('completed_date', dateStr) as unknown as Promise<{ data: { completion_amount: number }[] | null }>,
  ])

  const visitTotal = (visitsRes.data ?? []).reduce((acc, r) => acc + (r.visit_fee ?? 0), 0)
  const extTotal = (extRes.data ?? []).reduce((acc, r) => acc + r.amount, 0)
  const opTotal = (opRes.data ?? []).reduce((acc, r) => acc + r.completion_amount, 0)
  return { total: visitTotal + extTotal + opTotal }
}

/**
 * Get ended visit records + external costs for a date range, with patient info and fees.
 */
export async function getFinancialRecords(fromDate: string, toDate: string): Promise<{
  records?: Array<{
    id: string
    patient_name: string
    patient_id: string
    visit_date: string
    visit_fee: number
    national_id: string | null
    patient_code: string | null
    phone: string | null
    visit_type?: string
    record_type?: 'visit' | 'external' | 'operation'
  }>
  total?: number
  error?: string
}> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const [visitsRes, extRes, opRes] = await Promise.all([
    supabase.from('medical_records').select('id, patient_id, visit_date, visit_fee, visit_type').eq('is_ended', true).gte('visit_date', fromDate).lte('visit_date', toDate).order('visit_date', { ascending: true }) as unknown as Promise<{
      data: { id: string; patient_id: string; visit_date: string; visit_fee: number | null; visit_type: string | null }[] | null
      error: { message: string } | null
    }>,
    supabase.from('external_costs').select('id, patient_id, cost_date, amount, visit_type').gte('cost_date', fromDate).lte('cost_date', toDate).order('cost_date', { ascending: true }) as unknown as Promise<{
      data: { id: string; patient_id: string; cost_date: string; amount: number; visit_type: string }[] | null
      error: { message: string } | null
    }>,
    supabase.from('operations').select('id, patient_id, completed_date, completion_amount, operation_type').eq('is_completed', true).not('completion_amount', 'is', null).gte('completed_date', fromDate).lte('completed_date', toDate).order('completed_date', { ascending: true }) as unknown as Promise<{
      data: { id: string; patient_id: string; completed_date: string; completion_amount: number; operation_type: string }[] | null
      error: { message: string } | null
    }>,
  ])

  if (visitsRes.error) return { error: visitsRes.error.message }

  const visitData = visitsRes.data ?? []
  const extData = extRes.data ?? []
  const opData = opRes.data ?? []

  if (visitData.length === 0 && extData.length === 0 && opData.length === 0) return { records: [], total: 0 }

  // Collect all unique patient IDs
  const allPatientIds = [...new Set([
    ...visitData.map((r) => r.patient_id),
    ...extData.map((r) => r.patient_id),
    ...opData.map((r) => r.patient_id),
  ])]

  const [profilesRes, patientsRes] = await Promise.all([
    supabase.from('profiles').select('id, full_name_ar, phone').in('id', allPatientIds),
    supabase.from('patients').select('id, national_id, patient_code').in('id', allPatientIds),
  ])

  const profileMap = new Map<string, { id: string; full_name_ar: string; phone: string | null }>((profilesRes.data ?? []).map((p: { id: string; full_name_ar: string; phone: string | null }) => [p.id, p] as [string, { id: string; full_name_ar: string; phone: string | null }]))
  const patientMap = new Map<string, { id: string; national_id: string | null; patient_code: string | null }>((patientsRes.data ?? []).map((p: { id: string; national_id: string | null; patient_code: string | null }) => [p.id, p] as [string, { id: string; national_id: string | null; patient_code: string | null }]))

  const visitRecords = visitData.map((rec) => ({
    id: rec.id,
    patient_name: profileMap.get(rec.patient_id)?.full_name_ar ?? '—',
    patient_id: rec.patient_id,
    visit_date: rec.visit_date,
    visit_fee: rec.visit_fee ?? 0,
    national_id: patientMap.get(rec.patient_id)?.national_id ?? null,
    patient_code: patientMap.get(rec.patient_id)?.patient_code ?? null,
    phone: profileMap.get(rec.patient_id)?.phone ?? null,
    visit_type: rec.visit_type ?? undefined,
    record_type: 'visit' as const,
  }))

  const extRecords = extData.map((rec) => ({
    id: rec.id,
    patient_name: profileMap.get(rec.patient_id)?.full_name_ar ?? '—',
    patient_id: rec.patient_id,
    visit_date: rec.cost_date,
    visit_fee: rec.amount,
    national_id: patientMap.get(rec.patient_id)?.national_id ?? null,
    patient_code: patientMap.get(rec.patient_id)?.patient_code ?? null,
    phone: profileMap.get(rec.patient_id)?.phone ?? null,
    visit_type: rec.visit_type,
    record_type: 'external' as const,
  }))

  const opRecords = opData.map((rec) => ({
    id: rec.id,
    patient_name: profileMap.get(rec.patient_id)?.full_name_ar ?? '—',
    patient_id: rec.patient_id,
    visit_date: rec.completed_date,
    visit_fee: rec.completion_amount,
    national_id: patientMap.get(rec.patient_id)?.national_id ?? null,
    patient_code: patientMap.get(rec.patient_id)?.patient_code ?? null,
    phone: profileMap.get(rec.patient_id)?.phone ?? null,
    visit_type: rec.operation_type,
    record_type: 'operation' as const,
  }))

  const records = [...visitRecords, ...extRecords, ...opRecords].sort((a, b) =>
    a.visit_date.localeCompare(b.visit_date)
  )

  const total = records.reduce((acc, r) => acc + r.visit_fee, 0)
  return { records, total }
}

/**
 * Get all visit records (any status) for a date range, with patient info.
 */
export async function getVisitorsByDateRange(fromDate: string, toDate: string): Promise<{
  records?: Array<{
    id: string
    patient_name: string
    patient_id: string
    visit_date: string
    visit_fee: number | null
    national_id: string | null
    patient_code: string | null
    phone: string | null
    visit_type: string | null
  }>
  error?: string
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data, error } = await supabase
    .from('medical_records')
    .select('id, patient_id, visit_date, visit_fee, visit_type')
    .eq('is_ended', true)
    .not('visit_fee', 'is', null)
    .gte('visit_date', fromDate)
    .lte('visit_date', toDate)
    .order('visit_date', { ascending: true }) as {
      data: { id: string; patient_id: string; visit_date: string; visit_fee: number | null; visit_type: string | null }[] | null
      error: { message: string } | null
    }

  if (error) return { error: error.message }
  if (!data || data.length === 0) return { records: [] }

  const patientIds = [...new Set(data.map((r) => r.patient_id))]

  const [profilesRes, patientsRes] = await Promise.all([
    supabase.from('profiles').select('id, full_name_ar, phone').in('id', patientIds),
    supabase.from('patients').select('id, national_id, patient_code').in('id', patientIds),
  ])

  const profileMap = new Map((profilesRes.data ?? []).map((p: { id: string; full_name_ar: string; phone: string | null }) => [p.id, p]))
  const patientMap = new Map((patientsRes.data ?? []).map((p: { id: string; national_id: string | null; patient_code: string | null }) => [p.id, p]))

  const records = data.map((rec) => ({
    id: rec.id,
    patient_name: profileMap.get(rec.patient_id)?.full_name_ar ?? '—',
    patient_id: rec.patient_id,
    visit_date: rec.visit_date,
    visit_fee: rec.visit_fee,
    national_id: patientMap.get(rec.patient_id)?.national_id ?? null,
    patient_code: patientMap.get(rec.patient_id)?.patient_code ?? null,
    phone: profileMap.get(rec.patient_id)?.phone ?? null,
    visit_type: rec.visit_type ?? null,
  }))

  return { records }
}
