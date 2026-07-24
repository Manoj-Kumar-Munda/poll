import { useState } from 'react'
import { ChevronDown, Menu, X } from 'lucide-react'
import { Brand } from '@/components'

const navItems = ['Features', 'How it works', 'Pricing', 'Resources']

function getAnchor(item: string) {
  return `#${item.toLowerCase().replaceAll(' ', '-')}`
}

export function LandingHeader() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="relative border-b border-border bg-surface">
      <div className="mx-auto flex h-16 items-center justify-between px-page-mobile lg:px-page">
        <Brand />

        <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
          {navItems.map((item) => (
            <a key={item} href={getAnchor(item)} className="group flex items-center gap-1 text-xs font-semibold text-ink transition-colors hover:text-brand-forest">
              {item}
              {item === 'Resources' && <ChevronDown className="size-3.5 transition-transform group-hover:translate-y-0.5" aria-hidden="true" />}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-5 md:flex">
          <a href="#login" className="text-xs font-semibold text-ink transition-colors hover:text-brand-forest">Log in</a>
          <a href="#get-started" className="rounded-control bg-brand-forest px-control-x py-control-y text-xs font-semibold text-white shadow-sm transition-colors hover:bg-brand-forest-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-forest">Get started</a>
        </div>

        <button type="button" className="grid size-9 place-items-center rounded-control text-ink transition-colors hover:bg-surface-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-forest md:hidden" aria-expanded={menuOpen} aria-controls="mobile-navigation" aria-label={menuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMenuOpen((open) => !open)}>
          {menuOpen ? <X className="size-4" aria-hidden="true" /> : <Menu className="size-4" aria-hidden="true" />}
        </button>
      </div>

      {menuOpen && (
        <nav id="mobile-navigation" className="border-t border-border bg-surface px-page-mobile py-card-compact md:hidden" aria-label="Mobile navigation">
          <div className="flex flex-col gap-1">
            {navItems.map((item) => (
              <a key={item} href={getAnchor(item)} className="rounded-control px-3 py-3 text-sm font-semibold text-ink hover:bg-surface-soft" onClick={() => setMenuOpen(false)}>{item}</a>
            ))}
            <div className="mt-2 flex items-center gap-4 border-t border-border pt-4">
              <a href="#login" className="px-3 py-3 text-sm font-semibold text-ink">Log in</a>
              <a href="#get-started" className="rounded-control bg-brand-forest px-control-x py-control-y text-sm font-semibold text-white">Get started</a>
            </div>
          </div>
        </nav>
      )}
    </header>
  )
}
