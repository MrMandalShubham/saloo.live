'use client'

export default function OwnerError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center max-w-sm mx-auto space-y-5 px-4">
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
        <span className="text-2xl font-bold text-red-500">!</span>
      </div>
      <div>
        <h2 className="font-syne font-bold text-saloo-dark text-xl">Something went wrong</h2>
        <p className="text-saloo-dark/60 text-sm mt-2">{error.message || 'An unexpected error occurred.'}</p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-6 py-2.5 rounded-xl bg-saloo-pink text-white text-sm font-semibold hover:bg-saloo-pink/90 transition-all"
        >
          Try Again
        </button>
        <a
          href="/home"
          className="px-6 py-2.5 rounded-xl border border-saloo-dark/10 text-saloo-dark/70 text-sm font-semibold hover:bg-saloo-dark/5 transition-all"
        >
          Go Home
        </a>
      </div>
    </div>
  )
}
