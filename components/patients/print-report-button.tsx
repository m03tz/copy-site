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

  const visitRows = visits
    .map((v) => {
      const visitType = v.notes || '\u2014'
      const typeColor = v.notes === 'ANC' ? '#c62828' : v.notes === 'GYNE' ? '#2e7d32' : '#666'
      const vs = v.vital_signs as Record<string, string> | null

      let detailRow = ''

      if (v.notes === 'ANC' && vs) {
        const parts: string[] = []
        if (vs.blood_pressure) parts.push(`${isAr ? '\u0636\u063a\u0637 \u0627\u0644\u062f\u0645' : 'BP'}: ${vs.blood_pressure}`)
        if (vs.weight) parts.push(`${isAr ? '\u0627\u0644\u0648\u0632\u0646' : 'Weight'}: ${vs.weight}`)
        if (vs.pulse) parts.push(`${isAr ? '\u0627\u0644\u0646\u0628\u0636' : 'Pulse'}: ${vs.pulse}`)
        if (vs.temperature) parts.push(`${isAr ? '\u0627\u0644\u062d\u0631\u0627\u0631\u0629' : 'Temp'}: ${vs.temperature}`)
        if (parts.length > 0) {
          detailRow = `<tr><td colspan="6" style="padding:4px 12px;background:#fff3f3;font-size:15px;color:#555">${parts.join(' &nbsp;|&nbsp; ')}</td></tr>`
        }
      }

      if (v.notes === 'GYNE') {
        const matched = infertilityRecords.find(r => r.record_date === v.visit_date)
        if (matched) {
          const parts: string[] = []
          if (matched.complaint) parts.push(`${isAr ? '\u0627\u0644\u0634\u0643\u0648\u0649' : 'C/O'}: ${matched.complaint}`)
          if (matched.us_findings) parts.push(`${isAr ? '\u0627\u0644\u062a\u0635\u0648\u064a\u0631' : 'US'}: ${matched.us_findings}`)
          if (matched.plan) parts.push(`${isAr ? '\u0627\u0644\u062e\u0637\u0629' : 'Plan'}: ${matched.plan}`)
          // Hormones
          const hormones: string[] = []
          if (matched.fsh != null) hormones.push(`FSH: ${matched.fsh}`)
          if (matched.lh != null) hormones.push(`LH: ${matched.lh}`)
          if (matched.tsh != null) hormones.push(`TSH: ${matched.tsh}`)
          if (matched.prl != null) hormones.push(`PRL: ${matched.prl}`)
          if (matched.amh != null) hormones.push(`AMH: ${matched.amh}`)
          if (matched.homa_score != null) hormones.push(`HOMA: ${matched.homa_score}`)
          if (hormones.length > 0) parts.push(`${isAr ? '\u0647\u0631\u0645\u0648\u0646\u0627\u062a' : 'Hormones'}: ${hormones.join(', ')}`)
          if (matched.hsg_result) parts.push(`HSG: ${matched.hsg_result}`)
          // SFA
          const sfa: string[] = []
          if (matched.sfa_count != null) sfa.push(`Count: ${matched.sfa_count}`)
          if (matched.sfa_motility != null) sfa.push(`Motility: ${matched.sfa_motility}%`)
          if (matched.sfa_morphology != null) sfa.push(`Morphology: ${matched.sfa_morphology}%`)
          if (matched.sfa_viscosity) sfa.push(`Viscosity: ${matched.sfa_viscosity}`)
          if (sfa.length > 0) parts.push(`SFA: ${sfa.join(', ')}`)
          if (parts.length > 0) {
            detailRow = `<tr><td colspan="6" style="padding:4px 12px;background:#f0fff0;font-size:15px;color:#555">${parts.join(' &nbsp;|&nbsp; ')}</td></tr>`
          }
        }
        // Also show vital signs if present
        if (vs) {
          const vsParts: string[] = []
          if (vs.blood_pressure) vsParts.push(`${isAr ? '\u0636\u063a\u0637 \u0627\u0644\u062f\u0645' : 'BP'}: ${vs.blood_pressure}`)
          if (vs.weight) vsParts.push(`${isAr ? '\u0627\u0644\u0648\u0632\u0646' : 'Weight'}: ${vs.weight}`)
          if (vs.pulse) vsParts.push(`${isAr ? '\u0627\u0644\u0646\u0628\u0636' : 'Pulse'}: ${vs.pulse}`)
          if (vsParts.length > 0) {
            detailRow += `<tr><td colspan="6" style="padding:4px 12px;background:#f5f5f5;font-size:15px;color:#555">${vsParts.join(' &nbsp;|&nbsp; ')}</td></tr>`
          }
        }
      }

      return `
    <tr>
      <td>${v.visit_date}</td>
      <td><span style="color:${typeColor};font-weight:700">${visitType}</span></td>
      <td>${v.chief_complaint || '\u2014'}</td>
      <td>${v.diagnosis || '\u2014'}</td>
      <td>${v.treatment_plan || '\u2014'}</td>
      <td>${v.notes || '\u2014'}</td>
    </tr>${detailRow}`
    })
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
    visits.length > 0
      ? `<div class="section">
    <h2>${l.medicalRecords} (${visits.length} ${l.visit})</h2>
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

