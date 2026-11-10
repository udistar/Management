import {
  HomepageVisitsChart,
  VISIT_WEEKDAY_COLOR,
  VISIT_WEEKEND_COLOR,
} from "@/components/HomepageVisitsChart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import {
  buildVisitWindow,
  visitTotal,
  type VisitBar,
} from "@shared/homepageVisits";
import { useEffect, useState } from "react";

export default function HomepageVisitsCard() {
  const [bars, setBars] = useState<VisitBar[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) {
          if (!cancelled) setError("로그인 후 다시 열어 주세요.");
          return;
        }

        const response = await fetch("/api/ga4-daily-visits", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          if (!cancelled) {
            setError(
              response.status === 401
                ? "로그인 후 다시 열어 주세요."
                : "GA4 조회수를 불러오지 못했습니다."
            );
          }
          return;
        }

        const body = (await response.json()) as { days?: VisitBar[] };
        const days = Array.isArray(body.days) ? body.days : [];
        if (!cancelled) {
          setBars(buildVisitWindow(days));
          setError(null);
        }
      } catch {
        if (!cancelled) setError("GA4 조회수를 불러오지 못했습니다.");
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const total = bars ? visitTotal(bars) : 0;

  return (
    <Card className="glass-panel">
      <CardHeader className="px-4 sm:px-6">
        <CardTitle>홈페이지 일별 방문(30일)</CardTitle>
        <CardDescription>
          {bars
            ? `GA4 조회 합계 ${total.toLocaleString()}회 · 오늘은 제외`
            : "어제까지 30일 · 오늘은 제외"}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        <div className="mb-3 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ background: VISIT_WEEKDAY_COLOR }}
            />
            평일
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ background: VISIT_WEEKEND_COLOR }}
            />
            주말
          </span>
        </div>

        {error ? (
          <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
            {error}
          </div>
        ) : !bars ? (
          <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
            불러오는 중...
          </div>
        ) : (
          <HomepageVisitsChart bars={bars} />
        )}
      </CardContent>
    </Card>
  );
}
