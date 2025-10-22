import { useState } from "react";
import { AddItemModal } from "../AddItemModal";
import { Button } from "@/components/ui/button";

export default function AddItemModalExample() {
  const [open, setOpen] = useState(false);

  return (
    <div className="p-8">
      <Button onClick={() => setOpen(true)} className="gradient-bg rounded-xl">
        Open Add Item Modal
      </Button>
      <AddItemModal open={open} onOpenChange={setOpen} />
    </div>
  );
}
