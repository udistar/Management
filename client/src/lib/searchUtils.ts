/**
 * 부분 일치 검색을 위한 유틸리티 함수
 * 사용자 입력과 아이템을 비교하여 유사도 점수를 계산합니다.
 */

/**
 * 두 문자열 간의 유사도를 계산합니다 (0-1 사이의 값)
 * 더 높은 값일수록 더 유사합니다.
 */
export function calculateSimilarity(input: string, target: string): number {
  const inputLower = input.toLowerCase().trim();
  const targetLower = target.toLowerCase().trim();

  // 정확한 매치
  if (inputLower === targetLower) return 1;

  // 포함 관계 확인
  if (targetLower.includes(inputLower)) {
    return 0.9 + (inputLower.length / targetLower.length) * 0.1;
  }

  // 시작 부분 일치
  if (targetLower.startsWith(inputLower)) {
    return 0.8 + (inputLower.length / targetLower.length) * 0.1;
  }

  // 각 단어별 매치 확인 (공백으로 구분)
  const inputWords = inputLower.split(/\s+/);
  const targetWords = targetLower.split(/\s+/);

  let matchedWords = 0;
  for (const inputWord of inputWords) {
    if (targetWords.some((targetWord) => targetWord.includes(inputWord))) {
      matchedWords++;
    }
  }

  if (matchedWords > 0) {
    return (matchedWords / inputWords.length) * 0.7;
  }

  // Levenshtein 거리 기반 유사도 계산
  const distance = levenshteinDistance(inputLower, targetLower);
  const maxLength = Math.max(inputLower.length, targetLower.length);
  const similarity = 1 - distance / maxLength;

  return Math.max(0, similarity * 0.5);
}

/**
 * Levenshtein 거리를 계산합니다
 * 두 문자열을 같게 만드는 데 필요한 최소 편집 횟수입니다.
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // 치환
          matrix[i][j - 1] + 1, // 삽입
          matrix[i - 1][j] + 1 // 삭제
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * 검색어로 아이템 목록을 필터링하고 정렬합니다
 */
export function searchAndSort(
  items: string[],
  query: string,
  threshold: number = 0.3
): string[] {
  if (!query.trim()) {
    return items;
  }

  return items
    .map((item) => ({
      item,
      score: calculateSimilarity(query, item),
    }))
    .filter((result) => result.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .map((result) => result.item);
}
