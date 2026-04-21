package com.example.be.dto.request.domain;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

@Schema(description = "Tạo DNS records (Cloudflare)")
public record DnsRecordsCreateRequest(
        @NotEmpty @Valid List<DnsRecordUpsertRequest> records
) {
}

