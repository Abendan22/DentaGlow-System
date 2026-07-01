<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTreasurerAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ! $user->canAccessTreasurer()) {
            return response()->json(['message' => 'Unauthorized. Treasurer access required.'], 403);
        }

        return $next($request);
    }
}
