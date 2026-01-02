import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { useFilter } from "@/contexts/FilterContext";
import { searchAndSort } from "@/lib/searchUtils";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Calendar as CalendarIcon, Check, ChevronsUpDown, Filter, X } from "lucide-react";
import { useMemo, useState } from "react";

export default function FilterBar() {
  const { filters, setFilters, availableSpecs, availableClients, resetFilters } = useFilter();
  const [openSpec, setOpenSpec] = useState(false);
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);

  const handleDateSelect = (range: any) => {
    setFilters(prev => ({
      ...prev,
      dateRange: range || { from: undefined, to: undefined }
    }));
  };

  const toggleSpec = (spec: string) => {
    setFilters(prev => {
      const current = prev.selectedSpecs;
      const next = current.includes(spec)
        ? current.filter(s => s !== spec)
        : [...current, spec];
      return { ...prev, selectedSpecs: next };
    });
  };

  // 부분 일치 검색 결과
  const clientSearchResults = useMemo(() => {
    if (!filters.selectedClient) return [];
    return searchAndSort(availableClients, filters.selectedClient, 0.2).slice(0, 5);
  }, [filters.selectedClient, availableClients]);

  return (
    <div className="glass-panel p-4 mb-6 rounded-xl flex flex-wrap items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-500">
      <div className="flex items-center gap-2 text-primary font-medium">
        <Filter className="h-4 w-4" />
        <span>필터</span>
      </div>

      <Separator orientation="vertical" className="h-6 bg-white/10" />

      {/* Date Range Picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-full md:w-[240px] justify-start text-left font-normal bg-white/5 border-white/10 hover:bg-white/10",
              !filters.dateRange.from && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {filters.dateRange.from ? (
              filters.dateRange.to ? (
                <>
                  {format(filters.dateRange.from, "yyyy-MM-dd")} ~{" "}
                  {format(filters.dateRange.to, "yyyy-MM-dd")}
                </>
              ) : (
                format(filters.dateRange.from, "yyyy-MM-dd")
              )
            ) : (
              <span>기간 선택</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={filters.dateRange?.from}
            selected={{
              from: filters.dateRange?.from,
              to: filters.dateRange?.to,
            }}
            onSelect={handleDateSelect}
            disabled={(date) =>
              date > new Date() || date < new Date("2010-01-01")
            }
          />
        </PopoverContent>
      </Popover>

      {/* Spec Selector */}
      <Popover open={openSpec} onOpenChange={setOpenSpec}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full md:w-[140px] justify-between bg-white/5 border-white/10 hover:bg-white/10"
          >
            <span className="truncate">
              {filters.selectedSpecs.length > 0
                ? `규격 ${filters.selectedSpecs.length}개`
                : "모든 규격"}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0">
          <Command>
            <CommandInput placeholder="규격 검색..." />
            <CommandList>
              <CommandEmpty>규격을 찾을 수 없습니다.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="all"
                  onSelect={() => {
                    setFilters((prev) => ({
                      ...prev,
                      selectedSpecs: [],
                    }));
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      filters.selectedSpecs.length === 0 ? "opacity-100" : "opacity-0"
                    )}
                  />
                  모든 규격
                </CommandItem>
                {availableSpecs.map((spec) => (
                  <CommandItem
                    key={spec}
                    value={spec}
                    onSelect={() => toggleSpec(spec)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        filters.selectedSpecs.includes(spec)
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    <span className="truncate">{spec}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Client Search Input with Suggestions */}
      <div className="relative w-full md:w-[280px]">
        <input
          type="text"
          placeholder="거래처 검색..."
          value={filters.selectedClient || ""}
          onChange={(e) => {
            setFilters((prev) => ({
              ...prev,
              selectedClient: e.target.value || null,
            }));
            setShowClientSuggestions(true);
          }}
          onFocus={() => setShowClientSuggestions(true)}
          onBlur={() => setTimeout(() => setShowClientSuggestions(false), 200)}
          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
        />
        {filters.selectedClient && (
          <button
            onClick={() => {
              setFilters((prev) => ({
                ...prev,
                selectedClient: null,
              }));
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition"
            title="거래처 선택 해제"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {/* Search Suggestions */}
        {showClientSuggestions && clientSearchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-white/10 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
            {clientSearchResults.map((client) => (
              <button
                key={client}
                onClick={() => {
                  setFilters((prev) => ({
                    ...prev,
                    selectedClient: client,
                  }));
                  setShowClientSuggestions(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-white/10 transition text-sm text-white/80 hover:text-white"
              >
                {client}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Active Filters Badges */}
      <div className="flex-1 flex flex-wrap gap-2">
        {filters.selectedSpecs.map((spec) => (
          <div
            key={spec}
            className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/20 text-primary text-xs border border-primary/30"
          >
            <span>{spec}</span>
            <button
              onClick={() => toggleSpec(spec)}
              className="hover:opacity-70 transition"
              title={`${spec} 필터 제거`}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Reset Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={resetFilters}
        className="text-muted-foreground hover:text-white hover:bg-white/10"
      >
        초기화
      </Button>
    </div>
  );
}
