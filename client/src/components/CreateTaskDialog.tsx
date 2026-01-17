import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateTask, useAiSubtasks } from "@/hooks/use-tasks";
import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  storyPoints: z.string().optional(), // handled as string in input, coerced in hook
});

interface CreateTaskDialogProps {
  projectId: number;
  columnId?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateTaskDialog({ projectId, columnId, open, onOpenChange }: CreateTaskDialogProps) {
  const { toast } = useToast();
  const createTask = useCreateTask();
  const aiSubtasks = useAiSubtasks();
  const [subtasks, setSubtasks] = useState<string[]>([]);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "medium",
      storyPoints: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      // Append generated subtasks to description if any
      let finalDescription = values.description || "";
      if (subtasks.length > 0) {
        finalDescription += "\n\n### Subtasks:\n" + subtasks.map(s => `- [ ] ${s}`).join("\n");
      }

      await createTask.mutateAsync({
        ...values,
        description: finalDescription,
        projectId,
        columnId,
        reporterId: "current_user", // Backend should override or handle this
      });
      
      toast({ title: "Task created successfully" });
      onOpenChange(false);
      form.reset();
      setSubtasks([]);
    } catch (error) {
      toast({ title: "Failed to create task", variant: "destructive" });
    }
  }

  const handleGenerateSubtasks = async () => {
    const desc = form.getValues("description") || form.getValues("title");
    if (!desc) {
      toast({ title: "Please enter a title or description first", variant: "destructive" });
      return;
    }
    
    try {
      const generated = await aiSubtasks.mutateAsync(desc);
      setSubtasks(generated);
      toast({ title: "Subtasks generated!" });
    } catch (e) {
      toast({ title: "Failed to generate subtasks", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Title</FormLabel>
                  <FormControl>
                    <Input placeholder="What needs to be done?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="storyPoints"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Story Points</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Estimate" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Add details..." 
                      className="min-h-[100px]" 
                      {...field} 
                    />
                  </FormControl>
                  <div className="flex justify-between items-center mt-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={handleGenerateSubtasks}
                      disabled={aiSubtasks.isPending}
                      className="text-xs gap-1.5"
                    >
                      {aiSubtasks.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-primary" />}
                      Generate Subtasks
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {subtasks.length > 0 && (
              <div className="bg-muted/50 p-3 rounded-md text-sm space-y-1">
                <p className="font-semibold text-xs uppercase text-muted-foreground mb-2">Suggested Subtasks</p>
                {subtasks.map((task, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                    <span>{task}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={createTask.isPending}>
                {createTask.isPending ? "Creating..." : "Create Task"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
