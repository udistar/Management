import { calculateSimilarity } from "./searchUtils";

/**
 * 규격 표기를 자동으로 통일합니다
 * 예: "3x6", "3*6", "3 x 6" -> "3 x 6"
 */
export function normalizeSpec(spec: string): string {
  if (!spec) return "";

  // 공백 제거 후 처리
  let normalized = spec.trim();

  // 다양한 구분자를 "x"로 통일
  // "3x6", "3X6", "3*6", "3-6" 등을 "3x6"으로 변환
  normalized = normalized
    .replace(/\s*[xX*\-]\s*/g, "x") // 구분자를 'x'로 통일
    .replace(/\s+/g, ""); // 모든 공백 제거

  return normalized;
}

/**
 * 규격 목록을 정규화합니다
 */
export function normalizeSpecs(specs: string[]): string[] {
  const normalized = new Set<string>();
  specs.forEach((spec) => {
    const norm = normalizeSpec(spec);
    if (norm) normalized.add(norm);
  });
  return Array.from(normalized).sort();
}

/**
 * 거래처명 오타를 감지하고 수정합니다
 * 유사도 기반으로 가장 유사한 거래처명을 제안합니다
 */
export function findSimilarClient(
  clientName: string,
  existingClients: string[],
  threshold: number = 0.7
): string | null {
  if (!clientName || !existingClients.length) return null;

  let bestMatch: string | null = null;
  let bestScore = threshold;

  for (const existing of existingClients) {
    const score = calculateSimilarity(clientName, existing);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = existing;
    }
  }

  return bestMatch;
}

/**
 * 거래처명 오타를 자동으로 수정합니다
 */
export function correctClientName(
  clientName: string,
  existingClients: string[],
  threshold: number = 0.7
): { original: string; corrected: string; isCorrected: boolean } {
  const trimmed = clientName.trim();

  // 정확한 매치가 있으면 그대로 반환
  if (existingClients.includes(trimmed)) {
    return { original: clientName, corrected: trimmed, isCorrected: false };
  }

  // 유사한 거래처명 찾기
  const similar = findSimilarClient(trimmed, existingClients, threshold);

  if (similar) {
    return { original: clientName, corrected: similar, isCorrected: true };
  }

  return { original: clientName, corrected: trimmed, isCorrected: false };
}

/**
 * 거래처가 비어있는 행을 기본값으로 채웁니다
 */
function fillMissingClients(data: any): any {
  const DEFAULT_CLIENT = "미등록";

  return {
    ...data,
    sales: (data.sales || []).map((item: any) => ({
      ...item,
      client: item.client && item.client.trim() ? item.client.trim() : DEFAULT_CLIENT,
    })),
    inout: (data.inout || []).map((item: any) => ({
      ...item,
      client: item.client && item.client.trim() ? item.client.trim() : DEFAULT_CLIENT,
    })),
    purchase: (data.purchase || []).map((item: any) => ({
      ...item,
      client: item.client && item.client.trim() ? item.client.trim() : DEFAULT_CLIENT,
    })),
    rental: (data.rental || []).map((item: any) => ({
      ...item,
      client: item.client && item.client.trim() ? item.client.trim() : DEFAULT_CLIENT,
    })),
  };
}

/**
 * 규격이 비어있는 행을 기본값으로 채웁니다
 */
function fillMissingSpecs(data: any): any {
  const DEFAULT_SPEC = "미지정";

  return {
    ...data,
    sales: (data.sales || []).map((item: any) => ({
      ...item,
      spec: item.spec && item.spec.trim() ? item.spec.trim() : DEFAULT_SPEC,
    })),
    inout: (data.inout || []).map((item: any) => ({
      ...item,
      spec: item.spec && item.spec.trim() ? item.spec.trim() : DEFAULT_SPEC,
    })),
    purchase: (data.purchase || []).map((item: any) => ({
      ...item,
      spec: item.spec && item.spec.trim() ? item.spec.trim() : DEFAULT_SPEC,
    })),
    rental: (data.rental || []).map((item: any) => ({
      ...item,
      spec: item.spec && item.spec.trim() ? item.spec.trim() : DEFAULT_SPEC,
    })),
  };
}

/**
 * 전체 데이터를 정제합니다
 */

/**
 * 구분(type)이 비어있는 행을 기본값으로 채웁니다
 */
function fillMissingTypes(data: any): any {
  const DEFAULT_TYPE = "미지정";

  return {
    ...data,
    inout: (data.inout || []).map((item: any) => ({
      ...item,
      type: item.type && item.type.trim() ? item.type.trim() : DEFAULT_TYPE,
    })),
  };
}


/**
 * 공급가액(amount)이 0 이하인 행을 0으로 처리합니다
 */
function fillMissingAmounts(data: any): any {
  return {
    ...data,
    sales: (data.sales || []).map((item: any) => ({
      ...item,
      amount: item.amount && Number(item.amount) > 0 ? Number(item.amount) : 0,
    })),
    purchase: (data.purchase || []).map((item: any) => ({
      ...item,
      amount: item.amount && Number(item.amount) > 0 ? Number(item.amount) : 0,
    })),
  };
}

export function cleanData(data: any): {
  cleanedData: any;
  corrections: {
    specs: Map<string, string>;
    clients: Map<string, string>;
  };
} {
  // 먼저 거래처와 규격 기본값 채우기
  let dataWithDefaults = fillMissingClients(data);
  dataWithDefaults = fillMissingSpecs(dataWithDefaults);
  dataWithDefaults = fillMissingTypes(dataWithDefaults);
  dataWithDefaults = fillMissingAmounts(dataWithDefaults);

  const specCorrections = new Map<string, string>();
  const clientCorrections = new Map<string, string>();

  // 먼저 모든 규격과 거래처를 수집
  const allSpecs = new Set<string>();
  const allClients = new Set<string>();

  // 첫 번째 패스: 모든 규격과 거래처 수집
  [...(dataWithDefaults.sales || []), ...(dataWithDefaults.inout || []), ...(dataWithDefaults.purchase || []), ...(dataWithDefaults.rental || [])].forEach(
    (item: any) => {
      if (item.spec) allSpecs.add(item.spec);
      if (item.client) allClients.add(item.client);
    }
  );

  // 규격 정규화
  const normalizedSpecMap = new Map<string, string>();
  Array.from(allSpecs).forEach((spec) => {
    const normalized = normalizeSpec(spec);
    if (normalized !== spec) {
      normalizedSpecMap.set(spec, normalized);
      specCorrections.set(spec, normalized);
    }
  });

  // 거래처명 정정 (기존 데이터 기반) - 비활성화됨
  // const existingClients = Array.from(allClients);
  const correctedClientMap = new Map<string, string>();

  // 자동 오타 수정 기능 비활성화 - 공백 제거만 수행
  Array.from(allClients).forEach((client) => {
    const trimmed = client.trim();

    // 공백만 제거하고 자동 수정은 하지 않음
    if (trimmed !== client) {
      correctedClientMap.set(client, trimmed);
      clientCorrections.set(client, trimmed);
    }
  });

  // 아래 코드는 자동 오타 수정 기능 (비활성화됨)
  /*
  Array.from(allClients).forEach((client) => {
    const trimmed = client.trim();

    // 이미 정정된 거래처는 제외
    if (correctedClientMap.has(trimmed)) return;

    // 다른 거래처와 비교하여 오타 감지
    const others = existingClients.filter((c) => c !== client);
    const similar = findSimilarClient(trimmed, others, 0.75);

    if (similar) {
      correctedClientMap.set(trimmed, similar);
      clientCorrections.set(client, similar);
    } else if (trimmed !== client) {
      correctedClientMap.set(client, trimmed);
      clientCorrections.set(client, trimmed);
    }
  });
  */

  // 두 번째 패스: 데이터 정제
  const cleanedData = {
    sales: (dataWithDefaults.sales || []).map((item: any) => ({
      ...item,
      spec: normalizedSpecMap.get(item.spec) || normalizeSpec(item.spec),
      client: correctedClientMap.get(item.client) || item.client,
    })),
    inout: (dataWithDefaults.inout || []).map((item: any) => ({
      ...item,
      spec: normalizedSpecMap.get(item.spec) || normalizeSpec(item.spec),
      client: correctedClientMap.get(item.client) || item.client,
    })),
    purchase: (dataWithDefaults.purchase || []).map((item: any) => ({
      ...item,
      spec: normalizedSpecMap.get(item.spec) || normalizeSpec(item.spec),
      client: correctedClientMap.get(item.client) || item.client,
    })),
    rental: (dataWithDefaults.rental || []).map((item: any) => ({
      ...item,
      spec: normalizedSpecMap.get(item.spec) || normalizeSpec(item.spec),
      client: correctedClientMap.get(item.client) || item.client,
    })),
    specs: normalizeSpecs(Array.from(allSpecs)),
    clients: Array.from(
      new Set(
        Array.from(
          new Set(
            [...(dataWithDefaults.sales || []), ...(dataWithDefaults.inout || []), ...(dataWithDefaults.purchase || []), ...(dataWithDefaults.rental || [])]
              .map((item: any) => correctedClientMap.get(item.client) || item.client)
              .filter(Boolean)
          )
        )
      )
    ).sort(),
  };

  return {
    cleanedData,
    corrections: {
      specs: specCorrections,
      clients: clientCorrections,
    },
  };
}

/**
 * 정제 결과를 요약합니다
 */
export function summarizeCorrections(corrections: {
  specs: Map<string, string>;
  clients: Map<string, string>;
}): {
  specCount: number;
  clientCount: number;
  details: Array<{ type: "spec" | "client"; original: string; corrected: string }>;
} {
  const details: Array<{ type: "spec" | "client"; original: string; corrected: string }> = [];

  Array.from(corrections.specs.entries()).forEach(([original, corrected]) => {
    details.push({ type: "spec", original, corrected });
  });

  Array.from(corrections.clients.entries()).forEach(([original, corrected]) => {
    details.push({ type: "client", original, corrected });
  });

  return {
    specCount: corrections.specs.size,
    clientCount: corrections.clients.size,
    details: details.slice(0, 20), // 최대 20개만 표시
  };
}

/**
 * 거래처 기본값 채우기 정보를 반환합니다
 */
export function getDefaultClientInfo(data: any): { count: number; affectedSheets: string[] } {
  const affectedSheets: string[] = [];
  let count = 0;

  if ((data.sales || []).some((item: any) => !item.client || !item.client.trim())) {
    affectedSheets.push("매출계약");
    count += (data.sales || []).filter((item: any) => !item.client || !item.client.trim()).length;
  }

  if ((data.inout || []).some((item: any) => !item.client || !item.client.trim())) {
    affectedSheets.push("입출고현황");
    count += (data.inout || []).filter((item: any) => !item.client || !item.client.trim()).length;
  }

  if ((data.purchase || []).some((item: any) => !item.client || !item.client.trim())) {
    affectedSheets.push("매입");
    count += (data.purchase || []).filter((item: any) => !item.client || !item.client.trim()).length;
  }

  if ((data.rental || []).some((item: any) => !item.client || !item.client.trim())) {
    affectedSheets.push("임대현황");
    count += (data.rental || []).filter((item: any) => !item.client || !item.client.trim()).length;
  }

  return { count, affectedSheets };
}
