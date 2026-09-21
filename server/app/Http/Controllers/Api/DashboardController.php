<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\DentalDoctor;
use App\Models\Patient;
use App\Models\Payment;
use App\Models\PaymentOrder;
use App\Models\Service;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $date = $request->query('date', now()->toDateString());

        $appointmentsQuery = Appointment::active();
        if ($request->filled('date')) {
            $appointmentsQuery->where('appointment_date', $date);
        }

        $patients = Patient::with('gender')->get();

        $ageGroups = [
            '0-25' => ['male' => 0, 'female' => 0],
            '26-50' => ['male' => 0, 'female' => 0],
            '50+' => ['male' => 0, 'female' => 0],
        ];

        foreach ($patients as $patient) {
            $age = $patient->age;
            if ($age === null) {
                continue;
            }

            $gender = strtolower($patient->gender?->name ?? '');
            $key = $gender === 'male' ? 'male' : 'female';

            if ($age <= 25) {
                $ageGroups['0-25'][$key]++;
            } elseif ($age <= 50) {
                $ageGroups['26-50'][$key]++;
            } else {
                $ageGroups['50+'][$key]++;
            }
        }

        return response()->json([
            'stats' => [
                'total_clinics' => 1,
                'total_services' => Service::where('is_active', true)->count(),
                'total_appointments' => Appointment::active()->count(),
                'total_doctors' => DentalDoctor::where('is_active', true)->count(),
                'total_patients' => Patient::count(),
                'pending_payments' => PaymentOrder::pending()->count(),
                'pending_amount' => PaymentOrder::pending()->sum('total_amount'),
                'collections_today' => Payment::whereDate('paid_at', today())->sum('amount_paid'),
                'collections_month' => Payment::whereMonth('paid_at', now()->month)
                    ->whereYear('paid_at', now()->year)
                    ->sum('amount_paid'),
            ],
            'age_groups' => $ageGroups,
            'recent_appointments' => Appointment::with(['patient', 'doctor', 'service'])
                ->active()
                ->orderByDesc('appointment_date')
                ->orderBy('time_slot')
                ->limit(5)
                ->get(),
        ]);
    }
}
