<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_saran_cache', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('lahan_id')->nullable()->constrained('lahan')->cascadeOnDelete();
            $table->string('tipe'); // 'perawatan' atau 'harian'
            $table->text('saran');
            $table->string('hash_key'); // hash dari input data agar bisa invalidate saat data berubah
            $table->timestamps();

            $table->index(['user_id', 'lahan_id', 'tipe']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_saran_cache');
    }
};
