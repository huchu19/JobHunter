"use client";

import { useEffect, useRef, useState } from "react";
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
import { ChevronDown, ChevronUp, ChevronsLeftRight } from "lucide-react";
import type { ApplicationDTO } from "@/app/types/application";
import { STATUSES, STATUS_META } from "@/app/lib/applicationStatus";
import KanbanCard from "./KanbanCard";
import SortableKanbanCard from "./SortableKanbanCard";

interface KanbanBoardProps {
  applications: ApplicationDTO[];
  onMove: (id: string, newStatus: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onOpen: (id: string) => void;
  selectMode?: boolean;
  selectedIds?: Set<string>;
  onSelect?: (id: string) => void;
}

interface ColumnProps {
  status: string;
  cards: ApplicationDTO[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  onMove: (id: string, newStatus: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onOpen: (id: string) => void;
  selectMode?: boolean;
  selectedIds?: Set<string>;
  onSelect?: (id: string) => void;
}

/** Collapsed column — a thin vertical rail. Still a drop target so cards can be
 *  dragged onto a collapsed stage; click anywhere to expand. */
function CollapsedColumn({
  status,
  cards,
  onToggleCollapse,
}: Pick<ColumnProps, "status" | "cards" | "onToggleCollapse">) {
  const meta = STATUS_META[status as keyof typeof STATUS_META];
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <button
      ref={setNodeRef}
      onClick={onToggleCollapse}
      title={`Expand ${meta.label}`}
      className={`flex h-full w-12 shrink-0 flex-col items-center gap-3 rounded-xl border py-3 transition-colors ${
        isOver
          ? "border-white/30 bg-white/[0.09]"
          : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"
      }`}
    >
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: meta.accent }}
      />
      <span className="figure rounded-full bg-white/10 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-white/80">
        {cards.length}
      </span>
      <span
        className="text-sm font-semibold tracking-wide text-white/70 [writing-mode:vertical-rl]"
      >
        {meta.label}
      </span>
    </button>
  );
}

function KanbanColumn({
  status,
  cards,
  collapsed,
  onToggleCollapse,
  onMove,
  onDelete,
  onOpen,
  selectMode,
  selectedIds,
  onSelect,
}: ColumnProps) {
  const meta = STATUS_META[status as keyof typeof STATUS_META];
  const { setNodeRef, isOver } = useDroppable({ id: status });

  const scrollRef = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  const [atBottom, setAtBottom] = useState(false);

  // Track whether the list overflows (so we show a jump affordance) and which
  // end we're at (so the button flips between "jump to bottom" / "back to top").
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      const canScroll = el.scrollHeight > el.clientHeight + 4;
      setOverflowing(canScroll);
      setAtBottom(el.scrollTop + el.clientHeight >= el.scrollHeight - 8);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [cards.length]);

  const jump = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: atBottom ? 0 : el.scrollHeight, behavior: "smooth" });
  };

  if (collapsed) {
    return (
      <CollapsedColumn
        status={status}
        cards={cards}
        onToggleCollapse={onToggleCollapse}
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={`flex h-full w-[300px] shrink-0 flex-col rounded-xl border transition-colors ${
        isOver
          ? "border-white/30 bg-white/[0.09]"
          : "border-white/10 bg-white/[0.04]"
      }`}
    >
      {/* Sticky column header — count stays visible no matter how far you scroll. */}
      <div className="flex shrink-0 items-center justify-between gap-2 rounded-t-xl border-b border-white/10 bg-white/[0.03] px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: meta.accent }}
          />
          <h3 className="text-sm font-semibold text-white">{meta.label}</h3>
          <span className="figure rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold tabular-nums text-white/80">
            {cards.length}
          </span>
        </div>
        <button
          onClick={onToggleCollapse}
          title={`Collapse ${meta.label}`}
          className="grid h-6 w-6 place-items-center rounded-md text-white/40 transition-colors hover:bg-white/10 hover:text-white/80"
        >
          <ChevronsLeftRight size={14} />
        </button>
      </div>
      <SortableContext
        items={cards.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={scrollRef}
          className="thin-scroll min-h-0 flex-1 space-y-2.5 overflow-y-auto p-2.5"
        >
          {cards.map((card) => (
            <SortableKanbanCard
              key={card.id}
              card={card}
              onMove={(newStatus) => onMove(card.id, newStatus)}
              onDelete={() => onDelete(card.id)}
              onOpen={() => onOpen(card.id)}
              selectMode={selectMode}
              selected={selectedIds?.has(card.id)}
              onSelect={() => onSelect?.(card.id)}
            />
          ))}
          {cards.length === 0 && (
            <p className="py-8 text-center text-sm text-white/30">No items</p>
          )}
        </div>
      </SortableContext>

      {/* Jump affordance — only when the list overflows the column viewport. */}
      {overflowing && (
        <button
          onClick={jump}
          className="flex shrink-0 items-center justify-center gap-1.5 rounded-b-xl border-t border-white/10 bg-white/[0.03] py-1.5 text-[11px] font-semibold text-white/55 transition-colors hover:bg-white/[0.07] hover:text-white/80"
        >
          {atBottom ? (
            <>
              <ChevronUp size={13} /> Back to top
            </>
          ) : (
            <>
              <ChevronDown size={13} /> Jump to bottom · {cards.length}
            </>
          )}
        </button>
      )}
    </div>
  );
}

export default function KanbanBoard({
  applications,
  onMove,
  onDelete,
  onOpen,
  selectMode,
  selectedIds,
  onSelect,
}: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggleCollapse = (status: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(status) ? next.delete(status) : next.add(status);
      return next;
    });

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
    <div className="panel-ink flex h-full flex-col rounded-card p-3">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="thin-scroll min-h-0 flex-1 overflow-x-auto pb-1">
          <div className="flex h-full gap-3">
            {STATUSES.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                cards={applications.filter((app) => app.status === status)}
                collapsed={collapsed.has(status)}
                onToggleCollapse={() => toggleCollapse(status)}
                onMove={onMove}
                onDelete={onDelete}
                onOpen={onOpen}
                selectMode={selectMode}
                selectedIds={selectedIds}
                onSelect={onSelect}
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
