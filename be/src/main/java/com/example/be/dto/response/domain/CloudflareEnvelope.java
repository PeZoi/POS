package com.example.be.dto.response.domain;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record CloudflareEnvelope(
        boolean success,
        List<Object> errors,
        List<Object> messages,
        Object result,
        @JsonProperty("result_info") CloudflareResultInfo resultInfo
) {
}

