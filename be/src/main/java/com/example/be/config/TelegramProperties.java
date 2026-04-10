package com.example.be.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "pos.telegram")
public class TelegramProperties {

    /**
     * Bật gửi thông báo Telegram (lỗi server, POS, backup, v.v.).
     */
    private boolean enabled = false;

    private String botToken = "";

    private String chatId = "";

    /**
     * Nhãn môi trường hiển thị trên tin nhắn (local, staging, prod).
     */
    private String env = "local";

    /**
     * Tên dịch vụ hiển thị trên tin nhắn.
     */
    private String serviceName = "pos-api";

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getBotToken() {
        return botToken;
    }

    public void setBotToken(String botToken) {
        this.botToken = botToken;
    }

    public String getChatId() {
        return chatId;
    }

    public void setChatId(String chatId) {
        this.chatId = chatId;
    }

    public String getEnv() {
        return env;
    }

    public void setEnv(String env) {
        this.env = env;
    }

    public String getServiceName() {
        return serviceName;
    }

    public void setServiceName(String serviceName) {
        this.serviceName = serviceName;
    }
}
