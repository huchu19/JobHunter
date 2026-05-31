"use client";

import { useEffect, useState, useMemo } from "react";
import Fuse from "fuse.js";
import { LONDON_AREA_INFO, NEAR_EC1V_AREAS } from "@/app/lib/londonAreas";

interface Sponsor {
  name: string;
  city: string;
  rating: string;
  route: string;
  isTech?: boolean;
  techScore?: number;
}

export default function SponsorSearch() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedArea, setSelectedArea] = useState("all");
  const [techOnly, setTechOnly] = useState(false);
  const [nearEC1V, setNearEC1V] = useState(false);

  useEffect(() => {
    const fetchSponsors = async () => {
      try {
        const response = await fetch("/api/sponsors");
        if (!response.ok) throw new Error("Failed to fetch");
        const data = await response.json();
        setSponsors(data.sponsors || []);
      } catch (error) {
        console.error("Error fetching sponsors:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSponsors();
  }, []);

  const filteredSponsors = useMemo(() => {
    let filtered = sponsors;

    // Tech filter
    if (techOnly) {
      filtered = filtered.filter((s) => s.isTech);
    }

    // Area filter
    if (nearEC1V) {
      filtered = filtered.filter((s) => {
        const city = s.city.toLowerCase();
        return NEAR_EC1V_AREAS.some(
          (area) =>
            city.includes(area.toLowerCase()) ||
            city.startsWith(area.toLowerCase())
        );
      });
    } else if (selectedArea !== "all") {
      filtered = filtered.filter((s) => {
        const city = s.city.toLowerCase();
        return (
          city.includes(selectedArea.toLowerCase()) ||
          city.startsWith(selectedArea.toLowerCase())
        );
      });
    }

    // Search filter
    if (searchTerm.trim()) {
      const fuse = new Fuse(filtered, {
        keys: ["name", "city"],
        threshold: 0.3,
      });
      filtered = fuse.search(searchTerm).map((result) => result.item);
    }

    return filtered;
  }, [sponsors, searchTerm, selectedArea, techOnly, nearEC1V]);

  if (loading) {
    return <div className="text-center py-12">Loading sponsors...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search by company or city
          </label>
          <input
            type="text"
            placeholder="e.g., Monzo, Google, EC1..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Area
            </label>
            <select
              value={selectedArea}
              onChange={(e) => {
                setSelectedArea(e.target.value);
                setNearEC1V(false);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All London</option>
              {Object.entries(LONDON_AREA_INFO).map(([code, info]) => (
                <option key={code} value={code}>
                  {info.label} ({code})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Filters
            </label>
            <div className="flex gap-2">
              <label className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100">
                <input
                  type="checkbox"
                  checked={techOnly}
                  onChange={(e) => setTechOnly(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">Tech only</span>
              </label>

              <label className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100">
                <input
                  type="checkbox"
                  checked={nearEC1V}
                  onChange={(e) => {
                    setNearEC1V(e.target.checked);
                    if (e.target.checked) setSelectedArea("all");
                  }}
                  className="w-4 h-4"
                />
                <span className="text-sm">Near EC1V</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Sponsors found: {filteredSponsors.length}
          </h2>
        </div>

        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-gray-700">
                  Company
                </th>
                <th className="px-6 py-3 text-left font-medium text-gray-700">
                  City
                </th>
                <th className="px-6 py-3 text-left font-medium text-gray-700">
                  Type
                </th>
                <th className="px-6 py-3 text-left font-medium text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredSponsors.map((sponsor, idx) => (
                <tr key={`${sponsor.name}-${idx}`} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {sponsor.name}
                      </span>
                      {sponsor.isTech && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          Tech
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{sponsor.city}</td>
                  <td className="px-6 py-4">
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      A-rated
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                      + Add to tracker
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredSponsors.length === 0 && (
            <div className="px-6 py-12 text-center text-gray-500">
              No sponsors found. Try adjusting your search criteria.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
