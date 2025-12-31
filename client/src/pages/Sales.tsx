import DashboardLayout from "@/components/DashboardLayout";
import ExportButton from "@/components/ExportButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFilter } from "@/contexts/FilterContext";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function Sales() {
  const { filteredData } = useFilter();

  const stats = useMemo(() => {
    // 월별 매출액 집계
    const monthlyStats: Record<string, number> = {};

    if (filteredData.sales.length > 0) {
      // 데이터 범위 내 최소/최대 날짜 찾기 (없으면 현재 연도 기준)
      const now = new Date();
      const currentYear = now.getFullYear();
      let minDate = `${currentYear}-01`;
      let maxDate = `${currentYear}-12`;

      const dates = filteredData.sales.map(s => s.date).filter(Boolean) as string[];
      if (dates.length > 0) {
        const sortedDates = [...dates].sort();
        minDate = sortedDates[0].substring(0, 7);
        maxDate = sortedDates[sortedDates.length - 1].substring(0, 7);
      }

      // 시작월부터 종료월까지 모든 월 초기화
      let curr = new Date(minDate + "-01");
      const end = new Date(maxDate + "-01");
      while (curr <= end) {
        const m = curr.toISOString().substring(0, 7);
        monthlyStats[m] = 0;
        curr.setMonth(curr.getMonth() + 1);
      }

      // 실제 데이터 누적
      filteredData.sales.forEach(item => {
        if (!item.date) return;
        const month = item.date.substring(0, 7);
        if (monthlyStats[month] !== undefined) {
          monthlyStats[month] += item.amount;
        } else {
          monthlyStats[month] = item.amount;
        }
      });
    }

    const monthlyTrend = Object.entries(monthlyStats)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // 기존 규격 정보는 상단 카드에서 사용하므로 유지
    const specStats: Record<string, number> = {};
    filteredData.sales.forEach(item => {
      specStats[item.spec] = (specStats[item.spec] || 0) + 1;
    });

    const topSpecs = Object.entries(specStats)
      .sort(([, a], [, b]) => b - a)
      .map(([name, count]) => ({ name, count }));

    const totalCount = filteredData.sales.length;
    const totalAmount = filteredData.sales.reduce((sum, item) => sum + item.amount, 0);
    const totalPurchaseAmount = filteredData.purchase.reduce((sum, item) => sum + item.amount, 0);
    const totalTransportCost = filteredData.inout.reduce((sum, item) => sum + item.amount, 0);
    const avgAmount = totalCount > 0 ? Math.round(totalAmount / totalCount) : 0;
    const topSpecName = topSpecs.length > 0 ? topSpecs[0].name : "-";
    const topSpecRatio = topSpecs.length > 0 && totalCount > 0
      ? ((topSpecs[0].count / totalCount) * 100).toFixed(1)
      : "0.0";

    return { monthlyTrend, totalCount, totalAmount, totalPurchaseAmount, totalTransportCost, avgAmount, topSpecName, topSpecRatio };
  }, [filteredData]);

  const { monthlyTrend, totalCount, totalAmount, totalPurchaseAmount, totalTransportCost, avgAmount, topSpecName, topSpecRatio } = stats;

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-glow mb-2">매출 분석</h1>
            <p className="text-muted-foreground text-lg">
              월별 매출 추이 및 판매 현황 분석
            </p>
          </div>
          <ExportButton dataType="sales" label="다운로드" />
        </div>

        {/* Monthly Sales Chart */}
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>월별 매출 현황</CardTitle>
            <CardDescription>선택된 기간 내의 매출액 변화 추이</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrend} margin={{ top: 20, right: 30, left: 40, bottom: 20 }}>
                  <defs>
                    <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.2} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                  <XAxis
                    dataKey="name"
                    stroke="#888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => (val && val.includes("-") ? val.split("-")[1] + "월" : val)}
                  />
                  <YAxis
                    stroke="#888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `₩${val.toLocaleString()}`}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{
                      backgroundColor: 'rgba(20, 20, 30, 0.9)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      color: '#fff'
                    }}
                    formatter={(value: number) => `₩${value.toLocaleString()}`}
                  />
                  <Bar dataKey="value" fill="url(#salesGradient)" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid gap-6 md:grid-cols-4">
          <Card className="glass-card bg-gradient-to-br from-primary/20 to-transparent border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">총 매출액</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">₩{totalAmount.toLocaleString()}</div>
              <p className="text-[10px] text-muted-foreground mt-1">판매 계약 공급가액 합계</p>
            </CardContent>
          </Card>

          <Card className="glass-card bg-gradient-to-br from-amber-500/20 to-transparent border-amber-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">총 매입액</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-500">
                ₩{totalPurchaseAmount.toLocaleString()}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">매입 계약 합계</p>
            </CardContent>
          </Card>

          <Card className="glass-card bg-gradient-to-br from-red-500/20 to-transparent border-red-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">총 운반비</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-400">
                ₩{totalTransportCost.toLocaleString()}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">입출고 운반비 합계</p>
            </CardContent>
          </Card>

          <Card className="glass-card bg-gradient-to-br from-chart-2/20 to-transparent border-chart-2/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">실질 순이익</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-chart-2">
                ₩{(totalAmount - totalPurchaseAmount - totalTransportCost).toLocaleString()}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">매출 - (매입 + 운반비)</p>
            </CardContent>
          </Card>
        </div>
        {/* Detailed Sales List */}
        <Card className="glass-panel overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>매출 계약 상세 리스트</CardTitle>
              <CardDescription>검색 및 필터링된 기간 내의 모든 매출 계약 (최신순)</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="px-6 py-4 font-medium">날짜</th>
                    <th className="px-6 py-4 font-medium">계약번호</th>
                    <th className="px-6 py-4 font-medium">거래처명</th>
                    <th className="px-6 py-4 font-medium">규격</th>
                    <th className="px-6 py-4 font-medium text-right">공급가액</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs">
                  {[...filteredData.sales]
                    .sort((a, b) => {
                      const dateA = a.date ? a.date : "0000-00-00";
                      const dateB = b.date ? b.date : "0000-00-00";
                      if (dateA !== dateB) return dateB.localeCompare(dateA);
                      return b.id.localeCompare(a.id); // 날짜 같으면 ID 역순
                    })
                    .slice(0, 100) // 100개까지 확장
                    .map((item, idx) => (
                      <tr key={idx} className="hover:bg-white/5 transition-colors group">
                        <td className="px-6 py-4 text-muted-foreground font-mono">{item.date || "-"}</td>
                        <td className="px-6 py-4 font-bold text-white group-hover:text-primary transition-colors">{item.id}</td>
                        <td className="px-6 py-4">{item.client}</td>
                        <td className="px-6 py-4 font-medium">{item.spec}</td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-chart-2">
                          ₩{item.amount?.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  {filteredData.sales.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground uppercase tracking-widest">
                        표시할 데이터가 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {filteredData.sales.length > 100 && (
                <div className="p-4 text-center border-t border-white/5">
                  <p className="text-xs text-muted-foreground">
                    최근 100개 항목만 표시 중입니다. 전체 데이터는 데이터 그리드에서 확인하세요.
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
