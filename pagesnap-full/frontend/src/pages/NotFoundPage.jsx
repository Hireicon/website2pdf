import React from 'react'
import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-6 font-sans">
      <div className="text-center">
        <p className="font-serif text-8xl text-border mb-4">404</p>
        <h1 className="font-serif text-3xl mb-2">Page not found</h1>
        <p className="text-ink-2 mb-8">The page you're looking for doesn't exist.</p>
        <Link to="/" className="text-sm text-accent hover:underline">← Back to PageSnap</Link>
      </div>
    </div>
  )
}
