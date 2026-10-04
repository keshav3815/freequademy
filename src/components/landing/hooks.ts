import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(callback: () => void) {
  const mql = window.matchMedia(REDUCED_MOTION_QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

export function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  );
}

export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (callback) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", callback);
      return () => mql.removeEventListener("change", callback);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

interface InViewOptions {
  /** Stop observing after the element first becomes visible. */
  once?: boolean;
  rootMargin?: string;
  threshold?: number;
}

export function useInView<T extends Element>({
  once = true,
  rootMargin = "0px 0px -10% 0px",
  threshold = 0.15,
}: InViewOptions = {}) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { rootMargin, threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [once, rootMargin, threshold]);

  return [ref, inView] as const;
}

interface ProgressiveTextOptions {
  wordsPerTick?: number;
  tickMs?: number;
  /** Changing this restarts the reveal from the first word. */
  resetKey?: number;
}

/**
 * Reveals `text` word by word once `active` is true. Returns the full text
 * immediately when the user prefers reduced motion.
 */
export function useProgressiveText(
  text: string,
  active: boolean,
  { wordsPerTick = 2, tickMs = 55, resetKey = 0 }: ProgressiveTextOptions = {},
) {
  const reducedMotion = usePrefersReducedMotion();
  const words = text.split(" ");
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(0);
  }, [text, resetKey]);

  useEffect(() => {
    if (!active || reducedMotion) return;
    if (count >= words.length) return;
    const id = window.setTimeout(() => setCount((c) => Math.min(words.length, c + wordsPerTick)), tickMs);
    return () => window.clearTimeout(id);
  }, [active, reducedMotion, count, words.length, wordsPerTick, tickMs]);

  if (reducedMotion) return { visible: text, done: true };
  return { visible: words.slice(0, count).join(" "), done: count >= words.length };
}
