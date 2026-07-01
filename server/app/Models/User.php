<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'phone',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isPatient(): bool
    {
        return $this->role === 'patient';
    }

    public function isTreasurer(): bool
    {
        return $this->role === 'treasurer';
    }

    public function isClinicStaff(): bool
    {
        return in_array($this->role, ['admin', 'staff', 'doctor'], true);
    }

    public function canAccessTreasurer(): bool
    {
        return in_array($this->role, ['admin', 'treasurer'], true);
    }

    public function canAccessAdminPanel(): bool
    {
        return in_array($this->role, ['admin', 'staff', 'doctor', 'treasurer'], true);
    }

    public function patient(): HasOne
    {
        return $this->hasOne(Patient::class);
    }
}
