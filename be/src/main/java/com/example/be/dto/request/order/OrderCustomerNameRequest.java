package com.example.be.dto.request.order;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(name = "OrderCustomerNameRequest")
public record OrderCustomerNameRequest(
        @Schema(example = "Nguyễn Văn A", description = "Tên khách hàng (có thể bỏ trống/null)") String customerName
) {
}

