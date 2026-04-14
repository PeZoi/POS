package com.example.be.controller;

import com.example.be.config.TelegramProperties;
import com.example.be.entity.SettingEntity;
import com.example.be.repository.SettingRepository;
import com.example.be.util.ScanbotLicenseKeyNormalizer;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@RestController
@RequestMapping("/api/telegram")
@RequiredArgsConstructor
public class TelegramWebhookController {

    private static final Logger log = LoggerFactory.getLogger(TelegramWebhookController.class);

    private final TelegramProperties telegramProperties;
    private final SettingRepository settingRepository;

    private final RestTemplate restTemplate = new RestTemplate();

    @PostMapping("/webhook/{secret}")
    public ResponseEntity<Void> webhook(@PathVariable String secret, @RequestBody(required = false) Map<String, Object> update) {
        String expected = telegramProperties.getWebhookSecret();
        if (expected == null || expected.isBlank() || secret == null || !secret.equals(expected)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        if (update == null || update.isEmpty()) {
            return ResponseEntity.ok().build();
        }

        try {
            Map<String, Object> message = asMap(update.get("message"));
            if (message == null) {
                return ResponseEntity.ok().build();
            }
            String chatId = readChatId(message.get("chat"));
            String allowedChatId = telegramProperties.getChatId();
            if (allowedChatId == null || allowedChatId.isBlank() || chatId == null || !chatId.equals(allowedChatId)) {
                return ResponseEntity.ok().build();
            }

            String text = readString(message.get("text"));
            if (text == null || text.isBlank()) {
                return ResponseEntity.ok().build();
            }

            // Commands:
            // - /scanbot_key <LICENSE_KEY>
            // - /scanbot_key (hiển thị hướng dẫn)
            String trimmed = text.trim();
            if (!startsWithCommand(trimmed, "/scanbot_key") && !startsWithCommand(trimmed, "/set_scanbot_key")) {
                return ResponseEntity.ok().build();
            }

            String arg = extractCommandArg(trimmed);
            if (arg == null || arg.isBlank()) {
                sendReply(chatId, "Dùng lệnh:\n/scanbot_key <LICENSE_KEY>\nVí dụ:\n/scanbot_key ABCD-....");
                return ResponseEntity.ok().build();
            }

            SettingEntity s = settingRepository.findById(SettingEntity.SINGLETON_ID).orElse(null);
            if (s == null) {
                sendReply(chatId, "Không tìm thấy Settings trong DB (chưa khởi tạo).");
                return ResponseEntity.ok().build();
            }
            s.setScanbotLicenseKey(ScanbotLicenseKeyNormalizer.normalize(arg));
            settingRepository.save(s);
            sendReply(chatId, "Đã cập nhật SCANBOT_LICENSE_KEY.");
        } catch (Exception e) {
            log.warn("Telegram webhook error: {}", e.getMessage());
        }

        return ResponseEntity.ok().build();
    }

    private void sendReply(String chatId, String text) {
        String botToken = telegramProperties.getBotToken();
        if (botToken == null || botToken.isBlank() || chatId == null || chatId.isBlank()) {
            return;
        }
        String url = "https://api.telegram.org/bot" + botToken + "/sendMessage";
        restTemplate.postForEntity(url, Map.of("chat_id", chatId, "text", text == null ? "" : text), String.class);
    }

    private static boolean startsWithCommand(String text, String cmd) {
        if (text.equals(cmd)) return true;
        // Telegram có thể gửi "/cmd@botname ..."
        return text.startsWith(cmd + " ") || text.startsWith(cmd + "@");
    }

    private static String extractCommandArg(String text) {
        String[] parts = text.split("\\s+", 2);
        if (parts.length < 2) return "";
        return parts[1];
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> asMap(Object o) {
        return (o instanceof Map) ? (Map<String, Object>) o : null;
    }

    private static String readChatId(Object chatObj) {
        Map<String, Object> chat = asMap(chatObj);
        if (chat == null) return null;
        Object id = chat.get("id");
        return id == null ? null : String.valueOf(id);
    }

    private static String readString(Object o) {
        return o == null ? null : String.valueOf(o);
    }
}

