import { Link } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'

const TrustPage = ({ eyebrow, title, intro, sections, ctaTitle, ctaText, ctaLink = '/dashboard/onboarding', ctaLabel = 'Open onboarding' }) => {
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <Header />
      <main>
        <section className="border-b border-neutral-800/60">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
            <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-neutral-500">{eyebrow}</p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
            <p className="mt-4 max-w-3xl text-[15px] leading-7 text-neutral-400">{intro}</p>
          </div>
        </section>

        <section className="border-b border-neutral-800/60 py-14">
          <div className="mx-auto max-w-5xl space-y-4 px-4 sm:px-6 lg:px-8">
            {sections.map((section) => (
              <div key={section.title} className="rounded-xl border border-neutral-800 bg-neutral-900 p-6 transition hover:border-neutral-700">
                <h2 className="text-lg font-semibold text-white">{section.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-neutral-400">{section.description}</p>
                {section.points ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {section.points.map((point) => (
                      <div key={point} className="rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-300">
                        {point}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section className="py-16">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <div className="rounded-xl border border-neutral-800 bg-neutral-900 px-8 py-10 shadow-2xl shadow-black/30">
              <h2 className="text-2xl font-semibold tracking-tight">{ctaTitle}</h2>
              <p className="mt-3 text-sm leading-relaxed text-neutral-400">{ctaText}</p>
              <div className="mt-6 flex justify-center">
                <Link
                  to={ctaLink}
                  className="rounded-md bg-white px-6 py-2.5 text-sm font-semibold text-neutral-950 shadow-sm transition hover:bg-neutral-200"
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
