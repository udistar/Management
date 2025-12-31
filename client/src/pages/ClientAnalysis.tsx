import DashboardLayout from "@/components/DashboardLayout";
import ExportButton from "@/components/ExportButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFilter } from "@/contexts/FilterContext";
import { format } from "date-fns";
import { useMemo } from "react";
import { BarChart, Bar, LineChart, Line, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function ClientAnalysis() {
  const { filters, filteredData } = useFilter();

  const stats = useMemo(() => {
    if (!filters.selectedClient) {
      return {
        clientName: "거래처 미선택",
        totalSales: 0,
        totalInOut: 0,
        totalPurchase: 0,
        totalRental: 0,
        salesAmount: 0,
        purchaseAmount: 0,
        margin: 0,
        topSpec: "",
        transactionHistory: [],
        monthlyTrend: [],
        specBreakdown: [],
      };
    }

    // 매출 통계
    const salesCount = filteredData.sales.length;
    const salesAmount = filteredData.sales.reduce((sum, item) => sum + item.amount, 0);

    // 입출고 통계
    const inOutCount = filteredData.inout.length;
    const inCount = filteredData.inout.filter(i => i.type === "입고").length;
    const outCount = filteredData.inout.filter(i => i.type === "출고").length;

    // 매입 통계
    const purchaseCount = filteredData.purchase.length;
    const purchaseAmount = filteredData.purchase.reduce((sum, item) => sum + item.amount, 0);

    // 임대 통계
    const rentalCount = filteredData.rental.length;
    const rentalActive = filteredData.rental.filter(r => r.status === "ongoing").length;

    // 마진율 계산
    const margin = salesAmount > 0 ? ((salesAmount - purchaseAmount) / salesAmount * 100) : 0;

    // 규격별 거래 집계
    const specStats: Record<string, number> = {};
    [...filteredData.sales, ...filteredData.inout, ...filteredData.purchase, ...filteredData.rental].forEach(item => {
      specStats[item.spec] = (specStats[item.spec] || 0) + 1;
    });

    const topSpec = Object.entries(specStats).sort(([, a], [, b]) => b - a)[0]?.[0] || "-";

    // 월별 트렌드 (매출)
    const monthlyStats: Record<string, number> = {};

    // 선택된 기간 내의 모든 월 초기화 (0원)
    const { from, to } = filters.dateRange;
    if (from && to) {
      const current = new Date(from);
      const end = new Date(to);
      while (current <= end) {
        const monthStr = format(current, "yyyy-MM");
        monthlyStats[monthStr] = 0;
        current.setMonth(current.getMonth() + 1);
      }
    }

    filteredData.sales.forEach(item => {
      if (item.date) {
        const month = item.date.substring(0, 7);
        if (monthlyStats[month] !== undefined) {
          monthlyStats[month] += item.amount;
        } else {
          monthlyStats[month] = (monthlyStats[month] || 0) + item.amount;
        }
      }
    });

    const monthlyTrend = Object.entries(monthlyStats)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => ({ month, amount: Math.round(amount / 10000) })); // 만원 단위

    // 규격별 거래량
    const specBreakdown = Object.entries(specStats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));

    // 거래 이력 (최근 10건)
    const transactionHistory = [
      ...filteredData.sales.map(item => ({
        date: item.date || "-",
        type: "매출",
        spec: item.spec,
        amount: item.amount,
      })),
      ...filteredData.inout.map(item => ({
        date: item.date,
        type: `입출고(${item.type})`,
        spec: item.spec,
        amount: 0,
      })),
      ...filteredData.purchase.map(item => ({
        date: item.date,
        type: "매입",
        spec: item.spec,
        amount: item.amount,
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    return {
      clientName: filters.selectedClient,
      totalSales: salesCount,
      totalInOut: inOutCount,
      inCount,
      outCount,
      totalPurchase: purchaseCount,
      totalRental: rentalCount,
      rentalActive,
      salesAmount,
      purchaseAmount,
      margin: Math.round(margin * 100) / 100,
      topSpec,
      transactionHistory,
      monthlyTrend,
      specBreakdown,
    };
  }, [filters.selectedClient, filteredData]);

  if (!filters.selectedClient) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-muted-foreground text-lg mb-2">거래처를 선택하세요</p>
            <p className="text-muted-foreground text-sm">필터 바에서 거래처를 선택하면 상세 분석 정보가 표시됩니다.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-glow mb-2">{stats.clientName}</h1>
            <p className="text-muted-foreground text-lg">거래처별 상세 거래 현황 및 분석</p>
          </div>
          <ExportButton dataType="sales" label="거래 내역 다운로드" />
        </div>

        {/* KPI Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="glass-panel">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">총 매출 건수</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-chart-1">{stats.totalSales}</div>
              <p className="text-xs text-muted-foreground mt-1">매출계약</p>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">총 매출액</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-chart-2">₩{(Math.round(stats.salesAmount / 10000)).toLocaleString()}만</div>
              <p className="text-xs text-muted-foreground mt-1">총 매출 공급가액 합계</p>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">입출고 건수</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-chart-3">{stats.totalInOut}</div>
              <p className="text-xs text-muted-foreground mt-1">입고 {stats.inCount}건 / 출고 {stats.outCount}건</p>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">마진율</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-chart-4">{stats.margin}%</div>
              <p className="text-xs text-muted-foreground mt-1">판매 - 매입</p>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Trend */}
        {stats.monthlyTrend.length > 0 && (
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>월별 매출 추이</CardTitle>
              <CardDescription>선택 기간 내 월별 매출액 변화</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.monthlyTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="month" stroke="rgba(255,255,255,0.5)" />
                    <YAxis stroke="rgba(255,255,255,0.5)" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(20, 20, 30, 0.9)",
                        backdropFilter: "blur(10px)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "12px",
                        color: "#fff",
                      }}
                      formatter={(value) => `₩${value}만`}
                    />
                    <Line
                      type="monotone"
                      dataKey="amount"
                      stroke="var(--chart-2)"
                      strokeWidth={3}
                      dot={{ fill: "var(--chart-2)", r: 5 }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Spec Breakdown */}
          {stats.specBreakdown.length > 0 && (
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle>주요 거래 규격 Top 5</CardTitle>
                <CardDescription>가장 많이 거래되는 규격</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.specBreakdown.map((item, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{item.name}</span>
                        <span className="text-muted-foreground">{item.value}건</span>
                      </div>
                      <div className="h-2 w-full bg-secondary/30 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-chart-2 to-chart-3 rounded-full"
                          style={{ width: `${(item.value / stats.specBreakdown[0].value) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Summary Stats */}
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>거래 현황 요약</CardTitle>
              <CardDescription>전체 거래 통계</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/10">
                  <span className="text-sm text-muted-foreground">매입 총액</span>
                  <span className="font-bold text-chart-1">₩{(stats.purchaseAmount / 100000000).toFixed(1)}억</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/10">
                  <span className="text-sm text-muted-foreground">임대 계약</span>
                  <span className="font-bold text-chart-3">{stats.totalRental}건</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/10">
                  <span className="text-sm text-muted-foreground">진행중 임대</span>
                  <span className="font-bold text-chart-4">{stats.rentalActive}건</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/10">
                  <span className="text-sm text-muted-foreground">주요 규격</span>
                  <span className="font-bold text-chart-2">{stats.topSpec}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        {stats.transactionHistory.length > 0 && (
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>최근 거래 이력</CardTitle>
              <CardDescription>최근 10건의 거래 기록</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-2 px-2 text-muted-foreground font-medium">날짜</th>
                      <th className="text-left py-2 px-2 text-muted-foreground font-medium">거래 유형</th>
                      <th className="text-left py-2 px-2 text-muted-foreground font-medium">규격</th>
                      <th className="text-right py-2 px-2 text-muted-foreground font-medium">금액</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.transactionHistory.map((item, index) => (
                      <tr key={index} className="border-b border-white/5 hover:bg-white/5 transition">
                        <td className="py-2 px-2">{item.date}</td>
                        <td className="py-2 px-2">
                          <span className="px-2 py-1 rounded-full text-xs bg-white/10 text-white/70">
                            {item.type}
                          </span>
                        </td>
                        <td className="py-2 px-2">{item.spec}</td>
                        <td className="py-2 px-2 text-right font-medium">
                          {item.amount > 0 ? `₩${(item.amount / 10000).toLocaleString()}만` : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
