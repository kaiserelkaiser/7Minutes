import { lazy, Suspense, useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { clearStoredRoomSession } from "@/lib/auth-session";
import NotFound from "@/pages/not-found";

const Landing = lazy(() => import("@/pages/Landing"));
const Rift = lazy(() => import("@/pages/Rift"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 3_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});

function Router() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100svh] items-center justify-center bg-[#05010f] text-white/55">
          <div className="font-mono text-[11px] uppercase tracking-[0.55em]">
            aligning thought particles...
          </div>
        </div>
      }
    >
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/rift/:id" component={Rift} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  useEffect(() => {
    const navigation = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;

    if (navigation?.type === "reload") {
      clearStoredRoomSession();
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
