import { getTranslations } from 'next-intl/server'

export async function Footer() {
  const t = await getTranslations('landing')

  return (
    <footer className="bg-card border-t py-8">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <p className="text-muted-foreground">
          Moataz Mdallal &copy; {new Date().getFullYear()} {t('footerRights')}
        </p>
      </div>
    </footer>
  )
}
