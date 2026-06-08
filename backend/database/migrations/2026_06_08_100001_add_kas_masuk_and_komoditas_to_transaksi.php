<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'sqlite') {
            // SQLite: recreate kolom tipe dengan enum baru agar CHECK constraint benar.
            Schema::table('transaksi', function (Blueprint $table) {
                $table->string('tipe_new')->default('kas_keluar');
            });
            DB::table('transaksi')->update(['tipe_new' => DB::raw('tipe')]);
            Schema::table('transaksi', function (Blueprint $table) {
                $table->dropColumn('tipe');
            });
            Schema::table('transaksi', function (Blueprint $table) {
                $table->enum('tipe', ['kas_keluar', 'kas_masuk'])->default('kas_keluar');
            });
            DB::table('transaksi')->update(['tipe' => DB::raw('tipe_new')]);
            Schema::table('transaksi', function (Blueprint $table) {
                $table->dropColumn('tipe_new');
            });
        } else {
            DB::statement("ALTER TABLE transaksi MODIFY COLUMN tipe ENUM('kas_keluar','kas_masuk') NOT NULL DEFAULT 'kas_keluar'");
        }

        Schema::table('transaksi', function (Blueprint $table) {
            $table->string('komoditas')->nullable()->after('kategori');
        });
    }

    public function down(): void
    {
        Schema::table('transaksi', function (Blueprint $table) {
            $table->dropColumn('komoditas');
        });

        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'mysql' || $driver === 'mariadb') {
            DB::statement("ALTER TABLE transaksi MODIFY COLUMN tipe ENUM('kas_keluar') NOT NULL DEFAULT 'kas_keluar'");
        }
    }
};
