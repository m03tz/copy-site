export interface FieldRef {
  min?: number
  max?: number
  hint: string
}

export interface SectionField {
  key: string
  placeholder: string
  inputType: 'number' | 'text'
}

export interface LabSection {
  key: string
  label: string
  icon: string
  fields: SectionField[]
}

export const REF: Record<string, FieldRef> = {
  // CBC
  hb:                  { min: 12.0, max: 17.5, hint: 'Normal: 12.0–16.0 g/dL (F) / 13.5–17.5 g/dL (M)' },
  wbc:                 { min: 4.5,  max: 11.0, hint: 'Normal: 4.5–11.0 ×10³/μL' },
  plt:                 { min: 150,  max: 400,  hint: 'Normal: 150–400 ×10³/μL' },
  rbc:                 { min: 3.8,  max: 5.9,  hint: 'Normal: 3.8–5.2 ×10⁶/μL (F) / 4.5–5.9 ×10⁶/μL (M)' },
  hct:                 { min: 36,   max: 53,   hint: 'Normal: 36–46% (F) / 41–53% (M)' },
  mcv:                 { min: 80,   max: 100,  hint: 'Normal: 80–100 fL' },
  mch:                 { min: 27,   max: 33,   hint: 'Normal: 27–33 pg' },
  mchc:                { min: 32,   max: 36,   hint: 'Normal: 32–36 g/dL' },
  // Urine (numeric)
  ua_ph:               { min: 4.5,  max: 8.0,  hint: 'Normal: 4.5–8.0' },
  ua_specific_gravity: { min: 1.005, max: 1.030, hint: 'Normal: 1.005–1.030' },
  ua_wbc_hpf:          { min: 0,    max: 5,    hint: 'Normal: 0–5 /HPF' },
  ua_rbc_hpf:          { min: 0,    max: 2,    hint: 'Normal: 0–2 /HPF' },
  // LFT
  alt:                 { min: 7,    max: 56,   hint: 'Normal: 7–56 U/L' },
  ast:                 { min: 10,   max: 40,   hint: 'Normal: 10–40 U/L' },
  alp:                 { min: 44,   max: 147,  hint: 'Normal: 44–147 U/L' },
  total_bilirubin:     { min: 0.1,  max: 1.2,  hint: 'Normal: 0.1–1.2 mg/dL' },
  direct_bilirubin:    { min: 0.0,  max: 0.3,  hint: 'Normal: 0.0–0.3 mg/dL' },
  total_protein:       { min: 6.3,  max: 8.2,  hint: 'Normal: 6.3–8.2 g/dL' },
  albumin:             { min: 3.5,  max: 5.0,  hint: 'Normal: 3.5–5.0 g/dL' },
  // KFT
  creatinine:          { min: 0.5,  max: 1.3,  hint: 'Normal: 0.5–1.1 mg/dL (F) / 0.7–1.3 mg/dL (M)' },
  bun:                 { min: 7,    max: 20,   hint: 'Normal: 7–20 mg/dL' },
  uric_acid:           { min: 2.4,  max: 7.0,  hint: 'Normal: 2.4–6.0 mg/dL (F) / 3.4–7.0 mg/dL (M)' },
  egfr:                { min: 60,              hint: 'Normal: ≥60 mL/min' },
  sodium:              { min: 136,  max: 145,  hint: 'Normal: 136–145 mEq/L' },
  potassium:           { min: 3.5,  max: 5.1,  hint: 'Normal: 3.5–5.1 mEq/L' },
  chloride:            { min: 98,   max: 107,  hint: 'Normal: 98–107 mEq/L' },
  // Blood Sugar & Hormones
  fbs:                 { min: 70,   max: 100,  hint: 'Normal: 70–100 mg/dL' },
  rbs:                 {            max: 140,  hint: 'Normal: <140 mg/dL' },
  ogtt_fasting:        { min: 70,   max: 100,  hint: 'Normal: Fasting <100 mg/dL' },
  ogtt_1hr:            {            max: 180,  hint: 'Normal: 1hr <180 mg/dL' },
  ogtt_2hr:            {            max: 140,  hint: 'Normal: 2hr <140 mg/dL' },
  hba1c:               {            max: 5.7,  hint: 'Normal: <5.7%' },
  tsh:                 { min: 0.4,  max: 4.0,  hint: 'Normal: 0.4–4.0 mIU/L' },
  t3:                  { min: 80,   max: 200,  hint: 'Normal: 80–200 ng/dL' },
  t4:                  { min: 5.0,  max: 12.0, hint: 'Normal: 5.0–12.0 μg/dL' },
  hcg_lab:             {            max: 5,    hint: 'Normal: <5 mIU/mL (non-pregnant)' },
  // Lipid Profile
  total_cholesterol:   {            max: 200,  hint: 'Normal: <200 mg/dL' },
  ldl:                 {            max: 100,  hint: 'Normal: <100 mg/dL' },
  hdl:                 { min: 40,              hint: 'Normal: >50 mg/dL (F) / >40 mg/dL (M)' },
  triglycerides:       {            max: 150,  hint: 'Normal: <150 mg/dL' },
}

export const FIELD_LABELS: Record<string, string> = {
  hb: 'HB (g/dL)',
  wbc: 'WBC (×10³/μL)',
  plt: 'PLT (×10³/μL)',
  rbc: 'RBC (×10⁶/μL)',
  hct: 'HCT (%)',
  mcv: 'MCV (fL)',
  mch: 'MCH (pg)',
  mchc: 'MCHC (g/dL)',
  ua_color: 'Color',
  ua_appearance: 'Appearance',
  ua_ph: 'pH',
  ua_specific_gravity: 'Specific Gravity',
  ua_protein: 'Protein',
  ua_glucose: 'Glucose',
  ua_ketones: 'Ketones',
  ua_blood: 'Blood',
  ua_nitrites: 'Nitrites',
  ua_leukocyte_esterase: 'Leukocyte Esterase',
  ua_wbc_hpf: 'WBC (/HPF)',
  ua_rbc_hpf: 'RBC (/HPF)',
  ua_casts: 'Casts',
  ua_bacteria: 'Bacteria',
  alt: 'ALT (U/L)',
  ast: 'AST (U/L)',
  alp: 'ALP (U/L)',
  total_bilirubin: 'Total Bilirubin (mg/dL)',
  direct_bilirubin: 'Direct Bilirubin (mg/dL)',
  total_protein: 'Total Protein (g/dL)',
  albumin: 'Albumin (g/dL)',
  creatinine: 'Creatinine (mg/dL)',
  bun: 'BUN (mg/dL)',
  uric_acid: 'Uric Acid (mg/dL)',
  egfr: 'eGFR (mL/min)',
  sodium: 'Sodium (mEq/L)',
  potassium: 'Potassium (mEq/L)',
  chloride: 'Chloride (mEq/L)',
  fbs: 'FBS (mg/dL)',
  rbs: 'RBS (mg/dL)',
  ogtt_fasting: 'OGTT Fasting (mg/dL)',
  ogtt_1hr: 'OGTT 1hr (mg/dL)',
  ogtt_2hr: 'OGTT 2hr (mg/dL)',
  hba1c: 'HbA1c (%)',
  insulin: 'Insulin (μIU/mL)',
  tsh: 'TSH (mIU/L)',
  t3: 'T3 (ng/dL)',
  t4: 'T4 (μg/dL)',
  hcg_lab: 'B-HCG (mIU/mL)',
  total_cholesterol: 'Total Cholesterol (mg/dL)',
  ldl: 'LDL (mg/dL)',
  hdl: 'HDL (mg/dL)',
  triglycerides: 'Triglycerides (mg/dL)',
}

export const LAB_SECTIONS: LabSection[] = [
  {
    key: 'cbc',
    label: 'CBC – Complete Blood Count',
    icon: '🩸',
    fields: [
      { key: 'hb',   placeholder: 'g/dL',    inputType: 'number' },
      { key: 'plt',  placeholder: '×10³/μL', inputType: 'number' },
      { key: 'wbc',  placeholder: '×10³/μL', inputType: 'number' },
      { key: 'rbc',  placeholder: '×10⁶/μL', inputType: 'number' },
      { key: 'hct',  placeholder: '%',        inputType: 'number' },
      { key: 'mcv',  placeholder: 'fL',       inputType: 'number' },
      { key: 'mch',  placeholder: 'pg',       inputType: 'number' },
      { key: 'mchc', placeholder: 'g/dL',     inputType: 'number' },
    ],
  },
  {
    key: 'urine',
    label: 'Urine Analysis',
    icon: '🧪',
    fields: [
      { key: 'ua_color',              placeholder: 'e.g. Yellow',      inputType: 'text' },
      { key: 'ua_appearance',         placeholder: 'e.g. Clear',        inputType: 'text' },
      { key: 'ua_ph',                 placeholder: '4.5–8.0',           inputType: 'number' },
      { key: 'ua_specific_gravity',   placeholder: '1.005–1.030',       inputType: 'number' },
      { key: 'ua_protein',            placeholder: 'Neg / Pos',         inputType: 'text' },
      { key: 'ua_glucose',            placeholder: 'Neg / Pos',         inputType: 'text' },
      { key: 'ua_ketones',            placeholder: 'Neg / Pos',         inputType: 'text' },
      { key: 'ua_blood',              placeholder: 'Neg / Pos',         inputType: 'text' },
      { key: 'ua_nitrites',           placeholder: 'Neg / Pos',         inputType: 'text' },
      { key: 'ua_leukocyte_esterase', placeholder: 'Neg / Pos',         inputType: 'text' },
      { key: 'ua_wbc_hpf',            placeholder: '/HPF',              inputType: 'number' },
      { key: 'ua_rbc_hpf',            placeholder: '/HPF',              inputType: 'number' },
      { key: 'ua_casts',              placeholder: 'type or Neg',       inputType: 'text' },
      { key: 'ua_bacteria',           placeholder: 'Neg / Few / Many',  inputType: 'text' },
    ],
  },
  {
    key: 'lft',
    label: 'Liver Function Tests (LFT)',
    icon: '🫀',
    fields: [
      { key: 'alt',              placeholder: 'U/L',   inputType: 'number' },
      { key: 'ast',              placeholder: 'U/L',   inputType: 'number' },
      { key: 'alp',              placeholder: 'U/L',   inputType: 'number' },
      { key: 'total_bilirubin',  placeholder: 'mg/dL', inputType: 'number' },
      { key: 'direct_bilirubin', placeholder: 'mg/dL', inputType: 'number' },
      { key: 'total_protein',    placeholder: 'g/dL',  inputType: 'number' },
      { key: 'albumin',          placeholder: 'g/dL',  inputType: 'number' },
    ],
  },
  {
    key: 'kft',
    label: 'Kidney Function Tests (KFT)',
    icon: '🫘',
    fields: [
      { key: 'creatinine', placeholder: 'mg/dL',  inputType: 'number' },
      { key: 'bun',        placeholder: 'mg/dL',  inputType: 'number' },
      { key: 'uric_acid',  placeholder: 'mg/dL',  inputType: 'number' },
      { key: 'egfr',       placeholder: 'mL/min', inputType: 'number' },
      { key: 'sodium',     placeholder: 'mEq/L',  inputType: 'number' },
      { key: 'potassium',  placeholder: 'mEq/L',  inputType: 'number' },
      { key: 'chloride',   placeholder: 'mEq/L',  inputType: 'number' },
    ],
  },
  {
    key: 'hormones',
    label: 'Blood Sugar & Hormones',
    icon: '🩺',
    fields: [
      { key: 'fbs',          placeholder: 'mg/dL',  inputType: 'number' },
      { key: 'rbs',          placeholder: 'mg/dL',  inputType: 'number' },
      { key: 'ogtt_fasting', placeholder: 'mg/dL',  inputType: 'number' },
      { key: 'ogtt_1hr',     placeholder: 'mg/dL',  inputType: 'number' },
      { key: 'ogtt_2hr',     placeholder: 'mg/dL',  inputType: 'number' },
      { key: 'hba1c',        placeholder: '%',      inputType: 'number' },
      { key: 'insulin', placeholder: 'μIU/mL', inputType: 'number' },
      { key: 'tsh',     placeholder: 'mIU/L',  inputType: 'number' },
      { key: 't3',      placeholder: 'ng/dL',  inputType: 'number' },
      { key: 't4',      placeholder: 'μg/dL',  inputType: 'number' },
      { key: 'hcg_lab', placeholder: 'mIU/mL', inputType: 'number' },
    ],
  },
  {
    key: 'lipid',
    label: 'Lipid Profile',
    icon: '📋',
    fields: [
      { key: 'total_cholesterol', placeholder: 'mg/dL', inputType: 'number' },
      { key: 'ldl',               placeholder: 'mg/dL', inputType: 'number' },
      { key: 'hdl',               placeholder: 'mg/dL', inputType: 'number' },
      { key: 'triglycerides',     placeholder: 'mg/dL', inputType: 'number' },
    ],
  },
]

export type FieldStatus = 'normal' | 'high' | 'low'

export function getStatus(fieldKey: string, value: string): FieldStatus | null {
  const ref = REF[fieldKey]
  if (!ref || !value || value.trim() === '') return null
  const num = parseFloat(value)
  if (isNaN(num)) return null
  if (ref.min !== undefined && num < ref.min) return 'low'
  if (ref.max !== undefined && num > ref.max) return 'high'
  return 'normal'
}

export function parseStructuredResult(result: string | null): Record<string, string> | null {
  if (!result) return null
  try {
    const parsed = JSON.parse(result)
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, string>
    }
    return null
  } catch {
    return null
  }
}
