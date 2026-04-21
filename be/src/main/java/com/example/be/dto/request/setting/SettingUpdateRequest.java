package com.example.be.dto.request.setting;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@Schema(description = "Cập nhật cài đặt; đổi PIN cần currentPin + newPin (mỗi mã 4 số)")
public record SettingUpdateRequest(
        @Size(max = 255) String storeName,
        Boolean enableQr,
        Boolean enableCard,
        Boolean enablePrint,
        Boolean darkMode,
        @Schema(description = "Scanbot license key (dùng ở frontend)")
        @Size(max = 4096) String scanbotLicenseKey,
        @Schema(description = "Bật/tắt gửi thông báo Telegram (cần cấu hình bot token + chat id trên server)")
        Boolean telegramEnabled,
        @Schema(description = "Bật/tắt backup SQL (mysqldump) mỗi ngày")
        Boolean backupEnabled,
        @Schema(description = "Giờ chạy backup mỗi ngày (HH:mm), ví dụ 02:00")
        @Pattern(regexp = "^([01]\\d|2[0-3]):[0-5]\\d$", message = "backupTime must be HH:mm (00:00-23:59)")
        String backupTime,
        @Schema(description = "Cloudflare API Token (Bearer)", example = "eyJ...") @Size(max = 255) String cloudflareApiToken,
        @Schema(description = "Cloudflare Zone ID", example = "023e105f4ecef8ad9ca31a8372d0c353") @Size(max = 64) String cloudflareZoneId,
        @Schema(description = "Root domain (dùng để nhận biết redirect)", example = "pos-toy.click") @Size(max = 255) String rootDomain,
        @Schema(description = "Domain active hiện tại (root domain redirect sang)", example = "a1.pos-toy.click")
        @Size(max = 255) String activeDomain,
        @Pattern(regexp = "^\\d{4}$", message = "newPin must be 4 digits")
        String newPin,
        @Pattern(regexp = "^\\d{4}$", message = "currentPin must be 4 digits")
        String currentPin
) {
}
