import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import DataCleaningPreview from "@/components/DataCleaningPreview";
import { cleanData, summarizeCorrections } from "@/lib/dataCleaning";
import { mergeData, saveUploadHistory, validateExcelData } from "@/lib/dataValidation";
import { Upload, AlertCircle, CheckCircle, Info } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { RentalData } from "@/contexts/FilterContext";

interface FileUploaderProps {
  onUploadSuccess?: () => void;
}

export default function FileUploader({ onUploadSuccess }: FileUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [mergeMode, setMergeMode] = useState<"replace" | "merge">("replace");
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  const [cleaningCorrections, setCleaningCorrections] = useState<any>(null);
  const [pendingData, setPendingData] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 파일 형식 확인
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls") && !file.name.endsWith(".xlsm")) {
      toast.error("Excel 파일(.xlsx, .xls, .xlsm)만 업로드 가능합니다.");
      return;
    }

    setIsProcessing(true);
    toast.loading("파일을 처리 중입니다...");

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          if (!data) throw new Error("파일 읽기 실패");

          // xlsx 라이브러리 동적 로드
          const XLSX = await import("xlsx");
          const workbook = XLSX.read(data, { type: "array" });

          // 데이터 추출
          const extractedData = {
            sales: [] as any[],
            inout: [] as any[],
            purchase: [] as any[],
            rental: [] as any[],
            specs: [] as string[],
            clients: [] as string[],
          };

          // 각 시트 처리
          const sheetNames = workbook.SheetNames;
          const findSheet = (target: string) =>
            sheetNames.find(n => n.replace(/\s/g, "").toLowerCase() === target.toLowerCase());

          // 컬럼 매칭 헬퍼
          const getVal = (row: any, keys: string[]) => {
            for (const key of keys) {
              const matchedKey = Object.keys(row).find(k => k.replace(/\s/g, "").toLowerCase() === key.toLowerCase());
              if (matchedKey !== undefined && row[matchedKey] !== null) return row[matchedKey];
            }
            return undefined;
          };

          // 날짜 포맷 헬퍼 (Excel 날짜 숫자 대응 및 형식 통일)
          const formatDate = (val: any) => {
            if (!val) return null;

            // Excel Serial Date (숫자) 처리
            if (typeof val === 'number') {
              try {
                const date = XLSX.SSF.parse_date_code(val);
                const y = date.y;
                const m = String(date.m).padStart(2, '0');
                const d = String(date.d).padStart(2, '0');
                return `${y}-${m}-${d}`;
              } catch (e) {
                return String(val);
              }
            }

            // 문자열인 경우 yyyy-mm-dd 형식으로 변환 시도
            const str = String(val).trim();
            if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.substring(0, 10);
            if (/^\d{8}/.test(str)) return `${str.substring(0, 4)}-${str.substring(4, 6)}-${str.substring(6, 8)}`;
            if (/^\d{4}\.\d{2}\.\d{2}/.test(str)) return str.replace(/\./g, "-");

            return str;
          };

          // 매출계약 시트
          const salesSheet = findSheet("매출계약") || findSheet("매출");
          if (salesSheet) {
            const ws = workbook.Sheets[salesSheet];
            const data = XLSX.utils.sheet_to_json(ws);

            // ID에서 날짜 추출 (YYMMDD 또는 YYYYMMDD)
            const parseDateFromId = (id: string) => {
              if (!id) return null;

              // 8자리 (YYYYMMDD) 우선 체크
              const date8 = id.match(/^\d{8}/);
              if (date8) {
                const yyyy = date8[0].substring(0, 4);
                const mm = date8[0].substring(4, 6);
                const dd = date8[0].substring(6, 8);
                const m = parseInt(mm);
                const d = parseInt(dd);
                if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
                  return `${yyyy}-${mm}-${dd}`;
                }
              }

              // 6자리 (YYMMDD) 체크
              const date6 = id.match(/^\d{6}/);
              if (date6) {
                const yy = date6[0].substring(0, 2);
                const mm = date6[0].substring(2, 4);
                const dd = date6[0].substring(4, 6);
                const m = parseInt(mm);
                const d = parseInt(dd);
                if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
                  const year = parseInt(yy) > 50 ? `19${yy}` : `20${yy}`;
                  return `${year}-${mm}-${dd}`;
                }
              }
              return null;
            };

            extractedData.sales = data.map((row: any) => {
              const id = String(getVal(row, ["계약서번호", "계약번호", "관리번호", "id", "번호", "계약서"]) || "").trim();
              let date = formatDate(getVal(row, ["날짜", "일자", "계약일", "등록일"]));

              const extractedDate = parseDateFromId(id);
              if (extractedDate) {
                date = extractedDate;
              }

              return {
                id,
                date,
                client: String(getVal(row, ["거래처명", "거래처", "고객명", "상호", "성함", "업체명"]) || "").trim(),
                spec: String(getVal(row, ["규격", "사이즈", "품목"]) || "").trim(),
                amount: Number(getVal(row, ["공급가액", "금액", "매출액", "합계금액"])) || 0,
                type: "sales",
              };
            });
          }

          // 입출고현황 시트
          const inoutSheet = findSheet("입출고현황") || findSheet("입출고");
          if (inoutSheet) {
            const ws = workbook.Sheets[inoutSheet];
            const data = XLSX.utils.sheet_to_json(ws);
            extractedData.inout = data.map((row: any) => {
              const transportCost = Number(getVal(row, ["운반비", "화물비", "운송비", "화물트럭운반비"])) || 0;
              const loadingCost = Number(getVal(row, ["상하차비용", "지게차상하차비", "상하차비", "상하차", "상하비", "상하차비용(M열)"])) || 0;

              let type = String(getVal(row, ["구분", "입출구분", "입출", "유형", "상태"]) || "").trim();
              const destination = String(getVal(row, ["도착지", "장소", "현장"]) || "").trim();
              const departure = String(getVal(row, ["출발지"]) || "").trim();

              // 사용자 요청Fallback: 구분이 비어있으면 출발지/도착지('비제이')로 판별
              if (!type) {
                if (departure.includes("비제이") || departure.toLowerCase().includes("bj")) {
                  type = "출고";
                } else if (destination.includes("비제이") || destination.toLowerCase().includes("bj")) {
                  type = "입고";
                }
              }

              // 타입 정규화
              if (type.includes("입")) type = "입고";
              else if (type.includes("출")) type = "출고";

              // 사용자 요청 로직: 출고 시 도착지, 입고 시 출발지가 현장
              // 단, 한쪽이 '비제이'일 경우 반대쪽을 현장으로 선택
              let location = "";
              if (type === "출고") {
                location = (destination && destination !== "비제이") ? destination : departure;
              } else if (type === "입고") {
                location = (departure && departure !== "비제이") ? departure : destination;
              } else {
                location = destination || departure;
              }

              return {
                date: formatDate(getVal(row, ["날짜", "일자"])),
                type: type || "미지정",
                spec: String(getVal(row, ["규격", "사이즈", "품목"]) || "").trim(),
                client: String(getVal(row, ["거래처명", "거래처", "상호", "고객명"]) || "").trim(),
                location: location || "미지정",
                amount: transportCost + loadingCost,
              };
            });
          }

          // 매입 시트
          const purchaseSheet = findSheet("매입") || findSheet("매입현황");
          if (purchaseSheet) {
            const ws = workbook.Sheets[purchaseSheet];
            const data = XLSX.utils.sheet_to_json(ws);
            extractedData.purchase = data.map((row: any) => ({
              date: formatDate(getVal(row, ["날짜", "일자"])),
              spec: String(getVal(row, ["규격", "사이즈"]) || "").trim(),
              amount: Number(getVal(row, ["공급 총액", "공급총액", "공급가액", "금액", "매입가"])) || 0,
              client: String(getVal(row, ["거래처명", "거래처", "상호"]) || "").trim(),
              type: "purchase",
            }));
          }

          // 임대현황 시트
          const rentalSheet = findSheet("임대현황") || findSheet("임대");
          if (rentalSheet) {
            const ws = workbook.Sheets[rentalSheet];
            const data = XLSX.utils.sheet_to_json(ws);
            extractedData.rental = data
              .map((row: any) => {
                const daysLeftVal = getVal(row, ["남은기간", "남은기한"]);
                const daysLeftStr = String(daysLeftVal || "").trim();

                // "반납완료" 포함 시 제외하기 위해 null 반환 (나중에 filter)
                if (daysLeftStr.includes("반납완료")) {
                  return null;
                }

                return {
                  start_date: formatDate(getVal(row, ["시작일", "임대시작", "날짜"])),
                  end_date: formatDate(getVal(row, ["종료일", "임대종료", "반납일"])),
                  spec: String(getVal(row, ["규격", "사이즈"]) || "").trim(),
                  client: String(getVal(row, ["거래처명", "거래처", "상호"]) || "").trim(),
                  address: String(getVal(row, ["주소", "현장주소", "장소"]) || "").trim(),
                  contact: String(getVal(row, ["연락처", "전화번호", "휴대폰", "HP"]) || "").trim(),
                  status: String(getVal(row, ["상태", "구분"]) || "ongoing").toLowerCase().includes("종료")
                    ? "terminated"
                    : "ongoing",
                  daysLeft: isNaN(Number(daysLeftVal)) ? null : Number(daysLeftVal),
                };
              })
              .filter((item): item is RentalData => item !== null);
          }

          // 자산현황 시트 (New)
          let assetCount = 0;
          const assetSheet = findSheet("자산현황") || findSheet("자산");
          if (assetSheet) {
            const ws = workbook.Sheets[assetSheet];
            const data = XLSX.utils.sheet_to_json(ws);
            assetCount = data.length;
          }

          // 규격 추출 및 정제
          const specsSet = new Set<string>();
          [...extractedData.sales, ...extractedData.inout, ...extractedData.purchase, ...extractedData.rental].forEach(
            (item) => {
              if (item.spec) specsSet.add(item.spec);
            }
          );
          extractedData.specs = Array.from(specsSet).sort();

          // 거래처 추출 및 정제
          const clientsSet = new Set<string>();
          [...extractedData.sales, ...extractedData.inout, ...extractedData.purchase, ...extractedData.rental].forEach(
            (item) => {
              if (item.client) clientsSet.add(item.client);
            }
          );
          extractedData.clients = Array.from(clientsSet).sort();

          // 데이터 정제 (규격 표기 통일 및 거래처명 오타 수정)
          const { cleanedData, corrections } = cleanData(extractedData);
          const correctionSummary = summarizeCorrections(corrections);

          // 데이터 검증
          const errors = validateExcelData(cleanedData);
          const criticalErrors = errors.filter((e) => e.severity === "error");

          setPendingData({
            ...cleanedData,
            fileName: file.name,
            totalRecords: cleanedData.sales.length + cleanedData.inout.length + cleanedData.purchase.length + cleanedData.rental.length,
            salesCount: cleanedData.sales.length,
            inoutCount: cleanedData.inout.length,
            purchaseCount: cleanedData.purchase.length,
            rentalCount: cleanedData.rental.length,
            assetCount: assetCount,
          });
          setValidationErrors(errors);
          setCleaningCorrections(correctionSummary);
          setShowDialog(true);

          toast.dismiss();
          if (criticalErrors.length > 0) {
            toast.warning(`${criticalErrors.length}개의 오류가 발견되었습니다.`);
          } else {
            toast.success("파일이 검증되었습니다.");
          }
        } catch (error) {
          console.error("파일 처리 오류:", error);
          toast.dismiss();
          toast.error("파일 처리 중 오류가 발생했습니다.");
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error("업로드 오류:", error);
      toast.error("파일 업로드 중 오류가 발생했습니다.");
    } finally {
      setIsProcessing(false);
      // 입력 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleConfirmUpload = async () => {
    if (!pendingData) return;

    try {
      const existingData = (() => {
        try {
          const stored = localStorage.getItem("dashboardData");
          return stored ? JSON.parse(stored) : null;
        } catch {
          return null;
        }
      })();

      // 데이터 병합 또는 교체 (Supabase 저장 포함)
      const finalData = existingData
        ? await mergeData(existingData, pendingData, mergeMode, pendingData.fileName)
        : pendingData;

      // 자산 수량은 항상 최신 업로드 파일 기준
      if (pendingData.assetCount !== undefined) {
        finalData.assetCount = pendingData.assetCount;
      }

      // Supabase에 저장 (mergeData에서 이미 저장되지만, replace 모드에서는 별도 저장 필요)
      if (mergeMode === "replace") {
        const { saveDataToSupabase } = await import("@/lib/dataService");
        await saveDataToSupabase({
          sales: finalData.sales || [],
          inout: finalData.inout || [],
          purchase: finalData.purchase || [],
          rental: finalData.rental || [],
          assetCount: finalData.assetCount || 0,
          filename: pendingData.fileName,
        });
      }

      // 업로드 이력 저장
      saveUploadHistory(pendingData.fileName, finalData, validationErrors);

      setShowDialog(false);
      setPendingData(null);
      setValidationErrors([]);
      setCleaningCorrections(null);

      toast.success("데이터가 성공적으로 업로드되었습니다!");

      // 페이지 새로고침
      setTimeout(() => {
        window.location.reload();
      }, 1000);

      onUploadSuccess?.();
    } catch (error) {
      console.error("업로드 확인 오류:", error);
      toast.error("데이터 저장 중 오류가 발생했습니다.");
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.xlsm"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isProcessing}
      />
      <Button
        onClick={() => fileInputRef.current?.click()}
        variant="outline"
        size="sm"
        className="gap-2 bg-white/5 border-white/10 hover:bg-white/10"
        title="새로운 Excel 파일을 업로드하여 데이터를 갱신합니다"
        disabled={isProcessing}
      >
        <Upload className="h-4 w-4" />
        {isProcessing ? "처리 중..." : "파일 업로드"}
      </Button>

      {/* Validation Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>데이터 검증 및 업로드</DialogTitle>
            <DialogDescription>
              {pendingData?.fileName} - 총 {pendingData?.totalRecords || 0}개 레코드
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Data Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
              <div>
                <div className="text-xs text-muted-foreground">매출</div>
                <div className="text-lg font-bold">{pendingData?.salesCount || 0}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">입출고</div>
                <div className="text-lg font-bold">{pendingData?.inoutCount || 0}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">매입</div>
                <div className="text-lg font-bold">{pendingData?.purchaseCount || 0}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">임대</div>
                <div className="text-lg font-bold">{pendingData?.rentalCount || 0}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">자산</div>
                <div className="text-lg font-bold text-chart-2">{pendingData?.assetCount || 0}</div>
              </div>
            </div>

            {/* Data Cleaning Preview */}
            {cleaningCorrections && (
              <DataCleaningPreview corrections={cleaningCorrections} />
            )}

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-medium">
                    {validationErrors.filter((e) => e.severity === "error").length} 오류,{" "}
                    {validationErrors.filter((e) => e.severity === "warning").length} 경고
                  </span>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1 text-xs">
                  {validationErrors.slice(0, 10).map((error, idx) => (
                    <div
                      key={idx}
                      className={`p-2 rounded border ${error.severity === "error"
                        ? "bg-red-500/10 border-red-500/30 text-red-400"
                        : "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
                        }`}
                    >
                      <strong>{error.sheet}</strong>
                      {error.row && ` (행 ${error.row})`}
                      {error.field && ` - ${error.field}`}: {error.message}
                    </div>
                  ))}
                  {validationErrors.length > 10 && (
                    <div className="text-muted-foreground text-center py-2">
                      외 {validationErrors.length - 10}개 더...
                    </div>
                  )}
                </div>
              </div>
            )}

            {validationErrors.length === 0 && (
              <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg border border-green-500/30">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm text-green-400">모든 데이터가 유효합니다.</span>
              </div>
            )}

            {/* Merge Mode Selection */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">데이터 처리 방식</span>
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 p-2 rounded border border-white/10 cursor-pointer hover:bg-white/5">
                  <input
                    type="radio"
                    name="mergeMode"
                    value="replace"
                    checked={mergeMode === "replace"}
                    onChange={(e) => setMergeMode(e.target.value as "replace" | "merge")}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">
                    <strong>덮어쓰기</strong> - 기존 데이터를 모두 삭제하고 새 데이터로 교체
                  </span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded border border-white/10 cursor-pointer hover:bg-white/5">
                  <input
                    type="radio"
                    name="mergeMode"
                    value="merge"
                    checked={mergeMode === "merge"}
                    onChange={(e) => setMergeMode(e.target.value as "replace" | "merge")}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">
                    <strong>병합</strong> - 기존 데이터에 새 데이터를 추가
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowDialog(false);
                setPendingData(null);
                setValidationErrors([]);
                setCleaningCorrections(null);
              }}
              className="bg-white/5 border-white/10 hover:bg-white/10"
            >
              취소
            </Button>
            <Button
              onClick={handleConfirmUpload}
              disabled={validationErrors.filter((e) => e.severity === "error").length > 0}
              className="bg-primary hover:bg-primary/90"
            >
              업로드 확인
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
