'use client'

import { useTranslations, useLocale } from 'next-intl'
import { Link } from '@/i18n/routing'
import Image from 'next/image'
import { useEffect, useState } from 'react'

type ScheduleDay = { day_of_week: number; start_time: string; end_time: string; is_active: boolean }

const DAY_NAMES_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAY_NAMES_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h < 12 ? 'AM' : 'PM'
  const hour = h % 12 || 12
  return `${hour}${m ? ':' + String(m).padStart(2, '0') : ''} ${ampm}`
}
import {
  Stethoscope,
  Baby,
  HeartPulse,
  Scissors,
  MapPin,
  Phone,
  Clock,
  GraduationCap,
  Award,
  Building2,
  UserRound,
  Microscope,
  HeartHandshake,
  CalendarCheck,
  MapPinned,
  ArrowRight,
  Star,
  Shield,
  Calendar,
} from 'lucide-react'

export default function HomePage() {
  const t = useTranslations('landing')
  const locale = useLocale()
  const isRtl = locale === 'ar'
  const [schedule, setSchedule] = useState<ScheduleDay[]>([])

  useEffect(() => {
    fetch('/api/public/schedule').then(r => r.json()).then(setSchedule).catch(() => {})
  }, [])

  return (
    <div className="flex flex-col" dir={isRtl ? 'rtl' : 'ltr'}>

      {/* ── HERO ─────────────────────────────────────────── */}
      <section
        id="top"
        className="relative min-h-screen flex items-center overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 35%, #1d4ed8 65%, #0e7490 100%)' }}
      >
        {/* Decorative background */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,.07) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="absolute -top-52 -right-52 w-[700px] h-[700px] rounded-full pointer-events-none opacity-10"
          style={{ background: 'radial-gradient(circle, #60a5fa, transparent 70%)' }} />
        <div className="absolute -bottom-52 -left-28 w-[500px] h-[500px] rounded-full pointer-events-none opacity-10"
          style={{ background: 'radial-gradient(circle, #2dd4bf, transparent 70%)' }} />

        <div className="max-w-6xl mx-auto px-6 py-20 w-full grid lg:grid-cols-2 gap-16 items-center relative z-10">

          {/* Left: Content */}
          <div className={isRtl ? 'text-right' : ''}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold tracking-widest uppercase mb-6"
              style={{ background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.2)', color: '#2dd4bf', backdropFilter: 'blur(8px)' }}>
              <Star className="h-3.5 w-3.5" />
              {isRtl ? 'رعاية صحية متخصصة للمرأة' : "Specialized Women's Healthcare"}
            </div>

            <h1 className="font-black leading-[1.05] tracking-tight text-white mb-4"
              style={{ fontSize: 'clamp(32px, 4.5vw, 56px)' }}>
              {isRtl ? (
                <>عيادة الدكتور<br /><span style={{ background: 'linear-gradient(135deg, #2dd4bf, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>فادي الساحلة</span></>
              ) : (
                <>Dr. Fadi<br /><span style={{ background: 'linear-gradient(135deg, #2dd4bf, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Al-Sahleh</span><br />Clinic</>
              )}
            </h1>

            <p className="text-lg font-semibold mb-3" style={{ color: 'rgba(255,255,255,.8)' }}>
              {t('heroTitle')}
            </p>
            <p className="text-sm mb-10" style={{ color: 'rgba(255,255,255,.6)', lineHeight: 1.7 }}>
              {t('heroSubtitle')}
            </p>

            <div className="flex flex-wrap gap-4 items-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-2.5 font-bold text-sm px-8 py-3.5 rounded-full text-white transition-all hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', boxShadow: '0 8px 28px rgba(59,130,246,.45)' }}
              >
                <Calendar className="h-4 w-4" />
                {t('bookAppointment')}
                <ArrowRight className={`h-3.5 w-3.5 ${isRtl ? 'rotate-180' : ''}`} />
              </Link>
              <a
                href="https://wa.me/962786637847"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 font-semibold text-sm px-7 py-3.5 rounded-full text-white transition-all hover:-translate-y-0.5"
                style={{ background: 'rgba(255,255,255,.1)', border: '1.5px solid rgba(255,255,255,.25)', backdropFilter: 'blur(8px)' }}
              >
                <svg className="h-4 w-4" style={{ color: '#4ade80' }} fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                {isRtl ? 'واتساب' : 'WhatsApp Us'}
              </a>
            </div>

            <div className="flex items-center gap-2 mt-7 text-xs" style={{ color: 'rgba(255,255,255,.5)' }}>
              <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: '#2dd4bf' }} />
              {isRtl ? 'جرش، وسط البلد — شارع الشعب، مقابل غرفة تجارة جرش' : "Jarash, Downtown — AlSha'ab Street, opposite Jersh Chamber of Commerce"}
            </div>
          </div>

          {/* Right: Visual */}
          <div className="flex flex-col items-center gap-7">
            <div className="flex items-center justify-center gap-7">
              {/* Doctor photo */}
              <div className="relative shrink-0"
                style={{ width: 220, height: 220, borderRadius: '50%', background: 'linear-gradient(135deg, #2dd4bf, #3b82f6, #1e40af)', padding: 4, boxShadow: '0 0 0 10px rgba(45,212,191,.15), 0 0 0 20px rgba(45,212,191,.07)' }}>
                <div className="w-full h-full rounded-full overflow-hidden">
                  <Image src="/images/fadi.jpg" alt="Dr. Fadi Al-Sahleh" width={220} height={220} className="object-cover w-full h-full" priority />
                </div>
              </div>
              {/* Clinic logo */}
              <Image src="/images/site logo.png" alt={t('clinicName')} width={100} height={100} className="object-contain" priority
                style={{ filter: 'drop-shadow(0 8px 24px rgba(255,255,255,.2))' }} />
            </div>

            {/* Credential chips */}
            <div className="flex flex-wrap justify-center gap-2.5">
              {[
                { icon: GraduationCap, label: isRtl ? 'خريج JUST' : 'JUST Graduate' },
                { icon: Award, label: isRtl ? 'البورد الأردني — نسائية' : 'Jordanian Board — OB/GYN' },
                { icon: Building2, label: isRtl ? 'خبرة KAUH' : 'KAUH Experience' },
                { icon: Shield, label: isRtl ? 'البورد البريطاني ج.١' : 'British Board Part 1' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold text-white"
                  style={{ background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.18)', backdropFilter: 'blur(12px)' }}>
                  <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: '#2dd4bf' }} />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-9 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 opacity-60 pointer-events-none">
          <div className="w-5 h-8 rounded-[11px] flex items-start justify-center pt-1.5" style={{ border: '2px solid rgba(255,255,255,.5)' }}>
            <div className="w-0.5 h-2 rounded-full animate-bounce" style={{ background: 'rgba(255,255,255,.7)' }} />
          </div>
          <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,.45)' }}>Scroll</span>
        </div>
      </section>


      {/* ── STATS BAR ──────────────────────────────────── */}
      <div className="bg-background shadow-md relative z-10 border-b border-border">
        <div className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4">
          {[
            { icon: UserRound, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400', num: 'OB/GYN', label: isRtl ? 'أخصائي' : 'Specialist' },
            { icon: Microscope, color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400', num: '4', label: isRtl ? 'خدمات أساسية' : 'Core Services' },
            { icon: Clock, color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400', num: '10–2', label: isRtl ? 'ساعات يومية' : 'Daily Hours (AM–PM)' },
            { icon: CalendarCheck, color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400', num: '5', label: isRtl ? 'أيام أسبوعياً' : 'Days a Week' },
          ].map(({ icon: Icon, color, num, label }, i) => (
            <div key={i} className="flex flex-col items-center text-center py-7 px-5 border-b lg:border-b-0 border-r border-border last:border-r-0 hover:bg-muted/50 transition-colors">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="text-2xl font-black text-blue-900 dark:text-blue-300 tracking-tight leading-none">{num}</div>
              <div className="text-xs font-semibold text-muted-foreground mt-1">{label}</div>
            </div>
          ))}
        </div>
      </div>


      {/* ── ABOUT ──────────────────────────────────────── */}
      <section id="about" className="py-24 bg-background">
        <div className="max-w-6xl mx-auto px-6">
          <div className={`grid lg:grid-cols-2 gap-16 items-center ${isRtl ? 'lg:grid-flow-col-dense' : ''}`}>

            {/* Image side */}
            <div className="relative flex justify-center lg:justify-start">
              <div className="relative overflow-hidden shadow-xl"
                style={{ width: '100%', maxWidth: 400, aspectRatio: '4/5', borderRadius: '40px 8px 40px 8px', background: 'linear-gradient(145deg, #dbeafe, #bfdbfe)' }}>
                <Image src="/images/fadi.jpg" alt="Dr. Fadi Al-Sahleh" fill className="object-cover object-top" />
              </div>
            </div>

            {/* Content side */}
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-extrabold tracking-widest uppercase text-blue-600 bg-blue-50 mb-4">
                <Shield className="h-3 w-3" />
                {t('aboutDoctor')}
              </div>
              <h2 className="text-3xl lg:text-4xl font-black text-foreground leading-tight mb-3">
                {isRtl ? 'د. فادي الساحلة' : 'Dr. Fadi Al-Sahleh'}<br />
                <span style={{ background: 'linear-gradient(135deg, #2563eb, #14b8a6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  {isRtl ? 'أخصائي نسائية وتوليد' : 'OB/GYN Specialist'}
                </span>
              </h2>
              <div className="w-12 h-1 rounded-full mb-5"
                style={{ background: 'linear-gradient(90deg, #3b82f6, #14b8a6)' }} />
              <p className="text-muted-foreground leading-relaxed mb-7">
                {isRtl
                  ? 'الدكتور فادي الساحلة متخصص مؤهل في طب النساء والتوليد، يمتلك خلفية أكاديمية متميزة وخبرة سريرية عملية في أحد أبرز مستشفيات الأردن.'
                  : 'Dr. Fadi Al-Sahleh is a highly qualified specialist in Obstetrics and Gynecology with a strong academic background and hands-on clinical experience at one of Jordan\'s leading hospitals.'}
              </p>

              <div className="flex flex-col gap-3.5">
                {[
                  { icon: GraduationCap, color: 'bg-blue-100 text-blue-700', title: isRtl ? 'MBBCh — جامعة العلوم والتكنولوجيا' : 'MBBCh — Jordan University of Science & Technology', sub: isRtl ? 'بكالوريوس الطب والجراحة (JUST)' : 'Bachelor of Medicine and Surgery (JUST)' },
                  { icon: Award, color: 'bg-teal-100 text-teal-700', title: isRtl ? 'البورد الأردني — نسائية وتوليد' : 'Jordanian Board — Obstetrics & Gynecology', sub: isRtl ? 'شهادة البورد الوطنية في تخصص النسائية' : 'National board certification in OB/GYN specialty' },
                  { icon: Shield, color: 'bg-indigo-100 text-indigo-700', title: isRtl ? 'البورد البريطاني الجزء الأول — نسائية' : 'British Board Part 1 — OB/GYN', sub: isRtl ? 'مؤهل دولي — MRCOG الجزء الأول' : 'International qualification — MRCOG Part 1' },
                  { icon: Building2, color: 'bg-blue-100 text-blue-700', title: isRtl ? 'مستشفى الملك عبدالله الجامعي' : 'King Abdullah University Hospital', sub: isRtl ? 'خبرة سريرية سابقة في KAUH، اربد، الأردن' : 'Previous clinical experience at KAUH, Irbid, Jordan' },
                ].map(({ icon: Icon, color, title, sub }) => (
                  <div key={title} className="flex items-start gap-3.5 p-4 rounded-xl border border-border bg-muted/40 hover:bg-blue-50 hover:border-blue-200 dark:hover:bg-blue-900/20 dark:hover:border-blue-700 transition-all cursor-default group">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-foreground">{title}</div>
                      <div className="text-xs font-medium text-muted-foreground mt-0.5 leading-relaxed">{sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* ── SERVICES ───────────────────────────────────── */}
      <section id="services" className="py-24 bg-slate-50 dark:bg-slate-900/60">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-14">
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-extrabold tracking-widest uppercase text-blue-600 bg-blue-50 mb-4">
                <Stethoscope className="h-3 w-3" />
                {isRtl ? 'ما نقدمه' : 'What We Offer'}
              </div>
              <h2 className="text-3xl lg:text-4xl font-black text-foreground tracking-tight mb-3">
                {isRtl ? 'خدماتنا الطبية' : 'Our Medical Services'}
              </h2>
              <div className="w-12 h-1 rounded-full mb-4" style={{ background: 'linear-gradient(90deg, #3b82f6, #14b8a6)' }} />
              <p className="text-muted-foreground max-w-md leading-relaxed">
                {isRtl
                  ? 'رعاية شاملة وصادقة في جميع مجالات صحة المرأة — من الاستشارات الروتينية إلى الإجراءات الجراحية المتقدمة.'
                  : "Comprehensive, compassionate care across all areas of women's health — from routine consultations to advanced surgical procedures."}
              </p>
            </div>
            <Link href="/login"
              className="inline-flex items-center gap-2.5 font-bold text-sm px-7 py-3.5 rounded-full text-white shrink-0 transition-all hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', boxShadow: '0 8px 28px rgba(59,130,246,.35)' }}>
              <CalendarCheck className="h-4 w-4" />
              {isRtl ? 'احجز الآن' : 'Book Now'}
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {[
              { icon: Stethoscope, color: 'from-blue-500 to-blue-700', num: '01', title: t('serviceObgyn'), desc: isRtl ? 'فحوصات شاملة لصحة المرأة ومتابعة طبية متخصصة، تعالج جميع المخاوف النسائية بخبرة وسرية.' : 'Comprehensive women\'s health examinations and specialized medical follow-up, addressing all gynecological concerns with expertise and discretion.' },
              { icon: Baby, color: 'from-teal-500 to-teal-600', num: '02', title: t('servicePregnancy'), desc: isRtl ? 'متابعة دقيقة للحمل ومراقبة الجنين باستخدام أحدث أجهزة التصوير بالموجات فوق الصوتية لرحلة حمل صحية وآمنة.' : 'Careful pregnancy follow-up and fetal monitoring using the latest ultrasound and diagnostic equipment for a healthy, confident pregnancy journey.' },
              { icon: HeartPulse, color: 'from-indigo-500 to-indigo-700', num: '03', title: t('serviceInfertility'), desc: isRtl ? 'تشخيص شامل وعلاج قائم على الأدلة لمشاكل الإنجاب باستخدام أساليب الإنجاب المساعدة الحديثة وخطط رعاية شخصية.' : 'Thorough diagnosis and evidence-based treatment of reproductive issues using modern assisted reproduction methods and personalized care plans.' },
              { icon: Scissors, color: 'from-violet-500 to-violet-700', num: '04', title: t('serviceSurgery'), desc: isRtl ? 'إجراءات جراحية طفيفة التوغل باستخدام تقنيات المنظار المتقدمة — تعافٍ أسرع، ألم أقل، ودقة فائقة.' : 'Minimally invasive surgical procedures using advanced laparoscopic techniques — shorter recovery times, less pain, and superior precision.' },
            ].map(({ icon: Icon, color, num, title, desc }) => (
              <div key={num} className="relative bg-background rounded-2xl p-8 border border-border shadow-sm overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:border-transparent group">
                <div className={`absolute top-5 ${isRtl ? 'left-6' : 'right-6'} text-7xl font-black text-slate-100 dark:text-slate-800 leading-none select-none pointer-events-none`} dir="ltr">{num}</div>
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-5 bg-gradient-to-br ${color}`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="absolute top-0 left-0 right-0 h-1 scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300 rounded-t-2xl"
                  style={{ background: 'linear-gradient(90deg, #3b82f6, #14b8a6)' }} />
                <h3 className="text-lg font-extrabold text-foreground mb-2.5 leading-tight">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ── WHY CHOOSE US ──────────────────────────────── */}
      <section className="py-24 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #0e7490 100%)' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,.05) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-extrabold tracking-widest uppercase mb-4"
              style={{ background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.15)', color: '#2dd4bf' }}>
              <Shield className="h-3 w-3" />
              {isRtl ? 'لماذا تختارنا' : 'Why Choose Us'}
            </div>
            <h2 className="text-3xl lg:text-4xl font-black text-white tracking-tight mb-4">
              {isRtl ? 'صحتك، أولويتنا' : 'Your Health, Our Priority'}
            </h2>
            <p className="text-sm max-w-md mx-auto leading-relaxed" style={{ color: 'rgba(255,255,255,.65)' }}>
              {isRtl
                ? 'نجمع بين التميز الطبي والتعاطف الحقيقي لتقديم الرعاية التي تستحقها المرأة في كل مرحلة من مراحل حياتها.'
                : 'We combine medical excellence with genuine compassion to deliver the care that women deserve at every stage of life.'}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: UserRound, c: 'rgba(59,130,246,.25)', ic: '#60a5fa', title: isRtl ? 'أخصائي معتمد' : 'Board-Certified Specialist', text: isRtl ? 'طبيب نسائية مؤهل وطنياً ودولياً بتميز سريري.' : 'Nationally and internationally qualified OB/GYN physician with clinical excellence.' },
              { icon: Microscope, c: 'rgba(45,212,191,.2)', ic: '#2dd4bf', title: isRtl ? 'أجهزة حديثة' : 'Modern Equipment', text: isRtl ? 'أحدث تقنيات التشخيص والتصوير لنتائج دقيقة وموثوقة.' : 'Latest diagnostic and imaging technology for accurate, reliable results every time.' },
              { icon: HeartHandshake, c: 'rgba(74,222,128,.2)', ic: '#4ade80', title: isRtl ? 'رعاية بتعاطف' : 'Compassionate Care', text: isRtl ? 'بيئة دافئة ومرحّبة حيث يشعر المرضى بالراحة والاحترام.' : 'A warm, welcoming environment where patients feel comfortable and respected.' },
              { icon: CalendarCheck, c: 'rgba(167,139,250,.2)', ic: '#c4b5fd', title: isRtl ? 'حجز سهل' : 'Easy Appointment Booking', text: isRtl ? 'احجز عبر الإنترنت أو واتساب — سريع وبسيط ومؤكد فوراً.' : 'Book online or via WhatsApp — quick, simple, and confirmed instantly.' },
              { icon: Scissors, c: 'rgba(251,191,36,.2)', ic: '#fbbf24', title: isRtl ? 'جراحة طفيفة التوغل' : 'Minimally Invasive Surgery', text: isRtl ? 'إجراءات منظار متقدمة مع تعافٍ أسرع وأقل إزعاج.' : 'Advanced laparoscopic procedures with faster recovery and minimal discomfort.' },
              { icon: MapPinned, c: 'rgba(249,115,22,.2)', ic: '#fb923c', title: isRtl ? 'موقع مناسب' : 'Convenient Location', text: isRtl ? 'في وسط جرش، سهل الوصول لجميع المرضى.' : 'Centrally located in Jarash downtown, easily accessible for all patients.' },
            ].map(({ icon: Icon, c, ic, title, text }) => (
              <div key={title} className="rounded-2xl p-8 text-center transition-all hover:-translate-y-1"
                style={{ background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.12)', backdropFilter: 'blur(10px)' }}>
                <div className="w-16 h-16 rounded-[20px] flex items-center justify-center mx-auto mb-5" style={{ background: c }}>
                  <Icon className="h-7 w-7" style={{ color: ic }} />
                </div>
                <h3 className="text-base font-extrabold text-white mb-2.5">{title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,.6)' }}>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ── CONTACT ────────────────────────────────────── */}
      <section id="contact" className="py-24 bg-background">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-extrabold tracking-widest uppercase text-blue-600 bg-blue-50 mb-4">
              <MapPin className="h-3 w-3" />
              {isRtl ? 'تواصل معنا' : 'Get in Touch'}
            </div>
            <h2 className="text-3xl lg:text-4xl font-black text-foreground tracking-tight mb-3">{t('contactTitle')}</h2>
            <div className="w-12 h-1 rounded-full mx-auto mb-4" style={{ background: 'linear-gradient(90deg, #3b82f6, #14b8a6)' }} />
            <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
              {isRtl ? 'نحن هنا من أجلك. تواصل معنا لحجز موعدك أو طرح أي أسئلة.' : 'We are here for you. Reach out to schedule your appointment or ask any questions.'}
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-start max-w-5xl mx-auto">
            {/* Info */}
            <div>
              <h3 className="text-xl font-extrabold text-foreground mb-8">{isRtl ? 'معلومات العيادة' : 'Clinic Information'}</h3>
              <div className="flex flex-col gap-6">
                <div className="flex gap-4 items-start">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-blue-100 text-blue-700">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground mb-1">{t('address')}</div>
                    <div className="text-sm font-semibold text-foreground">{t('clinicAddress')}</div>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-green-100 text-green-700">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground mb-1">{t('phone')} / WhatsApp</div>
                    <a
                      href={`https://wa.me/${t('clinicPhone').replace(/\s+/g, '').replace('+', '')}`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-sm font-bold text-green-600 hover:underline" dir="ltr"
                    >
                      {t('clinicPhone')}
                    </a>
                    <div className="text-xs text-muted-foreground mt-0.5">{isRtl ? 'متاح خلال ساعات العمل' : 'Available during working hours'}</div>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-blue-100 text-blue-700">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-2">{t('workingHours')}</div>
                    {schedule.length === 0 ? (
                      <div className="text-sm text-muted-foreground">{isRtl ? 'جاري التحميل...' : 'Loading...'}</div>
                    ) : (
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        {Array.from({ length: 7 }, (_, i) => {
                          const day = schedule.find(s => s.day_of_week === i)
                          const name = isRtl ? DAY_NAMES_AR[i] : DAY_NAMES_EN[i]
                          return (
                            <div key={i} className="flex justify-between gap-2 text-xs py-1 border-b border-border">
                              <span className="font-semibold text-foreground">{name}</span>
                              {day && day.is_active
                                ? <span className="font-bold text-blue-600">{formatTime(day.start_time)} – {formatTime(day.end_time)}</span>
                                : <span className="font-bold text-red-400">{isRtl ? 'مغلق' : 'Closed'}</span>
                              }
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Booking card */}
            <div className="rounded-2xl p-12 text-center relative overflow-hidden"
              style={{ background: 'linear-gradient(145deg, #0f172a, #1e3a8a)' }}>
              <div className="absolute inset-0 pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,.06) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-18 h-18 rounded-full flex items-center justify-center mb-6"
                  style={{ width: 72, height: 72, background: 'rgba(255,255,255,.12)' }}>
                  <CalendarCheck className="h-7 w-7" style={{ color: '#2dd4bf' }} />
                </div>
                <h3 className="text-2xl font-black text-white mb-3 leading-tight">
                  {isRtl ? 'احجز موعدك' : 'Book Your Appointment'}
                </h3>
                <p className="text-sm mb-8 leading-relaxed" style={{ color: 'rgba(255,255,255,.65)' }}>
                  {isRtl
                    ? 'سجّل الدخول إلى بوابة المريض لحجز مواعيدك وإدارتها ومتابعتها مع د. فادي الساحلة.'
                    : 'Sign in to the patient portal to book, manage, and track your appointments with Dr. Fadi Al-Sahleh.'}
                </p>
                <Link href="/login"
                  className="w-full inline-flex items-center justify-center gap-2.5 font-bold text-sm px-8 py-4 rounded-full text-white transition-all hover:-translate-y-0.5 mb-3"
                  style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)', boxShadow: '0 8px 28px rgba(14,148,110,.4)' }}>
                  <Calendar className="h-4 w-4" />
                  {isRtl ? 'احجز موعداً عبر الإنترنت' : 'Book Appointment Online'}
                </Link>
                <a href="https://wa.me/962786637847" target="_blank" rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2.5 font-bold text-sm px-8 py-4 rounded-full text-white transition-all hover:-translate-y-0.5"
                  style={{ background: 'rgba(255,255,255,.08)', border: '1.5px solid rgba(255,255,255,.2)' }}>
                  <svg className="h-4 w-4" style={{ color: '#4ade80' }} fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                  {isRtl ? 'تواصل عبر واتساب' : 'Chat on WhatsApp'}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
