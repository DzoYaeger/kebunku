<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('panen', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('lahan_id')->constrained('lahan')->cascadeOnDelete();
            $table->uuid('client_uuid');
            $table->date('tanggal');
            $table->decimal('berat', 10, 2)->comment('Dalam kg atau satuan lain');
            $table->string('grade')->nullable();
            $table->decimal('harga_jual', 15, 2)->nullable();
            $table->string('pembeli')->nullable();
            $table->text('catatan')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'client_uuid']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('panen');
    }
};
