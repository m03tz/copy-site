import { getTranslations, getLocale } from 'next-intl/server'
import Image from 'next/image'

export async function Footer() {
  const t = await getTranslations('landing')
  const locale = await getLocale()
  const isRtl = locale === 'ar'

  return (
    <footer style={{ background: '#0f172a' }} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Top section */}
      <div className="max-w-6xl mx-auto px-6 py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 shrink-0" style={{ borderColor: 'rgba(255,255,255,.2)' }}>
                <Image src="/images/fadi.png" alt="Dr. Fadi" width={48} height={48} className="object-cover w-full h-full" />
              </div>
              <span className="text-base font-extrabold text-white">{t('clinicName')}</span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,.45)', maxWidth: 280 }}>
              {isRtl
                ? 'رعاية صحية متخصصة للمرأة في جرش، الأردن. نساء وتوليد، علاج العقم والجراحة بالمنظار.'
                : 'Specialized women\'s healthcare in Jarash, Jordan. Obstetrics, Gynecology, Infertility Treatment & Laparoscopic Surgery.'}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <div className="text-xs font-extrabold uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,.4)' }}>
              {isRtl ? 'روابط سريعة' : 'Quick Links'}
            </div>
            <ul className="flex flex-col gap-2.5">
              {[
                { href: '#about',    label: isRtl ? 'عن الطبيب'        : 'About the Doctor' },
                { href: '#services', label: isRtl ? 'خدماتنا'          : 'Our Services' },
                { href: '#contact',  label: isRtl ? 'التواصل والموقع'  : 'Contact & Location' },
                { href: `/${locale}/login`, label: isRtl ? 'تسجيل دخول المريض' : 'Patient Login' },
              ].map(({ href, label }) => (
                <li key={href}>
                  <a href={href} className="text-sm font-medium transition-colors hover:text-teal-400"
                    style={{ color: 'rgba(255,255,255,.65)', textDecoration: 'none' }}>
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <div className="text-xs font-extrabold uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,.4)' }}>
              {isRtl ? 'التواصل' : 'Contact'}
            </div>
            <ul className="flex flex-col gap-2.5">
              <li>
                <a href="https://wa.me/962786820988" target="_blank" rel="noopener noreferrer"
                  className="text-sm font-medium transition-colors hover:text-teal-400"
                  style={{ color: 'rgba(255,255,255,.65)', textDecoration: 'none' }} dir="ltr">
                  +962 7 8663 7847
                </a>
              </li>
              <li className="pt-1">
                <div className="text-[10px] font-extrabold uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,.35)' }}>
                  {isRtl ? 'الموقع' : 'Location'}
                </div>
                <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,.65)' }}>
                  {isRtl ? 'جرش، وسط البلد، شارع الشعب' : "Jarash, Downtown, AlSha'ab Street"}
                </span>
              </li>
              <li className="pt-1">
                <a href="https://wa.me/962786820988" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-9 h-9 rounded-xl transition-all"
                  style={{ background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.08)', color: 'rgba(255,255,255,.5)' }}
                  title="WhatsApp">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="max-w-6xl mx-auto px-6">
        <div style={{ borderTop: '1px solid rgba(255,255,255,.08)' }} />
      </div>

      {/* Bottom bar */}
      <div className="max-w-6xl mx-auto px-6 py-7 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs" style={{ color: 'rgba(255,255,255,.35)' }}>
          &copy; {new Date().getFullYear()} {t('clinicName')}. {t('footerRights')} &mdash;{' '}
          {isRtl ? 'تطوير' : 'Developed by'}{' '}
          <span className="font-bold" style={{ color: 'rgba(255,255,255,.5)' }}>Moataz Mdallal</span>
          {' '}&nbsp;&middot;&nbsp;{' '}
          <a href="https://wa.me/96786820988" target="_blank" rel="noopener noreferrer"
            style={{ color: 'rgba(255,255,255,.5)', textDecoration: 'none' }} dir="ltr">
            +962786820988
          </a>
        </p>

        {/* Social buttons */}
        <div className="flex items-center gap-2.5">
          <a href="https://wa.me/96786820988" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center justify-center w-9 h-9 rounded-xl transition-all"
            style={{ background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.08)', color: 'rgba(255,255,255,.5)' }}
            title="WhatsApp">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </a>
          <a href="#top"
            className="inline-flex items-center justify-center w-9 h-9 rounded-xl transition-all"
            style={{ background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.08)', color: 'rgba(255,255,255,.5)' }}
            title="Back to top">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
            </svg>
          </a>
        </div>
      </div>
    </footer>
  )
}
