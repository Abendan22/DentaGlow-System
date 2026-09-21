<?php

namespace App\Services;

use App\Models\Appointment;
use Carbon\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SmsService
{
    public static function enabled(): bool
    {
        return (bool) config('sms.enabled') && filled(config('sms.philsms.api_token'));
    }

    public static function send(string $number, string $message): bool
    {
        if (! self::enabled()) {
            Log::info('SMS skipped (disabled or missing PhilSMS token).', [
                'number' => $number,
            ]);

            return false;
        }

        $normalized = self::normalizePhMobile63($number);
        if (! $normalized) {
            Log::warning('SMS skipped: invalid mobile number.', ['number' => $number]);

            return false;
        }

        $message = trim($message);
        $senderId = substr((string) config('sms.philsms.sender_id', 'TapazClinic'), 0, 11);

        try {
            $response = Http::withToken(trim((string) config('sms.philsms.api_token')))
                ->acceptJson()
                ->asJson()
                ->timeout(15)
                ->post((string) config('sms.philsms.endpoint'), [
                    'recipient' => $normalized,
                    'sender_id' => $senderId,
                    'type' => 'plain',
                    'message' => $message,
                ]);

            $body = $response->json();

            if (! $response->successful()) {
                Log::error('PhilSMS failed.', [
                    'status' => $response->status(),
                    'body' => $body ?: $response->body(),
                    'number' => $normalized,
                ]);

                return false;
            }

            // Some PhilSMS responses return HTTP 200 with status error in JSON
            if (is_array($body) && isset($body['status']) && strtolower((string) $body['status']) === 'error') {
                Log::error('PhilSMS API error.', [
                    'body' => $body,
                    'number' => $normalized,
                ]);

                return false;
            }

            Log::info('PhilSMS sent.', [
                'number' => $normalized,
                'response' => $body,
            ]);

            return true;
        } catch (\Throwable $e) {
            Log::error('PhilSMS exception: '.$e->getMessage(), [
                'number' => $normalized,
            ]);

            return false;
        }
    }

    public static function sendAppointmentApproved(Appointment $appointment): bool
    {
        $appointment->loadMissing(['patient', 'doctor', 'service']);

        $phone = $appointment->patient?->phone;
        if (! $phone) {
            return false;
        }

        $patientName = trim(($appointment->patient->full_name ?: trim(
            ($appointment->patient->first_name ?? '').' '.($appointment->patient->last_name ?? '')
        )));
        if ($patientName === '') {
            $patientName = 'Patient';
        }
        $doctor = $appointment->doctor?->full_name ?? 'Assigned dentist';
        $service = $appointment->service?->name ?? 'Dental service';
        $date = Carbon::parse($appointment->appointment_date)->format('F j, Y');
        $time = Carbon::createFromFormat('H:i', $appointment->time_slot)->format('g:i A');
        $queue = $appointment->getAttribute('queue_position');
        $wait = (int) ($appointment->getAttribute('estimated_wait_minutes') ?? 0);

        if ($queue) {
            $queueLine = $wait > 0
                ? "Queue: #{$queue} (Est. wait ~{$wait} min)"
                : "Queue: #{$queue} — You are next";
        } else {
            $queueLine = 'Queue: To be assigned upon arrival';
        }

        $message = implode("\n", [
            'Municipality of Tapaz, Capiz',
            'Municipal Dental Clinic',
            '',
            "Dear {$patientName},",
            '',
            'Your dental appointment has been APPROVED.',
            '',
            "Service: {$service}",
            "Doctor: {$doctor}",
            "Date: {$date}",
            "Time: {$time}",
            $queueLine,
            '',
            'Please arrive on time. Bring a valid ID if needed.',
            '',
            'Thank you.',
            '— Tapaz LGU Municipal Health Office',
        ]);

        return self::send($phone, $message);
    }

    /** PhilSMS expects 63XXXXXXXXXX format. */
    public static function normalizePhMobile63(string $number): ?string
    {
        $digits = preg_replace('/\D+/', '', $number) ?? '';

        if (str_starts_with($digits, '63') && strlen($digits) === 12) {
            return $digits;
        }

        if (str_starts_with($digits, '0') && strlen($digits) === 11) {
            return '63'.substr($digits, 1);
        }

        if (strlen($digits) === 10 && str_starts_with($digits, '9')) {
            return '63'.$digits;
        }

        return null;
    }
}
