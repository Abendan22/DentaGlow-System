<?php

namespace App\Services;

use App\Models\ActivityLog;
use Illuminate\Http\Request;

class ActivityLogger
{
    public static function log(string $action, string $module, string $description, ?Request $request = null): void
    {
        ActivityLog::create([
            'user_id' => auth()->id(),
            'action' => $action,
            'module' => $module,
            'description' => $description,
            'ip_address' => $request?->ip(),
        ]);
    }
}
