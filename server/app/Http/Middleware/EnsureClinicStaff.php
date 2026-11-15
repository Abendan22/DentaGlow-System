<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureClinicStaff
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ! $user->isClinicStaff()) {
            return response()->json(['message' => 'Unauthorized. Clinic staff access required.'], 403);
        }

        return $next($request);
    }
}
