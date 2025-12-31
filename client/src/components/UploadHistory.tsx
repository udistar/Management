import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getUploadHistories } from "@/lib/dataValidation";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { AlertCircle, CheckCircle, Clock } from "lucide-react";
import { useMemo } from "react";

export default function UploadHistory() {
  const histories = useMemo(() => getUploadHistories(), []);

  if (histories.length === 0) {
    return (
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            업로드 이력
          </CardTitle>
          <CardDescription>데이터 업로드 기록이 없습니다.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          업로드 이력
        </CardTitle>
        <CardDescription>최근 업로드 기록</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {histories.slice(0, 5).map((history) => (
            <div
              key={history.id}
              className="p-3 rounded-lg border border-white/10 bg-white/5 space-y-2"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-medium text-sm">{history.fileName}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(parseISO(history.uploadDate), "yyyy년 MM월 dd일 HH:mm:ss", {
                      locale: ko,
                    })}
                  </p>
                </div>
                {history.errors.filter((e) => e.severity === "error").length > 0 ? (
                  <AlertCircle className="h-5 w-5 text-yellow-500 mt-1" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-green-500 mt-1" />
                )}
              </div>

              <div className="grid grid-cols-4 gap-2 text-xs">
                <div className="bg-white/5 rounded p-2">
                  <div className="text-muted-foreground">매출</div>
                  <div className="font-bold text-sm">{history.salesCount}</div>
                </div>
                <div className="bg-white/5 rounded p-2">
                  <div className="text-muted-foreground">입출고</div>
                  <div className="font-bold text-sm">{history.inoutCount}</div>
                </div>
                <div className="bg-white/5 rounded p-2">
                  <div className="text-muted-foreground">매입</div>
                  <div className="font-bold text-sm">{history.purchaseCount}</div>
                </div>
                <div className="bg-white/5 rounded p-2">
                  <div className="text-muted-foreground">임대</div>
                  <div className="font-bold text-sm">{history.rentalCount}</div>
                </div>
              </div>

              {history.errors.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  오류 {history.errors.filter((e) => e.severity === "error").length} ·
                  경고 {history.errors.filter((e) => e.severity === "warning").length}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
