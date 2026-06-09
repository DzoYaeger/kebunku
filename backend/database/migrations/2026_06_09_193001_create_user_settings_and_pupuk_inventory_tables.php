<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('takaran_pupuk')->default('ember 25L'); // alat ukur pupuk
            $table->string('takaran_pestisida')->default('tangki 14L'); // alat ukur pestisida
            $table->decimal('luas_lahan', 10, 2)->nullable(); // total luas dalam m²
            $table->timestamps();

            $table->unique('user_id');
        });

        Schema::create('pupuk_inventory', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('nama'); // NPK 16-16-16, Urea, KCl, dll
            $table->enum('tipe', ['pupuk', 'pestisida']);
            $table->string('satuan')->nullable(); // kg, liter, gram
            $table->decimal('stok', 10, 2)->nullable();
            $table->text('catatan')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'nama', 'tipe']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pupuk_inventory');
        Schema::dropIfExists('user_settings');
    }
};
