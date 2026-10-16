import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ALLOWED_OWNER_EMAIL, isAllowedOwnerEmail } from "@/lib/allowedEmail";
import { authRedirectNotice, supabase } from "@/lib/supabase";
import { LayoutDashboard, Loader2 } from "lucide-react";
import { FormEvent, ReactNode, useEffect, useState } from "react";

export function AuthScreen({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="pointer-events-none absolute left-[-10%] top-[-20%] h-[420px] w-[420px] rounded-full bg-primary/20 blur-[100px]" />
      <div className="pointer-events-none absolute bottom-[-20%] right-[-10%] h-[420px] w-[420px] rounded-full bg-secondary/20 blur-[100px]" />
      <div className="relative w-full max-w-md">{children}</div>
    </div>
  );
}

function toKoreanSendError(error: { message?: string; code?: string | null }): string {
  const code = (error.code ?? "").toLowerCase();
  const message = (error.message ?? "").toLowerCase();
  const blob = `${code} ${message}`;

  if (blob.includes("rate") || blob.includes("too many")) {
    return "메일을 너무 자주 요청했어요. 잠시 후 다시 시도해 주세요.";
  }
  if (blob.includes("signup") || blob.includes("signups not allowed")) {
    return "새 계정 등록이 꺼져 있어요. Supabase에서 이메일 가입을 켠 뒤 다시 시도해 주세요.";
  }
  if (blob.includes("redirect")) {
    return "돌아올 주소가 Supabase에 등록되어 있지 않아요. 리다이렉트 URL 설정을 확인해 주세요.";
  }
  if (blob.includes("smtp") || blob.includes("error sending") || blob.includes("email rate")) {
    return "로그인 메일을 보내지 못했어요. Supabase 이메일 발송 설정을 확인해 주세요.";
  }
  return "로그인 링크를 보내지 못했어요. 잠시 후 다시 시도해 주세요.";
}

export default function LoginPage({ notice }: { notice?: string | null }) {
  const [email, setEmail] = useState(ALLOWED_OWNER_EMAIL);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(() => {
    if (notice) return { tone: "error", text: notice };
    if (authRedirectNotice) return { tone: "error", text: authRedirectNotice };
    return null;
  });

  useEffect(() => {
    if (notice) setMessage({ tone: "error", text: notice });
  }, [notice]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = email.trim();

    if (!trimmed) {
      setMessage({ tone: "error", text: "이메일을 입력해 주세요." });
      return;
    }

    if (!isAllowedOwnerEmail(trimmed)) {
      setMessage({ tone: "error", text: "등록된 관리자 이메일만 로그인할 수 있어요." });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    const { error } = await supabase.auth.signInWithOtp({
      email: ALLOWED_OWNER_EMAIL,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    setSubmitting(false);

    if (error) {
      setMessage({ tone: "error", text: toKoreanSendError(error) });
      return;
    }

    setMessage({
      tone: "success",
      text: "로그인 링크를 보냈어요. Gmail에서 메일을 열고 링크를 눌러 주세요.",
    });
  };

  return (
    <AuthScreen>
      <div className="glass-panel rounded-2xl p-8">
        <div className="mb-6 flex items-center gap-3">
          <LayoutDashboard className="h-7 w-7 shrink-0 text-primary" />
          <div>
            <h1 className="text-xl font-semibold tracking-tight">관리 대시보드 로그인</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              비밀번호 없이, 등록된 이메일로 로그인 링크를 보내 드려요.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="login-email">이메일</Label>
            <Input
              id="login-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={ALLOWED_OWNER_EMAIL}
              disabled={submitting}
            />
            <p className="text-xs text-muted-foreground">
              허용된 주소만 사용할 수 있어요. {ALLOWED_OWNER_EMAIL}
            </p>
          </div>

          {message && (
            <p
              role={message.tone === "error" ? "alert" : "status"}
              className={
                message.tone === "error"
                  ? "text-sm text-destructive"
                  : "text-sm text-chart-4"
              }
            >
              {message.text}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            이메일로 로그인 링크 받기
          </Button>
        </form>
      </div>
    </AuthScreen>
  );
}
