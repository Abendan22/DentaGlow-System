<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\PaymentOrder;
use App\Services\ActivityLogger;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TreasurerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = PaymentOrder::with(['patient', 'items', 'payment.receiver'])
            ->orderByDesc('created_at');

        if ($status = $request->query('status', 'pending')) {
            $query->where('status', $status);
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('reference_no', 'like', "%{$search}%")
                    ->orWhere('queue_number', 'like', "%{$search}%")
                    ->orWhereHas('patient', function ($p) use ($search) {
                        $p->where('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%");
                    });
            });
        }

        return response()->json($query->get());
    }

    public function stats(Request $request): JsonResponse
    {
        $today = today();

        return response()->json([
            'pending_count' => PaymentOrder::pending()->count(),
            'pending_amount' => PaymentOrder::pending()->sum('total_amount'),
            'paid_today_count' => PaymentOrder::paid()->whereDate('updated_at', $today)->count(),
            'collections_today' => Payment::whereDate('paid_at', $today)->sum('amount_paid'),
            'collections_month' => Payment::whereMonth('paid_at', $today->month)
                ->whereYear('paid_at', $today->year)
                ->sum('amount_paid'),
        ]);
    }

    public function report(Request $request): JsonResponse
    {
        [$from, $to, $label] = $this->resolveReportPeriod($request);

        $payments = Payment::query()
            ->with(['paymentOrder.patient', 'paymentOrder.items', 'receiver'])
            ->whereBetween('paid_at', [$from.' 00:00:00', $to.' 23:59:59'])
            ->orderBy('paid_at')
            ->get();

        $totalCollections = $payments->sum(fn (Payment $p) => (float) $p->amount_paid);
        $pendingAmount = PaymentOrder::pending()
            ->whereBetween('created_at', [$from.' 00:00:00', $to.' 23:59:59'])
            ->sum('total_amount');
        $pendingCount = PaymentOrder::pending()
            ->whereBetween('created_at', [$from.' 00:00:00', $to.' 23:59:59'])
            ->count();

        $byMethod = $payments
            ->groupBy(fn (Payment $p) => $p->payment_method ?: 'cash')
            ->map(fn ($group, $method) => [
                'method' => $method,
                'count' => $group->count(),
                'amount' => $group->sum(fn (Payment $p) => (float) $p->amount_paid),
            ])
            ->values();

        return response()->json([
            'period' => [
                'from' => $from,
                'to' => $to,
                'label' => $label,
            ],
            'facility' => [
                'name' => 'Municipal Dental Clinic',
                'office' => 'Municipal Treasurer\'s Office',
                'municipality' => 'Tapaz',
                'province' => 'Capiz',
            ],
            'summary' => [
                'total_payments' => $payments->count(),
                'total_collections' => $totalCollections,
                'pending_count' => $pendingCount,
                'pending_amount' => (float) $pendingAmount,
            ],
            'by_method' => $byMethod,
            'payments' => $payments->map(function (Payment $payment) {
                $order = $payment->paymentOrder;

                return [
                    'or_number' => $payment->or_number,
                    'paid_at' => $payment->paid_at?->toIso8601String(),
                    'amount_paid' => (float) $payment->amount_paid,
                    'payment_method' => $payment->payment_method ?: 'cash',
                    'reference_no' => $order?->reference_no,
                    'queue_number' => $order?->queue_number,
                    'patient_name' => $order?->patient?->full_name,
                    'barangay' => $order?->patient?->barangay,
                    'items' => $order?->items?->map(fn ($item) => [
                        'name' => $item->item_name,
                        'quantity' => $item->quantity,
                        'subtotal' => (float) $item->subtotal,
                    ])->values() ?? [],
                    'received_by' => $payment->receiver?->name,
                    'notes' => $payment->notes,
                ];
            })->values(),
            'generated_at' => now()->toIso8601String(),
        ]);
    }

    private function resolveReportPeriod(Request $request): array
    {
        $type = $request->query('type', 'monthly');
        $year = (int) $request->query('year', now()->year);

        if ($type === 'today') {
            $day = Carbon::today();

            return [$day->toDateString(), $day->toDateString(), $day->format('F d, Y')];
        }

        if ($type === 'custom') {
            $from = $request->query('from', now()->startOfMonth()->toDateString());
            $to = $request->query('to', now()->toDateString());
            $label = Carbon::parse($from)->format('M d, Y').' – '.Carbon::parse($to)->format('M d, Y');

            return [$from, $to, $label];
        }

        $month = max(1, min(12, (int) $request->query('month', now()->month)));
        $from = Carbon::create($year, $month, 1)->startOfMonth();
        $to = $from->copy()->endOfMonth();

        return [$from->toDateString(), $to->toDateString(), $from->format('F Y')];
    }

    public function recordPayment(Request $request, PaymentOrder $paymentOrder): JsonResponse
    {
        if ($paymentOrder->status !== 'pending') {
            return response()->json(['message' => 'This bill is already paid or cancelled.'], 422);
        }

        $validated = $request->validate([
            'payment_method' => ['nullable', 'string', 'max:30'],
            'notes' => ['nullable', 'string'],
        ]);

        $payment = DB::transaction(function () use ($paymentOrder, $validated, $request) {
            $payment = Payment::create([
                'payment_order_id' => $paymentOrder->id,
                'or_number' => Payment::generateOrNumber(),
                'amount_paid' => $paymentOrder->total_amount,
                'payment_method' => $validated['payment_method'] ?? 'cash',
                'paid_at' => now(),
                'received_by' => $request->user()->id,
                'notes' => $validated['notes'] ?? null,
            ]);

            $paymentOrder->update(['status' => 'paid']);

            return $payment;
        });

        ActivityLogger::log(
            'payment',
            'Treasurer',
            "Recorded payment OR#{$payment->or_number} for {$paymentOrder->reference_no}",
            $request
        );

        return response()->json([
            'message' => 'Payment recorded successfully.',
            'payment' => $payment->load('receiver'),
            'order' => $paymentOrder->load(['patient', 'items', 'payment']),
        ]);
    }
}
