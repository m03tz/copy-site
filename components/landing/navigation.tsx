'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { LanguageToggle } from '@/components/language-toggle'
import { ThemeToggle } from '@/components/theme-toggle'
import { Menu, X } from 'lucide-react'
import Image from 'next/image'

export function PublicNavigation() {
  const t = useTranslations('landing')
  const [isOpen, setIsOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur-sm shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Clinic name / logo */}
          <Link
            href="/"
            className="flex items-center gap-2 hover:opacity-90 transition-opacity"
          >
            <Image
              src="/images/site logo.png"
              alt="Clinic Logo"
              width={40}
              height={40}
              className="object-contain"
            />
            <span className="text-medical-blue-700 font-bold text-lg">
              {t('clinicName')}
            </span>
          </Link>

          {/* Desktop navigation */}
          <div className="hidden md:flex items-center gap-6">
            <a
              href="#about"
              className="text-foreground hover:text-medical-blue-600 transition-colors"
            >
              {t('navAbout')}
            </a>
            <a
              href="#services"
              className="text-foreground hover:text-medical-blue-600 transition-colors"
            >
              {t('navServices')}
            </a>
            <a
              href="#contact"
              className="text-foreground hover:text-medical-blue-600 transition-colors"
            >
              {t('navContact')}
            </a>
            <Link
              href="/login"
              className="px-4 py-2 bg-medical-blue-600 text-white rounded-lg hover:bg-medical-blue-700 transition-colors"
            >
              {t('navLogin')}
            </Link>
            <ThemeToggle />
            <LanguageToggle />
          </div>

          {/* Mobile hamburger button */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle />
            <LanguageToggle />
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-md text-foreground hover:text-medical-blue-600 hover:bg-medical-blue-50 transition-colors"
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isOpen && (
          <div className="md:hidden border-t py-4 space-y-3">
            <a
              href="#about"
              onClick={() => setIsOpen(false)}
              className="block px-2 py-2 text-foreground hover:text-medical-blue-600 hover:bg-medical-blue-50 rounded-md transition-colors"
            >
              {t('navAbout')}
            </a>
            <a
              href="#services"
              onClick={() => setIsOpen(false)}
              className="block px-2 py-2 text-foreground hover:text-medical-blue-600 hover:bg-medical-blue-50 rounded-md transition-colors"
            >
              {t('navServices')}
            </a>
            <a
              href="#contact"
              onClick={() => setIsOpen(false)}
              className="block px-2 py-2 text-foreground hover:text-medical-blue-600 hover:bg-medical-blue-50 rounded-md transition-colors"
            >
              {t('navContact')}
            </a>
            <Link
              href="/login"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2 bg-medical-blue-600 text-white rounded-lg hover:bg-medical-blue-700 transition-colors text-start"
            >
              {t('navLogin')}
            </Link>
          </div>
        )}
      </div>
    </nav>
  )
}
