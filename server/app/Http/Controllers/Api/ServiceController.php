<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Service;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ServiceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Service::query()->orderBy('name');

        if ($request->boolean('active_only')) {
            $query->where('is_active', true);
        }

        if ($search = $request->query('search')) {
            $query->where('name', 'like', "%{$search}%");
        }

        return response()->json($query->get());
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'description' => ['nullable', 'string'],
            'price' => ['required', 'numeric', 'min:0'],
            'duration_minutes' => ['required', 'integer', 'min:15', 'max:240'],
            'is_active' => ['boolean'],
        ]);

        $service = Service::create($validated);

        ActivityLogger::log('create', 'Service', "Created service: {$service->name}", $request);

        return response()->json($service, 201);
    }

    public function update(Request $request, Service $service): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'description' => ['nullable', 'string'],
            'price' => ['required', 'numeric', 'min:0'],
            'duration_minutes' => ['required', 'integer', 'min:15', 'max:240'],
            'is_active' => ['boolean'],
        ]);

        $service->update($validated);

        ActivityLogger::log('update', 'Service', "Updated service: {$service->name}", $request);

        return response()->json($service);
    }

    public function destroy(Request $request, Service $service): JsonResponse
    {
        if ($service->appointments()->active()->exists()) {
            return response()->json(['message' => 'Cannot delete service with active appointments.'], 422);
        }

        $name = $service->name;
        $service->delete();

        ActivityLogger::log('delete', 'Service', "Deleted service: {$name}", $request);

        return response()->json(['message' => 'Service deleted.']);
    }
}
