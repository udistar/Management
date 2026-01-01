import DashboardLayout from "@/components/DashboardLayout";
import ExportButton from "@/components/ExportButton";
import UploadHistory from "@/components/UploadHistory";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFilter } from "@/contexts/FilterContext";
import { ArrowDownRight, ArrowUpRight, DollarSign, Package, TrendingUp, Users } from "lucide-react";
import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export default function Home() {
  const { filteredData, assetCount } = useFilter();

  // 필터링된 데이터를 기반으로 KPI 계산
  const stats = useMemo(() => {
    const revenue = filteredData.sales.reduce((sum, item) => sum + item.amount, 0);
    const cost = filteredData.purchase.reduce((sum, item) => sum + item.amount, 0);
    const profit = revenue - cost;
    const margin = revenue > 0 ? ((profit / revenue) * 100).toFixed(2) : "0.00";

    const totalInOut = filteredData.inout.length;

    const totalRental = filteredData.rental.length;
    const ongoingRental = filteredData.rental.filter(r => r.status === "ongoing").length;

    // 분모를 자산 수량(assetCount)으로 변경. assetCount가 0이면 0.0 표시
    const rentalRate = assetCount > 0 ? ((ongoingRental / assetCount) * 100).toFixed(1) : "0.0";

    // 규격별 판매량 집계
    const specCounts: Record<string, number> = {};
    filteredData.sales.forEach(item => {
      specCounts[item.spec] = (specCounts[item.spec] || 0) + 1;
    });

    const topSpecs = Object.entries(specCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));

    return { revenue, cost, profit, margin, totalInOut, rentalRate, topSpecs };
  }, [filteredData, assetCount]);

  const kpiCards = [
    {
      title: "총 매출액",
      value: `${(stats.revenue / 100000000).toFixed(1)}억원`,
      subtext: "선택 기간 누적",
      icon: DollarSign,
      trend: "up",
      color: "text-chart-1",
      bg: "bg-chart-1/10",
      border: "border-chart-1/20"
    },
    {
      title: "순수익",
      value: `${(stats.profit / 100000000).toFixed(1)}억원`,
      subtext: `마진율 ${stats.margin}%`,
      icon: TrendingUp,
      trend: "up",
      color: "text-chart-4",
      bg: "bg-chart-4/10",
      border: "border-chart-4/20"
    },
    {
      title: "총 입출고",
      value: `${stats.totalInOut.toLocaleString()}건`,
      subtext: "활발한 물류 이동",
      icon: Package,
      trend: "neutral",
      color: "text-chart-2",
      bg: "bg-chart-2/10",
      border: "border-chart-2/20"
    },
    {
      title: "임대 가동률",
      value: `${stats.rentalRate}%`,
      subtext: "현재 진행중인 계약",
      icon: Users,
      trend: "down",
      color: "text-chart-3",
      bg: "bg-chart-3/10",
      border: "border-chart-3/20"
    }
  ];

  const pieData = [
    { name: "매출", value: stats.revenue },
    { name: "비용", value: stats.cost },
  ];

  const COLORS = ['var(--chart-1)', 'var(--chart-5)'];

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-glow mb-2">종합 관리 대시보드</h1>
            <p className="text-muted-foreground text-lg">
              실시간 데이터 분석 및 주요 지표 모니터링
            </p>
          </div>
          <div className="flex gap-2">
            <ExportButton dataType="sales" label="매출 다운로드" />
            <ExportButton dataType="inout" label="입출고 다운로드" />
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {kpiCards.map((card, index) => (
            <Card key={index} className={`glass-card border-l-4 ${card.border} overflow-hidden relative group`}>
              <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full ${card.bg} blur-2xl group-hover:blur-3xl transition-all duration-500`} />

              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold tracking-tight mb-1">{card.value}</div>
                <div className="flex items-center text-xs text-muted-foreground">
                  {card.trend === "up" ? (
                    <ArrowUpRight className="mr-1 h-4 w-4 text-green-400" />
                  ) : card.trend === "down" ? (
                    <ArrowDownRight className="mr-1 h-4 w-4 text-red-400" />
                  ) : (
                    <div className="mr-1 h-1 w-4 bg-gray-400 rounded-full" />
                  )}
                  {card.subtext}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
          {/* Revenue vs Cost Chart */}
          <Card className="glass-panel col-span-4">
            <CardHeader>
              <CardTitle>수익 구조 분석</CardTitle>
              <CardDescription>매출 대비 비용 및 순수익 비율</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="h-[300px] w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={110}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(20, 20, 30, 0.8)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        color: '#fff'
                      }}
                      formatter={(value: number) => `${value.toLocaleString()}원`}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute text-center">
                  <div className="text-3xl font-bold text-primary">{stats.margin}%</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-widest">Margin</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Products */}
          <Card className="glass-panel col-span-3">
            <CardHeader>
              <CardTitle>주력 규격 Top 5</CardTitle>
              <CardDescription>매출 기여도가 가장 높은 규격</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {stats.topSpecs.length > 0 ? (
                  stats.topSpecs.map((item, index) => (
                    <div key={index} className="flex items-center group">
                      <div className="w-12 text-sm font-medium text-muted-foreground group-hover:text-white transition-colors">
                        {index + 1}위
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{item.name}</span>
                          <span className="text-sm text-muted-foreground">{item.value}건</span>
                        </div>
                        <div className="h-2 w-full bg-secondary/30 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-chart-2 rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${(item.value / stats.topSpecs[0].value) * 100}%` }}
                          />
                        </div>
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
      </div>

      {/* Upload History */}
      <div className="mt-8">
        <UploadHistory />
      </div>
    </DashboardLayout>
  );
}
