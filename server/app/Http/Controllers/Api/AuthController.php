<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Patient;
use App\Models\User;
use App\Services\ActivityLogger;
use App\Services\SmsService;
use App\Support\TapazBarangays;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    private const OTP_EXPIRY_MINUTES = 15;
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'confirmed', Password::defaults()],
            'phone' => ['nullable', 'string', 'max:20'],
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'birth_date' => ['required', 'date', 'before:today'],
            'gender_id' => ['required', 'exists:genders,id'],
            'barangay' => ['required', 'string', TapazBarangays::rule()],
            'address' => ['nullable', 'string', 'max:255'],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
            'phone' => $validated['phone'] ?? null,
            'role' => 'patient',
        ]);

        Patient::create([
            'user_id' => $user->id,
            'gender_id' => $validated['gender_id'],
            'first_name' => $validated['first_name'],
            'last_name' => $validated['last_name'],
            'birth_date' => $validated['birth_date'],
            'phone' => $validated['phone'] ?? null,
            'email' => $validated['email'],
            'barangay' => $validated['barangay'],
            'address' => $validated['address'] ?? null,
        ]);

        $token = $user->createToken('auth-token')->plainTextToken;

        ActivityLogger::log('register', 'Auth', "New patient registered: {$user->email}", $request);

        return response()->json([
            'user' => $user->load('patient.gender'),
            'token' => $token,
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            return response()->json(['message' => 'Invalid credentials.'], 401);
        }

        $token = $user->createToken('auth-token')->plainTextToken;

        ActivityLogger::log('login', 'Auth', "User logged in: {$user->email}", $request);

        $user->load('patient.gender');

        return response()->json([
            'user' => $user,
            'token' => $token,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully.']);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $request->user()->load('patient.gender'),
        ]);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $user = User::with('patient')->where('email', $validated['email'])->first();

        // Same response whether user exists or not (avoid email enumeration)
        $generic = [
            'message' => 'If an account with that email exists and has a phone number, an OTP has been sent via SMS.',
        ];

        if (! $user) {
            return response()->json($generic);
        }

        $phone = $user->phone ?: $user->patient?->phone;
        if (! $phone) {
            return response()->json([
                'message' => 'No phone number on file for this account. Please contact the clinic to reset your password.',
            ], 422);
        }

        $otp = (string) random_int(100000, 999999);

        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $user->email],
            [
                'token' => Hash::make($otp),
                'created_at' => now(),
            ]
        );

        $message = implode("\n", [
            'DentaGlow - Municipal Dental Clinic',
            '',
            "Your password reset code is: {$otp}",
            '',
            'This code expires in '.self::OTP_EXPIRY_MINUTES.' minutes.',
            'If you did not request this, ignore this message.',
        ]);

        $smsSent = SmsService::send($phone, $message);

        if (! $smsSent) {
            Log::info('Password reset OTP (SMS not sent).', [
                'email' => $user->email,
                'otp' => $otp,
            ]);
        }

        ActivityLogger::log('forgot_password', 'Auth', "Password reset OTP requested: {$user->email}", $request);

        $response = $generic;
        $response['sms_sent'] = $smsSent;
        $response['masked_phone'] = $this->maskPhone($phone);

        // Local testing helper when SMS is off
        if (app()->environment('local') && ! $smsSent) {
            $response['debug_otp'] = $otp;
            $response['message'] = 'SMS is disabled/failed. Use the debug OTP shown (local only).';
        }

        return response()->json($response);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'otp' => ['required', 'string', 'size:6'],
            'password' => ['required', 'confirmed', Password::defaults()],
        ]);

        $record = DB::table('password_reset_tokens')
            ->where('email', $validated['email'])
            ->first();

        if (! $record) {
            return response()->json(['message' => 'Invalid or expired reset code.'], 422);
        }

        $createdAt = $record->created_at ? \Carbon\Carbon::parse($record->created_at) : null;
        if (! $createdAt || $createdAt->diffInMinutes(now()) > self::OTP_EXPIRY_MINUTES) {
            DB::table('password_reset_tokens')->where('email', $validated['email'])->delete();

            return response()->json(['message' => 'Reset code has expired. Please request a new one.'], 422);
        }

        if (! Hash::check($validated['otp'], $record->token)) {
            return response()->json(['message' => 'Invalid reset code.'], 422);
        }

        $user = User::where('email', $validated['email'])->first();
        if (! $user) {
            return response()->json(['message' => 'Account not found.'], 404);
        }

        $user->update(['password' => $validated['password']]);

        DB::table('password_reset_tokens')->where('email', $validated['email'])->delete();
        $user->tokens()->delete();

        ActivityLogger::log('reset_password', 'Auth', "Password reset completed: {$user->email}", $request);

        return response()->json([
            'message' => 'Password updated successfully. You can now sign in.',
        ]);
    }

    private function maskPhone(string $phone): string
    {
        $digits = preg_replace('/\D+/', '', $phone) ?? '';
        if (strlen($digits) < 4) {
            return '****';
        }

        return str_repeat('*', max(0, strlen($digits) - 4)).substr($digits, -4);
    }
}
