package com.example.be.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "pos.backup")
public class BackupProperties {

    /**
     * Bật job dump MySQL định kỳ (cần {@code mysqldump} trên PATH hoặc cấu hình đường dẫn).
     */
    private boolean enabled = false;

    private String outputDir = "./backups";

    /**
     * Lệnh mysqldump (vd. mysqldump hoặc C:/Program Files/MySQL/.../mysqldump.exe).
     */
    private String mysqldumpCommand = "mysqldump";

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
}
