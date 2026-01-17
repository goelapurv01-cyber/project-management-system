import { Link, useLocation } from "wouter";
import { Layout, LayoutGrid, Plus, LogOut, Settings, User as UserIcon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { data: workspaces, isLoading } = useWorkspaces();

  // Basic "current workspace" detection logic could be improved with route params,
  // but for now we default to first or let user navigate.
  const currentWorkspaceId = location.split("/")[2] ? parseInt(location.split("/")[2]) : workspaces?.[0]?.id;

  if (isLoading) return <div className="w-64 h-screen bg-muted/10 border-r border-border animate-pulse" />;

  return (
    <div className="w-64 h-screen border-r border-border bg-card flex flex-col sticky top-0">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 font-bold text-xl text-primary mb-4">
          <Layout className="w-6 h-6" />
          <span>TaskFlow</span>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full justify-start gap-2">
              <Avatar className="w-5 h-5">
                <AvatarFallback className="text-[10px]">WS</AvatarFallback>
              </Avatar>
              <span className="truncate">
                {workspaces?.find(w => w.id === currentWorkspaceId)?.name || "Select Workspace"}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>Switch Workspace</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {workspaces?.map(ws => (
              <DropdownMenuItem key={ws.id} asChild>
                <Link href={`/workspace/${ws.id}`}>
                  <span>{ws.name}</span>
                </Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Plus className="w-4 h-4 mr-2" />
              Create Workspace
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {currentWorkspaceId && (
          <>
            <div className="text-xs font-medium text-muted-foreground uppercase mb-2 px-2 mt-2">Main</div>
            <Link href={`/workspace/${currentWorkspaceId}`} className={`sidebar-link ${location === `/workspace/${currentWorkspaceId}` ? 'sidebar-link-active' : ''}`}>
              <LayoutGrid className="w-4 h-4" />
              Dashboard
            </Link>
          </>
        )}
      </nav>

      <div className="p-4 border-t border-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start gap-2 h-12">
              <Avatar className="w-8 h-8">
                <AvatarImage src={user?.profileImageUrl} />
                <AvatarFallback>{user?.firstName?.[0] || <UserIcon className="w-4 h-4" />}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start text-xs">
                <span className="font-medium">{user?.firstName || 'User'}</span>
                <span className="text-muted-foreground truncate w-32">{user?.email}</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuItem>
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => logout()} className="text-destructive focus:text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
