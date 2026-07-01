<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\PaymentOrder;
use App\Services\ActivityLogger;
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

    public function recordPayment(Request $request, PaymentOrder $paymentOrder): JsonResponse
    {
        if ($paymentOrder->status !== 'pending') {
            return response()->json(['message' => 'This bill is already paid or cancelled.'], 422);
        }

        $validated = $request->validate([
            'or_number' => ['required', 'string', 'max:50'],
            'payment_method' => ['nullable', 'string', 'max:30'],
            'notes' => ['nullable', 'string'],
        ]);

        $payment = DB::transaction(function () use ($paymentOrder, $validated, $request) {
            $payment = Payment::create([
                'payment_order_id' => $paymentOrder->id,
                'or_number' => $validated['or_number'],
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
            "Recorded payment OR#{$validated['or_number']} for {$paymentOrder->reference_no}",
            $request
        );

        return response()->json([
            'message' => 'Payment recorded successfully.',
            'payment' => $payment->load('receiver'),
            'order' => $paymentOrder->load(['patient', 'items', 'payment']),
        ]);
    }
}
