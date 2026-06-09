<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', ['admin', 'pekerja', 'viewer'])->default('admin')->after('password');
            $table->foreignId('team_owner_id')->nullable()->constrained('users')->nullOnDelete()->after('role');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['team_owner_id']);
            $table->dropColumn(['role', 'team_owner_id']);
        });
    }
};
