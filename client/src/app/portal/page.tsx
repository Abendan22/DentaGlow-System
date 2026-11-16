"use client";

import { StatusBadge } from "@/components/ui/StatusBadge";
import { ApiError, apiGet, apiPost } from "@/lib/api";
import { useToast } from "@/lib/toast";
import type { DentalDoctor, Service } from "@/lib/types";
import { formatCurrency, formatTime, localDateString } from "@/lib/utils";
import { Calendar, Clock, Stethoscope } from "lucide-react";
import { useEffect, useState } from "react";

export default function BookAppointmentPage() {
  const [doctors, setDoctors] = useState<DentalDoctor[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [doctorId, setDoctorId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [notes, setNotes] = useState("");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    apiGet<DentalDoctor[]>("/doctors?active_only=1").then(setDoctors);
    apiGet<Service[]>("/services?active_only=1").then(setServices);
  }, []);

  useEffect(() => {
    if (!doctorId || !date) {
      setAvailableSlots([]);
      return;
    }
    setLoadingSlots(true);
    setTimeSlot("");
    apiGet<{ slots: string[] }>(
      `/appointments/available-slots?doctor_id=${doctorId}&date=${date}`
    )
      .then((data) => setAvailableSlots(data.slots))
      .catch((err) => {
        setAvailableSlots([]);
        showToast(
          err instanceof ApiError ? err.message : "Could not load time slots",
          "error"
        );
      })
      .finally(() => setLoadingSlots(false));
  }, [doctorId, date, showToast]);

  const selectedService = services.find((s) => String(s.id) === serviceId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!timeSlot) {
      showToast("Please select a time slot", "error");
      return;
    }
    setSubmitting(true);
    try {
      await apiPost("/appointments/book", {
        doctor_id: Number(doctorId),
        service_id: Number(serviceId),
        appointment_date: date,
        time_slot: timeSlot,
        notes,
      });
      showToast("Appointment request submitted! Awaiting admin approval.");
      setTimeSlot("");
      setNotes("");
      const data = await apiGet<{ slots: string[] }>(
        `/appointments/available-slots?doctor_id=${doctorId}&date=${date}`
      );
      setAvailableSlots(data.slots);
    } catch (err) {
      showToast(
        err instanceof ApiError ? err.message : "Booking failed",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Book an Appointment</h1>
        <p className="text-slate-500 mt-1">
          Choose your doctor, service, and available time slot
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="form-label flex items-center gap-2">
                <Stethoscope size={16} /> Select Doctor
              </label>
              <select
                className="form-input"
                value={doctorId}
                onChange={(e) => setDoctorId(e.target.value)}
                required
              >
                <option value="">Choose a doctor...</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Select Service</label>
              <select
                className="form-input"
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                required
              >
                <option value="">Choose a service...</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {formatCurrency(s.price)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label flex items-center gap-2">
                <Calendar size={16} /> Appointment Date
              </label>
              <input
                type="date"
                className="form-input"
                value={date}
                min={localDateString()}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="form-label flex items-center gap-2">
                <Clock size={16} /> Available Time Slots
              </label>
              {!doctorId || !date ? (
                <p className="text-sm text-slate-400 p-4 bg-slate-50 rounded-lg">
                  Select a doctor and date to view available slots
                </p>
              ) : loadingSlots ? (
                <p className="text-sm text-slate-400">Loading slots...</p>
              ) : availableSlots.length === 0 ? (
                <p className="text-sm text-amber-600 p-4 bg-amber-50 rounded-lg">
                  No available slots for this date. Please try another date.
                </p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      className={`slot-btn ${timeSlot === slot ? "selected" : ""}`}
                      onClick={() => setTimeSlot(slot)}
                    >
                      {formatTime(slot)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="form-label">Notes (optional)</label>
              <textarea
                className="form-input"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special requests or concerns..."
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full justify-center py-3 text-base"
              disabled={submitting || !timeSlot}
            >
              {submitting ? "Booking..." : "Confirm Appointment"}
            </button>
          </form>
        </div>

        <div className="space-y-4">
          <div className="card bg-blue-50 border border-blue-100">
            <h3 className="font-bold text-blue-800 mb-3">Booking Info</h3>
            <ul className="text-sm text-blue-700 space-y-2">
              <li>• Clinic hours: 8:00 AM – 5:00 PM</li>
              <li>• 30-minute appointment slots</li>
              <li>• Double booking is automatically prevented</li>
              <li>• Admin will approve or reject your request</li>
            </ul>
          </div>

          {selectedService && (
            <div className="card">
              <h3 className="font-bold text-slate-800 mb-2">Selected Service</h3>
              <p className="font-medium">{selectedService.name}</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                {formatCurrency(selectedService.price)}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                Duration: {selectedService.duration_minutes} minutes
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
