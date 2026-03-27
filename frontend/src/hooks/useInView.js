import { useEffect, useRef, useState } from 'react'

export function useInView(options = {}) {
  const { threshold = 0.1, triggerOnce = true } = options
  const ref = useRef(null)
  const [isInView, setIsInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsInView(true)
        if (triggerOnce) observer.unobserve(el)
      }
    }, { threshold })
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold, triggerOnce])

  return [ref, isInView]
}
