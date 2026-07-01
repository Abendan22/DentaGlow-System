<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BillableItem;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BillableItemController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = BillableItem::query()->orderBy('name');

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
            'is_active' => ['boolean'],
        ]);

        $item = BillableItem::create($validated);

        ActivityLogger::log('create', 'BillableItem', "Created item: {$item->name}", $request);

        return response()->json($item, 201);
    }

    public function update(Request $request, BillableItem $billableItem): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'description' => ['nullable', 'string'],
            'price' => ['required', 'numeric', 'min:0'],
            'is_active' => ['boolean'],
        ]);

        $billableItem->update($validated);

        ActivityLogger::log('update', 'BillableItem', "Updated item: {$billableItem->name}", $request);

        return response()->json($billableItem);
    }

    public function destroy(Request $request, BillableItem $billableItem): JsonResponse
    {
        if ($billableItem->orderItems()->exists()) {
            return response()->json(['message' => 'Cannot delete item used in billing records.'], 422);
        }

        $name = $billableItem->name;
        $billableItem->delete();

        ActivityLogger::log('delete', 'BillableItem', "Deleted item: {$name}", $request);

        return response()->json(['message' => 'Item deleted.']);
    }
}
