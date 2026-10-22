import { isAllowedOwnerEmail } from "@/lib/allowedEmail";
import { supabase } from "@/lib/supabase";
import LoginPage, { AuthScreen } from "@/pages/Login";
import type { Session } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

type AuthStatus = "loading" | "unauthenticated" | "authenticated";

interface AuthContextValue {
  email: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const DISALLOWED_NOTICE = "등록된 관리자 계정이 아니에요. 로그아웃했어요.";

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth는 로그인된 화면 안에서만 사용할 수 있어요.");
  }
  return context;
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [email, setEmail] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let signingOutDisallowed = false;

    const applySession = (session: Session | null) => {
      if (!mounted) return;

      const sessionEmail = session?.user?.email ?? null;
      if (session && !isAllowedOwnerEmail(sessionEmail)) {
        setEmail(null);
        setNotice(DISALLOWED_NOTICE);
        setStatus("unauthenticated");
        if (signingOutDisallowed) return;
        signingOutDisallowed = true;
        // signOut inside onAuthStateChange can deadlock the auth client.
        window.setTimeout(() => {
          void supabase.auth.signOut().finally(() => {
            signingOutDisallowed = false;
          });
        }, 0);
        return;
      }

      if (!session || !sessionEmail) {
        setEmail(null);
        setStatus("unauthenticated");
        return;
      }

      setNotice(null);
      setEmail(sessionEmail);
      setStatus("authenticated");
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) {
        setStatus("unauthenticated");
        return;
      }
      applySession(data.session);
    }).catch(() => {
      if (mounted) setStatus("unauthenticated");
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  if (status === "loading") {
    return (
      <AuthScreen>
        <div className="glass-panel flex items-center justify-center gap-3 rounded-2xl px-8 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          로그인 상태를 확인하고 있어요…
        </div>
      </AuthScreen>
    );
  }

  // /call-status만 로그인 없이 읽기 전용 공개 (무도사 승인 10/22). 다른 화면은 로그인 필요.
  if (status !== "authenticated" && location === "/call-status") {
    return (
      <AuthContext.Provider value={{ email: null, signOut }}>
        {children}
      </AuthContext.Provider>
    );
  }

  if (status !== "authenticated") {
    return <LoginPage notice={notice} />;
  }

  return (
    <AuthContext.Provider value={{ email, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
