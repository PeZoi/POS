package com.example.be.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.DateTimeException;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@ConfigurationProperties(prefix = "pos.backup")
public class BackupProperties {

    /**
     * Bật job dump MySQL định kỳ (cần {@code mysqldump} trên PATH hoặc cấu hình đường dẫn).
     */
    private boolean enabled = false;

    private String outputDir = "./backups";

    /**
     * Lệnh chạy dump: một token (vd. {@code mysqldump}) hoặc nhiều token cách bằng dấu phẩy không có khoảng trắng thừa
     * (vd. {@code docker,exec,pos-mysql,mysqldump} khi MySQL chỉ có trong container và backend chạy trên host).
     */
    private String mysqldumpCommand = "mysqldump";

    /**
     * Múi giờ so khớp {@code backupTime} (HH:mm) và lưu {@code lastBackupAt} — mặc định VN.
     * Container Docker thường là UTC; nên đặt cùng giá trị với biến {@code TZ} hoặc dùng mặc định này.
     */
    private String zoneId = "Asia/Ho_Chi_Minh";

    /**
     * Tham số thêm truyền cho client dump (sau tên binary), cách nhau bằng dấu phẩy.
     * Mặc định {@code --ssl=0} cho {@code mariadb-dump} (Alpine). Client Oracle {@code mysqldump} 8: dùng {@code --ssl-mode=DISABLED}.
     */
    private String mysqldumpExtraArgs = "--ssl=0";

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getOutputDir() {
        return outputDir;
    }

    public void setOutputDir(String outputDir) {
        this.outputDir = outputDir;
    }

    public String getMysqldumpCommand() {
        return mysqldumpCommand;
    }

    public void setMysqldumpCommand(String mysqldumpCommand) {
        this.mysqldumpCommand = mysqldumpCommand;
    }

    public String getZoneId() {
        return zoneId;
    }

    public void setZoneId(String zoneId) {
        this.zoneId = zoneId;
    }

    /** Zone an toàn khi cấu hình sai ID. */
    public ZoneId resolveBackupZoneId() {
        String z = zoneId == null || zoneId.isBlank() ? "Asia/Ho_Chi_Minh" : zoneId.trim();
        try {
            return ZoneId.of(z);
        } catch (DateTimeException e) {
            return ZoneId.of("Asia/Ho_Chi_Minh");
        }
    }

    public String getMysqldumpExtraArgs() {
        return mysqldumpExtraArgs;
    }

    public void setMysqldumpExtraArgs(String mysqldumpExtraArgs) {
        this.mysqldumpExtraArgs = mysqldumpExtraArgs;
    }

    /** Tách {@link #mysqldumpExtraArgs} theo dấu phẩy thành từng đối số CLI. */
    public List<String> getMysqldumpExtraArgv() {
        if (mysqldumpExtraArgs == null || mysqldumpExtraArgs.isBlank()) {
            return List.of();
        }
        return Arrays.stream(mysqldumpExtraArgs.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(BackupProperties::toMariadbCompatibleSslArg)
                .collect(Collectors.toCollection(ArrayList::new));
    }

    /**
     * {@code mariadb-dump} không nhận {@code ssl-mode}/{@code --ssl-mode} kiểu Oracle mysqldump 8
     * (lỗi {@code unknown variable 'ssl-mode=DISABLED'}, exit 7). Chuẩn hóa sang {@code --ssl=0}.
     */
    private static String toMariadbCompatibleSslArg(String arg) {
        String a = arg.trim();
        if (a.isEmpty()) {
            return a;
        }
        String lower = a.toLowerCase();
        if (lower.startsWith("--ssl-mode=") || lower.startsWith("ssl-mode=")) {
            return "--ssl=0";
        }
        return a;
    }

    /**
     * Đối số cho {@link ProcessBuilder}: tách theo dấu phẩy nếu có, ngược lại một executable.
     */
    public List<String> getMysqldumpArgv0() {
        if (mysqldumpCommand == null || mysqldumpCommand.isBlank()) {
            return List.of("mysqldump");
        }
        String t = mysqldumpCommand.trim();
        if (!t.contains(",")) {
            return List.of(t);
        }
        List<String> parts = Arrays.stream(t.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toCollection(ArrayList::new));
        return parts.isEmpty() ? List.of("mysqldump") : parts;
    }
}
