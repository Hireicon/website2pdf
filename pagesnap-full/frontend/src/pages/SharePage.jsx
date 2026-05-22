import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { FileDown, ExternalLink, Clock, Download, AlertCircle } from 'lucide-react'
import api from '../lib/api'

function ExpiryBadge({ expiresAt }) {
  const diff = new Date(expiresAt) - Date.now()
  if (diff < 0) return <span className="text-red-500 text-sm">Expired</span>

  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)

  let label = days > 1 ? `Expires in ${days} days` : hours > 0 ? `Expires in ${hours}h` : 'Expires soon'
  let color  = days > 7 ? 'text-green-600' : days > 1 ? 'text-amber-600' : 'text-red-500'

  return <span className={`text-sm font-mono ${color}`}>{label}</span>
}

export default function SharePage() {
  const { shareId } = useParams()

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['share', shareId],
    queryFn: () => api.get(`/share/${shareId}`).then(r => r.data),
  })

  const downloadUrl = `/api/v1/share/${shareId}/download`

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-accent/30 border-t-accent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-ink-2 text-sm">Loading PDF info...</p>
        </div>
      </div>
    )
  }

  if (isError) {
    const msg = error?.response?.data?.error || 'This link is not available'
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-6">
        <div className="max-w-sm text-center">
          <AlertCircle size={40} className="text-ink-3 mx-auto mb-4" />
          <h1 className="font-serif text-2xl mb-2">Link unavailable</h1>
          <p className="text-ink-2 text-sm mb-6">{msg}</p>
          <Link to="/" className="text-sm text-accent hover:underline">Convert a new page →</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream font-sans">
      <nav className="border-b border-border h-14 flex items-center px-8">
        <Link to="/" className="flex items-center gap-2 font-serif text-xl text-ink">
          <span className="w-2 h-2 rounded-full bg-accent" />
          PageSnap
        </Link>
        <Link to="/" className="ml-auto text-sm text-accent hover:underline">
          Convert your own URL →
        </Link>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-16">
        {/* Card */}
        <div className="bg-white border border-border rounded-xl p-9">
          <p className="font-mono text-xs text-ink-3 mb-2">
            {new URL(data.originalUrl).hostname}
          </p>
          <h1 className="font-serif text-2xl leading-snug mb-6">
            {data.pageTitle || data.originalUrl}
          </h1>

          {/* Meta row */}
          <div className="flex gap-5 flex-wrap py-4 border-y border-border-2 mb-7 text-sm">
            <div>
              <p className="text-ink-3 text-xs mb-1">File size</p>
              <p className="font-medium">{data.fileSizeKB ? `${data.fileSizeKB} KB` : '—'}</p>
            </div>
            <div>
              <p className="text-ink-3 text-xs mb-1">Format</p>
              <p className="font-medium">{data.format}</p>
            </div>
            <div>
              <p className="text-ink-3 text-xs mb-1">Downloads</p>
              <p className="font-medium">{data.downloadCount}</p>
            </div>
            <div>
              <p className="text-ink-3 text-xs mb-1">Created</p>
              <p className="font-medium">{new Date(data.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="ml-auto flex items-end">
              <ExpiryBadge expiresAt={data.expiresAt} />
            </div>
          </div>

          {/* Download button */}
          <a
            href={downloadUrl}
            download
            className="flex items-center justify-center gap-2.5 w-full
                       bg-accent hover:bg-accent-hover text-white font-semibold
                       py-4 rounded-lg transition mb-3"
          >
            <FileDown size={18} />
            Download PDF
          </a>

          {/* Original URL */}
          <a
            href={data.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 text-sm text-ink-3 hover:text-accent transition py-2"
          >
            <ExternalLink size={13} />
            View original webpage
          </a>
        </div>

        {/* Convert your own */}
        <div className="mt-6 text-center">
          <p className="text-sm text-ink-3 mb-3">Want to convert your own pages?</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium bg-ink text-cream
                       px-5 py-2.5 rounded-md hover:bg-accent transition"
          >
            Try PageSnap free →
          </Link>
        </div>
      </div>
    </div>
  )
}
