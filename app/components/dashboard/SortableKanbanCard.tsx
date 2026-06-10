"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ApplicationDTO } from "@/app/types/application";
import KanbanCard from "./KanbanCard";

interface SortableKanbanCardProps {
  card: ApplicationDTO;
  onMove: (newStatus: string) => Promise<void>;
  onDelete: () => Promise<void>;
  onOpen: () => void;
}

/**
 * Draggable wrapper around KanbanCard. The whole card is the drag handle; the
 * PointerSensor activation distance (set on the board) keeps a click that opens
 * the detail drawer from being swallowed as a drag.
 */
export default function SortableKanbanCard({
  card,
  onMove,
  onDelete,
  onOpen,
}: SortableKanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id, data: { status: card.status } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <KanbanCard
        card={card}
        onMove={onMove}
        onDelete={onDelete}
        onOpen={onOpen}
      />
    </div>
  );
}
