import { Link } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'

const TrustPage = ({ eyebrow, title, intro, sections, ctaTitle, ctaText, ctaLink = '/dashboard/onboarding', ctaLabel = 'Open onboarding' }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Header />
      <main className="border-b border-slate-800">
        <section className="border-b border-slate-800">
          <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
            <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-slate-500">{eyebrow}</p>
            <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
            <p className="mt-3 max-w-3xl text-[15px] leading-7 text-slate-400">{intro}</p>
          </div>
        </section>

        <section className="py-12">
          <div className="mx-auto max-w-5xl space-y-4 px-4 sm:px-6 lg:px-8">
            {sections.map((section) => (
              <div key={section.title} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <h2 className="text-lg font-semibold">{section.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{section.description}</p>
                {section.points ? (
                  <div className="mt-4 grid gap-2.5 md:grid-cols-2">
                    {section.points.map((point) => (
                      <div key={point} className="rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-300">
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
          <div className="mx-auto max-w-3xl px-4 pb-12 text-center sm:px-6 lg:px-8">
            <div className="rounded-xl border border-slate-800 bg-slate-900 px-6 py-8">
              <h2 className="text-xl font-semibold">{ctaTitle}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{ctaText}</p>
              <div className="mt-5 flex justify-center">
                <Link
                  to={ctaLink}
                  className="rounded-lg bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400"
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
