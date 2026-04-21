package com.example.be.dto.response.setting;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Thông tin hiển thị công khai (màn hình PIN)")
public record SettingPublicResponse(
        @Schema(example = "Cửa hàng Quế Hường") String storeName,
        @Schema(description = "Domain active hiện tại (root domain redirect sang)", example = "a1.pos-toy.click") String activeDomain
) {
}
