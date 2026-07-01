<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Patient;
use App\Services\ActivityLogger;
use App\Support\TapazBarangays;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PatientController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Patient::with('gender')->orderBy('last_name');

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('barangay', 'like', "%{$search}%")
                    ->orWhere('address', 'like', "%{$search}%");
            });
        }

        if ($barangay = $request->query('barangay')) {
            $query->where('barangay', $barangay);
        }

        return response()->json($query->get());
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'gender_id' => ['required', 'exists:genders,id'],
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'birth_date' => ['required', 'date', 'before:today'],
            'phone' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email'],
            'barangay' => ['required', 'string', TapazBarangays::rule()],
            'address' => ['nullable', 'string', 'max:255'],
            'photo' => ['nullable', 'image', 'mimes:jpeg,jpg,png,webp', 'max:2048'],
        ]);

        if ($request->hasFile('photo')) {
            $validated['photo'] = $request->file('photo')->store('patients', 'public');
        }

        $patient = Patient::create($validated);

        ActivityLogger::log('create', 'Patient', "Created patient: {$patient->full_name}", $request);

        return response()->json($patient->load('gender'), 201);
    }

    public function update(Request $request, Patient $patient): JsonResponse
    {
        $validated = $request->validate([
            'gender_id' => ['required', 'exists:genders,id'],
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'birth_date' => ['required', 'date', 'before:today'],
            'phone' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email'],
            'barangay' => ['required', 'string', TapazBarangays::rule()],
            'address' => ['nullable', 'string', 'max:255'],
            'photo' => ['nullable', 'image', 'mimes:jpeg,jpg,png,webp', 'max:2048'],
            'remove_photo' => ['nullable', 'boolean'],
        ]);

        if ($request->boolean('remove_photo')) {
            $patient->deletePhotoFile();
            $validated['photo'] = null;
        } elseif ($request->hasFile('photo')) {
            $patient->deletePhotoFile();
            $validated['photo'] = $request->file('photo')->store('patients', 'public');
        } else {
            unset($validated['photo']);
        }

        unset($validated['remove_photo']);

        $patient->update($validated);

        ActivityLogger::log('update', 'Patient', "Updated patient: {$patient->full_name}", $request);

        return response()->json($patient->load('gender'));
    }

    public function destroy(Request $request, Patient $patient): JsonResponse
    {
        if ($patient->appointments()->active()->exists()) {
            return response()->json([
                'message' => 'Cannot delete patient with active appointments. Please cancel them first.',
            ], 422);
        }

        $name = $patient->full_name;

        try {
            DB::transaction(function () use ($patient) {
                $patient->appointments()->delete();
                $patient->deletePhotoFile();
                $patient->delete();
            });
        } catch (\Illuminate\Database\QueryException) {
            return response()->json([
                'message' => 'Cannot delete patient. Related records still exist.',
            ], 422);
        }

        ActivityLogger::log('delete', 'Patient', "Deleted patient: {$name}", $request);

        return response()->json(['message' => 'Patient deleted.']);
    }
}
