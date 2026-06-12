'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Printer, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getPatientReportData, type PatientReportData } from '@/lib/actions/patient-report'
import { getClinicHeaderHtml, getClinicHeaderStyles } from '@/lib/print-utils'

interface PrintReportButtonProps {
  patientId: string
}

// ─── Exported helpers (used by other print components) ───────────────────────

export function generateClinicHeader(_locale: string, baseUrl: string = ''): string {
  return getClinicHeaderHtml(baseUrl)
}

export function generateStyles(): string {
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 1.5cm 1cm; color: #222; font-size: 18px; }
    ${getClinicHeaderStyles()}
    .report-date { color: #888; font-size: 18px; margin-bottom: 16px; }
    .section { margin-bottom: 24px; }
    .section h2 { font-size: 18px; color: #0d7377; border-bottom: 1px solid #ddd; padding-bottom: 6px; margin-bottom: 12px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
    .info-item { display: flex; gap: 8px; font-size: 18px; }
    .info-item .label { color: #666; min-width: 120px; }
    .info-item .value { font-weight: 600; }
    .snapshot-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
    .snapshot-card { border: 1px solid #ddd; border-radius: 8px; padding: 12px; text-align: center; }
    .snapshot-card .snap-label { font-size: 18px; color: #666; margin-bottom: 4px; }
    .snapshot-card .snap-value { font-size: 18px; font-weight: 700; color: #0d7377; }
    table { width: 100%; border-collapse: collapse; font-size: 18px; margin-top: 8px; }
    th { background: #0d7377; color: #fff; padding: 8px 12px; }
    td { padding: 8px 12px; border-bottom: 1px solid #eee; }
    tr:nth-child(even) { background: #f9f9f9; }
    .footer { text-align: center; margin-top: 32px; padding-top: 16px; border-top: 1px solid #ddd; color: #aaa; font-size: 18px; }
    @media print {
      body { padding: 1.5cm 1cm; }
      .no-print { display: none !important; }
    }
    @page {
      size: A4;
      margin: 0;
    }`
}

// ─── Report HTML generator (Arabic) ────────────────────────────────────────

function generateReportHtml(data: PatientReportData, lang: 'ar' | 'en', baseUrl: string = ''): string {
  const { patient, visits, pregnancies, infertilityRecords } = data

  // Flatten all pregnancy measurements across pregnancies so we can match by date
  const allMeasurements = pregnancies.flatMap(p => p.pregnancy_measurements ?? [])
  const isAr = lang === 'ar'

  const dir = isAr ? 'rtl' : 'ltr'
  const langAttr = isAr ? 'ar' : 'en'
  const textAlign = isAr ? 'right' : 'left'
  const patientName = isAr ? patient.full_name_ar : (patient.full_name_en || patient.full_name_ar)

  // Labels
  const l = isAr ? {
    reportTitle: '\u0645\u0644\u0641 \u0645\u0631\u064a\u0636\u0629',
    reportDate: '',
    patientInfo: '\u0645\u0639\u0644\u0648\u0645\u0627\u062a \u0627\u0644\u0645\u0631\u064a\u0636\u0629',
    name: '\u0627\u0644\u0627\u0633\u0645',
    nameEn: '\u0627\u0644\u0627\u0633\u0645 (\u0625\u0646\u062c\u0644\u064a\u0632\u064a)',
    phone: '\u0627\u0644\u0647\u0627\u062a\u0641',
    dob: '\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0645\u064a\u0644\u0627\u062f',
    bloodType: '\u0641\u0635\u064a\u0644\u0629 \u0627\u0644\u062f\u0645',
    nationalId: '\u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u0648\u0637\u0646\u064a',
    emergency: '\u062c\u0647\u0629 \u0627\u062a\u0635\u0627\u0644 \u0637\u0648\u0627\u0631\u0626',
    notes: '\u0645\u0644\u0627\u062d\u0638\u0627\u062a',
    snapshot: '\u0645\u0644\u062e\u0635 \u0633\u0631\u064a\u0639',
    age: '\u0627\u0644\u0639\u0645\u0631',
    years: '\u0633\u0646\u0629',
    pregnanciesCount: '\u0639\u062f\u062f \u0627\u0644\u0627\u062d\u0645\u0627\u0644',
    medicalRecords: '\u0627\u0644\u0633\u062c\u0644\u0627\u062a \u0627\u0644\u0637\u0628\u064a\u0629',
    visit: '\u0632\u064a\u0627\u0631\u0629',
    date: '\u0627\u0644\u062a\u0627\u0631\u064a\u062e',
    complaint: '\u0627\u0644\u0634\u0643\u0648\u0649',
    diagnosis: '\u0627\u0644\u062a\u0634\u062e\u064a\u0635',
    treatmentPlan: '\u062e\u0637\u0629 \u0627\u0644\u0639\u0644\u0627\u062c',
    prescriptions: '\u0627\u0644\u0648\u0635\u0641\u0627\u062a',
    pregnancyRecord: '\u0633\u062c\u0644 \u0627\u0644\u062d\u0645\u0644',
    status: '\u0627\u0644\u062d\u0627\u0644\u0629',
    lmp: '\u0622\u062e\u0631 \u062f\u0648\u0631\u0629 (LMP)',
    dueDate: '\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0648\u0644\u0627\u062f\u0629 \u0627\u0644\u0645\u062a\u0648\u0642\u0639',
    statusActive: '\u0646\u0634\u0637',
    statusCompleted: '\u0645\u0643\u062a\u0645\u0644',
    footerText: '\u0647\u0630\u0627 \u0627\u0644\u062a\u0642\u0631\u064a\u0631 \u0635\u0627\u062f\u0631 \u0645\u0646 \u0646\u0638\u0627\u0645 \u0639\u064a\u0627\u062f\u0629 \u062f. \u0641\u0627\u062f\u064a \u0646\u0627\u062f\u064a \u0627\u0644\u0633\u062d\u0644\u0629 \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a',
    footerPhone: '\u0647\u0627\u062a\u0641 \u0627\u0644\u0639\u064a\u0627\u062f\u0629',
  } : {
    reportTitle: 'Patient File',
    reportDate: '',
    patientInfo: 'Patient Information',
    name: 'Name',
    nameEn: 'Name (English)',
    phone: 'Phone',
    dob: 'Date of Birth',
    bloodType: 'Blood Type',
    nationalId: 'National ID',
    emergency: 'Emergency Contact',
    notes: 'Notes',
    snapshot: 'Quick Summary',
    age: 'Age',
    years: 'years',
    pregnanciesCount: 'Pregnancies',
    medicalRecords: 'Medical Records',
    visit: 'visit',
    date: 'Date',
    complaint: 'Complaint',
    diagnosis: 'Diagnosis',
    treatmentPlan: 'Treatment Plan',
    prescriptions: 'Prescriptions',
    pregnancyRecord: 'Pregnancy Record',
    status: 'Status',
    lmp: 'Last Period (LMP)',
    dueDate: 'Expected Due Date',
    statusActive: 'Active',
    statusCompleted: 'Completed',
    footerText: 'This report was generated by Dr. Fadi Al-Sahleh Clinic System',
    footerPhone: 'Clinic Phone',
  }

  // Calculate age from date_of_birth
  let ageStr = '\u2014'
  if (patient.date_of_birth) {
    const dob = new Date(patient.date_of_birth)
    const now = new Date()
    const age = now.getFullYear() - dob.getFullYear() - (now < new Date(now.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0)
    ageStr = `${age} ${l.years}`
  }

  // Use the patient_code from DB if available
  const patientCode = patient.patient_code ?? '\u2014'

  // Helper: build a 2-column key/value table for measurements of one visit
  function buildMeasurementTable(visitDate: string, visitType: string, rows: { label: string; value: string }[]): string {
    if (rows.length === 0) return ''
    const headerColor = visitType === 'ANC' ? '#c62828' : visitType === 'GYNE' ? '#2e7d32' : '#0d7377'
    const typeLabel = visitType === 'ANC'
      ? (isAr ? '\u0631\u0639\u0627\u064a\u0629 \u062d\u0645\u0644' : 'Antenatal Care')
      : visitType === 'GYNE'
        ? (isAr ? '\u0646\u0633\u0627\u0621' : 'Gynecology')
        : visitType
    const tableTitle = `${visitDate} \u2014 ${typeLabel}`
    const body = rows.map((r, i) => `
      <tr style="background:${i % 2 === 0 ? '#fff' : '#f7f7f7'}">
        <td style="width:35%;font-weight:600;color:#444">${r.label}</td>
        <td>${r.value}</td>
      </tr>`).join('')
    return `
    <table style="margin-top:14px;margin-bottom:8px">
      <thead>
        <tr style="background:${headerColor};color:#fff">
          <th colspan="2" style="text-align:${textAlign};font-size:16px;padding:8px 12px">${tableTitle}</th>
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>`
  }

  // Infer the visit type per visit: explicit notes value, or by date match with measurement/infertility records
  function getVisitType(v: typeof visits[number]): 'ANC' | 'GYNE' | null {
    if (v.notes === 'ANC' || v.notes === 'GYNE') return v.notes
    if (allMeasurements.some(m => m.measured_at === v.visit_date)) return 'ANC'
    if (infertilityRecords.some(r => r.record_date === v.visit_date)) return 'GYNE'
    return null
  }

  // Merge visits with synthetic visits derived from measurements / infertility records
  // that don't have a matching medical_record on the same date. This way the print
  // shows every measurement date in Medical Records, not just those with a saved visit.
  type VisitEntry = {
    visit_date: string
    chief_complaint: string | null
    diagnosis: string | null
    treatment_plan: string | null
    vital_signs: Record<string, string> | null
    notes: string | null
    type: 'ANC' | 'GYNE' | null
    synthetic: boolean
  }

  const visitDates = new Set(visits.map(v => v.visit_date))
  const orphanMeasurementDates = [...new Set(
    allMeasurements
      .map(m => m.measured_at)
      .filter(d => !visitDates.has(d))
  )]
  const orphanInfertilityDates = [...new Set(
    infertilityRecords
      .map(r => r.record_date)
      .filter(d => !visitDates.has(d))
  )]

  const entries: VisitEntry[] = [
    ...visits.map((v): VisitEntry => ({
      visit_date: v.visit_date,
      chief_complaint: v.chief_complaint,
      diagnosis: v.diagnosis,
      treatment_plan: v.treatment_plan,
      vital_signs: v.vital_signs,
      notes: v.notes,
      type: getVisitType(v),
      synthetic: false,
    })),
    ...orphanMeasurementDates.map((d): VisitEntry => ({
      visit_date: d,
      chief_complaint: null,
      diagnosis: null,
      treatment_plan: null,
      vital_signs: null,
      notes: null,
      type: 'ANC',
      synthetic: true,
    })),
    ...orphanInfertilityDates.map((d): VisitEntry => ({
      visit_date: d,
      chief_complaint: null,
      diagnosis: null,
      treatment_plan: null,
      vital_signs: null,
      notes: null,
      type: 'GYNE',
      synthetic: true,
    })),
  ].sort((a, b) => b.visit_date.localeCompare(a.visit_date))

  const visitRows = entries
    .map((v) => {
      const typeLabel = v.type === 'ANC'
        ? (isAr ? '\u0631\u0639\u0627\u064a\u0629 \u062d\u0645\u0644' : 'Antenatal Care')
        : v.type === 'GYNE'
          ? (isAr ? '\u0646\u0633\u0627\u0621' : 'Gynecology')
          : '\u2014'
      const typeColor = v.type === 'ANC' ? '#c62828' : v.type === 'GYNE' ? '#2e7d32' : '#666'
      return `
    <tr>
      <td>${v.visit_date}</td>
      <td><span style="color:${typeColor};font-weight:700">${typeLabel}</span></td>
      <td>${v.chief_complaint || '\u2014'}</td>
      <td>${v.diagnosis || '\u2014'}</td>
      <td>${v.treatment_plan || '\u2014'}</td>
      <td>${v.notes || '\u2014'}</td>
    </tr>`
    })
    .join('')

  // Build a per-visit measurements table (ANC: vital signs, GYNE: infertility record + vital signs)
  const measurementTables = entries
    .map((v) => {
      const vs = v.vital_signs
      const rows: { label: string; value: string }[] = []

      const type = v.type

      if (type === 'ANC') {
        // Match the pregnancy measurement recorded on the same date
        const m = allMeasurements.find(x => x.measured_at === v.visit_date)
        if (m) {
          if (m.gestational_week != null) rows.push({ label: isAr ? '\u0627\u0644\u0623\u0633\u0628\u0648\u0639' : 'Gestational Week', value: String(m.gestational_week) })
          if (m.weight_kg != null) rows.push({ label: isAr ? '\u0627\u0644\u0648\u0632\u0646 (kg)' : 'Weight (kg)', value: String(m.weight_kg) })
          if (m.blood_pressure) rows.push({ label: isAr ? '\u0636\u063a\u0637 \u0627\u0644\u062f\u0645' : 'Blood Pressure', value: m.blood_pressure })
          // Obstetric findings
          if (m.fh) rows.push({ label: isAr ? '\u0646\u0628\u0636\u0627\u062a \u0627\u0644\u062c\u0646\u064a\u0646' : 'Fetal Heart', value: m.fh })
          if (m.placenta) rows.push({ label: isAr ? '\u0627\u0644\u0645\u0634\u064a\u0645\u0629' : 'Placenta', value: m.placenta })
          if (m.liquor) rows.push({ label: isAr ? '\u0627\u0644\u0633\u0627\u0626\u0644 \u0627\u0644\u0623\u0645\u0646\u064a\u0648\u0633\u064a' : 'Amniotic Fluid (Liquor)', value: m.liquor })
          // Ultrasound
          if (m.crl) rows.push({ label: 'CRL (mm)', value: m.crl })
          if (m.bpd) rows.push({ label: 'BPD (mm)', value: m.bpd })
          if (m.fl) rows.push({ label: 'FL (mm)', value: m.fl })
          if (m.ac) rows.push({ label: 'AC (mm)', value: m.ac })
          if (m.efw) rows.push({ label: 'EFW (g)', value: m.efw })
          // Lab tests
          if (m.hb != null) rows.push({ label: 'HB (g/dL)', value: String(m.hb) })
          if (m.plt != null) rows.push({ label: 'PLT', value: String(m.plt) })
          if (m.rbs != null) rows.push({ label: 'RBS (mg/dL)', value: String(m.rbs) })
          if (m.ua) rows.push({ label: 'UA', value: m.ua })
          if (m.ogtt_fasting != null) rows.push({ label: 'OGTT Fasting (mg/dL)', value: String(m.ogtt_fasting) })
          if (m.ogtt_1hr != null) rows.push({ label: 'OGTT 1hr (mg/dL)', value: String(m.ogtt_1hr) })
          if (m.ogtt_2hr != null) rows.push({ label: 'OGTT 2hr (mg/dL)', value: String(m.ogtt_2hr) })
          if (m.tsh_lab != null) rows.push({ label: 'TSH (mIU/L)', value: String(m.tsh_lab) })
          if (m.b_hcg != null) rows.push({ label: '\u03b2-HCG (mIU/mL)', value: String(m.b_hcg) })
          if (m.notes) rows.push({ label: isAr ? '\u0645\u0644\u0627\u062d\u0638\u0627\u062a' : 'Notes', value: m.notes })
        }
        // Fallback: visit's vital signs (in case secretary recorded BP/weight before ANC dialog was filled)
        if (rows.length === 0 && vs) {
          if (vs.blood_pressure) rows.push({ label: isAr ? '\u0636\u063a\u0637 \u0627\u0644\u062f\u0645' : 'Blood Pressure', value: vs.blood_pressure })
          if (vs.weight) rows.push({ label: isAr ? '\u0627\u0644\u0648\u0632\u0646 (kg)' : 'Weight (kg)', value: vs.weight })
          if (vs.pulse) rows.push({ label: isAr ? '\u0627\u0644\u0646\u0628\u0636' : 'Pulse', value: vs.pulse })
          if (vs.temperature) rows.push({ label: isAr ? '\u0627\u0644\u062d\u0631\u0627\u0631\u0629' : 'Temperature', value: vs.temperature })
        }
      }

      if (type === 'GYNE') {
        if (vs?.blood_pressure) rows.push({ label: isAr ? '\u0636\u063a\u0637 \u0627\u0644\u062f\u0645' : 'Blood Pressure', value: vs.blood_pressure })
        if (vs?.weight) rows.push({ label: isAr ? '\u0627\u0644\u0648\u0632\u0646 (kg)' : 'Weight (kg)', value: vs.weight })
        if (vs?.pulse) rows.push({ label: isAr ? '\u0627\u0644\u0646\u0628\u0636' : 'Pulse', value: vs.pulse })
        if (vs?.temperature) rows.push({ label: isAr ? '\u0627\u0644\u062d\u0631\u0627\u0631\u0629' : 'Temperature', value: vs.temperature })

        const matched = infertilityRecords.find(r => r.record_date === v.visit_date)
        if (matched) {
          if (matched.lmp_date) rows.push({ label: isAr ? '\u0622\u062e\u0631 \u062f\u0648\u0631\u0629 (LMP)' : 'Last Period (LMP)', value: matched.lmp_date })
          if (matched.complaint) rows.push({ label: isAr ? '\u0627\u0644\u0634\u0643\u0648\u0649' : 'Chief Complaint (C/O)', value: matched.complaint })
          if (matched.us_findings) rows.push({ label: isAr ? '\u0646\u062a\u0627\u0626\u062c \u0627\u0644\u062a\u0635\u0648\u064a\u0631 (US)' : 'Ultrasound Findings (US)', value: matched.us_findings })
          if (matched.plan) rows.push({ label: isAr ? '\u062e\u0637\u0629 \u0627\u0644\u0639\u0644\u0627\u062c' : 'Treatment Plan', value: matched.plan })
          // Hormone panel
          if (matched.fsh != null) rows.push({ label: 'FSH (IU/L)', value: String(matched.fsh) })
          if (matched.lh != null) rows.push({ label: 'LH (IU/L)', value: String(matched.lh) })
          if (matched.tsh != null) rows.push({ label: 'TSH (mIU/L)', value: String(matched.tsh) })
          if (matched.prl != null) rows.push({ label: 'PRL (ng/mL)', value: String(matched.prl) })
          if (matched.amh != null) rows.push({ label: 'AMH (ng/mL)', value: String(matched.amh) })
          if (matched.homa_score != null) rows.push({ label: 'HOMA Score', value: String(matched.homa_score) })
          // HSG
          if (matched.hsg_result) rows.push({ label: 'HSG Result', value: matched.hsg_result })
          // SFA
          if (matched.sfa_count != null) rows.push({ label: 'SFA Count (\u00d710\u2076/mL)', value: String(matched.sfa_count) })
          if (matched.sfa_motility != null) rows.push({ label: 'SFA Motility %', value: String(matched.sfa_motility) })
          if (matched.sfa_morphology != null) rows.push({ label: 'SFA Morphology %', value: String(matched.sfa_morphology) })
          if (matched.sfa_viscosity) rows.push({ label: 'SFA Viscosity', value: matched.sfa_viscosity })
          if (matched.notes) rows.push({ label: isAr ? '\u0645\u0644\u0627\u062d\u0638\u0627\u062a \u0625\u0636\u0627\u0641\u064a\u0629' : 'Additional Notes', value: matched.notes })
        }
      }

      return buildMeasurementTable(v.visit_date, type ?? '', rows)
    })
    .filter(Boolean)
    .join('')

  const pregnancyRows = pregnancies
    .map((p) => {
      const statusLabel = p.status === 'active' ? l.statusActive : p.status === 'completed' ? l.statusCompleted : p.status
      const measurements = [...(p.pregnancy_measurements ?? [])].sort(
        (a, b) => a.measured_at.localeCompare(b.measured_at)
      )
      const measurementRows = measurements.map((m, i) => `
        <tr style="background:${i % 2 === 0 ? '#fff' : '#f4f7ff'}">
          <td>${m.measured_at}</td>
          <td style="text-align:center">${m.gestational_week ?? '\u2014'}</td>
          <td style="text-align:center">${m.weight_kg ?? '\u2014'}</td>
          <td style="text-align:center">${m.blood_pressure ?? '\u2014'}</td>
          <td style="text-align:center">${m.fh ?? '\u2014'}</td>
          <td style="text-align:center">${m.placenta ?? '\u2014'}</td>
          <td style="text-align:center">${m.liquor ?? '\u2014'}</td>
          <td style="text-align:center">${m.hb ?? '\u2014'}</td>
          <td style="text-align:center">${m.rbs ?? '\u2014'}</td>
          <td>${m.notes ?? '\u2014'}</td>
        </tr>`).join('')

      return `
      <tr style="background:#e8f5e9;font-weight:700">
        <td colspan="10">${statusLabel} &nbsp;|&nbsp; LMP: ${p.lmp_date} &nbsp;|&nbsp; EDD: ${p.expected_due_date}${p.notes ? ` &nbsp;|&nbsp; ${p.notes}` : ''}</td>
      </tr>
      ${measurements.length > 0 ? `
      <tr style="background:#0d7377;color:#fff;font-size:15px">
        <th>${isAr ? '\u0627\u0644\u062a\u0627\u0631\u064a\u062e' : 'Date'}</th>
        <th style="text-align:center">${isAr ? '\u0627\u0644\u0623\u0633\u0628\u0648\u0639' : 'Week'}</th>
        <th style="text-align:center">${isAr ? '\u0627\u0644\u0648\u0632\u0646' : 'Wt (kg)'}</th>
        <th style="text-align:center">${isAr ? '\u0636\u063a\u0637 \u0627\u0644\u062f\u0645' : 'BP'}</th>
        <th style="text-align:center">${isAr ? '\u0646\u0628\u0636\u0627\u062a \u0627\u0644\u062c\u0646\u064a\u0646' : 'FH'}</th>
        <th style="text-align:center">${isAr ? '\u0627\u0644\u0645\u0634\u064a\u0645\u0629' : 'Placenta'}</th>
        <th style="text-align:center">${isAr ? '\u0627\u0644\u0633\u0627\u0626\u0644' : 'Liquor'}</th>
        <th style="text-align:center">HB</th>
        <th style="text-align:center">RBS</th>
        <th>${isAr ? '\u0645\u0644\u0627\u062d\u0638\u0627\u062a' : 'Notes'}</th>
      </tr>
      ${measurementRows}` : `<tr><td colspan="10" style="color:#888;padding:6px 12px">${isAr ? '\u0644\u0627 \u062a\u0648\u062c\u062f \u0642\u064a\u0627\u0633\u0627\u062a' : 'No measurements'}</td></tr>`}`
    })
    .join('')

  return `<!DOCTYPE html>
<html dir="${dir}" lang="${langAttr}">
<head>
  <meta charset="UTF-8">
  <title>${l.reportTitle} - ${patientName}</title>
  <link rel="icon" type="image/png" href="${baseUrl}/images/site logo.png" />
  <style>
    ${generateStyles()}
    body { direction: ${dir}; text-align: ${textAlign}; }
    th { text-align: ${textAlign}; }
    td { text-align: ${textAlign}; }
  </style>
</head>
<body>
  ${getClinicHeaderHtml(baseUrl)}

  <!-- Patient Snapshot -->
  <div class="section">
    <h2>${l.snapshot}</h2>
    <div class="snapshot-grid">
      <div class="snapshot-card">
        <div class="snap-label">${l.age}</div>
        <div class="snap-value">${ageStr}</div>
      </div>
      <div class="snapshot-card">
        <div class="snap-label">${l.bloodType}</div>
        <div class="snap-value">${patient.blood_type || '\u2014'}</div>
      </div>
      <div class="snapshot-card">
        <div class="snap-label">${l.pregnanciesCount}</div>
        <div class="snap-value">${pregnancies.length}</div>
      </div>
    </div>
  </div>

  <!-- Patient Info -->
  <div class="section">
    <h2>${l.patientInfo}</h2>
    <div class="info-grid">
      <div class="info-item"><span class="label">${l.name}:</span><span class="value">${patient.full_name_ar}</span></div>
      ${patient.full_name_en ? `<div class="info-item"><span class="label">${l.nameEn}:</span><span class="value">${patient.full_name_en}</span></div>` : ''}
      <div class="info-item"><span class="label">${l.phone}:</span><span class="value" dir="ltr">${patient.phone}</span></div>
      <div class="info-item"><span class="label">${isAr ? '\u0631\u0642\u0645 \u0627\u0644\u0645\u0644\u0641' : 'File No'}:</span><span class="value" dir="ltr" style="font-family:monospace;font-weight:700">${patientCode}</span></div>
      ${patient.date_of_birth ? `<div class="info-item"><span class="label">${l.dob}:</span><span class="value">${patient.date_of_birth}</span></div>` : ''}
      ${patient.blood_type ? `<div class="info-item"><span class="label">${l.bloodType}:</span><span class="value">${patient.blood_type}</span></div>` : ''}
      ${patient.national_id ? `<div class="info-item"><span class="label">${l.nationalId}:</span><span class="value">${patient.national_id}</span></div>` : ''}
      ${patient.emergency_contact_name ? `<div class="info-item"><span class="label">${l.emergency}:</span><span class="value">${patient.emergency_contact_name} - ${patient.emergency_contact_phone || ''}</span></div>` : ''}
      ${patient.notes ? `<div class="info-item" style="grid-column:1/-1"><span class="label">${l.notes}:</span><span class="value">${patient.notes}</span></div>` : ''}
    </div>
  </div>

  ${
    entries.length > 0
      ? `<div class="section">
    <h2>${l.medicalRecords} (${entries.length} ${l.visit})</h2>
    <table>
      <thead>
        <tr>
          <th>${l.date}</th>
          <th>${isAr ? 'النوع' : 'Type'}</th>
          <th>${l.complaint}</th>
          <th>${l.diagnosis}</th>
          <th>${l.treatmentPlan}</th>
          <th>${l.notes}</th>
        </tr>
      </thead>
      <tbody>${visitRows}</tbody>
    </table>
    ${measurementTables}
  </div>`
      : ''
  }

  ${
    pregnancies.length > 0
      ? `<div class="section">
    <h2>${l.pregnancyRecord}</h2>
    <table>
      <tbody>${pregnancyRows}</tbody>
    </table>
  </div>`
      : ''
  }

  <div class="footer">
    <p>${l.footerText}</p>
    <p>${l.footerPhone}: <span dir="ltr">+962 7 8663 7847</span></p>
  </div>
</body>
</html>`
}

// ─── Component ──────────────────────────────────────────────────────────────

export function PrintReportButton({ patientId }: PrintReportButtonProps) {
  const t = useTranslations('patients')
  const [loading, setLoading] = useState<'ar' | 'en' | null>(null)

  const handlePrint = async (lang: 'ar' | 'en') => {
    setLoading(lang)
    try {
      const result = await getPatientReportData(patientId)
      if (result.error || !result.data) {
        console.error('Failed to get report data:', result.error)
        return
      }

      const html = generateReportHtml(result.data, lang, window.location.origin)

      // Open in new tab and print
      const win = window.open('', '_blank')
      if (!win) return
      win.document.write(html)
      win.document.close()
      win.focus()
      setTimeout(() => win.print(), 500)
    } catch (e) {
      console.error('Failed to generate report:', e)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={() => handlePrint('ar')} disabled={loading !== null}>
        {loading === 'ar' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
        <span className="ms-2">{t('report.printArabic')}</span>
      </Button>
      <Button variant="outline" size="sm" onClick={() => handlePrint('en')} disabled={loading !== null}>
        {loading === 'en' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
        <span className="ms-2">{t('report.printEnglish')}</span>
      </Button>
    </div>
  )
}

