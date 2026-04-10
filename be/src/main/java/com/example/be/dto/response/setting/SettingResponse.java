package com.example.be.dto.response.setting;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Cài đặt hệ thống (sau khi xác thực PIN)")
public record SettingResponse(
        @Schema(example = "Cửa hàng Quế Hường") String storeName,
        @Schema(example = "true") boolean enableQr,
        @Schema(example = "false") boolean enableCard,
        @Schema(example = "false") boolean enablePrint,
        @Schema(example = "false") boolean darkMode
) {
}
