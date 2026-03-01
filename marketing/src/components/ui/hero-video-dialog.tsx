import { useEffect, useMemo, useState } from "react"
import { Play, XIcon } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"

import { cn } from "@/lib/utils"

type AnimationStyle =
  | "from-bottom"
  | "from-center"
  | "from-top"
  | "from-left"
  | "from-right"
  | "fade"
  | "top-in-bottom-out"
  | "left-in-right-out"

interface HeroVideoProps {
  animationStyle?: AnimationStyle
  videoSrc: string
  thumbnailSrc: string
  thumbnailDarkSrc?: string
  thumbnailAlt?: string
  className?: string
}

const animationVariants = {
  "from-bottom": {
    initial: { y: "100%", opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: "100%", opacity: 0 },
  },
  "from-center": {
    initial: { scale: 0.5, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.5, opacity: 0 },
  },
  "from-top": {
    initial: { y: "-100%", opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: "-100%", opacity: 0 },
  },
  "from-left": {
    initial: { x: "-100%", opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: "-100%", opacity: 0 },
  },
  "from-right": {
    initial: { x: "100%", opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: "100%", opacity: 0 },
  },
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  "top-in-bottom-out": {
    initial: { y: "-100%", opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: "100%", opacity: 0 },
  },
  "left-in-right-out": {
    initial: { x: "-100%", opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: "100%", opacity: 0 },
  },
}

export function HeroVideoDialog({
  animationStyle = "from-center",
  videoSrc,
  thumbnailSrc,
  thumbnailDarkSrc,
  thumbnailAlt = "Video thumbnail",
  className,
}: HeroVideoProps) {
  const [isVideoOpen, setIsVideoOpen] = useState(false)
  const [isDarkTheme, setIsDarkTheme] = useState(() => {
    if (typeof document === "undefined") return false
    return document.documentElement.classList.contains("dark")
  })
  const selectedAnimation = animationVariants[animationStyle]
  const iframeSrc = useMemo(() => {
    try {
      const parsed = new URL(videoSrc)
      parsed.searchParams.set("autoplay", "1")
      parsed.searchParams.set("rel", "0")
      return parsed.toString()
    } catch {
      return videoSrc.includes("?") ? `${videoSrc}&autoplay=1&rel=0` : `${videoSrc}?autoplay=1&rel=0`
    }
  }, [videoSrc])
  const activeThumbnailSrc = isDarkTheme && thumbnailDarkSrc ? thumbnailDarkSrc : thumbnailSrc

  useEffect(() => {
    if (typeof document === "undefined") return

    const root = document.documentElement
    const syncThemeState = () => {
      setIsDarkTheme(root.classList.contains("dark"))
    }

    syncThemeState()
    const observer = new MutationObserver(syncThemeState)
    observer.observe(root, { attributes: true, attributeFilter: ["class"] })

    return () => {
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    if (!isVideoOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsVideoOpen(false)
      }
    }

    window.addEventListener("keydown", onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [isVideoOpen])

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        aria-label="Play video"
        className="group relative w-full cursor-pointer overflow-hidden rounded-2xl border-0 bg-transparent p-0 text-left"
        onClick={() => setIsVideoOpen(true)}
      >
        <img
          src={activeThumbnailSrc}
          alt={thumbnailAlt}
          width={1920}
          height={1080}
          className="h-auto w-full rounded-2xl border border-black/10 object-contain shadow-lg transition-all duration-300 ease-out group-hover:scale-[1.01] group-hover:brightness-[0.75] dark:border-white/15"
        />
        <div className="pointer-events-none absolute inset-0 " />
        <div className="absolute inset-0 flex items-center justify-center px-4">
          <div className="flex items-center gap-3 shadow-3xl border border-white/45 bg-black/70 px-4 py-2 text-white backdrop-blur-sm transition-all duration-200 ease-out group-hover:scale-[1.03] group-hover:bg-black/80 sm:px-5 sm:py-3">
            <span className="flex size-9 items-center justify-center rounded-full bg-white text-black sm:size-10">
              <Play className="size-4 fill-current sm:size-5" />
            </span>
            <span className="font-sans text-xs uppercase tracking-[0.22em] sm:text-sm">
              Watch Demo
            </span>
          </div>
        </div>
      </button>
      <AnimatePresence>
        {isVideoOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            role="presentation"
            onClick={() => setIsVideoOpen(false)}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur-sm"
          >
            <motion.div
              {...selectedAnimation}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              onClick={(event) => event.stopPropagation()}
              className="relative aspect-video w-full max-w-5xl"
            >
              <button
                type="button"
                aria-label="Close video"
                onClick={() => setIsVideoOpen(false)}
                className="absolute right-3 top-3 z-10 rounded-full border border-white/35 bg-black/75 p-2 text-white transition-colors hover:bg-black"
              >
                <XIcon className="size-5" />
              </button>
              <div className="relative isolate z-1 size-full overflow-hidden rounded-2xl border border-white/70 shadow-2xl">
                <iframe
                  src={iframeSrc}
                  title="Hero Video player"
                  className="size-full rounded-2xl"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                ></iframe>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
