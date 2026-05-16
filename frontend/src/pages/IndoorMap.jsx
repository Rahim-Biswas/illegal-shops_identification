import { useState } from 'react';
import { DEMO_BUILDINGS } from '../data/demoData';

export default function IndoorMap() {
  const [selectedBuilding, setSelectedBuilding] = useState(DEMO_BUILDINGS[0]);
  const [selectedFloor, setSelectedFloor] = useState(selectedBuilding.floors[0]);

  const handleSelectBuilding = (building) => {
    setSelectedBuilding(building);
    setSelectedFloor(building.floors[0]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Indoor Mapping</h1>
          <p className="text-gray-500 mt-2 max-w-2xl">Explore multi-tenant commercial sites, floor-aware shop units, and violation history in dense trade centers.</p>
        </div>
        <button className="rounded-3xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">View Floor Plan</button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Buildings</h2>
          <div className="space-y-3">
            {DEMO_BUILDINGS.map((building) => (
              <button
                key={building.id}
                onClick={() => handleSelectBuilding(building)}
                className={`w-full rounded-3xl border px-4 py-3 text-left transition-colors ${selectedBuilding.id === building.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{building.name}</p>
                    <p className="text-xs text-slate-500">{building.units} units · {building.activeViolations} active violations</p>
                  </div>
                  <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{building.floors.length} floors</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="xl:col-span-3 space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{selectedBuilding.name}</h2>
                <p className="text-sm text-slate-500">Floor-aware navigation and unit status for dense marketplace complexes.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                {selectedBuilding.floors.map((floor) => (
                  <button
                    key={floor}
                    onClick={() => setSelectedFloor(floor)}
                    className={`rounded-3xl px-4 py-2 text-sm font-medium transition-colors ${selectedFloor === floor ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                  >
                    {floor}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
              <p className="text-sm">Interactive floor diagram placeholder for {selectedFloor}. Use this area to render indoor unit pins and violations once GIS layers are integrated.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, idx) => (
              <div key={idx} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold text-slate-900">Unit {idx + 101}</p>
                    <p className="text-xs text-slate-500">Retail shop · {selectedFloor}</p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">Violation risk</span>
                </div>
                <p className="text-sm text-slate-600">License status: <span className="font-semibold text-slate-900">Active</span></p>
                <p className="text-sm text-slate-600 mt-2">Last inspection: <span className="font-semibold text-slate-900">May 14, 2026</span></p>
                <p className="text-sm text-slate-600 mt-2">AI alerts: <span className="font-semibold text-slate-900">2</span></p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
