<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_saran_cache', function (Blueprint $table) {
            $table->enum('outcome', ['pending', 'success', 'failed'])->default('pending')->after('saran');
            $table->text('outcome_note')->nullable()->after('outcome');
        });
    }

    public function down(): void
    {
        Schema::table('ai_saran_cache', function (Blueprint $table) {
            $table->dropColumn(['outcome', 'outcome_note']);
        });
    }
};
