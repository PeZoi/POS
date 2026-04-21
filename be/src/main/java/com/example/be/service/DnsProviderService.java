package com.example.be.service;

import com.example.be.dto.request.domain.DnsRecordUpsertRequest;
import com.example.be.dto.request.domain.DnsRecordsCreateRequest;
import com.example.be.dto.response.domain.DnsRecordsValuesResponseDto;

public interface DnsProviderService {
    DnsRecordsValuesResponseDto listRecords();

    String createRecords(DnsRecordsCreateRequest request);

    String updateRecord(DnsRecordUpsertRequest request);

    /**
     * Khi đổi activeDomain, tự động rename DNS record có name trùng activeDomain cũ sang activeDomain mới.
     * Trả về số record đã cập nhật.
     */
    int syncActiveDomainDnsName(String oldActiveDomain, String newActiveDomain);
}

