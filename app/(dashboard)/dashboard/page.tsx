import { Suspense } from "react";
import StatsBar from "@/app/components/dashboard/StatsBar";
import KanbanBoard from "@/app/components/dashboard/KanbanBoard";

export default function DashboardPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-6 border-b border-gray-200">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Track your job applications</p>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-8 space-y-8">
          <Suspense fallback={<div className="text-gray-500">Loading stats...</div>}>
            <StatsBar />
          </Suspense>

          <Suspense fallback={<div className="text-gray-500">Loading applications...</div>}>
            <KanbanBoard />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
