<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_saran_cache', function (Blueprint $table) {
            $table->uuid('session_id')->nullable()->after('tipe');
            $table->text('keluhan_text')->nullable()->after('session_id'); // stores user's question
            $table->index(['lahan_id', 'session_id']);
        });
    }

    public function down(): void
    {
        Schema::table('ai_saran_cache', function (Blueprint $table) {
            $table->dropIndex(['lahan_id', 'session_id']);
            $table->dropColumn(['session_id', 'keluhan_text']);
        });
    }
};
