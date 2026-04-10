package com.example.be.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "settings")
public class SettingEntity {

    public static final long SINGLETON_ID = 1L;

    @Id
    @Column(nullable = false)
    private Long id = SINGLETON_ID;

    @Column(name = "store_name", nullable = false, length = 255)
    private String storeName = "Cửa hàng";

    @Column(name = "pin_hash", nullable = false, length = 80)
    private String pinHash;

    @Column(name = "enable_qr", nullable = false)
    private Boolean enableQr = true;

    @Column(name = "enable_card", nullable = false)
    private Boolean enableCard = false;

    @Column(name = "enable_print", nullable = false)
    private Boolean enablePrint = false;

    @Column(name = "dark_mode", nullable = false)
    private Boolean darkMode = false;

    @Column(name = "telegram_enabled", nullable = false)
    private Boolean telegramEnabled = false;

    @Column(name = "backup_enabled", nullable = false)
    private Boolean backupEnabled = false;

    /**
     * HH:mm (00:00–23:59), chạy backup 1 lần/ngày.
     */
    @Column(name = "backup_time", nullable = false, length = 5)
    private String backupTime = "02:00";

    @Column(name = "last_backup_at")
    private LocalDateTime lastBackupAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
