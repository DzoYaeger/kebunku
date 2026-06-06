<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Tambah kolom jenis_pestisida (nullable) — aman untuk MariaDB & SQLite.
        Schema::table('aktivitas', function (Blueprint $table) {
            $table->string('jenis_pestisida')->nullable()->after('jenis_pupuk');
        });

        // Tambah 'pestisida' ke enum tipe (non-destruktif, mempertahankan data).
        Schema::table('aktivitas', function (Blueprint $table) {
            $table->enum('tipe', ['semai', 'pindah_tanam', 'pemupukan', 'pestisida'])->change();
        });
    }

    public function down(): void
    {
        Schema::table('aktivitas', function (Blueprint $table) {
            $table->dropColumn('jenis_pestisida');
        });

        Schema::table('aktivitas', function (Blueprint $table) {
            $table->enum('tipe', ['semai', 'pindah_tanam', 'pemupukan'])->change();
        });
    }
};
