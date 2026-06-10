"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { ApplicationDTO } from "@/app/types/application";
import { STATUSES, STATUS_META } from "@/app/lib/applicationStatus";
import KanbanCard from "./KanbanCard";
import SortableKanbanCard from "./SortableKanbanCard";

interface KanbanBoardProps {
  applications: ApplicationDTO[];
  onMove: (id: string, newStatus: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onOpen: (id: string) => void;
}

interface ColumnProps {
  status: string;
  cards: ApplicationDTO[];
  onMove: (id: string, newStatus: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onOpen: (id: string) => void;
}

function KanbanColumn({ status, cards, onMove, onDelete, onOpen }: ColumnProps) {
  const meta = STATUS_META[status as keyof typeof STATUS_META];
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={`flex w-[280px] shrink-0 flex-col rounded-xl border p-3 transition-colors ${
        isOver
          ? "border-white/30 bg-white/[0.09]"
          : "border-white/10 bg-white/[0.04]"
      }`}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: meta.accent }}
          />
          <h3 className="text-sm font-semibold text-white">{meta.label}</h3>
        </div>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-white/80">
          {cards.length}
        </span>
      </div>
      <SortableContext
        items={cards.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="thin-scroll flex-1 space-y-2.5 overflow-y-auto pr-0.5">
          {cards.map((card) => (
            <SortableKanbanCard
              key={card.id}
              card={card}
              onMove={(newStatus) => onMove(card.id, newStatus)}
              onDelete={() => onDelete(card.id)}
              onOpen={() => onOpen(card.id)}
            />
          ))}
          {cards.length === 0 && (
            <p className="py-8 text-center text-sm text-white/30">No items</p>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export default function KanbanBoard({
  applications,
  onMove,
  onDelete,
  onOpen,
}: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 8 },
    }),
    useSensor(KeyboardSensor)
  );

  const activeCard = applications.find((a) => a.id === activeId) || null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const activeAppId = String(active.id);
    const activeApp = applications.find((a) => a.id === activeAppId);
    if (!activeApp) return;

    // `over.id` is either a column status (dropped on empty area) or a card id
    // (dropped onto another card) — resolve the target column either way.
    const overId = String(over.id);
    const targetStatus = STATUSES.includes(overId as never)
      ? overId
      : applications.find((a) => a.id === overId)?.status;

    if (!targetStatus || targetStatus === activeApp.status) return;
    void onMove(activeAppId, targetStatus);
  };

  return (
    <div className="panel-ink rounded-card p-5 shadow-[0_18px_48px_-12px_rgba(11,31,42,0.22)]">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="thin-scroll overflow-x-auto pb-1">
          <div className="flex gap-4">
            {STATUSES.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                cards={applications.filter((app) => app.status === status)}
                onMove={onMove}
                onDelete={onDelete}
                onOpen={onOpen}
              />
            ))}
          </div>
        </div>

        <DragOverlay>
          {activeCard ? (
            <div className="w-[256px]">
              <KanbanCard
                card={activeCard}
                onMove={async () => {}}
                onDelete={async () => {}}
                onOpen={() => {}}
                overlay
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
