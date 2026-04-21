package com.example.be.dto.response.domain;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "DNS record (đã chuyển sang camelCase cho frontend)")
public record DnsRecordResponseDto(
        String id,
        String zoneId,
        String name,
        String nameUnicode,
        String type,
        String content,
        int ttl,
        int priority,
        String createdAt,
        String updatedAt,
        boolean proxied,
        String proxyStatus,
        String comment
) {
}

