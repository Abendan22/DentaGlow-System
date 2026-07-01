<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Services\ActivityLogger;
use App\Services\AppointmentSlotService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AppointmentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Appointment::with(['patient.gender', 'doctor', 'service'])
            ->orderByRaw("FIELD(status, 'pending', 'confirmed', 'completed', 'rejected', 'cancelled')")
            ->orderByDesc('appointment_date')
            ->orderBy('time_slot');

        if ($search = $request->query('search')) {
            $query->whereHas('patient', function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%");
            });
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($date = $request->query('date')) {
            $query->where('appointment_date', $date);
        }

        return response()->json($query->get());
    }

    public function availableSlots(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'doctor_id' => ['required', 'exists:dental_doctors,id'],
            'date' => ['required', 'date', 'after_or_equal:today'],
        ]);

        $slots = AppointmentSlotService::getAvailableSlots(
            (int) $validated['doctor_id'],
            $validated['date']
        );

        return response()->json([
            'slots' => $slots,
            'all_slots' => AppointmentSlotService::allSlots(),
        ]);
    }

    public function myAppointments(Request $request): JsonResponse
    {
        $patient = $request->user()->patient;

        if (! $patient) {
            return response()->json(['message' => 'Patient profile not found.'], 404);
        }

        $appointments = Appointment::with(['doctor', 'service'])
            ->where('patient_id', $patient->id)
            ->orderByDesc('appointment_date')
            ->orderBy('time_slot')
            ->get();

        return response()->json($appointments);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'patient_id' => ['nullable', 'exists:patients,id'],
            'doctor_id' => ['required', 'exists:dental_doctors,id'],
            'service_id' => ['required', 'exists:services,id'],
            'appointment_date' => ['required', 'date', 'after_or_equal:today'],
            'time_slot' => ['required', 'string', 'size:5'],
            'notes' => ['nullable', 'string'],
            'status' => ['nullable', 'in:pending,confirmed,completed,cancelled,rejected'],
        ]);

        $user = $request->user();

        if ($user->isPatient()) {
            $patient = $user->patient;
            if (! $patient) {
                return response()->json(['message' => 'Patient profile not found.'], 404);
            }
            $validated['patient_id'] = $patient->id;
            $validated['status'] = 'pending';
        } elseif (empty($validated['patient_id'])) {
            return response()->json(['message' => 'Patient is required.'], 422);
        }

        if (! AppointmentSlotService::isSlotAvailable(
            (int) $validated['doctor_id'],
            $validated['appointment_date'],
            $validated['time_slot']
        )) {
            return response()->json(['message' => 'This time slot is no longer available. Please choose another.'], 422);
        }

        try {
            $appointment = DB::transaction(function () use ($validated, $user) {
                if (! AppointmentSlotService::isSlotAvailable(
                    (int) $validated['doctor_id'],
                    $validated['appointment_date'],
                    $validated['time_slot']
                )) {
                    throw new \RuntimeException('Slot taken');
                }

                return Appointment::create([
                    ...$validated,
                    'created_by' => $user->id,
                ]);
            });
        } catch (\RuntimeException) {
            return response()->json(['message' => 'This time slot is no longer available. Please choose another.'], 422);
        } catch (\Illuminate\Database\QueryException $e) {
            return response()->json(['message' => 'This time slot is already booked. Please choose another.'], 422);
        }

        ActivityLogger::log('create', 'Appointment', "Booked appointment on {$appointment->appointment_date} at {$appointment->time_slot}", $request);

        return response()->json($appointment->load(['patient.gender', 'doctor', 'service']), 201);
    }

    public function update(Request $request, Appointment $appointment): JsonResponse
    {
        $validated = $request->validate([
            'patient_id' => ['required', 'exists:patients,id'],
            'doctor_id' => ['required', 'exists:dental_doctors,id'],
            'service_id' => ['required', 'exists:services,id'],
            'appointment_date' => ['required', 'date'],
            'time_slot' => ['required', 'string', 'size:5'],
            'notes' => ['nullable', 'string'],
            'status' => ['required', 'in:pending,confirmed,completed,cancelled,rejected'],
        ]);

        $slotChanged = $appointment->doctor_id != $validated['doctor_id']
            || $appointment->appointment_date->toDateString() != $validated['appointment_date']
            || $appointment->time_slot !== $validated['time_slot'];

        if ($slotChanged && ! in_array($validated['status'], ['cancelled', 'rejected'])) {
            if (! AppointmentSlotService::isSlotAvailable(
                (int) $validated['doctor_id'],
                $validated['appointment_date'],
                $validated['time_slot']
            )) {
                return response()->json(['message' => 'This time slot is not available.'], 422);
            }
        }

        $appointment->update($validated);

        ActivityLogger::log('update', 'Appointment', "Updated appointment #{$appointment->id}", $request);

        return response()->json($appointment->load(['patient.gender', 'doctor', 'service']));
    }

    public function destroy(Request $request, Appointment $appointment): JsonResponse
    {
        $appointment->update(['status' => 'cancelled']);

        ActivityLogger::log('cancel', 'Appointment', "Cancelled appointment #{$appointment->id}", $request);

        return response()->json(['message' => 'Appointment cancelled.']);
    }

    public function approve(Request $request, Appointment $appointment): JsonResponse
    {
        if ($appointment->status !== 'pending') {
            return response()->json(['message' => 'Only pending appointments can be approved.'], 422);
        }

        $appointment->update(['status' => 'confirmed']);

        $appointment->load('patient');
        ActivityLogger::log('approve', 'Appointment', "Approved appointment #{$appointment->id} for {$appointment->patient->full_name}", $request);

        return response()->json([
            'message' => 'Appointment approved.',
            'appointment' => $appointment->load(['patient.gender', 'doctor', 'service']),
        ]);
    }

    public function reject(Request $request, Appointment $appointment): JsonResponse
    {
        if ($appointment->status !== 'pending') {
            return response()->json(['message' => 'Only pending appointments can be rejected.'], 422);
        }

        $appointment->update(['status' => 'rejected']);

        $appointment->load('patient');
        ActivityLogger::log('reject', 'Appointment', "Rejected appointment #{$appointment->id} for {$appointment->patient->full_name}", $request);

        return response()->json([
            'message' => 'Appointment rejected.',
            'appointment' => $appointment->load(['patient.gender', 'doctor', 'service']),
        ]);
    }
}
