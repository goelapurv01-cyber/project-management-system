import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import WorkspaceDashboard from "@/pages/WorkspaceDashboard";
import ProjectBoard from "@/pages/ProjectBoard";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/workspace/:id" component={WorkspaceDashboard} />
      <Route path="/project/:id" component={ProjectBoard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
