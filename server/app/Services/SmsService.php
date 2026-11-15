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
        $ctx = self::appointmentContext($appointment);
        if (! $ctx) {
            return false;
        }

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
            'DentaGlow - Municipal Dental Clinic',
            'Municipality of Tapaz, Capiz',
            '',
            "Dear {$ctx['patient_name']},",
            '',
            'Your dental appointment has been APPROVED.',
            '',
            "Service: {$ctx['service']}",
            "Doctor: {$ctx['doctor']}",
            "Date: {$ctx['date']}",
            "Time: {$ctx['time']}",
            $queueLine,
            '',
            'Please arrive on time. Bring a valid ID if needed.',
            '',
            'Thank you.',
            '— Tapaz LGU Municipal Health Office',
        ]);

        return self::send($ctx['phone'], $message);
    }

    public static function sendAppointmentRejected(Appointment $appointment): bool
    {
        $ctx = self::appointmentContext($appointment);
        if (! $ctx) {
            return false;
        }

        $message = implode("\n", [
            'DentaGlow - Municipal Dental Clinic',
            'Municipality of Tapaz, Capiz',
            '',
            "Dear {$ctx['patient_name']},",
            '',
            'Your dental appointment request has been REJECTED.',
            '',
            "Service: {$ctx['service']}",
            "Doctor: {$ctx['doctor']}",
            "Date: {$ctx['date']}",
            "Time: {$ctx['time']}",
            '',
            'Please book another date/time or contact the clinic for assistance.',
            '',
            'Thank you.',
            '— Tapaz LGU Municipal Health Office',
        ]);

        return self::send($ctx['phone'], $message);
    }

    public static function sendAppointmentCancelled(Appointment $appointment, string $cancelledBy = 'clinic'): bool
    {
        $ctx = self::appointmentContext($appointment);
        if (! $ctx) {
            return false;
        }

        $who = $cancelledBy === 'patient'
            ? 'You have cancelled your dental appointment.'
            : 'Your dental appointment has been CANCELLED by the clinic.';

        $message = implode("\n", [
            'DentaGlow - Municipal Dental Clinic',
            'Municipality of Tapaz, Capiz',
            '',
            "Dear {$ctx['patient_name']},",
            '',
            $who,
            '',
            "Service: {$ctx['service']}",
            "Doctor: {$ctx['doctor']}",
            "Date: {$ctx['date']}",
            "Time: {$ctx['time']}",
            '',
            'You may book a new appointment through the patient portal if needed.',
            '',
            'Thank you.',
            '— Tapaz LGU Municipal Health Office',
        ]);

        return self::send($ctx['phone'], $message);
    }

    /**
     * @return array{phone: string, patient_name: string, doctor: string, service: string, date: string, time: string}|null
     */
    private static function appointmentContext(Appointment $appointment): ?array
    {
        $appointment->loadMissing(['patient', 'doctor', 'service']);

        $phone = $appointment->patient?->phone;
        if (! $phone) {
            return null;
        }

        $patientName = trim(($appointment->patient->full_name ?: trim(
            ($appointment->patient->first_name ?? '').' '.($appointment->patient->last_name ?? '')
        )));
        if ($patientName === '') {
            $patientName = 'Patient';
        }

        $timeSlot = $appointment->time_slot;
        try {
            $time = Carbon::createFromFormat('H:i', substr((string) $timeSlot, 0, 5))->format('g:i A');
        } catch (\Throwable) {
            $time = (string) $timeSlot;
        }

        return [
            'phone' => $phone,
            'patient_name' => $patientName,
            'doctor' => $appointment->doctor?->full_name ?? 'Assigned dentist',
            'service' => $appointment->service?->name ?? 'Dental service',
            'date' => Carbon::parse($appointment->appointment_date)->format('F j, Y'),
            'time' => $time,
        ];
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
