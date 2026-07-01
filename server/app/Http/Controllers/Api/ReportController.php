<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Patient;
use App\Models\Payment;
use App\Models\PaymentOrder;
use App\Models\PaymentOrderItem;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        [$from, $to, $type, $label] = $this->resolvePeriod($request);

        $appointmentBase = Appointment::query()->whereBetween('appointment_date', [$from, $to]);
        $paymentBase = Payment::query()->whereBetween('paid_at', [$from.' 00:00:00', $to.' 23:59:59']);

        $appointmentsByStatus = (clone $appointmentBase)
            ->select('status', DB::raw('count(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status');

        $commonProcedures = (clone $appointmentBase)
            ->whereNotIn('status', ['cancelled', 'rejected'])
            ->join('services', 'appointments.service_id', '=', 'services.id')
            ->select('services.name', DB::raw('count(*) as total'))
            ->groupBy('services.name')
            ->orderByDesc('total')
            ->limit(10)
            ->get();

        $commonBillableItems = PaymentOrderItem::query()
            ->join('payment_orders', 'payment_order_items.payment_order_id', '=', 'payment_orders.id')
            ->join('payments', 'payments.payment_order_id', '=', 'payment_orders.id')
            ->whereBetween('payments.paid_at', [$from.' 00:00:00', $to.' 23:59:59'])
            ->select(
                'payment_order_items.item_name as name',
                DB::raw('sum(payment_order_items.quantity) as total'),
                DB::raw('sum(payment_order_items.subtotal) as amount')
            )
            ->groupBy('payment_order_items.item_name')
            ->orderByDesc('total')
            ->limit(10)
            ->get();

        $servedPatientIds = (clone $appointmentBase)
            ->whereIn('status', ['confirmed', 'completed'])
            ->distinct()
            ->pluck('patient_id');

        $patientsByGender = Patient::query()
            ->whereIn('id', $servedPatientIds)
            ->join('genders', 'patients.gender_id', '=', 'genders.id')
            ->select('genders.name', DB::raw('count(*) as total'))
            ->groupBy('genders.name')
            ->pluck('total', 'name');

        $patientsByBarangay = Patient::query()
            ->whereIn('id', $servedPatientIds)
            ->whereNotNull('barangay')
            ->select('barangay', DB::raw('count(*) as total'))
            ->groupBy('barangay')
            ->orderByDesc('total')
            ->limit(10)
            ->get();

        $totalCollections = (clone $paymentBase)->sum('amount_paid');
        $pendingCollections = PaymentOrder::pending()
            ->whereBetween('created_at', [$from.' 00:00:00', $to.' 23:59:59'])
            ->sum('total_amount');

        $estimatedRevenue = (clone $appointmentBase)
            ->whereIn('status', ['confirmed', 'completed'])
            ->join('services', 'appointments.service_id', '=', 'services.id')
            ->sum('services.price');

        $response = [
            'report_type' => $type,
            'period' => [
                'from' => $from,
                'to' => $to,
                'label' => $label,
            ],
            'facility' => [
                'name' => 'Municipal Dental Clinic',
                'office' => 'Municipal Health Office (MHO)',
                'municipality' => 'Tapaz',
                'province' => 'Capiz',
                'reporting_to' => 'Department of Health (DOH)',
            ],
            'total_registered_patients' => Patient::count(),
            'new_patients' => Patient::whereBetween('created_at', [$from.' 00:00:00', $to.' 23:59:59'])->count(),
            'patients_served' => $servedPatientIds->count(),
            'total_appointments' => (clone $appointmentBase)->count(),
            'completed_appointments' => (clone $appointmentBase)->where('status', 'completed')->count(),
            'appointments_by_status' => $appointmentsByStatus,
            'common_procedures' => $commonProcedures,
            'common_billable_items' => $commonBillableItems,
            'total_collections' => $totalCollections,
            'pending_collections' => $pendingCollections,
            'estimated_service_revenue' => $estimatedRevenue,
            'patients_by_gender' => [
                'male' => $patientsByGender['Male'] ?? 0,
                'female' => $patientsByGender['Female'] ?? 0,
            ],
            'patients_by_barangay' => $patientsByBarangay,
            'generated_at' => now()->toIso8601String(),
        ];

        if ($type === 'quarterly') {
            $response['monthly_breakdown'] = $this->monthlyBreakdown($from, $to);
        }

        return response()->json($response);
    }

    private function resolvePeriod(Request $request): array
    {
        $type = $request->query('type', 'monthly');
        $year = (int) $request->query('year', now()->year);

        if ($type === 'quarterly') {
            $quarter = max(1, min(4, (int) $request->query('quarter', now()->quarter)));
            $startMonth = ($quarter - 1) * 3 + 1;
            $from = Carbon::create($year, $startMonth, 1)->startOfMonth();
            $to = $from->copy()->addMonths(2)->endOfMonth();
            $label = "Q{$quarter} {$year} (".$from->format('M').' – '.$to->format('M Y').')';

            return [$from->toDateString(), $to->toDateString(), 'quarterly', $label];
        }

        if ($type === 'custom') {
            $from = $request->query('from', now()->startOfMonth()->toDateString());
            $to = $request->query('to', now()->toDateString());
            $label = Carbon::parse($from)->format('M d, Y').' – '.Carbon::parse($to)->format('M d, Y');

            return [$from, $to, 'custom', $label];
        }

        $month = max(1, min(12, (int) $request->query('month', now()->month)));
        $from = Carbon::create($year, $month, 1)->startOfMonth();
        $to = $from->copy()->endOfMonth();
        $label = $from->format('F Y');

        return [$from->toDateString(), $to->toDateString(), 'monthly', $label];
    }

    private function monthlyBreakdown(string $from, string $to): array
    {
        $breakdown = [];
        $cursor = Carbon::parse($from)->startOfMonth();
        $end = Carbon::parse($to)->endOfMonth();

        while ($cursor <= $end) {
            $monthStart = $cursor->copy()->startOfMonth()->toDateString();
            $monthEnd = $cursor->copy()->endOfMonth()->toDateString();

            $breakdown[] = [
                'month' => $cursor->format('F Y'),
                'patients' => Appointment::query()
                    ->whereBetween('appointment_date', [$monthStart, $monthEnd])
                    ->whereIn('status', ['confirmed', 'completed'])
                    ->distinct()
                    ->count('patient_id'),
                'appointments' => Appointment::whereBetween('appointment_date', [$monthStart, $monthEnd])->count(),
                'collections' => Payment::whereBetween('paid_at', [$monthStart.' 00:00:00', $monthEnd.' 23:59:59'])->sum('amount_paid'),
            ];

            $cursor->addMonth();
        }

        return $breakdown;
    }
}
