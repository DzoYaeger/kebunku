<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_settings', function (Blueprint $table) {
            $table->string('takaran_benam')->default('per tanaman')->after('takaran_pestisida');
        });

        Schema::create('plan_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('nama');
            $table->string('komoditas');
            $table->json('schedule');
            $table->text('summary');
            $table->timestamps();

            $table->index(['user_id', 'komoditas']);
        });

        // Track completed items in care plan
        Schema::table('care_plans', function (Blueprint $table) {
            $table->json('completed_items')->nullable()->after('schedule');
        });
    }

    public function down(): void
    {
        Schema::table('care_plans', function (Blueprint $table) {
            $table->dropColumn('completed_items');
        });
        Schema::dropIfExists('plan_templates');
        Schema::table('user_settings', function (Blueprint $table) {
            $table->dropColumn('takaran_benam');
        });
    }
};
