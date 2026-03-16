/**
 * Shared clinic header and styles used across all print/HTML generation functions.
 */

export function getClinicHeaderHtml(baseUrl = ''): string {
  const logoSrc = `${baseUrl}/images/site logo.png`
  return `
  <div class="clinic-header">
    <img src="${logoSrc}" alt="شعار العيادة" class="clinic-logo" onerror="this.style.display='none'" />
    <h1 class="clinic-name">عيادة د. فادي السحلة</h1>
    <p class="clinic-specialty">أخصائي نساء وتوليد وعقم وجراحة بالمنظار</p>
    <p class="clinic-contact">جرش، الأردن | هاتف: <span dir="ltr">+962 7 8663 7847</span></p>
    <div class="clinic-divider-thick"></div>
    <div class="clinic-divider-thin"></div>
  </div>`
}

export function getClinicHeaderStyles(): string {
  return `
  .clinic-header { text-align: center; margin-bottom: 28px; }
  .clinic-logo { width: 88px; height: 88px; border-radius: 50%; object-fit: cover; display: block; margin: 0 auto 10px; }
  .clinic-name { color: #1a1a1a; font-size: 22px; font-weight: bold; margin: 0 0 5px; }
  .clinic-specialty { color: #444; font-size: 13px; margin: 0 0 4px; }
  .clinic-contact { color: #666; font-size: 12px; margin: 0 0 14px; }
  .clinic-divider-thick { border-top: 3px solid #0d7377; }
  .clinic-divider-thin { border-top: 1px solid #0d9ea4; margin-top: 3px; }`
}
