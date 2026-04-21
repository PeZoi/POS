package com.example.be.service.impl;

import com.example.be.dto.request.domain.DnsRecordUpsertRequest;
import com.example.be.dto.request.domain.DnsRecordsCreateRequest;
import com.example.be.dto.response.domain.CloudflareDnsRecordDto;
import com.example.be.dto.response.domain.DnsRecordResponseDto;
import com.example.be.dto.response.domain.DnsRecordsValuesResponseDto;
import com.example.be.entity.SettingEntity;
import com.example.be.exception.BadRequestException;
import com.example.be.exception.NotFoundException;
import com.example.be.repository.SettingRepository;
import com.example.be.service.DnsProviderService;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.RequiredArgsConstructor;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class CloudflareDnsProviderServiceImpl implements DnsProviderService {

    private static final String CF_BASE = "https://api.cloudflare.com/client/v4";

    private final SettingRepository settingRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    @Override
    public DnsRecordsValuesResponseDto listRecords() {
        SettingEntity s = loadSettings();
        String zoneId = require(s.getCloudflareZoneId(), "cloudflareZoneId");
        String token = require(s.getCloudflareApiToken(), "cloudflareApiToken");

        String url = UriComponentsBuilder
                .fromUriString(CF_BASE + "/zones/" + zoneId + "/dns_records")
                .queryParam("per_page", 50)
                .queryParam("page", 1)
                .toUriString();

        ResponseEntity<CfEnvelope<List<CloudflareDnsRecordDto>>> resp = restTemplate.exchange(
                url,
                HttpMethod.GET,
                new HttpEntity<>(buildHeaders(token)),
                new ParameterizedTypeReference<>() {}
        );

        CfEnvelope<List<CloudflareDnsRecordDto>> env = resp.getBody();
        if (env == null || !env.success || env.result == null) {
            throw new BadRequestException("Cloudflare trả về lỗi");
        }

        int total = env.resultInfo != null ? env.resultInfo.total : env.result.size();
        int limit = env.resultInfo != null ? env.resultInfo.perPage : env.result.size();
        int offset = env.resultInfo != null ? (Math.max(1, env.resultInfo.page) - 1) * env.resultInfo.perPage : 0;

        return new DnsRecordsValuesResponseDto(
                env.result.stream().map(this::toResponse).toList(),
                total,
                limit,
                offset
        );
    }

    @Override
    public String createRecords(DnsRecordsCreateRequest request) {
        SettingEntity s = loadSettings();
        String zoneId = require(s.getCloudflareZoneId(), "cloudflareZoneId");
        String token = require(s.getCloudflareApiToken(), "cloudflareApiToken");
        String rootDomain = safe(s.getRootDomain());

        if (request == null || request.records() == null || request.records().isEmpty()) {
            throw new BadRequestException("records is required");
        }

        for (DnsRecordUpsertRequest r : request.records()) {
            String fqdn = normalizeName(rootDomain, r.name());
            Map<String, Object> payload = buildUpsertPayload(fqdn, r);
            String url = CF_BASE + "/zones/" + zoneId + "/dns_records";
            ResponseEntity<CfEnvelope<Object>> resp = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    new HttpEntity<>(payload, buildHeaders(token)),
                    new ParameterizedTypeReference<>() {}
            );
            CfEnvelope<Object> env = resp.getBody();
            if (env == null || !env.success) {
                throw new BadRequestException("Cloudflare tạo record thất bại");
            }
        }
        return "Success";
    }

    @Override
    public String updateRecord(DnsRecordUpsertRequest request) {
        SettingEntity s = loadSettings();
        String zoneId = require(s.getCloudflareZoneId(), "cloudflareZoneId");
        String token = require(s.getCloudflareApiToken(), "cloudflareApiToken");
        String rootDomain = safe(s.getRootDomain());

        if (request == null || safe(request.id()).isBlank()) {
            throw new BadRequestException("id is required");
        }

        String fqdn = normalizeName(rootDomain, request.name());
        Map<String, Object> payload = buildUpsertPayload(fqdn, request);
        String url = CF_BASE + "/zones/" + zoneId + "/dns_records/" + request.id().trim();
        ResponseEntity<CfEnvelope<Object>> resp = restTemplate.exchange(
                url,
                HttpMethod.PUT,
                new HttpEntity<>(payload, buildHeaders(token)),
                new ParameterizedTypeReference<>() {}
        );
        CfEnvelope<Object> env = resp.getBody();
        if (env == null || !env.success) {
            throw new BadRequestException("Cloudflare cập nhật record thất bại");
        }
        return "Success";
    }

    @Override
    public int syncActiveDomainDnsName(String oldActiveDomain, String newActiveDomain) {
        String oldActive = safe(oldActiveDomain).toLowerCase();
        String nextActive = safe(newActiveDomain).toLowerCase();
        if (oldActive.isBlank() || nextActive.isBlank() || Objects.equals(oldActive, nextActive)) {
            return 0;
        }

        SettingEntity s = loadSettings();
        String zoneId = require(s.getCloudflareZoneId(), "cloudflareZoneId");
        String token = require(s.getCloudflareApiToken(), "cloudflareApiToken");
        String rootDomain = safe(s.getRootDomain()).toLowerCase();

        String oldFqdn = normalizeName(rootDomain, oldActive).toLowerCase();
        String nextFqdn = normalizeName(rootDomain, nextActive).toLowerCase();
        if (oldFqdn.isBlank() || nextFqdn.isBlank() || Objects.equals(oldFqdn, nextFqdn)) {
            return 0;
        }

        String url = UriComponentsBuilder
                .fromUriString(CF_BASE + "/zones/" + zoneId + "/dns_records")
                .queryParam("per_page", 500)
                .queryParam("page", 1)
                .toUriString();

        ResponseEntity<CfEnvelope<List<CloudflareDnsRecordDto>>> resp = restTemplate.exchange(
                url,
                HttpMethod.GET,
                new HttpEntity<>(buildHeaders(token)),
                new ParameterizedTypeReference<>() {}
        );
        CfEnvelope<List<CloudflareDnsRecordDto>> env = resp.getBody();
        if (env == null || !env.success || env.result == null) {
            throw new BadRequestException("Cloudflare trả về lỗi");
        }

        int updated = 0;
        for (CloudflareDnsRecordDto r : env.result) {
            if (r == null || safe(r.id()).isBlank()) continue;
            String rn = safe(r.name()).toLowerCase();
            if (!rn.equals(oldFqdn)) continue;

            Map<String, Object> payload = new java.util.HashMap<>();
            payload.put("type", r.type());
            payload.put("name", nextFqdn);
            payload.put("content", r.content());
            // Cloudflare yêu cầu ttl hợp lệ; nếu null thì để 1 (auto)
            payload.put("ttl", r.ttl() == null ? 1 : r.ttl());
            if (r.proxied() != null) payload.put("proxied", r.proxied());

            String putUrl = CF_BASE + "/zones/" + zoneId + "/dns_records/" + r.id().trim();
            ResponseEntity<CfEnvelope<Object>> putResp = restTemplate.exchange(
                    putUrl,
                    HttpMethod.PUT,
                    new HttpEntity<>(payload, buildHeaders(token)),
                    new ParameterizedTypeReference<>() {}
            );
            CfEnvelope<Object> putEnv = putResp.getBody();
            if (putEnv == null || !putEnv.success) {
                throw new BadRequestException("Cloudflare đổi tên record thất bại");
            }
            updated++;
        }

        return updated;
    }

    private SettingEntity loadSettings() {
        return settingRepository.findById(SettingEntity.SINGLETON_ID)
                .orElseThrow(() -> new NotFoundException("Settings not initialized"));
    }

    private static HttpHeaders buildHeaders(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setAccept(MediaType.parseMediaTypes("application/json"));
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Bearer " + token);
        return headers;
    }

    private static String require(String value, String field) {
        String v = safe(value);
        if (v.isBlank()) {
            throw new BadRequestException("Chưa cấu hình " + field + " trong Settings");
        }
        return v;
    }

    private static String normalizeName(String rootDomain, String input) {
        String name = safe(input);
        if (name.isBlank()) return name;
        if ("@".equals(name)) return safe(rootDomain);
        if (name.contains(".")) return name;
        if (safe(rootDomain).isBlank()) return name;
        return name + "." + rootDomain;
    }

    private static String safe(String s) {
        return s == null ? "" : s.trim();
    }

    private static Map<String, Object> buildUpsertPayload(String fqdn, DnsRecordUpsertRequest r) {
        Map<String, Object> payload = new java.util.HashMap<>();
        payload.put("type", r.type());
        payload.put("name", fqdn);
        payload.put("content", r.content());
        payload.put("ttl", r.ttl());
        if (r.proxied() != null) payload.put("proxied", r.proxied());
        return payload;
    }

    private DnsRecordResponseDto toResponse(CloudflareDnsRecordDto r) {
        boolean proxied = Boolean.TRUE.equals(r.proxied());
        int ttl = r.ttl() == null ? 1 : r.ttl();
        int priority = r.priority() == null ? 0 : r.priority();
        return new DnsRecordResponseDto(
                r.id(),
                r.zoneId(),
                r.name(),
                r.name(),
                r.type(),
                r.content(),
                ttl,
                priority,
                r.createdOn(),
                r.modifiedOn(),
                proxied,
                proxied ? "active" : "off",
                r.comment()
        );
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class CfEnvelope<T> {
        @JsonProperty("success")
        public boolean success;
        @JsonProperty("result")
        public T result;
        @JsonProperty("result_info")
        public ResultInfo resultInfo;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class ResultInfo {
        @JsonProperty("page")
        public int page;
        @JsonProperty("per_page")
        public int perPage;
        @JsonProperty("total")
        public int total;
    }
}

