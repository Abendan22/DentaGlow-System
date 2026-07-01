<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Gender;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GenderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Gender::query()->orderBy('name');

        if ($search = $request->query('search')) {
            $query->where('name', 'like', "%{$search}%");
        }

        return response()->json($query->get());
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:50', 'unique:genders,name'],
        ]);

        $gender = Gender::create($validated);

        ActivityLogger::log('create', 'Gender', "Created gender: {$gender->name}", $request);

        return response()->json($gender, 201);
    }

    public function update(Request $request, Gender $gender): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:50', 'unique:genders,name,'.$gender->id],
        ]);

        $gender->update($validated);

        ActivityLogger::log('update', 'Gender', "Updated gender: {$gender->name}", $request);

        return response()->json($gender);
    }

    public function destroy(Request $request, Gender $gender): JsonResponse
    {
        if ($gender->patients()->exists()) {
            return response()->json(['message' => 'Cannot delete gender with linked patients.'], 422);
        }

        $name = $gender->name;
        $gender->delete();

        ActivityLogger::log('delete', 'Gender', "Deleted gender: {$name}", $request);

        return response()->json(['message' => 'Gender deleted.']);
    }
}
