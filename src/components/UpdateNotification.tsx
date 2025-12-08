import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Sparkles } from "lucide-react";

interface UpdateData {
  id: string;
  title: string;
  description: string;
}

export const UpdateNotification = () => {
  const [open, setOpen] = useState(false);
  const [updateData, setUpdateData] = useState<UpdateData | null>(null);

  useEffect(() => {
    // 1. Check for latest update on initial load
    const checkUpdate = async () => {
      const { data } = await supabase
        .from('system_updates')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        // Cast data to unknown then UpdateData to satisfy TS
        const update = data as unknown as UpdateData;
        const lastSeen = localStorage.getItem('last_seen_update_id');
        
        // Only show if the user hasn't seen this specific update ID
        if (lastSeen !== update.id) {
          setUpdateData(update);
          setOpen(true);
        }
      }
    };

    checkUpdate();

    // 2. Listen for NEW updates in real-time
    const channel = supabase
      .channel('system-updates-channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'system_updates' },
        (payload) => {
          const newUpdate = payload.new as UpdateData;
          setUpdateData(newUpdate);
          setOpen(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleRefresh = () => {
    if (updateData) {
      // Mark this update as 'seen' so it doesn't appear again after reload
      localStorage.setItem('last_seen_update_id', updateData.id);
    }
    window.location.reload();
  };

  if (!updateData) return null;

  return (
    <Dialog open={open} onOpenChange={(val) => {
      // Prevent closing by setting state to false unless we explicitly allow it
      // In this case, we force it to stay open (val is ignored here essentially)
      if (!val) return; 
      setOpen(val);
    }}>
      <DialogContent 
        // [&>button]:hidden hides the default "X" close button from Shadcn Dialog
        className="sm:max-w-md border-primary/20 [&>button]:hidden" 
        // Prevent closing by clicking outside
        onPointerDownOutside={(e) => e.preventDefault()} 
        // Prevent closing by pressing Escape
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-orbitron text-primary">
            <Sparkles className="h-5 w-5" />
            {updateData.title}
          </DialogTitle>
          <DialogDescription className="pt-3 text-foreground/90 whitespace-pre-wrap">
            {updateData.description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4 sm:justify-center">
          <Button onClick={handleRefresh} className="w-full gap-2 glow-ps5 font-orbitron h-12 text-base">
            <RefreshCcw className="h-4 w-4" />
            Update & Refresh
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};