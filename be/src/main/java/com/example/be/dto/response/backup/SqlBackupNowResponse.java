package com.example.be.dto.response.backup;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

@Schema(name = "SqlBackupNowResponse", description = "Kết quả chạy backup SQL thủ công (Backup ngay)")
public record SqlBackupNowResponse(
        @Schema(example = "true") boolean ok,
        @Schema(example = "Backup thành công") String message,
        @Schema(example = "pos") String database,
        @Schema(example = "123456") long bytes,
        LocalDateTime finishedAt
) {
}

