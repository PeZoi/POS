package com.example.be.controller;

import com.example.be.common.response.ApiResponse;
import com.example.be.dto.request.domain.DnsRecordUpsertRequest;
import com.example.be.dto.request.domain.DnsRecordsCreateRequest;
import com.example.be.dto.response.domain.DnsRecordsValuesResponseDto;
import com.example.be.service.DnsProviderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/domain")
@RequiredArgsConstructor
@Tag(name = "Domain", description = "Proxy domain/DNS (Cloudflare)")
public class DomainController {

    private final DnsProviderService dnsProviderService;

    @GetMapping("/dns-records")
    @Operation(summary = "Lấy DNS records (proxy qua backend)", description = "Proxy qua Cloudflare API")
    public ResponseEntity<ApiResponse<DnsRecordsValuesResponseDto>> dnsRecords() {
        return ResponseEntity.ok(ApiResponse.success(dnsProviderService.listRecords()));
    }

    @PostMapping("/dns-records")
    @Operation(summary = "Tạo DNS record(s) (proxy qua backend)", description = "Body: { records: [{ name, type, content, ttl, proxied }] }")
    public ResponseEntity<ApiResponse<String>> createDnsRecords(@RequestBody @Valid DnsRecordsCreateRequest request) {
        return ResponseEntity.ok(ApiResponse.created(dnsProviderService.createRecords(request)));
    }

    @PutMapping("/dns-records")
    @Operation(summary = "Cập nhật DNS record (proxy qua backend)", description = "Body: { id, name, type, content, ttl, proxied }")
    public ResponseEntity<ApiResponse<String>> updateDnsRecord(@RequestBody @Valid DnsRecordUpsertRequest request) {
        return ResponseEntity.ok(ApiResponse.updated(dnsProviderService.updateRecord(request)));
    }
}

