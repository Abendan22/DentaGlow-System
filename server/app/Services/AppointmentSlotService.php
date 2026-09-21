<?php

namespace App\Services;

use App\Models\Appointment;
use Carbon\Carbon;

class AppointmentSlotService
{
    public const CLINIC_OPEN = '08:00';

    public const CLINIC_CLOSE = '17:00';

    public const SLOT_INTERVAL_MINUTES = 30;

    public static function allSlots(): array
    {
        $slots = [];
        $current = Carbon::createFromFormat('H:i', self::CLINIC_OPEN);
        $close = Carbon::createFromFormat('H:i', self::CLINIC_CLOSE);

        while ($current->lt($close)) {
            $slots[] = $current->format('H:i');
            $current->addMinutes(self::SLOT_INTERVAL_MINUTES);
        }

        return $slots;
    }

    public static function getAvailableSlots(int $doctorId, string $date): array
    {
        $booked = Appointment::query()
            ->where('doctor_id', $doctorId)
            ->where('appointment_date', $date)
            ->active()
            ->pluck('time_slot')
            ->toArray();

        return array_values(array_diff(self::allSlots(), $booked));
    }

    public static function isSlotAvailable(int $doctorId, string $date, string $timeSlot, ?int $ignoreAppointmentId = null): bool
    {
        if (! in_array($timeSlot, self::allSlots(), true)) {
            return false;
        }

        $query = Appointment::query()
            ->where('doctor_id', $doctorId)
            ->where('appointment_date', $date)
            ->where('time_slot', $timeSlot)
            ->active();

        if ($ignoreAppointmentId) {
            $query->where('id', '!=', $ignoreAppointmentId);
        }

        return ! $query->exists();
    }
}
