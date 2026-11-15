"use client";

import { formatTime } from "@/lib/utils";

type Props = {
  allSlots: string[];
  availableSlots: string[];
  selected: string;
  onSelect: (slot: string) => void;
  loading?: boolean;
  emptyMessage?: string;
};

export function TimeSlotPicker({
  allSlots,
  availableSlots,
  selected,
  onSelect,
  loading = false,
  emptyMessage = "Select a doctor and date to view time slots",
}: Props) {
  if (loading) {
    return <p className="text-sm text-slate-400">Loading slots...</p>;
  }

  if (allSlots.length === 0) {
    return (
      <p className="text-sm text-slate-400 p-4 bg-slate-50 rounded-lg">
        {emptyMessage}
      </p>
    );
  }

  const availableSet = new Set(availableSlots);

  return (
    <div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {allSlots.map((slot) => {
          const isAvailable = availableSet.has(slot);
          const isSelected = selected === slot;

          return (
            <button
              key={slot}
              type="button"
              disabled={!isAvailable}
              className={`slot-btn ${isSelected ? "selected" : ""} ${!isAvailable ? "unavailable" : ""}`}
              onClick={() => isAvailable && onSelect(slot)}
              title={isAvailable ? "Available" : "Unavailable — already booked"}
            >
              {formatTime(slot)}
            </button>
          );
        })}
      </div>
      {availableSlots.length === 0 && (
        <p className="text-sm text-red-600 mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
          All time slots are unavailable for this doctor on the selected date. Please choose another date or doctor.
        </p>
      )}
    </div>
  );
}
