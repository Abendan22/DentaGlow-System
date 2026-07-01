<?php

namespace App\Support;

class TapazBarangays
{
    public const LIST = [
        'Abangay', 'Acuña', 'Agcococ', 'Aglinab', 'Aglupacan', 'Agpalali', 'Agustin',
        'Bagacay', 'Banaybanay', 'Bato', 'Buri', 'Carpintero', 'Dalicanan', 'Dobdoban',
        'Dolores', 'Feliciana', 'Garciano', 'Hilwan', 'Initan', 'Katipunan', 'Linayuan',
        'Lizares', 'Madrigal', 'Magdalena', 'Maliao', 'Malitbog', 'Minanpay', 'Nayawan',
        'Poblacion', 'Puctad', 'Salong', 'San Antonio', 'San Jose', 'San Julian',
        'Santa Ana', 'Santa Petronila', 'Senonod', 'Siya', 'Tabon', 'Tacsan', 'Talogoy',
        'Tamlang', 'Tuburan', 'XI',
    ];

    public static function rule(): string
    {
        return 'in:'.implode(',', self::LIST);
    }
}
