import DashboardLayout from "@/components/DashboardLayout";
import ExportButton from "@/components/ExportButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFilter } from "@/contexts/FilterContext";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function PurchaseCost() {
    const { filteredData } = useFilter();

    const stats = useMemo(() => {
        // 월별 추이 집계
        const monthlyStats: Record<string, number> = {};
        filteredData.purchase.forEach(item => {
            if (!item.date) return;
            const month = item.date.substring(0, 7); // "YYYY-MM"
            monthlyStats[month] = (monthlyStats[month] || 0) + item.amount;
        });

        const monthlyTrend = Object.entries(monthlyStats)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => a.name.localeCompare(b.name));

        // 매입 현황 집계
        const totalAmount = filteredData.purchase.reduce((sum, item) => sum + item.amount, 0);
        const count = filteredData.purchase.length;
        const avgAmount = count > 0 ? Math.round(totalAmount / count) : 0;

        // 규격별 매입 집계
        const specStats: Record<string, number> = {};
        filteredData.purchase.forEach(item => {
            specStats[item.spec] = (specStats[item.spec] || 0) + 1;
        });

        const bySpec = Object.entries(specStats)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([name, value]) => ({ name, value }));

        return { monthlyTrend, totalAmount, count, avgAmount, bySpec };
    }, [filteredData]);

    const { monthlyTrend, totalAmount, count, avgAmount, bySpec } = stats;

    const COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];

    return (
        <DashboardLayout>
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight text-glow mb-2">매입 (비용)</h1>
                        <p className="text-muted-foreground text-lg">
                            컨테이너 매입 비용 및 규격별 매입 구조 분석
                        </p>
                    </div>
                    <ExportButton dataType="purchase" label="매입 데이터 다운로드" />
                </div>

                {/* Monthly Purchase Chart */}
                <Card className="glass-panel">
                    <CardHeader>
                        <CardTitle>월별 매입 현황</CardTitle>
                        <CardDescription>선택된 기간 내의 매입액 변화 추이</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[400px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={monthlyTrend} margin={{ top: 20, right: 30, left: 40, bottom: 20 }}>
                                    <defs>
                                        <linearGradient id="purchaseGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.8} />
                                            <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.2} />
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
                                        tickFormatter={(val) => `${val.toLocaleString()}원`}
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
                                        formatter={(value: number) => `${value.toLocaleString()}원`}
                                    />
                                    <Bar dataKey="value" fill="url(#purchaseGradient)" radius={[4, 4, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <Card className="glass-panel">
                        <CardHeader>
                            <CardTitle>규격별 매입 비율</CardTitle>
                            <CardDescription>주요 매입 규격 Top 5</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={bySpec}
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={100}
                                            dataKey="value"
                                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                            labelLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                                            stroke="rgba(0,0,0,0.2)"
                                            strokeWidth={2}
                                        >
                                            {bySpec.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
                        </CardContent>
                    </Card>

                    <Card className="glass-panel">
                        <CardHeader>
                            <CardTitle>매입 요약</CardTitle>
                            <CardDescription>주요 지표 데이터</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-4">
                            <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20">
                                <p className="text-sm text-muted-foreground mb-1">총 매입액</p>
                                <p className="text-3xl font-bold text-amber-500">{(totalAmount / 100000000).toFixed(2)}억원</p>
                                <p className="text-xs text-muted-foreground mt-1">{(totalAmount / 10000).toLocaleString()}만원 누적</p>
                            </div>
                            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20">
                                <p className="text-sm text-muted-foreground mb-1">평균 매입단가</p>
                                <p className="text-3xl font-bold text-blue-400">{avgAmount.toLocaleString()}원</p>
                                <p className="text-xs text-muted-foreground mt-1">거래당 평균 금액</p>
                            </div>
                            <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/20">
                                <p className="text-sm text-muted-foreground mb-1">총 매입 건수</p>
                                <p className="text-3xl font-bold text-purple-400">{count}건</p>
                                <p className="text-xs text-muted-foreground mt-1">기간 내 전체 매입 횟수</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="glass-panel">
                        <CardHeader>
                            <CardTitle>매입 규격 리스트</CardTitle>
                            <CardDescription>제품별 매입 빈도</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-4 px-0">
                            <div className="space-y-4 px-6">
                                {bySpec.map((item, index) => (
                                    <div key={index} className="flex justify-between items-center group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                            <span className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">{item.name}</span>
                                        </div>
                                        <span className="text-sm font-mono text-muted-foreground bg-white/5 px-2 py-1 rounded-md">{item.value}건</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Detailed Purchase List */}
                <Card className="glass-panel overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>매입 상세 리스트</CardTitle>
                            <CardDescription>검색 및 필터링된 기간 내의 매입 계약 (최신순)</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-muted-foreground uppercase bg-white/5 border-b border-white/10">
                                    <tr>
                                        <th className="px-6 py-4 font-medium">매입일자</th>
                                        <th className="px-6 py-4 font-medium uppercase">규격</th>
                                        <th className="px-6 py-4 font-medium">거래처</th>
                                        <th className="px-6 py-4 font-medium text-right font-mono">매입금액</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {[...filteredData.purchase]
                                        .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
                                        .slice(0, 50)
                                        .map((item, idx) => (
                                            <tr key={idx} className="hover:bg-white/5 transition-colors group">
                                                <td className="px-6 py-4 text-muted-foreground font-mono">{item.date || "-"}</td>
                                                <td className="px-6 py-4 font-medium">{item.spec}</td>
                                                <td className="px-6 py-4 font-bold text-white group-hover:text-primary transition-colors">{item.client}</td>
                                                <td className="px-6 py-4 text-right font-bold text-chart-2">{item.amount.toLocaleString()}원</td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                            {filteredData.purchase.length > 50 && (
                                <div className="p-4 text-center border-t border-white/5 bg-white/5">
                                    <p className="text-xs text-muted-foreground text-glow-subtle">
                                        상위 50개의 항목만 표시 중입니다. (전체 {filteredData.purchase.length}건)
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
