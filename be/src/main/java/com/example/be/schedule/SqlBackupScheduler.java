package com.example.be.schedule;

import com.example.be.config.BackupProperties;
import com.example.be.entity.SettingEntity;
import com.example.be.repository.SettingRepository;
import com.example.be.service.TelegramNotificationService;
import com.example.be.util.JdbcMysqlUrlParser;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * Dump MySQL định kỳ bằng {@code mysqldump}. Bật bằng {@code pos.backup.enabled=true}.
 */
@Component
public class SqlBackupScheduler {

    private static final Logger log = LoggerFactory.getLogger(SqlBackupScheduler.class);
    private static final DateTimeFormatter FILE_TS = DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss");

    private final BackupProperties backupProperties;
    private final TelegramNotificationService telegramNotificationService;
    private final SettingRepository settingRepository;

    @Value("${spring.datasource.url}")
    private String jdbcUrl;

    @Value("${spring.datasource.username}")
    private String dbUser;

    @Value("${spring.datasource.password}")
    private String dbPassword;

    public SqlBackupScheduler(
            BackupProperties backupProperties,
            TelegramNotificationService telegramNotificationService,
            SettingRepository settingRepository
    ) {
        this.backupProperties = backupProperties;
        this.telegramNotificationService = telegramNotificationService;
        this.settingRepository = settingRepository;
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
            LocalTime configured = LocalTime.parse(hhmm);
            LocalTime nowTime = LocalTime.now();
            if (!(nowTime.getHour() == configured.getHour() && nowTime.getMinute() == configured.getMinute())) {
                return;
            }
            LocalDateTime last = settings.getLastBackupAt();
            if (last != null && last.toLocalDate().equals(LocalDateTime.now().toLocalDate())) {
                return;
            }

            JdbcMysqlUrlParser.MysqlTarget target = JdbcMysqlUrlParser.parse(jdbcUrl);
            Path dir = Paths.get(backupProperties.getOutputDir()).toAbsolutePath().normalize();
            Files.createDirectories(dir);

            String fileName = "pos_backup_" + target.database() + "_" + LocalDateTime.now().format(FILE_TS) + ".sql";
            Path outFile = dir.resolve(fileName).normalize();
            if (!outFile.startsWith(dir)) {
                throw new IOException("Invalid backup path");
            }

            List<String> cmd = new ArrayList<>();
            cmd.add(backupProperties.getMysqldumpCommand());
            cmd.add("--protocol=tcp");
            cmd.add("-h");
            cmd.add(target.host());
            cmd.add("-P");
            cmd.add(String.valueOf(target.port()));
            cmd.add("-u");
            cmd.add(dbUser);
            cmd.add("-p" + (dbPassword == null ? "" : dbPassword));
            cmd.add("--single-transaction");
            cmd.add("--routines");
            cmd.add("--events");
            cmd.add(target.database());

            ProcessBuilder pb = new ProcessBuilder(cmd);
            pb.redirectOutput(outFile.toFile());
            pb.redirectErrorStream(true);
            Process p = pb.start();
            boolean finished = p.waitFor(2, TimeUnit.HOURS);
            if (!finished) {
                p.destroyForcibly();
                String err = "mysqldump timeout (2h)";
                log.error(err);
                telegramNotificationService.notifyBackupFailure(err);
                return;
            }
            if (p.exitValue() != 0) {
                String err = dumpTail(outFile) + " (exit " + p.exitValue() + ")";
                log.error("mysqldump failed: {}", err);
                try {
                    Files.deleteIfExists(outFile);
                } catch (IOException ignored) {
                    // ignore
                }
                telegramNotificationService.notifyBackupFailure(err);
                return;
            }

            long size = Files.exists(outFile) ? Files.size(outFile) : -1L;
            log.info("MySQL backup OK: {} ({} bytes)", outFile, size);
            telegramNotificationService.notifyBackupSuccess(outFile.toString(), size, target.database());
            telegramNotificationService.sendDumpFileAndDeleteAsync(
                    outFile,
                    "Dump " + target.database() + " @ " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
            );

            settings.setLastBackupAt(LocalDateTime.now());
            settingRepository.save(settings);
        } catch (Exception e) {
            log.error("Scheduled backup failed", e);
            telegramNotificationService.notifyBackupFailure(e.getClass().getSimpleName() + ": " + e.getMessage());
        }
    }

    private static String dumpTail(Path outFile) {
        try {
            if (!Files.exists(outFile)) {
                return "(empty output file)";
            }
            String all = Files.readString(outFile);
            String t = all.trim();
            if (t.length() > 600) {
                return t.substring(t.length() - 600);
            }
            return t.isEmpty() ? "(no output)" : t;
        } catch (IOException e) {
            return "(cannot read output: " + e.getMessage() + ")";
        }
    }
}
