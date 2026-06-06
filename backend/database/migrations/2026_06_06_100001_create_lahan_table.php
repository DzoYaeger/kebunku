<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lahan', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->uuid('client_uuid');
            $table->string('nomor_bed');
            $table->string('komoditas');
            $table->enum('status', ['semai', 'aktif', 'selesai'])->default('semai');
            $table->text('catatan')->nullable();
            $table->timestamps();

            // Idempotensi sync: client_uuid unik per user.
            $table->unique(['user_id', 'client_uuid']);
            // Nomor bed unik per user.
            $table->unique(['user_id', 'nomor_bed']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lahan');
    }
};
