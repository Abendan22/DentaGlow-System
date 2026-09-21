<?php

return [
    /*
    |--------------------------------------------------------------------------
    | SMS (PhilSMS — cheap for PH, no big minimum top-up)
    |--------------------------------------------------------------------------
    |
    | Sign up: https://app.philsms.com/register
    | API docs: https://app.philsms.com/developers/documentation
    | Put your API token in .env only (never commit it).
    |
    */
    'enabled' => (bool) env('SMS_ENABLED', false),

    'provider' => env('SMS_PROVIDER', 'philsms'),

    'philsms' => [
        'api_token' => env('PHILSMS_API_TOKEN'),
        'sender_id' => env('PHILSMS_SENDER_ID', 'PhilSMS'),
        'endpoint' => env('PHILSMS_ENDPOINT', 'https://dashboard.philsms.com/api/v3/sms/send'),
        'balance_endpoint' => env('PHILSMS_BALANCE_ENDPOINT', 'https://dashboard.philsms.com/api/v3/balance'),
    ],
];
