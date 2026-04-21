package com.example.be.dto.response.domain;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record CloudflareResultInfo(
        int page,
        int per_page,
        int count,
        int total
) {
}

