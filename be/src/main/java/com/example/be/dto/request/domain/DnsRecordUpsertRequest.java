package com.example.be.dto.request.domain;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Schema(description = "Tạo/cập nhật DNS record (Cloudflare)")
public record DnsRecordUpsertRequest(
        @Schema(description = "DNS record id (bắt buộc khi update)") @Size(max = 64) String id,
        @NotBlank @Size(max = 255) String name,
        @NotBlank @Size(max = 20) String type,
        @NotBlank @Size(max = 1024) String content,
        @Min(60) @Max(86400) int ttl,
        @NotNull Boolean proxied
) {
}

