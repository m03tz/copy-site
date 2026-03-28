'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/client'
import { patientLoginByFileNo } from '@/lib/actions/patient-login'
import { staffLoginByPhone } from '@/lib/actions/staff-login'
import { Link } from '@/i18n/routing'
import Image from 'next/image'

type Tab = 'patient' | 'staff'

export default function LoginPage() {
  const t = useTranslations('auth')
  const tc = useTranslations('common')
  const locale = useLocale()
  const isRtl = locale === 'ar'
  const router = useRouter()

  const [tab, setTab] = useState<Tab>('patient')

  // Patient
  const [fileNo, setFileNo] = useState('')
  const [patientError, setPatientError] = useState('')
  const [patientLoading, setPatientLoading] = useState(false)

  // Staff
  const [staffPhone, setStaffPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [staffError, setStaffError] = useState('')
  const [staffLoading, setStaffLoading] = useState(false)

  const handlePatientLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setPatientError('')
    setPatientLoading(true)
    try {
      const result = await patientLoginByFileNo(fileNo.trim())
      if ('error' in result) { setPatientError(t(result.error)); return }
      const supabase = createClient()
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: result.token_hash, type: 'magiclink',
      })
      if (verifyError) { setPatientError(t('loginFailed')); return }
      router.push('/patient/dashboard')
    } catch { setPatientError(t('loginFailed')) }
    finally { setPatientLoading(false) }
  }

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setStaffError('')
    setStaffLoading(true)
    try {
      const result = await staffLoginByPhone(staffPhone.trim(), password)
      if ('error' in result) { setStaffError(t(result.error)); return }
      router.push(`/${result.role}/dashboard`)
    } catch { setStaffError(t('loginFailed')) }
    finally { setStaffLoading(false) }
  }

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', background: '#f8fafc', overflow: 'hidden' }}
    >
      {/* ── LEFT PANEL ─────────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[52%] xl:w-[55%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #0f172a 0%, #1e3a8a 45%, #0e7490 100%)' }}
      >
        {/* Dot pattern */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,.06) 1px, transparent 1px)',
          backgroundSize: '36px 36px',
        }} />
        {/* Glow blobs */}
        <div style={{
          position: 'absolute', top: '-140px', right: '-140px',
          width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(96,165,250,.18), transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '-100px', left: '-80px',
          width: 380, height: 380, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(45,212,191,.12), transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Top: Logo + name */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, overflow: 'hidden', background: 'rgba(255,255,255,.1)', flexShrink: 0 }}>
              <Image src="/images/site logo.png" alt="Logo" width={48} height={48} style={{ objectFit: 'contain', width: '100%', height: '100%' }} />
            </div>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: '-.01em' }}>
              {isRtl ? 'عيادة د. فادي الصالح' : 'Dr. Fadi Al-Sahleh Clinic'}
            </span>
          </Link>
        </div>

        {/* Centre: Doctor photo + info */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, flex: 1, justifyContent: 'center' }}>
          {/* Glowing ring photo */}
          <div style={{
            width: 180, height: 180, borderRadius: '50%', padding: 4, flexShrink: 0,
            background: 'linear-gradient(135deg, #2dd4bf, #3b82f6, #1e40af)',
            boxShadow: '0 0 0 10px rgba(45,212,191,.12), 0 0 0 20px rgba(45,212,191,.06)',
          }}>
            <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: '#1e3a8a' }}>
              <Image src="/images/fadi.jpg" alt="Dr. Fadi" width={180} height={180} style={{ objectFit: 'cover', width: '100%', height: '100%' }} priority />
            </div>
          </div>

          {/* Text */}
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: '-.02em', lineHeight: 1.2, marginBottom: 8 }}>
              {isRtl ? 'د. فادي الصالح' : 'Dr. Fadi Al-Sahleh'}
            </h2>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,.7)', lineHeight: 1.6, maxWidth: 300 }}>
              {isRtl
                ? 'أخصائي أمراض النساء والتوليد، علاج العقم وجراحة المنظار'
                : 'Specialist in Obstetrics & Gynecology, Infertility & Laparoscopic Surgery'}
            </p>
          </div>

          {/* Credential chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
            {[
              isRtl ? '🎓 خريج جاست' : '🎓 JUST Graduate',
              isRtl ? '🏅 البورد الأردني' : '🏅 Jordanian Board',
              isRtl ? '📜 البورد البريطاني ج١' : '📜 British Board Pt.1',
              isRtl ? '🏥 مستشفى الملك عبدالله' : '🏥 KAUH Experience',
            ].map((chip) => (
              <span key={chip} style={{
                fontSize: 11, fontWeight: 700,
                background: 'rgba(255,255,255,.1)',
                border: '1px solid rgba(255,255,255,.15)',
                borderRadius: 999, padding: '6px 12px',
                color: '#fff', whiteSpace: 'nowrap',
              }}>
                {chip}
              </span>
            ))}
          </div>

          {/* Quote */}
          <div style={{
            background: 'rgba(255,255,255,.07)',
            border: '1px solid rgba(255,255,255,.12)',
            borderRadius: 16, padding: '18px 24px', maxWidth: 340, textAlign: 'center',
          }}>
            <p style={{ fontSize: 13, fontStyle: 'italic', color: 'rgba(255,255,255,.65)', lineHeight: 1.7 }}>
              {isRtl
                ? '"رعاية صحية شاملة للمرأة في بيئة مريحة وآمنة"'
                : '"Providing comprehensive women\'s healthcare in a comfortable and safe environment"'}
            </p>
          </div>
        </div>

        {/* Bottom: Address */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>📍</span>
            {isRtl ? 'جرش، وسط البلد، شارع الشعب — مقابل غرفة تجارة جرش' : "Jarash, Downtown, AlSha'ab Street — opposite Jersh Chamber of Commerce"}
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL ────────────────────────────────────────── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px', background: '#fff',
      }}>
        {/* Mobile: logo */}
        <div className="lg:hidden" style={{ marginBottom: 28, textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 6 }}>
            <Image src="/images/site logo.png" alt="Logo" width={40} height={40} style={{ objectFit: 'contain' }} />
            <span style={{ fontSize: 17, fontWeight: 800, color: '#1e3a8a' }}>
              {isRtl ? 'عيادة د. فادي الصالح' : 'Dr. Fadi Al-Sahleh Clinic'}
            </span>
          </div>
        </div>

        {/* Form card */}
        <div style={{ width: '100%', maxWidth: 420 }}>
          {/* Header */}
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', letterSpacing: '-.02em', marginBottom: 6 }}>
              {isRtl ? 'مرحباً بك 👋' : 'Welcome back 👋'}
            </h1>
            <p style={{ fontSize: 14, color: '#64748b', fontWeight: 500 }}>
              {isRtl ? 'سجّل دخولك للوصول إلى ملفك الطبي وحجز مواعيدك' : 'Sign in to access your medical records and appointments'}
            </p>
          </div>

          {/* Tabs */}
          <div style={{
            display: 'flex', background: '#f1f5f9',
            borderRadius: 12, padding: 4, marginBottom: 28,
          }}>
            {(['patient', 'staff'] as Tab[]).map((t_) => (
              <button
                key={t_}
                type="button"
                onClick={() => setTab(t_)}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: 9, border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 700,
                  transition: 'all .2s',
                  background: tab === t_ ? '#fff' : 'transparent',
                  color: tab === t_ ? '#1e40af' : '#64748b',
                  boxShadow: tab === t_ ? '0 1px 6px rgba(0,0,0,.1)' : 'none',
                }}
              >
                {t_ === 'patient'
                  ? (isRtl ? '🧑‍⚕️ مريض' : '🧑‍⚕️ Patient')
                  : (isRtl ? '👨‍💼 طاقم العيادة' : '👨‍💼 Clinic Staff')}
              </button>
            ))}
          </div>

          {/* ── Patient Form ── */}
          {tab === 'patient' && (
            <form onSubmit={handlePatientLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 7 }}>
                  {isRtl ? 'رقم الملف' : t('fileNumber')}
                </label>
                <input
                  type="text"
                  dir="ltr"
                  placeholder=""
                  value={fileNo}
                  onChange={(e) => setFileNo(e.target.value)}
                  required
                  disabled={patientLoading}
                  style={{
                    width: '100%', padding: '12px 14px',
                    borderRadius: 10, border: '1.5px solid #e2e8f0',
                    fontSize: 14, fontWeight: 500, color: '#0f172a',
                    background: '#fff', outline: 'none',
                    transition: 'border-color .2s',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>

              {patientError && (
                <div style={{
                  background: '#fef2f2', border: '1px solid #fecaca',
                  borderRadius: 8, padding: '10px 14px',
                  fontSize: 13, color: '#dc2626', fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  ⚠️ {patientError}
                </div>
              )}

              <button
                type="submit"
                disabled={patientLoading}
                style={{
                  width: '100%', padding: '13px 0',
                  borderRadius: 10, border: 'none', cursor: patientLoading ? 'not-allowed' : 'pointer',
                  fontSize: 15, fontWeight: 800, color: '#fff',
                  background: patientLoading ? '#93c5fd' : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  boxShadow: patientLoading ? 'none' : '0 6px 20px rgba(37,99,235,.4)',
                  transition: 'all .25s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {patientLoading ? (
                  <>
                    <span style={{
                      width: 16, height: 16, border: '2px solid rgba(255,255,255,.4)',
                      borderTopColor: '#fff', borderRadius: '50%',
                      animation: 'spin .7s linear infinite', display: 'inline-block',
                    }} />
                    {tc('loading')}
                  </>
                ) : (
                  <>{isRtl ? '🔐 تسجيل الدخول' : '🔐 Sign In'}</>
                )}
              </button>

              <p style={{ textAlign: 'center', fontSize: 13, color: '#64748b', fontWeight: 500 }}>
                {isRtl ? 'ليس لديك حساب؟ ' : t('noAccount') + ' '}
                <Link href="/register" style={{ color: '#2563eb', fontWeight: 700, textDecoration: 'none' }}>
                  {isRtl ? 'إنشاء حساب' : t('createAccount')}
                </Link>
              </p>
            </form>
          )}

          {/* ── Staff Form ── */}
          {tab === 'staff' && (
            <form onSubmit={handleStaffLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 7 }}>
                  {isRtl ? 'رقم الهاتف' : t('phoneNumber')}
                </label>
                <input
                  type="tel"
                  dir="ltr"
                  placeholder={t('phonePlaceholder')}
                  value={staffPhone}
                  onChange={(e) => setStaffPhone(e.target.value)}
                  required
                  disabled={staffLoading}
                  style={{
                    width: '100%', padding: '12px 14px',
                    borderRadius: 10, border: '1.5px solid #e2e8f0',
                    fontSize: 14, fontWeight: 500, color: '#0f172a',
                    background: '#fff', outline: 'none',
                    transition: 'border-color .2s', boxSizing: 'border-box',
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 7 }}>
                  {isRtl ? 'كلمة المرور' : t('password')}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPass ? 'text' : 'password'}
                    dir="ltr"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={staffLoading}
                    style={{
                      width: '100%', padding: '12px 42px 12px 14px',
                      borderRadius: 10, border: '1.5px solid #e2e8f0',
                      fontSize: 14, fontWeight: 500, color: '#0f172a',
                      background: '#fff', outline: 'none',
                      transition: 'border-color .2s', boxSizing: 'border-box',
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    style={{
                      position: 'absolute', top: '50%', right: 12,
                      transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: '#94a3b8', padding: 0, display: 'flex', alignItems: 'center',
                    }}
                  >
                    {showPass ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {staffError && (
                <div style={{
                  background: '#fef2f2', border: '1px solid #fecaca',
                  borderRadius: 8, padding: '10px 14px',
                  fontSize: 13, color: '#dc2626', fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  ⚠️ {staffError}
                </div>
              )}

              <button
                type="submit"
                disabled={staffLoading}
                style={{
                  width: '100%', padding: '13px 0',
                  borderRadius: 10, border: 'none', cursor: staffLoading ? 'not-allowed' : 'pointer',
                  fontSize: 15, fontWeight: 800, color: '#fff',
                  background: staffLoading ? '#93c5fd' : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  boxShadow: staffLoading ? 'none' : '0 6px 20px rgba(37,99,235,.4)',
                  transition: 'all .25s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {staffLoading ? (
                  <>
                    <span style={{
                      width: 16, height: 16, border: '2px solid rgba(255,255,255,.4)',
                      borderTopColor: '#fff', borderRadius: '50%',
                      animation: 'spin .7s linear infinite', display: 'inline-block',
                    }} />
                    {tc('loading')}
                  </>
                ) : (
                  <>{isRtl ? '🔐 تسجيل الدخول' : '🔐 Sign In'}</>
                )}
              </button>
            </form>
          )}

          {/* Back to home */}
          <div style={{ marginTop: 28, textAlign: 'center' }}>
            <Link href="/" style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              ← {isRtl ? 'العودة إلى الصفحة الرئيسية' : 'Back to home'}
            </Link>
          </div>
        </div>

      </div>

      {/* Spinner keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
