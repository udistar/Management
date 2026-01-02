import DashboardLayout from "@/components/DashboardLayout";
import ExportButton from "@/components/ExportButton";
import UploadHistory from "@/components/UploadHistory";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFilter } from "@/contexts/FilterContext";
import { ArrowDownRight, ArrowUpRight, DollarSign, Package, TrendingUp, Users } from "lucide-react";
import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export default function Home() {
  const { filteredData, assetCount, assetStats, isLoading } = useFilter();

  // 필터링된 데이터를 기반으로 KPI 계산
  const stats = useMemo(() => {
    const revenue = filteredData.sales.reduce((sum, item) => sum + item.amount, 0);
    const purchaseCost = filteredData.purchase.reduce((sum, item) => sum + item.amount, 0);
    const inoutCost = filteredData.inout.reduce((sum, item) => sum + item.amount, 0);

    // 순수익 = 매출 - 매입비용 - 입출고비용(운반비+상하차비)
    const profit = revenue - purchaseCost - inoutCost;
    const margin = revenue > 0 ? ((profit / revenue) * 100).toFixed(2) : "0.00";

    const totalInOut = filteredData.inout.length;

    // 임대 가동률: (총 자산 - 현재 재고) / 총 자산 * 100
    const totalInventory = assetStats.reduce((sum, s) => sum + s.inventory, 0);
    const activeRentalCount = assetCount - totalInventory;
    const rentalRate = assetCount > 0 ? ((activeRentalCount / assetCount) * 100).toFixed(1) : "0.0";

    return { revenue, purchaseCost, inoutCost, profit, margin, totalInOut, rentalRate, activeRentalCount, totalInventory };
  }, [filteredData, assetCount, assetStats]);

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
      subtext: `매입·운반비 제외 마진 ${stats.margin}%`,
      icon: TrendingUp,
      trend: "up",
      color: "text-chart-4",
      bg: "bg-chart-4/10",
      border: "border-chart-4/20"
    },
    {
      title: "총 입출고",
      value: `${stats.totalInOut.toLocaleString()}건`,
      subtext: `운반/상하차비 합계 ${(stats.inoutCost / 10000).toLocaleString()}만원`,
      icon: Package,
      trend: "neutral",
      color: "text-chart-2",
      bg: "bg-chart-2/10",
      border: "border-chart-2/20"
    },
    {
      title: "임대 가동률",
      value: `${stats.rentalRate}%`,
      subtext: `자산 ${assetCount} / 재고 ${stats.totalInventory}`,
      icon: Users,
      trend: "neutral",
      color: "text-chart-3",
      bg: "bg-chart-3/10",
      border: "border-chart-3/20"
    }
  ];

  const pieData = [
    { name: "매출", value: stats.revenue },
    { name: "비용", value: stats.purchaseCost + stats.inoutCost },
  ];

  const COLORS = ['var(--chart-1)', 'var(--chart-5)'];

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-glow mb-2">종합 관리 대시보드</h1>
            <p className="text-muted-foreground text-sm md:text-lg">
              실시간 데이터 분석 및 주요 지표 모니터링
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
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

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
          {/* Inventory by Spec */}
          <Card className="glass-panel col-span-5">
            <CardHeader>
              <CardTitle>규격별 재고 현황</CardTitle>
              <CardDescription>보유 자산 대비 현재 재고(미임대) 수량</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {assetStats.length > 0 ? (
                  assetStats.map((item, index) => (
                    <div key={index} className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                      <div className="flex items-center justify-between mb-4">
                        <span className="font-bold text-lg">{item.spec}</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-bold text-primary">{item.inventory}</span>
                          <span className="text-xs text-muted-foreground">/ {item.total}대</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
                          <span>임대 가동 중 ({item.total - item.inventory})</span>
                          <span>재고 ({item.inventory})</span>
                        </div>
                        <div className="h-2 w-full bg-secondary/30 rounded-full overflow-hidden flex">
                          <div
                            className="h-full bg-primary transition-all duration-1000"
                            style={{ width: `${item.total > 0 ? ((item.total - item.inventory) / item.total) * 100 : 0}%` }}
                          />
                          <div
                            className="h-full bg-chart-5/40 transition-all duration-1000"
                            style={{ width: `${item.total > 0 ? (item.inventory / item.total) * 100 : 0}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-primary">{item.total > 0 ? Math.round(((item.total - item.inventory) / item.total) * 100) : 0}% 가동</span>
                          <span className="text-muted-foreground">{item.inventory}대 남음</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full flex items-center justify-center p-12 text-muted-foreground">
                    자산 데이터가 없습니다. 파일을 업로드해 주세요.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Data Source Indicator */}
      <div className="mt-8 flex justify-center">
        <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] text-muted-foreground flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${isLoading ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`} />
          {isLoading ? '데이터 동기화 중...' : (assetCount > 0 ? 'Supabase 클라우드 데이터 적용됨' : '샘플 데이터 표시 중 (파일 업로드 필요)')}
        </div>
      </div>

      {/* Upload History */}
      <div className="mt-8">
        <UploadHistory />
      </div>
    </DashboardLayout>
  );
}
