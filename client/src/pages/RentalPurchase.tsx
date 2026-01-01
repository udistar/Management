import DashboardLayout from "@/components/DashboardLayout";
import ExportButton from "@/components/ExportButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFilter } from "@/contexts/FilterContext";
import { useMemo } from "react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export default function RentalPurchase() {
  const { filteredData } = useFilter();

  const stats = useMemo(() => {
    // 임대 현황 집계
    const rentalTotal = filteredData.rental.length;
    const rentalTerminated = filteredData.rental.filter(r => r.status === "terminated").length;
    const rentalOngoing = filteredData.rental.filter(r => r.status === "ongoing").length;

    const rentalData = [
      { name: "임대 종료", value: rentalTerminated },
      { name: "진행중/기타", value: rentalOngoing },
    ];

    // 매입 현황 집계
    const purchaseTotalAmount = filteredData.purchase.reduce((sum, item) => sum + item.amount, 0);
    const purchaseCount = filteredData.purchase.length;
    const purchaseAvgAmount = purchaseCount > 0 ? Math.round(purchaseTotalAmount / purchaseCount) : 0;

    // 규격별 매입 집계
    const specStats: Record<string, number> = {};
    filteredData.purchase.forEach(item => {
      specStats[item.spec] = (specStats[item.spec] || 0) + 1;
    });

    const purchaseBySpec = Object.entries(specStats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));

    return {
      rentalTotal, rentalTerminated, rentalOngoing, rentalData,
      purchaseTotalAmount, purchaseAvgAmount, purchaseBySpec
    };
  }, [filteredData]);

  const {
    rentalTotal, rentalTerminated, rentalOngoing, rentalData,
    purchaseTotalAmount, purchaseAvgAmount, purchaseBySpec
  } = stats;

  const RENTAL_COLORS = ['var(--chart-5)', 'var(--chart-4)'];
  const PURCHASE_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-glow mb-2">임대 및 매입 현황</h1>
            <p className="text-muted-foreground text-lg">
              자산 활용도 및 매입 구조 분석
            </p>
          </div>
          <div className="flex gap-2">
            <ExportButton dataType="rental" label="임대 다운로드" />
            <ExportButton dataType="purchase" label="매입 다운로드" />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Rental Status */}
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>임대 현황</CardTitle>
              <CardDescription>종료 vs 진행중 계약 비율</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={rentalData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {rentalData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={RENTAL_COLORS[index % RENTAL_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(20, 20, 30, 0.9)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        color: '#fff'
                      }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none pb-8">
                  <div className="text-3xl font-bold text-white">{rentalTotal}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-center">
                    <div className="text-2xl font-bold text-chart-5">{rentalTerminated}</div>
                    <div className="text-xs text-muted-foreground mt-1">종료된 계약</div>
                  </div>
                  <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-center">
                    <div className="text-2xl font-bold text-chart-4">{rentalOngoing}</div>
                    <div className="text-xs text-muted-foreground mt-1">진행중인 계약</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Purchase by Spec */}
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>규격별 매입 현황</CardTitle>
              <CardDescription>주요 매입 규격 Top 5</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={purchaseBySpec}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                      stroke="rgba(0,0,0,0.2)"
                      strokeWidth={2}
                    >
                      {purchaseBySpec.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PURCHASE_COLORS[index % PURCHASE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(20, 20, 30, 0.9)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        color: '#fff'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white/5 p-4 rounded-xl border border-white/10 mt-4 flex justify-between items-center">
                <div>
                  <div className="text-sm text-muted-foreground">총 매입액</div>
                  <div className="text-xl font-bold text-white">{(purchaseTotalAmount / 100000000).toFixed(1)}억원</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">평균 매입단가</div>
                  <div className="text-xl font-bold text-chart-2">{purchaseAvgAmount.toLocaleString()}원</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
