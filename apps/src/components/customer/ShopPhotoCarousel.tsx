'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'

export function ShopPhotoCarousel({ photos }: { photos: string[] }) {
  const [current, setCurrent] = useState(0)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchDiff, setTouchDiff] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const total = photos.length

  const goTo = useCallback((idx: number) => {
    setCurrent((idx + total) % total)
  }, [total])

  // Auto-scroll every 3s
  useEffect(() => {
    if (total <= 1) return
    timerRef.current = setInterval(() => {
      setCurrent(prev => (prev + 1) % total)
    }, 3000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [total])

  // Reset timer on manual interaction
  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setCurrent(prev => (prev + 1) % total)
    }, 3000)
  }, [total])

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX)
    setTouchDiff(0)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return
    setTouchDiff(e.touches[0].clientX - touchStart)
  }

  const handleTouchEnd = () => {
    if (Math.abs(touchDiff) > 50) {
      if (touchDiff < 0) goTo(current + 1)
      else goTo(current - 1)
      resetTimer()
    }
    setTouchStart(null)
    setTouchDiff(0)
  }

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Images */}
      <div
        className="flex h-full transition-transform duration-500 ease-out"
        style={{ transform: `translateX(calc(-${current * 100}% + ${touchStart !== null ? touchDiff : 0}px))` }}
      >
        {photos.map((photo, i) => (
          <div key={i} className="w-full h-full flex-shrink-0 relative">
            <Image
              src={photo}
              alt={`Shop photo ${i + 1}`}
              fill
              className="object-cover"
              priority={i === 0}
            />
          </div>
        ))}
      </div>

      {/* Dots */}
      {total > 1 && (
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {photos.map((_, i) => (
            <button
              key={i}
              onClick={() => { goTo(i); resetTimer() }}
              className={`rounded-full transition-all duration-300 ${
                i === current
                  ? 'w-6 h-2 bg-white'
                  : 'w-2 h-2 bg-white/40 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
