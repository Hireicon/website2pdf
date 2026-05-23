import React from 'react'
import { Link } from 'react-router-dom'
import { FileDown, Link2, Eye, Zap, Shield, Clock } from 'lucide-react'
import ConverterBox from '../components/converter/ConverterBox'
import { useAuthStore } from '../store/authStore'

const FEATURES = [
  { icon: <Link2 size={20} />, title: 'Shareable link included', desc: 'Every PDF gets a unique link you can paste into email, Slack, or any document.' },
  { icon: <Eye size={20} />,   title: 'Reader mode', desc: 'Strip out ads, navigation, cookie banners. Just the article, cleanly typeset.' },
  { icon: <Zap size={20} />,   title: 'Full Page into PDF', desc: 'Capture all scrollable content of a website, not just the visible portion, into a single page PDF.' },
  { icon: <Shield size={20} />, title: 'Files deleted after 24h', desc: 'Free tier PDFs expire in 24 hours. Upgrade for 30-day or permanent links.' },
  { icon: <Clock size={20} />, title: '< 5 second renders', desc: 'Most pages convert in under 5 seconds. Complex JS apps may take up to 12s.' },
  { icon: <FileDown size={20} />, title: 'A4, Letter & A3', desc: 'Choose your paper size before converting. Portrait orientation, print-ready.' },
]

const HOW = [
  { n: '1', title: 'Paste a URL', desc: 'Drop any public webpage URL into the box — article, product page, docs, anything.' },
  { n: '2', title: 'We render it cleanly', desc: 'A real browser loads the page. JavaScript, images, and fonts are all included.' },
  { n: '3', title: 'Download + share', desc: 'Get a PDF download and a permanent shareable link — no re-uploading ever needed.' },
]

export default function HomePage() {
  const user = useAuthStore((s) => s.user)

  return (
    <div className="min-h-screen bg-cream font-sans">

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-cream/90 backdrop-blur-md border-b border-border h-14 flex items-center px-8">
        <a href="/" className="flex items-center gap-2 font-serif text-xl text-ink">
          <span className="w-2 h-2 rounded-full bg-accent" />
          PageSnap
        </a>
        <div className="ml-auto flex items-center gap-6">
          <a href="#how" className="text-sm text-ink-2 hover:text-accent transition">How it works</a>
          <a href="#pricing" className="text-sm text-ink-2 hover:text-accent transition">Pricing</a>
          {user
            ? <Link to="/dashboard" className="text-sm font-medium text-ink hover:text-accent transition">Dashboard →</Link>
            : <>
                <Link to="/login"    className="text-sm text-ink-2 hover:text-accent transition">Sign in</Link>
                <Link to="/register" className="text-sm font-medium bg-ink text-cream px-4 py-1.5 rounded hover:bg-accent transition">Get started</Link>
              </>
          }
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-36 pb-20 px-8 max-w-3xl mx-auto text-center">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-accent bg-accent/8 px-3 py-1.5 rounded-full mb-7">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          Free · No sign-up required
        </div>

        <h1 className="font-serif text-6xl md:text-7xl leading-tight tracking-tight mb-5">
          Save any webpage<br />as a <em className="text-accent italic">clean PDF</em>
        </h1>
        <p className="text-lg text-ink-2 font-light max-w-lg mx-auto mb-12 leading-relaxed">
          Paste a URL. Get a beautiful PDF and a shareable link instantly.
          No browser extensions. No broken layouts.
        </p>

        <ConverterBox />

        {/* Trust strip */}
        <div className="flex justify-center flex-wrap gap-6 mt-8">
          {['Advanced Rendering', 'No login needed', 'Files auto-deleted', 'Shareable link'].map(t => (
            <span key={t} className="flex items-center gap-1.5 text-xs text-ink-3">
              <span className="w-1 h-1 rounded-full bg-ink-3" />{t}
            </span>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-24 px-8 max-w-4xl mx-auto">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-4">How it works</p>
        <h2 className="font-serif text-4xl mb-12">Three steps. Thirty seconds.</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {HOW.map(({ n, title, desc }) => (
            <div key={n} className="bg-white border border-border rounded-xl p-7 relative overflow-hidden">
              <span className="absolute top-0 right-4 font-serif text-8xl leading-none text-border-2 pointer-events-none">
                {n}
              </span>
              <h3 className="font-medium text-base mb-2">{title}</h3>
              <p className="text-sm text-ink-2 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-8 bg-cream-paper">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-4">Features</p>
          <h2 className="font-serif text-4xl mb-12">Everything you actually need.</h2>
          <div className="grid md:grid-cols-3 gap-5">
            {FEATURES.map(({ icon, title, desc }) => (
              <div key={title} className="bg-white border border-border rounded-xl p-6 hover:border-accent transition">
                <div className="w-10 h-10 bg-accent/8 rounded-lg flex items-center justify-center text-accent mb-4">
                  {icon}
                </div>
                <h3 className="font-medium mb-2">{title}</h3>
                <p className="text-sm text-ink-2 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-8 max-w-4xl mx-auto">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-4">Pricing</p>
        <h2 className="font-serif text-4xl mb-12">Simple, honest pricing.</h2>
        <div className="grid md:grid-cols-3 gap-5">
          {[
            { name: 'Free', price: '$0', period: 'forever', features: ['3 conversions/day', 'Shareable links (24h)', 'A3 / A4 / Letter format', 'Reader mode'], cta: 'Start free', highlight: false },
            { name: 'Pro', price: '$5', period: '/month', features: ['50 conversions/day', 'Shareable links (30 days)', 'All formats', 'Priority rendering'], cta: 'Get Pro', highlight: true },
            { name: 'Business', price: '$29', period: '/month', features: ['500 conversions/day', 'Permanent links', 'All formats', 'Custom branding'], cta: 'Contact us', highlight: false },
          ].map(({ name, price, period, features, cta, highlight }) => (
            <div key={name} className={`border rounded-xl p-8 relative ${highlight ? 'border-accent border-2' : 'border-border'}`}>
              {highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-semibold bg-accent text-white px-3 py-1 rounded-full whitespace-nowrap">
                  Most popular
                </div>
              )}
              <p className="text-sm text-ink-3 mb-2">{name}</p>
              <p className="font-serif text-5xl mb-1">{price}</p>
              <p className="text-sm text-ink-3 mb-6">{period}</p>
              <ul className="space-y-2.5 mb-8">
                {features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-ink-2">
                    <span className="text-green-600 font-bold text-xs">✓</span>{f}
                  </li>
                ))}
              </ul>
              <Link
                to="/register"
                className={`block text-center text-sm font-medium py-2.5 rounded-md border transition ${
                  highlight
                    ? 'bg-accent text-white border-accent hover:bg-accent-hover'
                    : 'bg-cream text-ink border-border hover:border-accent hover:text-accent'
                }`}
              >
                {cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-ink py-24 px-8 text-center">
        <h2 className="font-serif text-5xl text-cream mb-4">
          Stop emailing files.<br />
          <em className="text-accent/90 italic">Send a link.</em>
        </h2>
        <p className="text-ink-3 mb-8">Free forever for 3 conversions a day. No credit card required.</p>
        <Link to="/register" className="inline-block bg-accent hover:bg-accent-hover text-white font-semibold px-8 py-4 rounded-md transition">
          Get started free →
        </Link>
      </section>

      <footer className="bg-cream-paper border-t border-border px-8 py-8 text-center text-sm text-ink-3">
        © 2026 PageSnap · <Link to="/login" className="hover:text-accent">Sign in</Link> · <Link to="/register" className="hover:text-accent">Register</Link>
      </footer>
    </div>
  )
}
