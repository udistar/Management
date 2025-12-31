import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFilter } from "@/contexts/FilterContext";
import {
  exportToCSV,
  exportToExcel,
  formatInOutForExport,
  formatPurchaseForExport,
  formatRentalForExport,
  formatSalesForExport,
  generateFilename,
} from "@/lib/exportData";
import { Download } from "lucide-react";

interface ExportButtonProps {
  dataType: "sales" | "inout" | "purchase" | "rental";
  label?: string;
}

export default function ExportButton({ dataType, label = "다운로드" }: ExportButtonProps) {
  const { filteredData, filters } = useFilter();

  const handleExport = (format: "csv" | "xlsx") => {
    let data: any[] = [];
    let prefix = "";

    switch (dataType) {
      case "sales":
        data = formatSalesForExport(filteredData.sales);
        prefix = "매출계약";
        break;
      case "inout":
        data = formatInOutForExport(filteredData.inout);
        prefix = "입출고현황";
        break;
      case "purchase":
        data = formatPurchaseForExport(filteredData.purchase);
        prefix = "매입";
        break;
      case "rental":
        data = formatRentalForExport(filteredData.rental);
        prefix = "임대현황";
        break;
    }

    const filename = generateFilename(prefix, format, filters.dateRange);

    if (format === "csv") {
      exportToCSV(data, filename);
    } else {
      exportToExcel(data, filename, prefix);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 bg-white/5 border-white/10 hover:bg-white/10"
        >
          <Download className="h-4 w-4" />
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport("csv")}>
          CSV로 다운로드
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("xlsx")}>
          Excel로 다운로드
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
