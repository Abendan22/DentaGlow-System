<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class Patient extends Model
{
    protected $fillable = [
        'user_id',
        'gender_id',
        'first_name',
        'last_name',
        'birth_date',
        'phone',
        'email',
        'barangay',
        'address',
        'photo',
    ];

    protected $casts = [
        'birth_date' => 'date',
    ];

    protected $appends = ['full_name', 'age', 'photo_url'];

    public function getFullNameAttribute(): string
    {
        return "{$this->first_name} {$this->last_name}";
    }

    public function getAgeAttribute(): int
    {
        return (int) $this->birth_date->age;
    }

    protected function photoUrl(): Attribute
    {
        return Attribute::get(function () {
            if (! $this->photo) {
                return null;
            }

            return asset('storage/'.$this->photo);
        });
    }

    public function deletePhotoFile(): void
    {
        if ($this->photo && Storage::disk('public')->exists($this->photo)) {
            Storage::disk('public')->delete($this->photo);
        }
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function gender(): BelongsTo
    {
        return $this->belongsTo(Gender::class);
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }
}
