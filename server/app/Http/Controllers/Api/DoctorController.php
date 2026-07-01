<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DentalDoctor;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DoctorController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = DentalDoctor::query()->orderBy('last_name');

        if ($request->boolean('active_only')) {
            $query->where('is_active', true);
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('specialization', 'like', "%{$search}%");
            });
        }

        return response()->json($query->get());
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'specialization' => ['required', 'string', 'max:150'],
            'phone' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email'],
            'is_active' => ['boolean'],
        ]);

        $doctor = DentalDoctor::create($validated);

        ActivityLogger::log('create', 'Doctor', "Created doctor: {$doctor->full_name}", $request);

        return response()->json($doctor, 201);
    }

    public function update(Request $request, DentalDoctor $doctor): JsonResponse
    {
        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'specialization' => ['required', 'string', 'max:150'],
            'phone' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email'],
            'is_active' => ['boolean'],
        ]);

        $doctor->update($validated);

        ActivityLogger::log('update', 'Doctor', "Updated doctor: {$doctor->full_name}", $request);

        return response()->json($doctor);
    }

    public function destroy(Request $request, DentalDoctor $doctor): JsonResponse
    {
        if ($doctor->appointments()->active()->exists()) {
            return response()->json(['message' => 'Cannot delete doctor with active appointments.'], 422);
        }

        $name = $doctor->full_name;
        $doctor->delete();

        ActivityLogger::log('delete', 'Doctor', "Deleted doctor: {$name}", $request);

        return response()->json(['message' => 'Doctor deleted.']);
    }
}
