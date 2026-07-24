import { LandingHeader } from '../components/landing-header'

export function LandingPage() {
  return (
    <div id="top" className="min-h-screen bg-canvas text-ink selection:bg-brand-sage-soft selection:text-brand-forest">
      <div className="mx-auto min-h-screen max-w-7xl bg-surface shadow-panel">
        <LandingHeader />
        <main className="min-h-dvh bg-canvas" aria-label="Quizzy landing page" />
      </div>
    </div>
  )
}
