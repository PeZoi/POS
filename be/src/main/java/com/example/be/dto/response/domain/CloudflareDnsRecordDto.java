package com.example.be.dto.response.domain;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record CloudflareDnsRecordDto(
        String id,
        @JsonProperty("zone_id") String zoneId,
        String type,
        String name,
        String content,
        Integer ttl,
        Boolean proxied,
        Integer priority,
        String comment,
        @JsonProperty("created_on") String createdOn,
        @JsonProperty("modified_on") String modifiedOn
) {
}

