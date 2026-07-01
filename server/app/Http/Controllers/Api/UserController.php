<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Password;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = User::query()
            ->whereIn('role', ['admin', 'staff', 'doctor', 'treasurer'])
            ->orderBy('name');

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        return response()->json($query->get());
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', Password::defaults()],
            'role' => ['required', 'in:admin,staff,doctor,treasurer'],
            'phone' => ['nullable', 'string', 'max:20'],
        ]);

        $user = User::create($validated);

        ActivityLogger::log('create', 'User', "Created user: {$user->email}", $request);

        return response()->json($user, 201);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        if ($user->role === 'patient') {
            return response()->json(['message' => 'Patient accounts are managed via Patient Record.'], 422);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email,'.$user->id],
            'password' => ['nullable', Password::defaults()],
            'role' => ['required', 'in:admin,staff,doctor,treasurer'],
            'phone' => ['nullable', 'string', 'max:20'],
        ]);

        if (empty($validated['password'])) {
            unset($validated['password']);
        }

        $user->update($validated);

        ActivityLogger::log('update', 'User', "Updated user: {$user->email}", $request);

        return response()->json($user);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        if ($user->role === 'patient') {
            return response()->json(['message' => 'Patient accounts are managed via Patient Record.'], 422);
        }

        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'You cannot delete your own account.'], 422);
        }

        $email = $user->email;
        $user->delete();

        ActivityLogger::log('delete', 'User', "Deleted user: {$email}", $request);

        return response()->json(['message' => 'User deleted.']);
    }
}
