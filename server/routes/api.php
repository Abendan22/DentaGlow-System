<?php

use App\Http\Controllers\Api\ActivityLogController;
use App\Http\Controllers\Api\AppointmentController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BillableItemController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DoctorController;
use App\Http\Controllers\Api\GenderController;
use App\Http\Controllers\Api\PatientController;
use App\Http\Controllers\Api\PaymentOrderController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\ServiceController;
use App\Http\Controllers\Api\StaffController;
use App\Http\Controllers\Api\TreasurerController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/reset-password', [AuthController::class, 'resetPassword']);
Route::get('/genders', [GenderController::class, 'index']);
Route::get('/doctors', [DoctorController::class, 'index']);
Route::get('/services', [ServiceController::class, 'index']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'me']);

    Route::get('/appointments/available-slots', [AppointmentController::class, 'availableSlots']);
    Route::get('/appointments/my', [AppointmentController::class, 'myAppointments']);
    Route::post('/appointments/book', [AppointmentController::class, 'store']);
    Route::post('/appointments/my/{appointment}/cancel', [AppointmentController::class, 'cancelMine']);

    Route::middleware('clinic')->group(function () {
        Route::get('/dashboard', [DashboardController::class, 'index']);

        // Shared clinic access (admin, staff, doctor, treasurer)
        Route::get('/billable-items', [BillableItemController::class, 'index']);
        Route::get('/payment-orders', [PaymentOrderController::class, 'index']);
        Route::post('/payment-orders', [PaymentOrderController::class, 'store']);
        Route::post('/payment-orders/{paymentOrder}/cancel', [PaymentOrderController::class, 'cancel']);

        Route::middleware('clinic.staff')->group(function () {
            Route::apiResource('patients', PatientController::class);
            Route::apiResource('appointments', AppointmentController::class)->except(['show']);
            Route::post('/appointments/{appointment}/approve', [AppointmentController::class, 'approve']);
            Route::post('/appointments/{appointment}/reject', [AppointmentController::class, 'reject']);
            Route::post('/appointments/{appointment}/complete', [AppointmentController::class, 'complete']);
        });

        Route::middleware('treasurer')->group(function () {
            Route::get('/treasurer', [TreasurerController::class, 'index']);
            Route::get('/treasurer/stats', [TreasurerController::class, 'stats']);
            Route::get('/treasurer/report', [TreasurerController::class, 'report']);
            Route::post('/treasurer/{paymentOrder}/pay', [TreasurerController::class, 'recordPayment']);
        });

        Route::get('/reports', [ReportController::class, 'index']);
    });

    Route::middleware('admin')->group(function () {
        Route::apiResource('genders', GenderController::class)->except(['show', 'index']);
        Route::apiResource('users', UserController::class)->except(['show']);
        Route::apiResource('doctors', DoctorController::class)->except(['show', 'index']);
        Route::apiResource('services', ServiceController::class)->except(['show', 'index']);
        Route::apiResource('staff', StaffController::class)->except(['show']);

        Route::apiResource('billable-items', BillableItemController::class)->except(['show', 'index']);
        Route::get('/activity-logs', [ActivityLogController::class, 'index']);
    });
});
