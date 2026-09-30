import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface PrimaryCta {
  isSignedIn: boolean;
  href: string;
  label: string;
}

const signedOut: PrimaryCta = { isSignedIn: false, href: "/signup-student", label: "Start Learning Free" };

const PrimaryCtaContext = createContext<PrimaryCta>(signedOut);

/**
 * Resolves where the landing page's primary CTA should go. Signed-out visitors
 * go to student sign-up; signed-in users go straight to their dashboard. The
 * session check reads local storage, so signed-out visitors trigger no network
 * request.
 */
export function PrimaryCtaProvider({ children }: { children: ReactNode }) {
  const [cta, setCta] = useState<PrimaryCta>(signedOut);

  useEffect(() => {
    let cancelled = false;

    // Loaded lazily so the Supabase client stays out of the landing page's initial bundle.
    import("@/integrations/supabase/client").then(async ({ supabase }) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled || !session?.user) return;
      setCta({ isSignedIn: true, href: "/dashboard", label: "Go to Dashboard" });

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();
      if (!cancelled && profile?.role === "mentor") {
        setCta({ isSignedIn: true, href: "/teacher", label: "Go to Dashboard" });
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return <PrimaryCtaContext.Provider value={cta}>{children}</PrimaryCtaContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const usePrimaryCta = () => useContext(PrimaryCtaContext);
