import { useAuth } from "@/hooks/use-auth";
import { Link, Redirect } from "wouter";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Plus } from "lucide-react";

export default function Home() {
  const { user, isLoading: authLoading } = useAuth();
  const { data: workspaces, isLoading: wsLoading } = useWorkspaces();

  if (authLoading || wsLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not logged in? Handled by useAuth/RequireAuth wrapper in App usually, 
  // but if we land here unauthorized, show landing page or redirect.
  // Assuming App.tsx structure handles unauthorized state or we show landing page.
  if (!user) {
    return (
      <div className="flex flex-col min-h-screen">
         <header className="px-6 py-4 flex justify-between items-center border-b">
           <div className="font-bold text-2xl tracking-tighter">TaskFlow</div>
           <Link href="/api/login">
             <Button>Log In</Button>
           </Link>
         </header>
         <main className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-gradient-to-b from-background to-muted/20">
           <h1 className="text-5xl font-extrabold tracking-tight mb-6 max-w-2xl">
             Manage projects with <span className="text-primary">clarity</span> and velocity.
           </h1>
           <p className="text-xl text-muted-foreground max-w-xl mb-8">
             The modern project management tool for high-performance teams. 
             Built with AI to help you move faster.
           </p>
           <div className="flex gap-4">
             <Link href="/api/login">
               <Button size="lg" className="h-12 px-8 text-lg shadow-lg shadow-primary/25">Get Started</Button>
             </Link>
             <Button variant="outline" size="lg" className="h-12 px-8">View Demo</Button>
           </div>
         </main>
      </div>
    );
  }

  // If user has workspaces, redirect to the first one
  if (workspaces && workspaces.length > 0) {
    return <Redirect to={`/workspace/${workspaces[0].id}`} />;
  }

  // User logged in but no workspaces
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/10 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-4">
            <Plus className="w-6 h-6 text-primary" />
          </div>
          <CardTitle>Create your first workspace</CardTitle>
          <CardDescription>
            You don't have any workspaces yet. Create one to get started with your projects.
          </CardDescription>
        </CardHeader>
        <div className="p-6 pt-0">
          <CreateWorkspaceForm />
        </div>
      </Card>
    </div>
  );
}

// Simple inline form for the empty state
import { useCreateWorkspace } from "@/hooks/use-workspaces";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

function CreateWorkspaceForm() {
  const [name, setName] = useState("");
  const createWs = useCreateWorkspace();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    await createWs.mutateAsync({ 
      name, 
      slug: name.toLowerCase().replace(/\s+/g, '-'),
      ownerId: "current_user" // handled by backend
    });
    // onSuccess will invalidate query and trigger redirect in Home component
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="ws-name">Workspace Name</Label>
        <Input 
          id="ws-name" 
          placeholder="Acme Corp" 
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <Button className="w-full" disabled={createWs.isPending}>
        {createWs.isPending ? "Creating..." : "Create Workspace"}
      </Button>
    </form>
  );
}
