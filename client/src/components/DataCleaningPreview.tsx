import { AlertCircle, CheckCircle, Info } from "lucide-react";

interface DataCleaningPreviewProps {
  corrections: {
    specCount: number;
    clientCount: number;
    details: Array<{ type: "spec" | "client"; original: string; corrected: string }>;
  };
}

export default function DataCleaningPreview({ corrections }: DataCleaningPreviewProps) {
  if (corrections.specCount === 0 && corrections.clientCount === 0) {
    return (
      <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg border border-green-500/30">
        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
        <span className="text-sm text-green-400">데이터가 이미 정제되어 있습니다.</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
        <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-400">
          <strong>자동 정제 완료:</strong> {corrections.specCount}개 규격,{" "}
          {corrections.clientCount}개 거래처명이 수정되었습니다.
        </div>
      </div>

      {corrections.details.length > 0 && (
        <div className="max-h-48 overflow-y-auto space-y-1 text-xs">
          {corrections.details.map((detail, idx) => (
            <div
              key={idx}
              className="p-2 rounded border border-white/10 bg-white/5 flex items-start gap-2"
            >
              <span className="text-muted-foreground min-w-12">
                {detail.type === "spec" ? "규격" : "거래처"}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-white/60 truncate">
                  <span className="line-through">{detail.original}</span>
                </div>
                <div className="text-green-400 truncate">→ {detail.corrected}</div>
              </div>
            </div>
          ))}
          {corrections.details.length < corrections.specCount + corrections.clientCount && (
            <div className="text-muted-foreground text-center py-2">
              외 {corrections.specCount + corrections.clientCount - corrections.details.length}개 더...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
