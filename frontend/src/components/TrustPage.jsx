import { Link } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'

const TrustPage = ({ eyebrow, title, intro, sections, ctaTitle, ctaText, ctaLink = '/dashboard/onboarding', ctaLabel = 'Open onboarding' }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Header />
      <main className="border-b border-white/5">
        <section className="border-b border-white/5">
          <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">{eyebrow}</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">{intro}</p>
          </div>
        </section>

        <section className="py-16">
          <div className="mx-auto max-w-5xl space-y-6 px-4 sm:px-6 lg:px-8">
            {sections.map((section) => (
              <div key={section.title} className="rounded-[26px] border border-white/10 bg-white/[0.03] p-6">
                <h2 className="text-2xl font-semibold tracking-tight">{section.title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-400">{section.description}</p>
                {section.points ? (
                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    {section.points.map((point) => (
                      <div key={point} className="rounded-2xl border border-white/8 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
                        {point}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section className="py-10">
          <div className="mx-auto max-w-3xl px-4 pb-16 text-center sm:px-6 lg:px-8">
            <div className="rounded-[28px] border border-white/10 bg-gradient-to-br from-white/[0.05] to-sky-500/[0.06] px-8 py-10">
              <h2 className="text-2xl font-semibold">{ctaTitle}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">{ctaText}</p>
              <div className="mt-6 flex justify-center">
                <Link
                  to={ctaLink}
                  className="rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
                >
                  {ctaLabel}
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default TrustPage
