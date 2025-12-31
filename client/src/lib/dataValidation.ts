/**
 * 데이터 검증 및 업로드 이력 관리 유틸리티
 */

import { saveDataToSupabase } from './dataService';

export interface ValidationError {
  sheet: string;
  row?: number;
  field?: string;
  message: string;
  severity: "error" | "warning";
}

export interface UploadHistory {
  id: string;
  fileName: string;
  uploadDate: string;
  totalRecords: number;
  salesCount: number;
  inoutCount: number;
  purchaseCount: number;
  rentalCount: number;
  errors: ValidationError[];
}

/**
 * 엑셀 데이터 검증
 */
export function validateExcelData(data: any): ValidationError[] {
  const errors: ValidationError[] = [];

  // 매출계약 검증
  if (data.sales && Array.isArray(data.sales)) {
    data.sales.forEach((item: any, index: number) => {
      if (!item.client || String(item.client).trim() === "") {
        errors.push({
          sheet: "매출계약",
          row: index + 2,
          field: "거래처",
          message: "거래처가 비어있어 '미등록'으로 자동 채워집니다.",
          severity: "warning",
        });
      }
      if (!item.spec || String(item.spec).trim() === "") {
        errors.push({
          sheet: "매출계약",
          row: index + 2,
          field: "규격",
          message: "규격이 비어있어 '미지정'으로 자동 채워집니다.",
          severity: "warning",
        });
      }
      if (!item.amount || Number(item.amount) <= 0) {
        errors.push({
          sheet: "매출계약",
          row: index + 2,
          field: "공급가액",
          message: "공급가액이 0 이하이므로 0으로 처리됩니다.",
          severity: "warning",
        });
      }
    });
  }

  // 입출고현황 검증
  if (data.inout && Array.isArray(data.inout)) {
    data.inout.forEach((item: any, index: number) => {
      if (!item.client || String(item.client).trim() === "") {
        errors.push({
          sheet: "입출고현황",
          row: index + 2,
          field: "거래처",
          message: "거래처가 비어있어 '미등록'으로 자동 채워집니다.",
          severity: "warning",
        });
      }
      if (!item.type || String(item.type).trim() === "") {
        errors.push({
          sheet: "입출고현황",
          row: index + 2,
          field: "구분",
          message: "구분(입고/출고)이 누락되었습니다.",
          severity: "error",
        });
      }
      if (!item.spec || String(item.spec).trim() === "") {
        errors.push({
          sheet: "입출고현황",
          row: index + 2,
          field: "규격",
          message: "규격이 비어있어 '미지정'으로 자동 채워집니다.",
          severity: "warning",
        });
      }
    });
  }

  // 매입 검증
  if (data.purchase && Array.isArray(data.purchase)) {
    data.purchase.forEach((item: any, index: number) => {
      if (!item.client || String(item.client).trim() === "") {
        errors.push({
          sheet: "매입",
          row: index + 2,
          field: "거래처",
          message: "거래처가 비어있어 '미등록'으로 자동 채워집니다.",
          severity: "warning",
        });
      }
      if (!item.amount || Number(item.amount) <= 0) {
        errors.push({
          sheet: "매입",
          row: index + 2,
          field: "공급가액",
          message: "공급가액이 0 이하이므로 0으로 처리됩니다.",
          severity: "warning",
        });
      }
    });
  }

  // 임대현황 검증
  if (data.rental && Array.isArray(data.rental)) {
    data.rental.forEach((item: any, index: number) => {
      if (!item.client || String(item.client).trim() === "") {
        errors.push({
          sheet: "임대현황",
          row: index + 2,
          field: "거래처",
          message: "거래처가 비어있어 '미등록'으로 자동 채워집니다.",
          severity: "warning",
        });
      }
      if (!item.client || String(item.client).trim() === "") {
        errors.push({
          sheet: "임대현황",
          row: index + 2,
          field: "거래처",
          message: "거래처가 누락되었습니다.",
          severity: "error",
        });
      }
    });
  }

  return errors;
}

/**
 * 업로드 이력 저장
 */
export function saveUploadHistory(
  fileName: string,
  data: any,
  errors: ValidationError[]
): UploadHistory {
  const history: UploadHistory = {
    id: `upload_${Date.now()}`,
    fileName,
    uploadDate: new Date().toISOString(),
    totalRecords:
      (data.sales?.length || 0) +
      (data.inout?.length || 0) +
      (data.purchase?.length || 0) +
      (data.rental?.length || 0),
    salesCount: data.sales?.length || 0,
    inoutCount: data.inout?.length || 0,
    purchaseCount: data.purchase?.length || 0,
    rentalCount: data.rental?.length || 0,
    errors,
  };

  // localStorage에 이력 저장
  const histories = getUploadHistories();
  histories.unshift(history);
  // 최근 10개만 유지
  localStorage.setItem(
    "uploadHistories",
    JSON.stringify(histories.slice(0, 10))
  );

  return history;
}

/**
 * 업로드 이력 조회
 */
export function getUploadHistories(): UploadHistory[] {
  try {
    const stored = localStorage.getItem("uploadHistories");
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
}

/**
 * 최신 업로드 이력 조회
 */
export function getLatestUploadHistory(): UploadHistory | null {
  const histories = getUploadHistories();
  return histories.length > 0 ? histories[0] : null;
}

/**
 * 데이터 병합 및 Supabase 저장
 */
export async function mergeData(
  existingData: any,
  newData: any,
  mergeMode: "replace" | "merge",
  fileName: string = "upload.xlsx"
): Promise<any> {
  let mergedData: any;

  if (mergeMode === "replace") {
    mergedData = newData;
  } else {
    // merge 모드: 새로운 데이터와 기존 데이터 병합
    mergedData = {
      sales: [...(existingData.sales || []), ...(newData.sales || [])],
      inout: [...(existingData.inout || []), ...(newData.inout || [])],
      purchase: [...(existingData.purchase || []), ...(newData.purchase || [])],
      rental: [...(existingData.rental || []), ...(newData.rental || [])],
      specs: Array.from(
        new Set([...(existingData.specs || []), ...(newData.specs || [])])
      ),
      clients: Array.from(
        new Set([...(existingData.clients || []), ...(newData.clients || [])])
      ),
      assetCount: newData.assetCount || existingData.assetCount || 0,
    };
  }

  // localStorage에 저장 (백업용)
  localStorage.setItem("dashboardData", JSON.stringify(mergedData));

  // Supabase에 저장
  try {
    console.log('📤 Supabase에 데이터 저장 중...');
    const result = await saveDataToSupabase({
      sales: mergedData.sales || [],
      inout: mergedData.inout || [],
      purchase: mergedData.purchase || [],
      rental: mergedData.rental || [],
      assetCount: mergedData.assetCount || 0,
      filename: fileName,
    });

    if (result.success) {
      console.log('✅ Supabase 저장 완료');
    } else {
      console.warn('⚠️ Supabase 저장 실패, localStorage만 사용');
    }
  } catch (error) {
    console.error('❌ Supabase 저장 오류:', error);
  }

  return mergedData;
}
