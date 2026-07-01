<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BillableItem;
use App\Models\PaymentOrder;
use App\Models\PaymentOrderItem;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PaymentOrderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = PaymentOrder::with(['patient', 'appointment.service', 'items', 'payment.receiver'])
            ->orderByDesc('created_at');

        if ($status = $request->query('status')) {
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

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'patient_id' => ['required', 'exists:patients,id'],
            'queue_number' => ['nullable', 'integer', 'min:1', 'max:9999'],
            'appointment_id' => ['nullable', 'exists:appointments,id'],
            'notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.billable_item_id' => ['required', 'exists:billable_items,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
        ]);

        try {
            $order = DB::transaction(function () use ($validated, $request) {
            $total = 0;
            $lineItems = [];

            foreach ($validated['items'] as $row) {
                $item = BillableItem::findOrFail($row['billable_item_id']);
                if (! $item->is_active) {
                    throw new \InvalidArgumentException("Item {$item->name} is not active.");
                }
                $subtotal = $item->price * $row['quantity'];
                $total += $subtotal;
                $lineItems[] = [
                    'billable_item_id' => $item->id,
                    'item_name' => $item->name,
                    'quantity' => $row['quantity'],
                    'unit_price' => $item->price,
                    'subtotal' => $subtotal,
                ];
            }

            $order = PaymentOrder::create([
                'reference_no' => PaymentOrder::generateReference(),
                'queue_number' => $validated['queue_number'] ?? null,
                'patient_id' => $validated['patient_id'],
                'appointment_id' => $validated['appointment_id'] ?? null,
                'status' => 'pending',
                'total_amount' => $total,
                'notes' => $validated['notes'] ?? null,
                'created_by' => $request->user()->id,
            ]);

            foreach ($lineItems as $line) {
                $order->items()->create($line);
            }

            return $order;
        });
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        ActivityLogger::log('create', 'Billing', "Created payment order {$order->reference_no}", $request);

        return response()->json($order->load(['patient', 'items', 'appointment']), 201);
    }

    public function cancel(Request $request, PaymentOrder $paymentOrder): JsonResponse
    {
        if ($paymentOrder->status !== 'pending') {
            return response()->json(['message' => 'Only pending bills can be cancelled.'], 422);
        }

        $paymentOrder->update(['status' => 'cancelled']);

        ActivityLogger::log('cancel', 'Billing', "Cancelled {$paymentOrder->reference_no}", $request);

        return response()->json(['message' => 'Billing cancelled.']);
    }
}
