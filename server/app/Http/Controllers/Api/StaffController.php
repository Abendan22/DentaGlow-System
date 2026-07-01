<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Staff;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StaffController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Staff::query()->orderBy('last_name');

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('position', 'like', "%{$search}%");
            });
        }

        return response()->json($query->get());
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'position' => ['required', 'string', 'max:100'],
            'phone' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email'],
            'is_active' => ['boolean'],
        ]);

        $staff = Staff::create($validated);

        ActivityLogger::log('create', 'Staff', "Created staff: {$staff->full_name}", $request);

        return response()->json($staff, 201);
    }

    public function update(Request $request, Staff $staff): JsonResponse
    {
        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'position' => ['required', 'string', 'max:100'],
            'phone' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email'],
            'is_active' => ['boolean'],
        ]);

        $staff->update($validated);

        ActivityLogger::log('update', 'Staff', "Updated staff: {$staff->full_name}", $request);

        return response()->json($staff);
    }

    public function destroy(Request $request, Staff $staff): JsonResponse
    {
        $name = $staff->full_name;
        $staff->delete();

        ActivityLogger::log('delete', 'Staff', "Deleted staff: {$name}", $request);

        return response()->json(['message' => 'Staff deleted.']);
    }
}
