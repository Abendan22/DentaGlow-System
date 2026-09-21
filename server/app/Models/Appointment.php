<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Appointment extends Model
{
    protected $fillable = [
        'patient_id',
        'doctor_id',
        'service_id',
        'appointment_date',
        'time_slot',
        'status',
        'approved_at',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'appointment_date' => 'date',
        'approved_at' => 'datetime',
    ];

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(DentalDoctor::class, 'doctor_id');
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function scopeActive($query)
    {
        return $query->whereNotIn('status', ['cancelled', 'rejected']);
    }
}
