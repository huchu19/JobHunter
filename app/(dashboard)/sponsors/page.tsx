import { Suspense } from "react";
import SponsorSearch from "@/app/components/sponsors/SponsorSearch";

export default function SponsorsPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-6 border-b border-gray-200">
        <h1 className="text-3xl font-bold text-gray-900">Find Sponsors</h1>
        <p className="text-gray-600 mt-1">Search UK visa sponsors from gov.uk register</p>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-8">
          <Suspense fallback={<div className="text-gray-500">Loading sponsors...</div>}>
            <SponsorSearch />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
