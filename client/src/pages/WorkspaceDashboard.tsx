import { useRoute, Link } from "wouter";
import { useProjects } from "@/hooks/use-projects";
import { useWorkspace } from "@/hooks/use-workspaces";
import { CreateProjectDialog } from "@/components/CreateProjectDialog";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Sidebar } from "@/components/Sidebar";
import { Folder, ArrowRight, Loader2 } from "lucide-react";

export default function WorkspaceDashboard() {
  const [match, params] = useRoute("/workspace/:id");
  const workspaceId = params ? parseInt(params.id) : 0;
  
  const { data: workspace, isLoading: wsLoading } = useWorkspace(workspaceId);
  const { data: projects, isLoading: projLoading } = useProjects(workspaceId);

  if (wsLoading || projLoading) {
    return (
      <div className="flex min-h-screen bg-background items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!workspace) {
    return <div>Workspace not found</div>;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{workspace.name}</h1>
            <p className="text-muted-foreground mt-1">Manage your projects and teams</p>
          </div>
          <CreateProjectDialog workspaceId={workspaceId} />
        </header>

        <section>
          <h2 className="text-lg font-semibold mb-4">Projects</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects?.map((project) => (
              <Link key={project.id} href={`/project/${project.id}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full border-l-4 border-l-transparent hover:border-l-primary group">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-bold">
                        {project.key}
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <CardTitle className="mt-2">{project.name}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {project.description || "No description provided."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Folder className="w-4 h-4" />
                      <span>{new Date(project.createdAt!).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}

            {projects?.length === 0 && (
              <div className="col-span-full py-12 text-center border-2 border-dashed border-border rounded-xl">
                <p className="text-muted-foreground">No projects yet. Create your first one!</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
