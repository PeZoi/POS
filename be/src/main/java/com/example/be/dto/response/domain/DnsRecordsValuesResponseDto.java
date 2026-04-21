package com.example.be.dto.response.domain;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

@Schema(description = "Danh sách DNS records (camelCase cho frontend)")
public record DnsRecordsValuesResponseDto(
        List<DnsRecordResponseDto> data,
        int total,
        int limit,
        int offset
) {
}

