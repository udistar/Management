import { InOutData, PurchaseData, RentalData, SalesData } from "@/contexts/FilterContext";
import * as XLSX from "xlsx";

/**
 * CSV 파일로 데이터 내보내기
 */
export function exportToCSV(
  data: any[],
  filename: string,
  headers?: string[]
) {
  if (data.length === 0) {
    alert("내보낼 데이터가 없습니다.");
    return;
  }

  // 헤더 결정
  const cols = headers || (data.length > 0 ? Object.keys(data[0]) : []);

  // CSV 콘텐츠 생성
  const csvContent = [
    cols.map((col) => `"${col}"`).join(","),
    ...data.map((row) =>
      cols
        .map((col) => {
          const value = row[col];
          if (value === null || value === undefined) return '""';
          if (typeof value === "string" && value.includes(",")) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return `"${value}"`;
        })
        .join(",")
    ),
  ].join("\n");

  // UTF-8 BOM 추가 (Excel에서 한글 깨짐 방지)
  const bom = "\uFEFF";
  const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });

  downloadFile(blob, filename);
}

/**
 * Excel 파일로 데이터 내보내기
 */
export function exportToExcel(
  data: any[],
  filename: string,
  sheetName: string = "Data"
) {
  if (data.length === 0) {
    alert("내보낼 데이터가 없습니다.");
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // 컬럼 너비 자동 조정
  const colWidths = Object.keys(data[0]).map((key) => ({
    wch: Math.max(key.length, 15),
  }));
  worksheet["!cols"] = colWidths;

  XLSX.writeFile(workbook, filename);
}

/**
 * 파일 다운로드 헬퍼 함수
 */
function downloadFile(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * 매출 데이터 내보내기 포맷팅
 */
export function formatSalesForExport(data: SalesData[]) {
  return data.map((item) => ({
    계약번호: item.id,
    날짜: item.date || "-",
    거래처: item.client,
    규격: item.spec,
    공급가액: item.amount,
  }));
}

/**
 * 입출고 데이터 내보내기 포맷팅
 */
export function formatInOutForExport(data: InOutData[]) {
  return data.map((item) => ({
    날짜: item.date,
    구분: item.type,
    규격: item.spec,
    거래처: item.client,
    도착지: item.location,
  }));
}

/**
 * 매입 데이터 내보내기 포맷팅
 */
export function formatPurchaseForExport(data: PurchaseData[]) {
  return data.map((item) => ({
    날짜: item.date,
    규격: item.spec,
    공급가액: item.amount,
    거래처: item.client,
  }));
}

/**
 * 임대 데이터 내보내기 포맷팅
 */
export function formatRentalForExport(data: RentalData[]) {
  return data.map((item) => ({
    시작일: item.start_date || "-",
    종료일: item.end_date || "-",
    규격: item.spec,
    거래처: item.client,
    상태: item.status === "terminated" ? "임대종료" : "진행중",
  }));
}

/**
 * 파일명 생성 헬퍼 함수
 */
export function generateFilename(
  prefix: string,
  format: "csv" | "xlsx",
  dateRange?: { from?: Date; to?: Date }
) {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];

  let rangeStr = "";
  if (dateRange?.from && dateRange?.to) {
    const fromStr = dateRange.from.toISOString().split("T")[0];
    const toStr = dateRange.to.toISOString().split("T")[0];
    rangeStr = `_${fromStr}_to_${toStr}`;
  }

  const ext = format === "csv" ? "csv" : "xlsx";
  return `${prefix}${rangeStr}_${dateStr}.${ext}`;
}
