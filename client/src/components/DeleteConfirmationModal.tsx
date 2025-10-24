import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2, AlertTriangle } from "lucide-react";

interface DeleteConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  itemTitle?: string;
  isLoading?: boolean;
}

export function DeleteConfirmationModal({
  open,
  onOpenChange,
  onConfirm,
  itemTitle,
  isLoading = false,
}: DeleteConfirmationModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md glass-strong rounded-3xl border-glass-border animate-scale-in bg-background/95 backdrop-blur-xl">
        <DialogHeader>
          <div className="flex items-center gap-3 text-destructive">
            <AlertTriangle className="h-6 w-6" />
            <DialogTitle className="text-xl">Delete Item</DialogTitle>
          </div>
          <DialogDescription className="text-foreground/80 pt-2 text-base">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-foreground">
              {itemTitle || "this item"}
            </span>
            ? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex gap-3 sm:gap-2 pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="flex-1 rounded-xl border-border hover:bg-accent"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
