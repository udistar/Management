import defaultData from "@/data/detailed_data.json";
import { addMonths, format, isWithinInterval, parseISO, subMonths } from "date-fns";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { loadDataFromSupabase, hasDataInSupabase } from "@/lib/dataService";

// 데이터 타입 정의
export interface SalesData {
  id: string;
  date: string | null;
  client: string;
  spec: string;
  amount: number;
  type: string;
}

export interface InOutData {
  date: string;
  type: string;
  spec: string;
  client: string;
  location: string;
  amount: number;
}

export interface PurchaseData {
  date: string;
  spec: string;
  amount: number;
  client: string;
  type: string;
}

export interface RentalData {
  start_date: string | null;
  end_date: string | null;
  spec: string;
  client: string;
  address: string;
  contact: string;
  status: string;
  daysLeft: number | null;
  latest_payment_date?: string | null;
}

interface FilterState {
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
  selectedSpecs: string[];
  selectedClient: string | null;
}

interface FilterContextType {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  availableSpecs: string[];
  availableClients: string[];
  assetCount: number;
  filteredData: {
    sales: SalesData[];
    inout: InOutData[];
    purchase: PurchaseData[];
    rental: RentalData[];
  };
  resetFilters: () => void;
  isLoading: boolean;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [detailedData, setDetailedData] = useState<any>(() => {
    // 초기값: localStorage에서 로드, 없으면 기본값 사용
    try {
      const stored = localStorage.getItem("dashboardData");
      return stored ? JSON.parse(stored) : defaultData;
    } catch (e) {
      return defaultData;
    }
  });

  // Supabase에서 데이터 로드
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        // Supabase에 데이터가 있는지 확인
        const hasData = await hasDataInSupabase();

        if (hasData) {
          console.log('📡 Supabase에서 데이터 로드 중...');
          const result = await loadDataFromSupabase();

          if (result.success && result.data) {
            // 규격과 거래처 목록 추출
            const allSpecs = new Set<string>();
            const allClients = new Set<string>();

            [...result.data.sales, ...result.data.inout, ...result.data.purchase, ...result.data.rental].forEach((item: any) => {
              if (item.spec) allSpecs.add(item.spec);
              if (item.client) allClients.add(item.client);
            });

            const loadedData = {
              ...result.data,
              specs: Array.from(allSpecs).sort(),
              clients: Array.from(allClients).sort(),
            };

            setDetailedData(loadedData);

            // localStorage에도 백업 저장
            localStorage.setItem("dashboardData", JSON.stringify(loadedData));
            console.log('✅ Supabase 데이터 로드 완료');
          } else {
            console.log('⚠️ Supabase 데이터 로드 실패, localStorage 사용');
          }
        } else {
          console.log('ℹ️ Supabase에 저장된 데이터가 없습니다');
        }
      } catch (error) {
        console.error('❌ 데이터 로드 오류:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  // 기본값: 최근 12개월, 모든 규격, 거래처 미선택
  const [filters, setFilters] = useState<FilterState>({
    dateRange: {
      from: subMonths(new Date(), 12),
      to: new Date(),
    },
    selectedSpecs: [],
    selectedClient: null,
  });

  const availableSpecs = detailedData.specs || [];
  const availableClients = detailedData.clients || [];
  const assetCount = detailedData.assetCount || 0;

  const filteredData = useMemo(() => {
    const { from, to } = filters.dateRange;
    const specs = filters.selectedSpecs;
    const client = filters.selectedClient;
    const hasSpecFilter = specs.length > 0;
    const hasClientFilter = client !== null && client !== "";

    // 날짜 필터링 헬퍼 함수
    const checkDate = (dateStr: string | null) => {
      if (!dateStr || !from || !to) return true;
      try {
        const date = parseISO(dateStr);
        return isWithinInterval(date, { start: from, end: to });
      } catch (e) {
        return false;
      }
    };

    // 규격 필터링 헬퍼 함수
    const checkSpec = (spec: string) => {
      if (!hasSpecFilter) return true;
      return specs.includes(spec);
    };

    // 거래처 필터링 헬퍼 함수
    const checkClient = (clientName: string) => {
      if (!hasClientFilter) return true;
      return clientName === client;
    };

    return {
      sales: ((detailedData.sales || []) as SalesData[]).filter(
        (item) => checkDate(item.date) && checkSpec(item.spec) && checkClient(item.client)
      ),
      inout: ((detailedData.inout || []) as InOutData[]).filter(
        (item) => checkDate(item.date) && checkSpec(item.spec) && checkClient(item.client)
      ),
      purchase: ((detailedData.purchase || []) as PurchaseData[]).filter(
        (item) => checkDate(item.date) && checkSpec(item.spec) && checkClient(item.client)
      ),
      rental: ((detailedData.rental || []) as RentalData[]).filter(
        (item) => (checkDate(item.start_date) || checkDate(item.end_date)) && checkSpec(item.spec) && checkClient(item.client)
      ),
    };
  }, [filters, detailedData]);

  const resetFilters = () => {
    setFilters({
      dateRange: {
        from: subMonths(new Date(), 12),
        to: new Date(),
      },
      selectedSpecs: [],
      selectedClient: null,
    });
  };

  return (
    <FilterContext.Provider
      value={{
        filters,
        setFilters,
        availableSpecs: availableSpecs || [],
        availableClients: availableClients || [],
        assetCount,
        filteredData,
        resetFilters,
        isLoading,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
}

export function useFilter() {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error("useFilter must be used within a FilterProvider");
  }
  return context;
}
