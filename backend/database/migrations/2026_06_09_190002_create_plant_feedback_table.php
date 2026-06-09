<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plant_feedback', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('lahan_id')->constrained('lahan')->cascadeOnDelete();
            $table->foreignId('care_plan_id')->nullable()->constrained('care_plans')->nullOnDelete();
            $table->enum('tipe', ['progress', 'keluhan'])->default('progress');
            $table->text('content');            // user feedback text
            $table->text('ai_response')->nullable(); // AI response to feedback
            $table->string('image_path')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'lahan_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('plant_feedback');
    }
};
