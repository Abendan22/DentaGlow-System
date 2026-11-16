<?php

namespace Database\Seeders;

use App\Models\Appointment;
use App\Models\DentalDoctor;
use App\Models\Gender;
use App\Models\Patient;
use App\Models\Service;
use App\Models\Staff;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $male = Gender::create(['name' => 'Male']);
        $female = Gender::create(['name' => 'Female']);

        User::create([
            'name' => 'System Admin',
            'email' => 'admin@dentaglow.com',
            'password' => 'password',
            'role' => 'admin',
            'phone' => '09171234567',
        ]);

        $services = collect([
            ['name' => 'Dental Cleaning', 'description' => 'Professional teeth cleaning', 'price' => 1500, 'duration_minutes' => 45],
            ['name' => 'Tooth Extraction', 'description' => 'Safe tooth removal procedure', 'price' => 2500, 'duration_minutes' => 60],
            ['name' => 'Dental Check-up', 'description' => 'Routine oral examination', 'price' => 800, 'duration_minutes' => 30],
            ['name' => 'Teeth Whitening', 'description' => 'Cosmetic whitening treatment', 'price' => 5000, 'duration_minutes' => 90],
        ])->map(fn ($s) => Service::create($s));

        $doctors = collect([
            ['first_name' => 'Maria', 'last_name' => 'Santos', 'email' => 'maria@dentaglow.com'],
            ['first_name' => 'Juan', 'last_name' => 'Reyes', 'email' => 'juan@dentaglow.com'],
            ['first_name' => 'Ana', 'last_name' => 'Cruz', 'email' => 'ana@dentaglow.com'],
        ])->map(fn ($d) => DentalDoctor::create($d));

        Staff::create(['first_name' => 'Lisa', 'last_name' => 'Garcia', 'position' => 'Receptionist', 'email' => 'lisa@dentaglow.com']);
        Staff::create(['first_name' => 'Mark', 'last_name' => 'Torres', 'position' => 'Dental Assistant', 'email' => 'mark@dentaglow.com']);

        User::create([
            'name' => 'Municipal Treasurer',
            'email' => 'treasurer@dentaglow.com',
            'password' => 'password',
            'role' => 'treasurer',
            'phone' => '09181234567',
        ]);

        collect([
            ['name' => 'Anesthesia', 'description' => 'Local anesthesia administration', 'price' => 150],
            ['name' => 'Dental Consultation', 'description' => 'Initial dental consultation fee', 'price' => 100],
            ['name' => 'Tooth Extraction Fee', 'description' => 'Extraction procedure fee', 'price' => 500],
            ['name' => 'Dental X-Ray', 'description' => 'Per exposure dental x-ray', 'price' => 200],
            ['name' => 'Dental Kit', 'description' => 'Disposable dental kit', 'price' => 50],
        ])->each(fn ($item) => \App\Models\BillableItem::create($item));

        $patientNames = [
            ['Raymond', 'Abendan', $male],
            ['Mohamed', 'Batz', $male],
            ['Sarah', 'Lopez', $female],
            ['James', 'Wilson', $male],
            ['Emily', 'Chen', $female],
            ['Michael', 'Brown', $male],
            ['Jessica', 'Davis', $female],
            ['David', 'Martinez', $male],
            ['Ashley', 'Taylor', $female],
        ];

        $barangays = ['Poblacion', 'Abangay', 'Bagacay', 'San Jose', 'Santa Ana', 'Malitbog', 'Tuburan', 'Nayawan', 'Katipunan'];

        $patients = collect($patientNames)->map(function ($p, $i) use ($barangays) {
            return Patient::create([
                'gender_id' => $p[2]->id,
                'first_name' => $p[0],
                'last_name' => $p[1],
                'birth_date' => now()->subYears(20 + $i * 3)->subMonths($i),
                'phone' => '09'.str_pad((string) (100000000 + $i), 9, '0'),
                'email' => strtolower($p[0]).'@email.com',
                'barangay' => $barangays[$i % count($barangays)],
                'address' => 'Purok '.($i + 1).', Sitio Sample',
            ]);
        });

        $slots = ['09:00', '09:30', '10:00', '10:30', '11:00', '14:00', '14:30', '15:00'];

        foreach (range(0, 9) as $i) {
            Appointment::create([
                'patient_id' => $patients[$i % $patients->count()]->id,
                'doctor_id' => $doctors[$i % $doctors->count()]->id,
                'service_id' => $services[$i % $services->count()]->id,
                'appointment_date' => now()->addDays($i % 7)->toDateString(),
                'time_slot' => $slots[$i % count($slots)],
                'status' => ['pending', 'confirmed', 'completed'][$i % 3],
                'created_by' => 1,
            ]);
        }
    }
}
