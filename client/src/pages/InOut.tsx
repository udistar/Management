import DashboardLayout from "@/components/DashboardLayout";
import ExportButton from "@/components/ExportButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFilter } from "@/contexts/FilterContext";
import { format, parseISO } from "date-fns";
import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function InOut() {
  const { filters, filteredData } = useFilter();

  const stats = useMemo(() => {
    const total = filteredData.inout.length;
    const inCount = filteredData.inout.filter(i => i.type === "입고").length;
    const outCount = filteredData.inout.filter(i => i.type === "출고").length;

    // 월별 트렌드 집계
    const monthlyStats: Record<string, { in: number; out: number }> = {};
    const startDate = filters.dateRange.from || new Date();
    const endDate = filters.dateRange.to || new Date();

    // 시작/종료 날짜를 월 단위로 정규화
    let current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const last = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

    while (current <= last) {
      const m = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
      monthlyStats[m] = { in: 0, out: 0 };
      current.setMonth(current.getMonth() + 1);
    }

    filteredData.inout.forEach(item => {
      if (!item.date) return;
      const month = item.date.substring(0, 7); // YYYY-MM
      if (monthlyStats[month]) {
        if (item.type === "입고") monthlyStats[month].in += 1;
        else if (item.type === "출고") monthlyStats[month].out += 1;
      }
    });

    const recentTrend = Object.entries(monthlyStats)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, in: data.in, out: data.out }));

    // 규격별 입출고 집계
    const specStats: Record<string, number> = {};
    filteredData.inout.forEach(item => {
      specStats[item.spec] = (specStats[item.spec] || 0) + 1;
    });

    const bySpec = Object.entries(specStats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));

    const totalCost = filteredData.inout.reduce((sum, item) => sum + item.amount, 0);

    return { total, inCount, outCount, recentTrend, bySpec, totalCost };
  }, [filteredData, filters.dateRange]);

  const { total, inCount, outCount, recentTrend, bySpec, totalCost } = stats;

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-glow mb-2">입출고 현황</h1>
            <p className="text-muted-foreground text-lg">
              월별 물류 이동 추이 및 규격별 입출고 분석
            </p>
          </div>
          <ExportButton dataType="inout" label="다운로드" />
        </div>

        {/* Summary Cards */}
        <div className="grid gap-6 md:grid-cols-4">
          <Card className="glass-card bg-gradient-to-br from-primary/20 to-transparent border-primary/20">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">총 물동량</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold">{total}건</div>
            </CardContent>
          </Card>

          <Card className="glass-card bg-gradient-to-br from-chart-4/20 to-transparent border-chart-4/20">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">입고 (In)</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold text-chart-4">{inCount}건</div>
            </CardContent>
          </Card>

          <Card className="glass-card bg-gradient-to-br from-chart-1/20 to-transparent border-chart-1/20">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">출고 (Out)</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold text-chart-1">{outCount}건</div>
            </CardContent>
          </Card>

          <Card className="glass-card bg-gradient-to-br from-yellow-500/20 to-transparent border-yellow-500/20">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">총 입출고 비용</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold text-yellow-400">₩{totalCost.toLocaleString()}</div>
              <p className="text-[10px] text-muted-foreground mt-1">화물비 + 상하차비</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Trend Chart */}
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>월별 입출고 추이</CardTitle>
            <CardDescription>선택 기간 내 물동량 변화</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={recentTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                  <XAxis
                    dataKey="month"
                    stroke="#888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => val.split("-")[1] + "월"}
                  />
                  <YAxis
                    stroke="#888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value} 건`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(20, 20, 30, 0.9)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      color: '#fff'
                    }}
                    labelFormatter={(label) => `${label.split("-")[0]}년 ${label.split("-")[1]} 월`}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Area
                    name="입고 (IN)"
                    type="monotone"
                    dataKey="in"
                    stroke="#3b82f6"
                    fillOpacity={1}
                    fill="url(#colorIn)"
                    strokeWidth={3}
                  />
                  <Area
                    name="출고 (OUT)"
                    type="monotone"
                    dataKey="out"
                    stroke="#f43f5e"
                    fillOpacity={1}
                    fill="url(#colorOut)"
                    strokeWidth={3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* In/Out Ratio */}
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>입고 vs 출고 비율</CardTitle>
              <CardDescription>전체 물동량 구성비</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-[200px] gap-8">
                <div className="text-center">
                  <div className="text-5xl font-bold text-chart-4 mb-2">{inCount}</div>
                  <div className="text-sm text-muted-foreground uppercase tracking-widest">입고 (In)</div>
                </div>
                <div className="h-16 w-[1px] bg-white/10" />
                <div className="text-center">
                  <div className="text-5xl font-bold text-chart-1 mb-2">{outCount}</div>
                  <div className="text-sm text-muted-foreground uppercase tracking-widest">출고 (Out)</div>
                </div>
              </div>
              <div className="mt-4 h-4 w-full bg-secondary/30 rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-chart-4 transition-all duration-1000"
                  style={{ width: `${total > 0 ? (inCount / total) * 100 : 0}% ` }}
                />
                <div
                  className="h-full bg-chart-1 transition-all duration-1000"
                  style={{ width: `${total > 0 ? (outCount / total) * 100 : 0}% ` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>{total > 0 ? ((inCount / total) * 100).toFixed(1) : 0}%</span>
                <span>{total > 0 ? ((outCount / total) * 100).toFixed(1) : 0}%</span>
              </div>
            </CardContent>
          </Card>

          {/* Top Specs In/Out */}
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>규격별 입출고 Top 5</CardTitle>
              <CardDescription>가장 이동이 잦은 규격</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                {bySpec.length > 0 ? (
                  bySpec.map((item, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{item.name}</span>
                        <span className="text-muted-foreground">{item.value}건</span>
                      </div>
                      <div className="h-2 w-full bg-secondary/30 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-chart-2 to-chart-3 rounded-full"
                          style={{ width: `${(item.value / bySpec[0].value) * 100}% ` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    데이터가 없습니다.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed InOut List */}
        <Card className="glass-panel overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>입출고 내역 상세 리스트</CardTitle>
              <CardDescription>검색 및 필터링된 모든 입출고 기록 (최신순)</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="px-6 py-4 font-medium">날짜</th>
                    <th className="px-6 py-4 font-medium text-center">구분</th>
                    <th className="px-6 py-4 font-medium">거래처명</th>
                    <th className="px-6 py-4 font-medium">현장(위치)</th>
                    <th className="px-6 py-4 font-medium">규격</th>
                    <th className="px-6 py-4 font-medium text-right">비용 (화물+상하차)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs">
                  {[...filteredData.inout]
                    .sort((a, b) => {
                      const dateA = a.date || "0000-00-00";
                      const dateB = b.date || "0000-00-00";
                      if (dateA !== dateB) return dateB.localeCompare(dateA);
                      return 0;
                    })
                    .slice(0, 100)
                    .map((item, idx) => (
                      <tr key={idx} className="hover:bg-white/5 transition-colors group">
                        <td className="px-6 py-4 text-muted-foreground font-mono">{item.date || "-"}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px - 2 py - 1 rounded - full text - [10px] font - bold ${item.type === "입고" ? "bg-chart-4/20 text-chart-4" : "bg-chart-1/20 text-chart-1"
                            } `}>
                            {item.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-medium text-white">{item.client}</td>
                        <td className="px-6 py-4">{item.location}</td>
                        <td className="px-6 py-4 text-muted-foreground">{item.spec}</td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-yellow-500">
                          ₩{item.amount?.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  {filteredData.inout.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground uppercase tracking-widest">
                        표시할 데이터가 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {filteredData.inout.length > 100 && (
                <div className="p-4 text-center border-t border-white/5">
                  <p className="text-xs text-muted-foreground">
                    최근 100개 항목만 표시 중입니다.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
