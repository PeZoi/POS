package com.example.be.dto.response.setting;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

@Schema(description = "Cài đặt hệ thống (sau khi xác thực PIN)")
public record SettingResponse(
        @Schema(example = "Cửa hàng Quế Hường") String storeName,
        @Schema(example = "true") boolean enableQr,
        @Schema(example = "false") boolean enableCard,
        @Schema(example = "false") boolean enablePrint,
        @Schema(example = "false") boolean darkMode,
        @Schema(description = "Scanbot license key (dùng ở frontend)", example = "YOUR_SCANBOT_LICENSE_KEY") String scanbotLicenseKey,
        @Schema(example = "true") boolean telegramEnabled,
        @Schema(example = "true") boolean backupEnabled,
        @Schema(example = "02:00") String backupTime,
        LocalDateTime lastBackupAt,
        @Schema(description = "Cloudflare API Token (Bearer)") String cloudflareApiToken,
        @Schema(description = "Cloudflare Zone ID") String cloudflareZoneId,
        @Schema(description = "Root domain (dùng để nhận biết redirect)", example = "pos-toy.click") String rootDomain,
        @Schema(description = "Domain active hiện tại (root domain redirect sang)", example = "a1.pos-toy.click") String activeDomain
) {
}
