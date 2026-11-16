<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('dental_doctors', 'specialization')) {
            Schema::table('dental_doctors', function (Blueprint $table) {
                $table->dropColumn('specialization');
            });
        }
    }

    public function down(): void
    {
        if (! Schema::hasColumn('dental_doctors', 'specialization')) {
            Schema::table('dental_doctors', function (Blueprint $table) {
                $table->string('specialization')->nullable()->after('last_name');
            });
        }
    }
};
