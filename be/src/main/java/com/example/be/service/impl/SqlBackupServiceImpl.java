package com.example.be.service.impl;

import com.example.be.config.BackupProperties;
import com.example.be.dto.response.backup.SqlBackupNowResponse;
import com.example.be.entity.SettingEntity;
import com.example.be.exception.BadRequestException;
import com.example.be.exception.NotFoundException;
import com.example.be.repository.SettingRepository;
import com.example.be.service.SqlBackupService;
import com.example.be.service.TelegramNotificationService;
import com.example.be.util.JdbcMysqlUrlParser;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
@RequiredArgsConstructor
public class SqlBackupServiceImpl implements SqlBackupService {

    private static final Logger log = LoggerFactory.getLogger(SqlBackupServiceImpl.class);
    private static final DateTimeFormatter FILE_TS = DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss");
    private final BackupProperties backupProperties;
    private final TelegramNotificationService telegramNotificationService;
    private final SettingRepository settingRepository;

    private final AtomicBoolean running = new AtomicBoolean(false);

    @Value("${spring.datasource.url}")
    private String jdbcUrl;

    @Value("${spring.datasource.username}")
    private String dbUser;

    @Value("${spring.datasource.password}")
    private String dbPassword;

    @Override
    @Transactional
    public SqlBackupNowResponse backupNow() {
        if (!backupProperties.isEnabled()) {
            throw new BadRequestException("Backup đang bị tắt (pos.backup.enabled=false)");
        }
        if (!running.compareAndSet(false, true)) {
            throw new BadRequestException("Backup đang chạy, vui lòng thử lại sau");
        }

        Path outFile = null;
        try {
            SettingEntity settings = settingRepository.findById(SettingEntity.SINGLETON_ID)
                    .orElseThrow(() -> new NotFoundException("Settings not initialized"));

            ZoneId zone = backupProperties.resolveBackupZoneId();
            ZonedDateTime nowZ = ZonedDateTime.now(zone);
            LocalDateTime nowWall = nowZ.toLocalDateTime();

            JdbcMysqlUrlParser.MysqlTarget target = JdbcMysqlUrlParser.parse(jdbcUrl);

            Path dir = Paths.get(backupProperties.getOutputDir()).toAbsolutePath().normalize();
            Files.createDirectories(dir);

            String fileName = "pos_backup_" + target.database() + "_" + nowWall.format(FILE_TS) + ".sql";
            outFile = dir.resolve(fileName).normalize();
            if (!outFile.startsWith(dir)) {
                throw new IOException("Invalid backup path");
            }

            List<String> cmd = new ArrayList<>(backupProperties.getMysqldumpArgv0());
            cmd.addAll(backupProperties.getMysqldumpExtraArgv());
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

            log.info("Manual MySQL backup start: {}", String.join(" ", cmd));
            Process p = pb.start();

            boolean finished = p.waitFor(2, TimeUnit.HOURS);
            if (!finished) {
                p.destroyForcibly();
                String err = "mysqldump timeout (2h)";
                log.error(err);
                telegramNotificationService.notifyBackupFailure(err);
                safeDelete(outFile);
                return new SqlBackupNowResponse(false, err, target.database(), -1L, LocalDateTime.now(zone));
            }

            if (p.exitValue() != 0) {
                String err = dumpTail(outFile) + " (exit " + p.exitValue() + ")";
                log.error("mysqldump failed: {}", err);
                telegramNotificationService.notifyBackupFailure(err);
                safeDelete(outFile);
                return new SqlBackupNowResponse(false, err, target.database(), -1L, LocalDateTime.now(zone));
            }

            long size = Files.exists(outFile) ? Files.size(outFile) : -1L;
            log.info("MySQL backup OK: {} ({} bytes)", outFile, size);
            telegramNotificationService.sendSqlBackupDumpAsync(outFile, target.database(), size, nowWall);

            settings.setLastBackupAt(nowWall);
            settingRepository.save(settings);

            return new SqlBackupNowResponse(true, "Backup thành công", target.database(), size, LocalDateTime.now(zone));
        } catch (Exception e) {
            String msg = e.getClass().getSimpleName() + ": " + e.getMessage();
            log.error("Manual backup failed", e);
            telegramNotificationService.notifyBackupFailure(msg);
            if (outFile != null) {
                safeDelete(outFile);
            }
            return new SqlBackupNowResponse(false, msg, null, -1L, LocalDateTime.now());
        } finally {
            running.set(false);
        }
    }

    private static void safeDelete(Path p) {
        try {
            Files.deleteIfExists(p);
        } catch (IOException ignored) {
            // ignore
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

