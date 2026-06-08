<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Akun tunggal untuk login.
        User::updateOrCreate(
            ['email' => 'yaeger'],
            [
                'name' => 'yaeger',
                'password' => Hash::make('se7encyber'),
            ],
        );

        $this->command->info('Seeder selesai. Login: yaeger / se7encyber');
    }
}
