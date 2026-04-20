package com.example.be.service;

import com.example.be.config.TelegramProperties;
import com.example.be.enums.OrderStatus;
import com.example.be.entity.SettingEntity;
import com.example.be.repository.SettingRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

/**
 * Gửi tin nhắn Telegram bất đồng bộ (theo hướng {@code TelegramNotifier} của class-management).
 */
@Service
@RequiredArgsConstructor
public class TelegramNotificationService {

    private static final Logger log = LoggerFactory.getLogger(TelegramNotificationService.class);
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final int MAX_TEXT = 3800;

    private final TelegramProperties telegramProperties;
    private final SettingRepository settingRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    public void sendPlainTextAsync(String text) {
        if (!isTelegramEnabled()) {
            return;
        }
        String botToken = telegramProperties.getBotToken();
        String chatId = telegramProperties.getChatId();
        if (botToken == null || botToken.isBlank() || chatId == null || chatId.isBlank()) {
            log.warn("Telegram bật nhưng thiếu bot-token hoặc chat-id");
            return;
        }
        String body = truncate(text == null ? "" : text, MAX_TEXT);
        CompletableFuture.runAsync(() -> {
            try {
                postMessage(botToken, chatId, body);
            } catch (Exception e) {
                log.warn("Gửi Telegram thất bại: {}", e.getMessage());
            }
        });
    }

    public void notifyServerErrorAsync(Throwable error, String httpMethod, String requestUri, String clientIp) {
        if (!isTelegramEnabled()) {
            return;
        }
        String service = safe(telegramProperties.getServiceName(), "pos-api");
        String env = safe(telegramProperties.getEnv(), "local").toUpperCase();
        String exName = error == null ? "Exception" : error.getClass().getSimpleName();
        String msg = error == null || error.getMessage() == null ? "(no message)" : error.getMessage();
        msg = truncate(msg, 500);
        StringBuilder sb = new StringBuilder();
        sb.append("❌ [").append(env).append("][SERVER][").append(service).append("]\n");
        sb.append("-----------------------------\n");
        if (httpMethod != null) {
            sb.append("🛣 ").append(httpMethod).append(" ").append(safe(requestUri, "")).append("\n");
        }
        if (clientIp != null && !clientIp.isBlank()) {
            sb.append("📍 IP: ").append(clientIp).append("\n");
        }
        sb.append("📢 ").append(exName).append(": ").append(msg).append("\n");
        sb.append("⏰ ").append(LocalDateTime.now().format(TIME)).append("\n");
        sb.append("\n#error #server");
        sendPlainTextAsync(sb.toString());
    }

    /**
     * Gửi một tin nhắn duy nhất: file dump + caption định dạng (không gửi thêm sendMessage).
     * Nếu gửi thành công sẽ xoá file trên disk.
     */
    public void sendSqlBackupDumpAsync(Path file, String database, long sizeBytes, LocalDateTime backupTime) {
        if (!isTelegramEnabled()) {
            return;
        }
        if (file == null || !Files.exists(file)) {
            return;
        }
        String botToken = telegramProperties.getBotToken();
        String chatId = telegramProperties.getChatId();
        if (botToken == null || botToken.isBlank() || chatId == null || chatId.isBlank()) {
            return;
        }
        String fileName = file.getFileName() != null ? file.getFileName().toString() : file.toString();
        String timeStr = backupTime != null ? backupTime.format(TIME) : LocalDateTime.now().format(TIME);
        String sizeStr = sizeBytes < 0 ? "?" : formatBytes(sizeBytes);
        String caption = buildSqlBackupCaption(safe(database, "?"), fileName, sizeStr, timeStr);

        CompletableFuture.runAsync(() -> {
            try {
                boolean ok = postDocument(botToken, chatId, file, caption);
                if (ok) {
                    Files.deleteIfExists(file);
                }
            } catch (Exception e) {
                log.warn("Gửi dump file qua Telegram thất bại: {}", e.getMessage());
            }
        });
    }

    private static String buildSqlBackupCaption(String database, String fileName, String sizeStr, String timeStr) {
        StringBuilder sb = new StringBuilder();
        sb.append("🗄️ SAO LƯU DATABASE\n");
        sb.append("-----------------------------\n");
        sb.append("🧩 Database: ").append(database).append("\n");
        sb.append("📅 Thời gian: ").append(timeStr).append("\n");
        sb.append("📁 File: ").append(fileName).append("\n");
        sb.append("📦 Dung lượng: ").append(sizeStr).append("\n");
        return sb.toString();
    }

    public void notifyBackupFailure(String detail) {
        String env = safe(telegramProperties.getEnv(), "local").toUpperCase();
        StringBuilder sb = new StringBuilder();
        sb.append("❌ [").append(env).append("][BACKUP] ");
        sb.append("MySQL dump thất bại");
        sb.append(" | 📢 ").append(truncate(safe(detail, "unknown"), 800));
        sb.append(" | ⏰ ").append(LocalDateTime.now().format(TIME));
        sendPlainTextAsync(sb.toString());
    }

    /**
     * Thông báo hoá đơn mới chỉ khi "chưa thanh toán" (để tránh spam).
     * Format gần giống thông báo thanh toán để dễ đọc.
     */
    public void notifyNewOrderPending(long orderId, String orderCode, int orderTotal, OrderStatus status) {
        StringBuilder sb = new StringBuilder();
        sb.append("🧾 [").append(safe(telegramProperties.getEnv(), "local").toUpperCase()).append("][HOÁ ĐƠN]\n");
        sb.append("-----------------------------\n");
        sb.append("🧾 Mã HĐ: ").append(safe(orderCode, String.valueOf(orderId))).append("\n");
        sb.append("🧮 Tổng: ").append(formatMoney(orderTotal)).append("\n");
        sb.append("⏳ Chưa thanh toán\n");
        sb.append("📌 Trạng thái: ").append(status != null ? status.name() : "?").append("\n");
        sb.append("-----------------------------\n");
        sb.append("⏰ ").append(LocalDateTime.now().format(TIME));
        sendPlainTextAsync(sb.toString());
    }

    public void notifyPaymentSuccess(
            long orderId,
            String orderCode,
            int paymentAmount,
            int totalAfter,
            int orderTotal,
            OrderStatus status,
            boolean paidInFull
    ) {
        int paidBefore = Math.max(0, totalAfter - paymentAmount);
        int remainBefore = Math.max(0, orderTotal - paidBefore);
        boolean settlesAllRemaining = remainBefore > 0 && paymentAmount == remainBefore;
        boolean isFullOnFirstPayment = settlesAllRemaining && paidBefore == 0;
        boolean isPayingRemainingAfterPartial = settlesAllRemaining && paidBefore > 0;

        StringBuilder sb = new StringBuilder();
        sb.append("💰 [").append(safe(telegramProperties.getEnv(), "local").toUpperCase()).append("][THANH TOÁN]\n");
        sb.append("-----------------------------\n");
        sb.append("🧾 Mã HĐ: ").append(safe(orderCode, String.valueOf(orderId))).append("\n");
        sb.append("➕ Số tiền lần này: ").append(formatMoney(paymentAmount)).append("\n");
        sb.append("📊 Đã trả (lũy kế): ").append(formatMoney(totalAfter)).append(" / ").append(formatMoney(orderTotal)).append("\n");
        if (isFullOnFirstPayment) {
            sb.append("✅ Thanh toán đầy đủ (trả hết ngay)\n");
        } else if (isPayingRemainingAfterPartial) {
            sb.append("✅ Thanh toán phần còn lại\n");
        } else {
            // fallback: tương thích logic cũ nếu nơi gọi chỉ biết paidInFull
            sb.append(paidInFull ? "✅ Đã thanh toán đủ\n" : "⏳ Thanh toán một phần\n");
        }
        sb.append("📌 Trạng thái: ").append(status != null ? status.name() : "?").append("\n");
        sb.append("-----------------------------\n");
        sb.append("⏰ ").append(LocalDateTime.now().format(TIME));
        sendPlainTextAsync(sb.toString());
    }

    public void notifyPinLocked(String clientIp, String lockKey, int maxAttempts, int lockMinutes) {
        StringBuilder sb = new StringBuilder();
        sb.append("🔒 [").append(safe(telegramProperties.getEnv(), "local").toUpperCase()).append("][PIN KHOÁ]\n");
        sb.append("-----------------------------\n");
        sb.append("Nhập sai PIN, thiết bị bị khóa ").append(lockMinutes).append(" phút\n");
        String ip = safe(clientIp, "unknown");
        sb.append("📍 IP người dùng: ").append(ip).append("\n");
        if (!"unknown".equalsIgnoreCase(ip) && !ip.isBlank()) {
            sb.append("🔎 Tra cứu: https://ipregistry.co/").append(ip).append("\n");
        }
        sb.append("🔑 Lock key: ").append(safe(lockKey, "")).append("\n");
        sb.append("📌 Ngưỡng: ").append(maxAttempts).append(" lần sai\n");
        sb.append("⏰ ").append(LocalDateTime.now().format(TIME));
        sendPlainTextAsync(sb.toString());
    }

    private void postMessage(String botToken, String chatId, String text) {
        String url = "https://api.telegram.org/bot" + botToken + "/sendMessage";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        Map<String, Object> body = new HashMap<>();
        body.put("chat_id", chatId);
        body.put("text", text);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
        restTemplate.postForEntity(url, entity, String.class);
    }

    private boolean postDocument(String botToken, String chatId, Path file, String caption) {
        String url = "https://api.telegram.org/bot" + botToken + "/sendDocument";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("chat_id", chatId);
        if (caption != null && !caption.isBlank()) {
            body.add("caption", truncate(caption.trim(), 1024));
        }
        body.add("document", new FileSystemResource(file.toFile()));

        HttpEntity<MultiValueMap<String, Object>> req = new HttpEntity<>(body, headers);
        ResponseEntity<String> resp = restTemplate.postForEntity(url, req, String.class);
        return resp.getStatusCode().is2xxSuccessful();
    }

    private boolean isTelegramEnabled() {
        if (!telegramProperties.isEnabled()) {
            return false;
        }
        try {
            SettingEntity s = settingRepository.findById(SettingEntity.SINGLETON_ID).orElse(null);
            if (s == null) {
                return false;
            }
            return Boolean.TRUE.equals(s.getTelegramEnabled());
        } catch (Exception e) {
            return false;
        }
    }

    private static String safe(String s, String fallback) {
        if (s == null || s.isBlank()) {
            return fallback;
        }
        return s;
    }

    private static String truncate(String s, int max) {
        if (s.length() <= max) {
            return s;
        }
        return s.substring(0, max) + "...";
    }

    private static String formatMoney(int amount) {
        return String.format("%,d đ", Math.max(0, amount));
    }

    private static String formatBytes(long bytes) {
        if (bytes < 1024) {
            return bytes + " B";
        }
        double kb = bytes / 1024.0;
        if (kb < 1024) {
            return String.format("%.1f KB", kb);
        }
        double mb = kb / 1024.0;
        return String.format("%.2f MB", mb);
    }
}
