'use client'
import { useEffect, useRef } from 'react'

export default function ScrollFade({
  children,
  delay = 0,
  y = 28,
}: {
  children: React.ReactNode
  delay?: number
  y?: number
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.opacity = '1'
          el.style.transform = 'translateY(0)'
          observer.disconnect()
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -30px 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={{
        opacity: 0,
        transform: `translateY(${y}px)`,
        transition: `opacity 0.55s cubic-bezier(.22,.68,0,1.1) ${delay}ms, transform 0.55s cubic-bezier(.22,.68,0,1.1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}
