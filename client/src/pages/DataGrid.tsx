import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useFilter } from "@/contexts/FilterContext";
import {
    ChevronLeft,
    ChevronRight,
    Download,
    Search,
    ArrowUpDown,
    FileSpreadsheet,
    FileOutput
} from "lucide-react";
import { useMemo, useState } from "react";
import * as XLSX from "xlsx";

type DataType = "sales" | "inout" | "purchase" | "rental";

export default function DataGrid() {
    const { filteredData } = useFilter();
    const [activeTab, setActiveTab] = useState<DataType>("sales");
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
    const itemsPerPage = 20;

    // 데이터 필터링 및 정렬
    const processedData = useMemo(() => {
        let data = [...filteredData[activeTab]];

        // 검색 필터
        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            data = data.filter((item: any) =>
                Object.values(item).some(val =>
                    String(val).toLowerCase().includes(lowerSearch)
                )
            );
        }

        // 정렬
        if (sortConfig) {
            data.sort((a: any, b: any) => {
                const aVal = a[sortConfig.key];
                const bVal = b[sortConfig.key];

                if (aVal === bVal) return 0;
                if (aVal === null || aVal === undefined) return 1;
                if (bVal === null || bVal === undefined) return -1;

                const result = aVal < bVal ? -1 : 1;
                return sortConfig.direction === "asc" ? result : -result;
            });
        }

        return data;
    }, [filteredData, activeTab, searchTerm, sortConfig]);

    // 페이지네이션
    const totalPages = Math.ceil(processedData.length / itemsPerPage);
    const paginatedData = processedData.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handleSort = (key: string) => {
        setSortConfig(prev => ({
            key,
            direction: prev?.key === key && prev.direction === "asc" ? "desc" : "asc"
        }));
        setCurrentPage(1);
    };

    const handleDownload = (format: "csv" | "xlsx") => {
        const ws = XLSX.utils.json_to_sheet(processedData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, activeTab);

        if (format === "csv") {
            XLSX.writeFile(wb, `mbox_data_${activeTab}.csv`, { bookType: "csv" });
        } else {
            XLSX.writeFile(wb, `mbox_data_${activeTab}.xlsx`);
        }
    };

    const getColumns = () => {
        switch (activeTab) {
            case "sales":
                return [
                    { key: "date", label: "날짜" },
                    { key: "client", label: "거래처" },
                    { key: "spec", label: "규격" },
                    { key: "amount", label: "공급가액", type: "number" },
                    { key: "type", label: "구분" },
                ];
            case "inout":
                return [
                    { key: "date", label: "날짜" },
                    { key: "type", label: "구분" },
                    { key: "spec", label: "규격" },
                    { key: "client", label: "거래처" },
                    { key: "location", label: "도착지" },
                ];
            case "purchase":
                return [
                    { key: "date", label: "날짜" },
                    { key: "client", label: "거래처" },
                    { key: "spec", label: "규격" },
                    { key: "amount", label: "공급가액", type: "number" },
                ];
            case "rental":
                return [
                    { key: "start_date", label: "시작일" },
                    { key: "end_date", label: "종료일" },
                    { key: "client", label: "거래처" },
                    { key: "spec", label: "규격" },
                    { key: "status", label: "상태" },
                ];
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-glow mb-2">데이터 그리드</h1>
                        <p className="text-muted-foreground text-sm md:text-lg">
                            원본 데이터를 검색하고 정렬하여 상세하게 분석합니다.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="gap-2 glass-panel" onClick={() => handleDownload("csv")}>
                            <FileOutput className="h-4 w-4" />
                            CSV 다운로드
                        </Button>
                        <Button variant="outline" size="sm" className="gap-2 glass-panel" onClick={() => handleDownload("xlsx")}>
                            <FileSpreadsheet className="h-4 w-4" />
                            Excel 다운로드
                        </Button>
                    </div>
                </div>

                <Card className="glass-panel border-white/10">
                    <CardHeader className="pb-3 border-b border-white/5 space-y-4">
                        <div className="flex flex-col md:flex-row justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <Select value={activeTab} onValueChange={(v) => { setActiveTab(v as DataType); setCurrentPage(1); }}>
                                    <SelectTrigger className="w-[180px] bg-white/5 border-white/10">
                                        <SelectValue placeholder="데이터 선택" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#0f111a] border-white/10">
                                        <SelectItem value="sales">매출계약</SelectItem>
                                        <SelectItem value="inout">입출고현황</SelectItem>
                                        <SelectItem value="purchase">매입</SelectItem>
                                        <SelectItem value="rental">임대현황</SelectItem>
                                    </SelectContent>
                                </Select>

                                <div className="relative w-full md:w-80">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="데이터 검색..."
                                        className="pl-10 bg-white/5 border-white/10 focus:ring-primary/20"
                                        value={searchTerm}
                                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center text-sm text-muted-foreground font-medium">
                                총 {processedData.length.toLocaleString()}개 항목
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-white/5">
                                    <TableRow className="hover:bg-transparent border-white/10">
                                        {getColumns().map((col) => (
                                            <TableHead
                                                key={col.key}
                                                className="cursor-pointer hover:text-white transition-colors"
                                                onClick={() => handleSort(col.key)}
                                            >
                                                <div className="flex items-center gap-2 py-2">
                                                    {col.label}
                                                    <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                                                </div>
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedData.length > 0 ? (
                                        paginatedData.map((row: any, idx) => (
                                            <TableRow key={idx} className="border-white/5 hover:bg-white/5 transition-colors">
                                                {getColumns()?.map((col) => (
                                                    <TableCell key={col.key} className="py-4 font-medium">
                                                        {col.type === "number"
                                                            ? `${Number(row[col.key] || 0).toLocaleString()}원`
                                                            : String(row[col.key] || "-")}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={getColumns().length} className="h-32 text-center text-muted-foreground">
                                                표시할 데이터가 없습니다.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 p-6 border-t border-white/5 bg-white/5">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="gap-1 hover:bg-white/10"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    이전
                                </Button>

                                <div className="flex items-center gap-1.5 px-4 font-medium">
                                    <span className="text-white">{currentPage}</span>
                                    <span className="text-muted-foreground">/</span>
                                    <span className="text-muted-foreground">{totalPages}</span>
                                </div>

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                    className="gap-1 hover:bg-white/10"
                                >
                                    다음
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
