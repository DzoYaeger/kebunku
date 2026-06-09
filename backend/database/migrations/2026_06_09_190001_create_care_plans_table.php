<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('care_plans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('lahan_id')->constrained('lahan')->cascadeOnDelete();
            $table->json('schedule');       // full AI-generated schedule JSON
            $table->text('summary');        // human-readable summary
            $table->enum('status', ['active', 'completed', 'superseded'])->default('active');
            $table->timestamps();

            $table->index(['user_id', 'lahan_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('care_plans');
    }
};
