import React, { useState, useRef } from 'react'
import { Link, FileDown, Copy, Check, AlertCircle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../lib/api'

const STEPS = ['Loading page...', 'Rendering content...', 'Generating PDF...', 'Creating share link...']

export default function ConverterBox() {
  const [url, setUrl]           = useState('')
  const [readerMode, setReader]       = useState(false)
  const [format, setFormat]           = useState('A3')
  const [addTimestamp, setTimestamp]  = useState(false)
  const [status, setStatus]     = useState('idle') // idle | loading | done | error
  const [progress, setProgress] = useState(0)
  const [stepIdx, setStepIdx]   = useState(0)
  const [result, setResult]     = useState(null)
  const [error, setError]       = useState('')
  const [copied, setCopied]     = useState(false)
  const progressTimer = useRef(null)
  const stepTimer     = useRef(null)

  function startProgress() {
    setProgress(0)
    setStepIdx(0)
    let p = 0
    let s = 0
    progressTimer.current = setInterval(() => {
      p += Math.random() * 8
      if (p >= 90) { clearInterval(progressTimer.current); p = 90 }
      setProgress(Math.round(p))
    }, 400)
    stepTimer.current = setInterval(() => {
      s = Math.min(s + 1, STEPS.length - 1)
      setStepIdx(s)
    }, 4000)
  }

  function stopProgress() {
    clearInterval(progressTimer.current)
    clearInterval(stepTimer.current)
    setProgress(100)
  }

  async function handleConvert(e) {
    e.preventDefault()
    if (!url.trim()) return

    setStatus('loading')
    setError('')
    setResult(null)
    startProgress()

    try {
      const { data } = await api.post('/convert', { url: url.trim(), format, readerMode, addTimestamp })
      stopProgress()
      setResult(data)
      setStatus('done')
    } catch (err) {
      stopProgress()
      const msg = err.response?.data?.error || 'Something went wrong. Please try again.'
      setError(msg)
      setStatus('error')

      // Handle upgrade prompts
      if (err.response?.data?.code === 'DAILY_LIMIT') {
        toast.error(msg, { duration: 5000 })
      }
    }
  }

  async function copyLink() {
    if (!result?.shareUrl) return
    await navigator.clipboard.writeText(result.shareUrl)
    setCopied(true)
    toast.success('Link copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  function reset() {
    setStatus('idle')
    setResult(null)
    setError('')
    setUrl('')
  }

  return (
    <div className="bg-white border border-border rounded-xl p-7 shadow-sm">
      {/* URL input row */}
      <form onSubmit={handleConvert}>
        <div className="flex gap-2.5 mb-4">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/article..."
            className="flex-1 font-mono text-sm bg-cream border border-border rounded-md px-4 py-3
                       text-ink placeholder-ink-3 outline-none
                       focus:border-accent focus:ring-2 focus:ring-accent/10 transition"
            disabled={status === 'loading'}
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="submit"
            disabled={status === 'loading' || !url.trim()}
            className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white
                       font-semibold text-sm px-5 py-3 rounded-md transition
                       disabled:bg-ink-3 disabled:cursor-not-allowed active:scale-98"
          >
            {status === 'loading'
              ? <><Loader2 size={15} className="animate-spin" /> Converting</>
              : <><FileDown size={15} /> Convert</>
            }
          </button>
        </div>

        {/* Options row */}
        <div className="flex items-center gap-5 pt-3.5 border-t border-border-2 flex-wrap">
          <label className="flex items-center gap-2 text-sm text-ink-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={readerMode}
              onChange={(e) => setReader(e.target.checked)}
              disabled={status === 'loading'}
              className="w-4 h-4 accent-accent cursor-pointer"
            />
            Reader mode <span className="text-ink-3 text-xs">(strips ads &amp; nav)</span>
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={addTimestamp}
              onChange={(e) => setTimestamp(e.target.checked)}
              disabled={status === 'loading'}
              className="w-4 h-4 accent-accent cursor-pointer"
            />
            Timestamp <span className="text-ink-3 text-xs">(on every page)</span>
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-2 ml-auto">
            Format:
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              disabled={status === 'loading'}
              className="text-sm border border-border rounded-md px-2 py-1 bg-cream text-ink cursor-pointer"
            >
              <option>A3</option>
              <option>A4</option>
              <option>Letter</option>
            </select>
          </label>
        </div>
      </form>

      {/* Progress bar */}
      {status === 'loading' && (
        <div className="mt-5">
          <div className="bg-cream-paper rounded-full h-1 overflow-hidden mb-2">
            <div
              className="h-full bg-accent rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs font-mono text-ink-3">{STEPS[stepIdx]}</p>
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="mt-4 flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-3.5">
          <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-red-800">{error}</p>
            <button onClick={reset} className="text-xs text-red-600 hover:underline mt-1">
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Result card */}
      {status === 'done' && result && (
        <div className="mt-4 bg-cream border border-border rounded-lg p-4">
          {/* Success header */}
          <div className="flex items-center gap-2 mb-3.5 text-sm font-medium text-ink">
            <span className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
              <Check size={11} className="text-green-700" strokeWidth={2.5} />
            </span>
            PDF ready — share it or download it
          </div>

          {/* Share link row */}
          <div className="flex gap-2 mb-3">
            <input
              readOnly
              value={result.shareUrl}
              className="flex-1 font-mono text-xs bg-white border border-border
                         rounded-md px-3 py-2.5 text-ink-2 outline-none select-all"
              onClick={(e) => e.target.select()}
            />
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2.5
                         border border-border rounded-md bg-white text-ink
                         hover:border-accent hover:text-accent transition"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <a
              href={result.downloadUrl}
              download
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2.5
                         bg-ink text-cream rounded-md hover:bg-accent transition"
            >
              <FileDown size={13} />
              Download
            </a>
          </div>

          {/* Meta info */}
          <div className="flex gap-4 flex-wrap font-mono text-xs text-ink-3">
            {result.fileSizeKB && <span>{result.fileSizeKB} KB</span>}
            {result.renderMs   && <span>rendered in {result.renderMs}ms</span>}
            {result.expiresAt  && (
              <span>expires {new Date(result.expiresAt).toLocaleDateString()}</span>
            )}
            <button
              onClick={reset}
              className="ml-auto hover:text-accent transition text-xs"
            >
              Convert another →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
