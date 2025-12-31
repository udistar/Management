import DashboardLayout from "@/components/DashboardLayout";
import ExportButton from "@/components/ExportButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFilter } from "@/contexts/FilterContext";
import { differenceInDays, parseISO } from "date-fns";
import { useMemo } from "react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export default function RentalStatus() {
    const { filteredData } = useFilter();
    const today = new Date();

    const stats = useMemo(() => {
        // 임대 현황 집계
        // Only consider active rentals for management status
        const activeRentals = filteredData.rental.filter(r => r.status !== "terminated");
        const totalActive = activeRentals.length;

        const needsManagementCount = activeRentals.filter(r => r.daysLeft !== null && r.daysLeft <= 7).length;
        const safeCount = totalActive - needsManagementCount;

        const data = [
            { name: "관리요망 (7일 이하)", value: needsManagementCount },
            { name: "정상 진행중", value: safeCount },
        ];

        return { totalActive, needsManagementCount, safeCount, data };
    }, [filteredData]);

    const { totalActive, needsManagementCount, safeCount, data } = stats;

    const COLORS = ['#f43f5e', '#3b82f6']; // 관리요망(Red), 정상(Blue)

    // 상세 리스트 데이터 가공 (남은 기간 포함)
    const processedRental = useMemo(() => {
        return [...filteredData.rental].map(item => {
            // Excel에서 추출된 daysLeft 사용 (값이 없으면 999999로 처리하여 하단 배치)
            const daysLeft = item.daysLeft !== undefined && item.daysLeft !== null ? item.daysLeft : null;
            return { ...item, daysLeft };
        }).sort((a, b) => {
            // 종료된 건은 뒤로 보냄
            if (a.status === 'terminated' && b.status !== 'terminated') return 1;
            if (a.status !== 'terminated' && b.status === 'terminated') return -1;

            // 남은 기간 기준 정렬 (마이너스 큰 순서대로 -> 기간 많이 남은 순서대로)
            const aDays = a.daysLeft === null ? 999999 : a.daysLeft;
            const bDays = b.daysLeft === null ? 999999 : b.daysLeft;
            return aDays - bDays;
        });
    }, [filteredData.rental]);

    return (
        <DashboardLayout>
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight text-glow mb-2">임대 현황</h1>
                        <p className="text-muted-foreground text-lg">
                            진행 중인 임대 계약 및 관리 필요 항목 분석
                        </p>
                    </div>
                    <ExportButton dataType="rental" label="임대 데이터 다운로드" />
                </div>

                <div className="grid gap-6">
                    <Card className="glass-panel">
                        <CardHeader>
                            <CardTitle>계약 관리 상태</CardTitle>
                            <CardDescription>관리요망(7일 이하) vs 정상 계약 비율</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col lg:flex-row items-center gap-8 py-8">
                                <div className="h-[350px] w-full lg:w-1/2 relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={data}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={80}
                                                outerRadius={120}
                                                paddingAngle={5}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {data.map((entry, index) => (
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
                                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none pb-8">
                                        <div className="text-4xl font-bold text-white">{totalActive}</div>
                                        <div className="text-xs text-muted-foreground uppercase tracking-widest">Total Active</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full lg:w-1/2">
                                    <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors shadow-[0_0_20px_rgba(244,63,94,0.1)]">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium text-muted-foreground">관리요망 (7일 이하)</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-4xl font-bold text-red-500">{needsManagementCount}</div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                전체 계약의 {totalActive > 0 ? ((needsManagementCount / totalActive) * 100).toFixed(1) : 0}% 차지
                                            </p>
                                        </CardContent>
                                    </Card>

                                    <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium text-muted-foreground">정상 진행중</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-4xl font-bold text-blue-400">{safeCount}</div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                전체 계약의 {totalActive > 0 ? ((safeCount / totalActive) * 100).toFixed(1) : 0}% 차지
                                            </p>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                {/* Detailed Rental List */}
                <Card className="glass-panel overflow-hidden">
                    <CardHeader>
                        <CardTitle>임대 계약 상세 현황</CardTitle>
                        <CardDescription>현재 필터링된 모든 임대 계약 내역 (종료 임박순)</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-muted-foreground uppercase bg-white/5 border-b border-white/10">
                                    <tr>
                                        <th className="px-4 py-4 font-medium w-[100px]">규격</th>
                                        <th className="px-4 py-4 font-medium w-[150px]">거래처명</th>
                                        <th className="px-4 py-4 font-medium">주소</th>
                                        <th className="px-4 py-4 font-medium w-[140px]">연락처</th>
                                        <th className="px-4 py-4 font-medium w-[110px]">시작일</th>
                                        <th className="px-4 py-4 font-medium w-[110px]">종료일</th>
                                        <th className="px-4 py-4 font-medium text-center w-[100px]">남은기간</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {processedRental.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-white/5 transition-colors group text-[13px]">
                                            <td className="px-4 py-4 font-medium whitespace-nowrap">{item.spec}</td>
                                            <td className="px-4 py-4 font-bold text-white group-hover:text-primary transition-colors whitespace-nowrap">{item.client}</td>
                                            <td className="px-4 py-4 text-muted-foreground max-w-[400px] truncate" title={item.address}>{item.address || "-"}</td>
                                            <td className="px-4 py-4 text-muted-foreground font-mono whitespace-nowrap">{item.contact || "-"}</td>
                                            <td className="px-4 py-4 text-muted-foreground font-mono whitespace-nowrap">{item.start_date || "-"}</td>
                                            <td className="px-4 py-4 text-muted-foreground font-mono whitespace-nowrap">{item.end_date || "-"}</td>
                                            <td className="px-4 py-4 text-center whitespace-nowrap">
                                                {item.daysLeft !== null ? (
                                                    <span className={`font-bold font-mono ${item.daysLeft < 0 ? 'text-red-500' : 'text-green-400'}`}>
                                                        {item.daysLeft}일
                                                    </span>
                                                ) : "-"}
                                            </td>
                                        </tr>
                                    ))}
                                    {processedRental.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground uppercase tracking-widest">
                                                표시할 데이터가 없습니다.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
