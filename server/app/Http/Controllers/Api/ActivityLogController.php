<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ActivityLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = ActivityLog::with('user')->orderByDesc('created_at');

        if ($module = $request->query('module')) {
            $query->where('module', $module);
        }

        if ($search = $request->query('search')) {
            $query->where('description', 'like', "%{$search}%");
        }

        return response()->json($query->paginate(20));
    }
}
