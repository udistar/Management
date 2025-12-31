import FileUploader from "@/components/FileUploader";
import FilterBar from "@/components/FilterBar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { BarChart3, Database, Home, LayoutDashboard, MapPin, PieChart, Settings, TrendingUp, Users } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [location] = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const navItems = [
    { icon: Home, label: "개요", path: "/" },
    { icon: TrendingUp, label: "매출 분석", path: "/sales" },
    { icon: BarChart3, label: "입출고 현황", path: "/inout" },
    { icon: PieChart, label: "임대 현황", path: "/rental-status" },
    { icon: TrendingUp, label: "매입 (비용)", path: "/purchase-cost" },
    { icon: MapPin, label: "물류 지도", path: "/logistics-map" },
    { icon: Users, label: "거래처 분석", path: "/client-analysis" },
    { icon: Database, label: "데이터 그리드", path: "/data-grid" },
  ];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      {/* Sidebar */}
      <aside
        className={cn(
          "glass-panel z-20 flex flex-col transition-all duration-300 ease-in-out",
          isSidebarOpen ? "w-64" : "w-20"
        )}
      >
        <div className="flex h-16 items-center justify-between px-3 border-b border-white/10">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <LayoutDashboard className="h-6 w-6 text-primary animate-pulse" />
            {isSidebarOpen && <span className="bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">DataView</span>}
          </div>
          {isSidebarOpen && <FileUploader />}
        </div>

        <ScrollArea className="flex-1 py-6">
          <nav className="grid gap-2 px-3">
            {navItems.map((item) => (
              <Link key={item.path} href={item.path}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-3 transition-all duration-200 hover:bg-white/10 hover:text-primary hover:shadow-[0_0_15px_rgba(var(--primary),0.3)]",
                    location === item.path
                      ? "bg-primary/20 text-primary shadow-[0_0_20px_rgba(var(--primary),0.4)] border border-primary/30"
                      : "text-muted-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {isSidebarOpen && <span>{item.label}</span>}
                </Button>
              </Link>
            ))}
          </nav>
        </ScrollArea>

        <div className="p-4 border-t border-white/10 space-y-2">
          {!isSidebarOpen && <FileUploader />}
          <Button
            variant="ghost"
            size="icon"
            className="w-full hover:bg-white/10"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            <Settings className="h-5 w-5 text-muted-foreground" />
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative">
        {/* Ambient Light Orbs */}
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/20 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-secondary/20 blur-[100px] pointer-events-none" />

        <ScrollArea className="h-full">
          <div className="container py-8 px-6 max-w-7xl mx-auto">
            <FilterBar />
            {children}
          </div>
        </ScrollArea>
      </main>
    </div>
  );
}
