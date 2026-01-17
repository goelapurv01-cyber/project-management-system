import { useRoute } from "wouter";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { useProjectBoard } from "@/hooks/use-projects";
import { useMoveTask, useCreateTask, useDeleteTask } from "@/hooks/use-tasks";
import { useCreateColumn } from "@/hooks/use-columns";
import { Sidebar } from "@/components/Sidebar";
import { CreateTaskDialog } from "@/components/CreateTaskDialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, MoreHorizontal, Calendar, Trash2 } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem 
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

export default function ProjectBoard() {
  const [match, params] = useRoute("/project/:id");
  const projectId = params ? parseInt(params.id) : 0;
  const { toast } = useToast();
  
  const { data: project, isLoading } = useProjectBoard(projectId);
  const moveTask = useMoveTask();
  const deleteTask = useDeleteTask();
  const createColumn = useCreateColumn();
  
  // Create Task Dialog State
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [activeColumnId, setActiveColumnId] = useState<number | undefined>(undefined);

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const taskId = parseInt(draggableId);
    const columnId = parseInt(destination.droppableId);
    
    // Optimistic UI update could go here, but for simplicity relying on RQ refetch
    moveTask.mutate({ 
      id: taskId, 
      columnId, 
      order: destination.index 
    });
  };

  const handleCreateColumn = () => {
    const name = prompt("Enter column name:");
    if (name) {
      createColumn.mutate({ projectId, name, order: (project?.columns.length || 0) + 1 });
    }
  };

  const handleDeleteTask = (taskId: number) => {
    if (confirm("Are you sure you want to delete this task?")) {
      deleteTask.mutate(taskId);
      toast({ title: "Task deleted" });
    }
  };

  if (isLoading || !project) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Sort columns by order
  const sortedColumns = [...project.columns].sort((a, b) => a.order - b.order);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="px-6 py-4 border-b border-border flex justify-between items-center bg-card/50 backdrop-blur-sm z-10">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <span>{project.key}</span>
              <span>/</span>
              <span>Board</span>
            </div>
            <h1 className="text-2xl font-bold">{project.name}</h1>
          </div>
          <div className="flex items-center gap-2">
             <Button variant="outline" size="sm" onClick={handleCreateColumn}>
               <Plus className="w-4 h-4 mr-2" />
               Add Column
             </Button>
          </div>
        </header>

        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
            <div className="flex h-full gap-6 min-w-max">
              {sortedColumns.map((column) => (
                <div key={column.id} className="w-80 flex flex-col h-full rounded-xl bg-muted/30 border border-border/50">
                  <div className="p-3 font-semibold text-sm flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary/50" />
                      {column.name}
                      <span className="text-muted-foreground font-normal ml-1">
                        {column.tasks.length}
                      </span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6"
                      onClick={() => {
                        setActiveColumnId(column.id);
                        setIsCreateTaskOpen(true);
                      }}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <Droppable droppableId={String(column.id)}>
                    {(provided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="flex-1 p-2 space-y-3 overflow-y-auto"
                      >
                        {column.tasks.map((task, index) => (
                          <Draggable key={task.id} draggableId={String(task.id)} index={index}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className="kanban-card group bg-card"
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <Badge variant={task.priority === 'urgent' ? 'destructive' : 'secondary'} className="text-[10px] px-1.5 py-0 uppercase">
                                    {task.priority}
                                  </Badge>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <MoreHorizontal className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                      <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteTask(task.id)}>
                                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                                
                                <h4 className="font-medium text-sm mb-3 leading-tight">
                                  {task.title}
                                </h4>
                                
                                <div className="flex justify-between items-center mt-auto">
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    {task.dueDate && (
                                      <span className="flex items-center gap-1 text-orange-500 bg-orange-500/10 px-1.5 rounded-sm">
                                        <Calendar className="w-3 h-3" />
                                        {format(new Date(task.dueDate), "MMM d")}
                                      </span>
                                    )}
                                    {task.storyPoints && (
                                      <span className="bg-muted px-1.5 rounded-sm font-mono text-[10px] font-bold">
                                        {task.storyPoints}
                                      </span>
                                    )}
                                  </div>
                                  
                                  {task.assigneeId && (
                                    <Avatar className="w-6 h-6 border-2 border-background">
                                      <AvatarFallback className="text-[9px]">U</AvatarFallback>
                                    </Avatar>
                                  )}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}
              
              {/* Add Column Button at end */}
              <button 
                onClick={handleCreateColumn}
                className="w-80 h-12 flex items-center justify-center rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Column
              </button>
            </div>
          </div>
        </DragDropContext>

        <CreateTaskDialog 
          projectId={projectId} 
          columnId={activeColumnId}
          open={isCreateTaskOpen}
          onOpenChange={setIsCreateTaskOpen}
        />
      </main>
    </div>
  );
}
