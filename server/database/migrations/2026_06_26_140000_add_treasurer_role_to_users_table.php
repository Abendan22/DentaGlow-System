<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'patient', 'staff', 'doctor', 'treasurer') NOT NULL DEFAULT 'patient'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'patient', 'staff', 'doctor') NOT NULL DEFAULT 'patient'");
    }
};
