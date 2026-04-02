package com.example.be.dto.request.product;

import com.example.be.enums.ProductStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Schema(name = "ProductCreateRequest")
public record ProductCreateRequest(
        @Schema(example = "Gấu bông nhỏ") @NotBlank @Size(max = 255) String name,
        @Schema(example = "893000000001") @NotBlank @Size(max = 100) String barcode,
        @Schema(example = "59000") @NotNull @Min(0) Integer price,
        @Schema(example = "ACTIVE") @NotNull ProductStatus status,
        @Schema(example = "false", description = "true nếu sản phẩm được tạo tự động (từ flow scan, import, v.v.)")
        Boolean isAutoCreated
) {
}

