import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/lib/supabase";
import { Loader2, Phone, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

interface CallRow {
  call_id: string;
  called_at: string | null;
  phone_masked: string | null;
  company: string | null;
  category: "견적" | "문의" | "내부" | "미분류" | null;
  summary: string | null;
  amount_text: string | null;
  assignee: string | null;
  status: "대기" | "진행" | "보내 대기" | "완료";
  stage_recorded: boolean | null;
  stage_summarized: boolean | null;
  stage_assigned: boolean | null;
  unclassified_reason: string | null;
  status_note: string | null;
  status_by: string | null;
  status_updated_at: string | null;
}

type Range = "today" | "week";

const CATEGORY_COLOR: Record<string, string> = {
  견적: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  문의: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  내부: "bg-zinc-500/20 text-zinc-300 border-zinc-500/40",
  미분류: "bg-amber-500/20 text-amber-300 border-amber-500/40",
};
const STATUS_COLOR: Record<string, string> = {
  대기: "bg-zinc-600 text-white",
  진행: "bg-blue-600 text-white",
  "보내 대기": "bg-amber-500 text-black",
  완료: "bg-emerald-600 text-white",
};

function kstDateKey(d: Date) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(d);
}

function rangeStart(range: Range): Date {
  const todayKey = kstDateKey(new Date());
  const start = new Date(`${todayKey}T00:00:00+09:00`);
  if (range === "week") {
    const dow = new Date(`${todayKey}T12:00:00+09:00`).getUTCDay();
    const back = (dow + 6) % 7; // 월요일 시작
    start.setTime(start.getTime() - back * 86400000);
  }
  return start;
}

function fmtKst(iso: string | null) {
  if (!iso) return "시각 없음";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul", month: "numeric", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date(iso));
}

function Steps({ row }: { row: CallRow }) {
  const steps = [
    { label: "녹음", done: !!row.stage_recorded, current: false },
    { label: "요약", done: !!row.stage_summarized, current: false },
    { label: "담당", done: !!row.stage_assigned, current: false },
    { label: row.status, done: row.status === "완료", current: row.status !== "대기" && row.status !== "완료" },
  ];
  return (
    <ol className="flex flex-wrap items-center gap-1 text-base">
      {steps.map((s, i) => (
        <li key={i} className="flex items-center gap-1">
          <span
            className={
              "px-2 py-1 rounded-md border whitespace-nowrap " +
              (s.done
                ? "bg-emerald-600/25 border-emerald-500/50 text-emerald-200"
                : s.current
                  ? "bg-amber-500/25 border-amber-500/50 text-amber-200"
                  : "border-zinc-600 text-zinc-400")
            }
          >
            {s.done ? "✓ " : ""}
            {s.label}
          </span>
          {i < steps.length - 1 && <span className="text-zinc-500">→</span>}
        </li>
      ))}
    </ol>
  );
}

export default function CallStatus() {
  // 홈 화면 바로가기용 아이콘·manifest (이 화면에서만 붙이고, 떠날 때 원래대로)
  useEffect(() => {
    const added: Element[] = [];
    const add = (tag: string, attrs: Record<string, string>) => {
      const el = document.createElement(tag);
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
      document.head.appendChild(el);
      added.push(el);
    };
    add("link", { rel: "manifest", href: "/call-status.webmanifest" });
    add("link", { rel: "apple-touch-icon", sizes: "180x180", href: "/call-status-apple-touch-icon.png" });
    add("meta", { name: "apple-mobile-web-app-title", content: "통화현황" });
    add("meta", { name: "apple-mobile-web-app-capable", content: "yes" });
    add("meta", { name: "theme-color", content: "#122652" });
    const prevTitle = document.title;
    document.title = "통화현황";
    return () => {
      added.forEach((el) => el.remove());
      document.title = prevTitle;
    };
  }, []);
  const [range, setRange] = useState<Range>("today");
  const [rows, setRows] = useState<CallRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("call_status")
      .select("*")
      .gte("called_at", rangeStart(range).toISOString())
      .order("called_at", { ascending: false })
      .limit(300);
    if (error) setError("통화 현황을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.");
    setRows((data as CallRow[]) ?? []);
    setLoading(false);
  }, [range]);

  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), 60000);
    return () => window.clearInterval(t);
  }, [load]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { 대기: 0, 진행: 0, "보내 대기": 0, 완료: 0 };
    rows.forEach(r => {
      c[r.status] = (c[r.status] ?? 0) + 1;
    });
    return c;
  }, [rows]);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-4 pb-10">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold">통화 처리 현황</h1>
          <button
            onClick={() => void load()}
            className="flex items-center gap-1 rounded-lg border border-zinc-600 px-3 py-2 text-base"
            aria-label="새로고침"
          >
            <RefreshCw className="h-5 w-5" /> 새로고침
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2" role="tablist">
          {(["today", "week"] as Range[]).map(r => (
            <button
              key={r}
              role="tab"
              aria-selected={range === r}
              onClick={() => setRange(r)}
              className={
                "rounded-xl py-3 text-lg font-semibold border " +
                (range === r ? "bg-primary text-primary-foreground border-primary" : "border-zinc-600")
              }
            >
              {r === "today" ? "오늘" : "이번 주"}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-4 gap-2 text-center">
          {Object.entries(counts).map(([k, v]) => (
            <div key={k} className="rounded-xl border border-zinc-700 p-2">
              <div className="text-sm text-zinc-400">{k}</div>
              <div className="text-2xl font-bold">{v}</div>
            </div>
          ))}
        </div>

        {loading && rows.length === 0 && (
          <div className="flex items-center justify-center gap-2 py-10 text-lg text-zinc-400">
            <Loader2 className="h-6 w-6 animate-spin" /> 불러오는 중이에요
          </div>
        )}
        {error && <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-4 text-lg text-red-200">{error}</div>}
        {!loading && !error && rows.length === 0 && (
          <div className="rounded-xl border border-zinc-700 p-6 text-center text-lg text-zinc-400">
            {range === "today" ? "오늘" : "이번 주"} 들어온 통화가 없어요.
          </div>
        )}

        <ul className="space-y-3">
          {rows.map(r => (
            <li key={r.call_id} className="rounded-2xl border border-zinc-700 bg-card p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-base text-zinc-400">{fmtKst(r.called_at)}</div>
                  <div className="text-xl sm:text-2xl font-bold break-keep">{r.company || "업체 미확인"}</div>
                  {r.phone_masked && (
                    <div className="flex items-center gap-1 text-lg text-zinc-300">
                      <Phone className="h-4 w-4" />
                      {r.phone_masked}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className={"rounded-full px-3 py-1 text-base font-bold " + (STATUS_COLOR[r.status] ?? "")}>{r.status}</span>
                  {r.category && (
                    <span className={"rounded-full border px-3 py-1 text-base " + (CATEGORY_COLOR[r.category] ?? "")}>{r.category}</span>
                  )}
                </div>
              </div>
              <p className="text-lg leading-relaxed break-keep">{r.summary || "요약 없음"}</p>
              {r.amount_text && <p className="text-lg font-semibold text-blue-300">{r.amount_text}</p>}
              {r.category === "미분류" && r.unclassified_reason && (
                <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-base text-amber-200">미분류 이유: {r.unclassified_reason}</p>
              )}
              <Steps row={r} />
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-base text-zinc-400">
                <span>담당: {r.assignee || "아직 없음"}</span>
                {r.status_note && <span>메모: {r.status_note}</span>}
                {r.status_updated_at && <span>상태 바뀐 시각: {fmtKst(r.status_updated_at)}</span>}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </DashboardLayout>
  );
}
