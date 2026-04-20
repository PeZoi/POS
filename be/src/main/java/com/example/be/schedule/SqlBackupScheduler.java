package com.example.be.schedule;

import com.example.be.config.BackupProperties;
import com.example.be.entity.SettingEntity;
import com.example.be.repository.SettingRepository;
import com.example.be.service.SqlBackupService;
import com.example.be.service.TelegramNotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;

/**
 * Dump MySQL định kỳ (tiến trình ngoài JVM). Bật bằng {@code pos.backup.enabled=true}.
 * Lệnh cấu hình {@code pos.backup.mysqldump-command}: một binary hoặc nhiều token cách bằng dấu phẩy.
 */
@Component
public class SqlBackupScheduler {

    private static final Logger log = LoggerFactory.getLogger(SqlBackupScheduler.class);

    private final BackupProperties backupProperties;
    private final TelegramNotificationService telegramNotificationService;
    private final SettingRepository settingRepository;
    private final SqlBackupService sqlBackupService;

    public SqlBackupScheduler(
            BackupProperties backupProperties,
            TelegramNotificationService telegramNotificationService,
            SettingRepository settingRepository,
            SqlBackupService sqlBackupService
    ) {
        this.backupProperties = backupProperties;
        this.telegramNotificationService = telegramNotificationService;
        this.settingRepository = settingRepository;
        this.sqlBackupService = sqlBackupService;
    }

    @org.springframework.scheduling.annotation.Scheduled(fixedDelayString = "${pos.backup.poll-ms:30000}")
    public void runDailyDumpPoller() {
        try {
            if (!backupProperties.isEnabled()) {
                return;
            }
            SettingEntity settings = settingRepository.findById(SettingEntity.SINGLETON_ID).orElse(null);
            if (settings == null) {
                return;
            }
            if (!Boolean.TRUE.equals(settings.getBackupEnabled())) {
                return;
            }
            String hhmm = settings.getBackupTime() == null ? "02:00" : settings.getBackupTime().trim();
            if (!hhmm.matches("^([01]\\d|2[0-3]):[0-5]\\d$")) {
                return;
            }
            ZoneId zone = backupProperties.resolveBackupZoneId();
            ZonedDateTime nowZ = ZonedDateTime.now(zone);
            LocalTime configured = LocalTime.parse(hhmm);
            LocalTime nowTime = nowZ.toLocalTime();
            if (!(nowTime.getHour() == configured.getHour() && nowTime.getMinute() == configured.getMinute())) {
                return;
            }
            LocalDateTime last = settings.getLastBackupAt();
            if (last != null && last.toLocalDate().equals(nowZ.toLocalDate())) {
                return;
            }
        } catch (Exception e) {
            log.error("Scheduled backup failed", e);
            telegramNotificationService.notifyBackupFailure(e.getClass().getSimpleName() + ": " + e.getMessage());
            return;
        }
        // Chạy backup sau khi đã vượt qua các điều kiện lịch/ngày.
        sqlBackupService.backupNow();
    }
}
