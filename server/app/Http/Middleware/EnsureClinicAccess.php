<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureClinicAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ! $user->canAccessAdminPanel()) {
            return response()->json(['message' => 'Unauthorized. Clinic access required.'], 403);
        }

        return $next($request);
    }
}
