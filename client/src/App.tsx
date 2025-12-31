import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FilterProvider } from "@/contexts/FilterContext";
import ClientAnalysis from "@/pages/ClientAnalysis";
import DataGrid from "@/pages/DataGrid";
import InOut from "@/pages/InOut";
import LogisticsMap from "@/pages/LogisticsMap";
import NotFound from "@/pages/NotFound";
import PurchaseCost from "@/pages/PurchaseCost";
import RentalStatus from "@/pages/RentalStatus";
import Sales from "@/pages/Sales";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";


function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/sales" component={Sales} />
      <Route path="/inout" component={InOut} />
      <Route path="/rental-status" component={RentalStatus} />
      <Route path="/purchase-cost" component={PurchaseCost} />
      <Route path="/logistics-map" component={LogisticsMap} />
      <Route path="/client-analysis" component={ClientAnalysis} />
      <Route path="/data-grid" component={DataGrid} />
      <Route path="/404" component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
      // switchable
      >
        <FilterProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </FilterProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
