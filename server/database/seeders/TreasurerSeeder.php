<?php

namespace Database\Seeders;

use App\Models\BillableItem;
use App\Models\User;
use Illuminate\Database\Seeder;

class TreasurerSeeder extends Seeder
{
    public function run(): void
    {
        User::firstOrCreate(
            ['email' => 'treasurer@dentaglow.com'],
            [
                'name' => 'Municipal Treasurer',
                'password' => 'password',
                'role' => 'treasurer',
                'phone' => '09181234567',
            ]
        );

        collect([
            ['name' => 'Anesthesia', 'description' => 'Local anesthesia administration', 'price' => 150],
            ['name' => 'Dental Consultation', 'description' => 'Initial dental consultation fee', 'price' => 100],
            ['name' => 'Tooth Extraction Fee', 'description' => 'Extraction procedure fee', 'price' => 500],
            ['name' => 'Dental X-Ray', 'description' => 'Per exposure dental x-ray', 'price' => 200],
            ['name' => 'Dental Kit', 'description' => 'Disposable dental kit', 'price' => 50],
        ])->each(fn ($item) => BillableItem::firstOrCreate(['name' => $item['name']], $item));
    }
}
