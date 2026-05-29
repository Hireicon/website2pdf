import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { LogOut, FileDown, ExternalLink, Copy, Check, User, Zap, Star } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'
import ConverterBox from '../components/converter/ConverterBox'

function PlanBadge({ plan }) {
  const colors = { free: 'bg-gray-100 text-gray-700', pro: 'bg-blue-100 text-blue-700', business: 'bg-amber-100 text-amber-700' }
  return (
    <span className={`text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded ${colors[plan] || colors.free}`}>
      {plan}
    </span>
  )
}

function ConversionRow({ item }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(item.shareUrl)
    setCopied(true)
    toast.success('Link copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  const expired = item.expires_at && new Date(item.expires_at) < new Date()

  return (
    <div className="flex items-start gap-4 p-4 border-b border-border-2 last:border-0 hover:bg-cream/50 transition">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink truncate">{item.page_title || item.original_url}</p>
        <p className="text-xs font-mono text-ink-3 mt-0.5 truncate">{item.original_url}</p>
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          <span className="text-xs text-ink-3">{new Date(item.created_at).toLocaleDateString()}</span>
          {item.file_size_kb && <span className="text-xs text-ink-3">{item.file_size_kb} KB</span>}
          {item.format        && <span className="text-xs text-ink-3">{item.format}</span>}
          {item.download_count != null && <span className="text-xs text-ink-3">{item.download_count} downloads</span>}
          {expired && <span className="text-xs text-red-500">Expired</span>}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {item.shareUrl && !expired && (
          <button
            onClick={copy}
            className="p-1.5 border border-border rounded hover:border-accent text-ink-3 hover:text-accent transition"
            title="Copy share link"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        )}
        {item.downloadUrl && (
          <a
            href={item.downloadUrl}
            download
            className="p-1.5 border border-border rounded hover:border-accent text-ink-3 hover:text-accent transition"
            title="Download PDF"
          >
            <FileDown size={14} />
          </a>
        )}
        {item.original_url && (
          <a
            href={item.original_url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 border border-border rounded hover:border-accent text-ink-3 hover:text-accent transition"
            title="Open original"
          >
            <ExternalLink size={14} />
          </a>
        )}
      </div>
    </div>
  )
}

function UpgradeBanner({ plan }) {
  if (plan === 'business') return null

  if (plan === 'pro') return (
    <div className="mb-10 bg-amber-50 border border-amber-200 rounded-xl p-6 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Star size={20} className="text-amber-500 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-ink">Upgrade to Business</p>
          <p className="text-xs text-ink-3 mt-0.5">500 conversions/day · Permanent links · Custom branding</p>
        </div>
      </div>
      <a
        href="mailto:hello@pagesnap.app?subject=Business Plan"
        className="flex-shrink-0 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-5 py-2.5 rounded-md transition"
      >
        Contact us — $29/mo
      </a>
    </div>
  )

  // free plan — show both Pro and Business
  return (
    <div className="mb-10">
      <div className="flex items-center gap-2 mb-4">
        <Zap size={15} className="text-accent" />
        <h3 className="text-sm font-semibold text-ink">Upgrade your plan</h3>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Pro */}
        <div className="bg-white border-2 border-accent rounded-xl p-5 relative">
          <span className="absolute -top-2.5 left-4 text-xs font-semibold bg-accent text-white px-2.5 py-0.5 rounded-full">
            Most popular
          </span>
          <div className="flex items-end gap-1 mb-1 mt-1">
            <span className="font-serif text-2xl text-ink">$5</span>
            <span className="text-xs text-ink-3 mb-1">/month</span>
          </div>
          <p className="text-sm font-semibold text-ink mb-3">Pro</p>
          <ul className="space-y-1.5 mb-5">
            {['50 conversions/day', 'Shareable links (30 days)', 'All formats', 'Priority rendering'].map(f => (
              <li key={f} className="flex items-center gap-2 text-xs text-ink-2">
                <Check size={13} className="text-accent flex-shrink-0" />{f}
              </li>
            ))}
          </ul>
          <a
            href="mailto:hello@pagesnap.app?subject=Pro Plan"
            className="block w-full text-center bg-accent hover:bg-accent-hover text-white text-sm font-semibold py-2.5 rounded-md transition"
          >
            Get Pro
          </a>
        </div>

        {/* Business */}
        <div className="bg-white border border-border rounded-xl p-5">
          <div className="flex items-end gap-1 mb-1 mt-1">
            <span className="font-serif text-2xl text-ink">$29</span>
            <span className="text-xs text-ink-3 mb-1">/month</span>
          </div>
          <p className="text-sm font-semibold text-ink mb-3">Business</p>
          <ul className="space-y-1.5 mb-5">
            {['500 conversions/day', 'Permanent links', 'All formats', 'Custom branding'].map(f => (
              <li key={f} className="flex items-center gap-2 text-xs text-ink-2">
                <Check size={13} className="text-green-500 flex-shrink-0" />{f}
              </li>
            ))}
          </ul>
          <a
            href="mailto:hello@pagesnap.app?subject=Business Plan"
            className="block w-full text-center border border-border hover:border-accent text-ink text-sm font-semibold py-2.5 rounded-md transition"
          >
            Contact us
          </a>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [page, setPage] = useState(1)
  const user   = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['conversions', page],
    queryFn: () => api.get(`/convert?page=${page}&limit=20`).then(r => r.data),
  })

  function handleLogout() {
    const refresh = useAuthStore.getState().refreshToken
    if (refresh) api.post('/auth/logout', { refreshToken: refresh }).catch(() => {})
    logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-cream font-sans">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-cream/90 backdrop-blur-md border-b border-border h-14 flex items-center px-8">
        <Link to="/" className="flex items-center gap-2 font-serif text-xl text-ink">
          <span className="w-2 h-2 rounded-full bg-accent" />PageSnap
        </Link>
        <div className="ml-auto flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-ink-2">
            <User size={15} />
            <span>{user?.name || user?.email}</span>
            <PlanBadge plan={user?.plan} />
          </div>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-sm text-ink-3 hover:text-accent transition">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </nav>

      <div className="pt-24 pb-16 px-8 max-w-3xl mx-auto">
        {/* Quick convert */}
        <div className="mb-10">
          <h2 className="font-serif text-2xl mb-5">Convert a page</h2>
          <ConverterBox />
        </div>

        {/* Upgrade banner */}
        <UpgradeBanner plan={user?.plan} />

        {/* History */}
        <div>
          <h2 className="font-serif text-2xl mb-5">Conversion history</h2>
          <div className="bg-white border border-border rounded-xl overflow-hidden">
            {isLoading && (
              <div className="flex items-center justify-center py-12 text-ink-3 text-sm">
                Loading...
              </div>
            )}
            {!isLoading && !data?.data?.length && (
              <div className="text-center py-12 text-ink-3">
                <FileDown size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No conversions yet. Convert your first URL above.</p>
              </div>
            )}
            {data?.data?.map(item => (
              <ConversionRow key={item.id} item={item} />
            ))}
          </div>

          {/* Pagination */}
          {data?.pages > 1 && (
            <div className="flex justify-center gap-3 mt-6">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="text-sm px-4 py-2 border border-border rounded hover:border-accent disabled:opacity-40"
              >
                ← Previous
              </button>
              <span className="text-sm text-ink-3 self-center">
                Page {page} of {data.pages}
              </span>
              <button
                disabled={page >= data.pages}
                onClick={() => setPage(p => p + 1)}
                className="text-sm px-4 py-2 border border-border rounded hover:border-accent disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
