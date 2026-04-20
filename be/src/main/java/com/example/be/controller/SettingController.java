package com.example.be.controller;

import com.example.be.common.response.ApiResponse;
import com.example.be.dto.request.setting.SettingUpdateRequest;
import com.example.be.dto.response.backup.SqlBackupNowResponse;
import com.example.be.dto.response.setting.SettingPublicResponse;
import com.example.be.dto.response.setting.SettingResponse;
import com.example.be.service.SettingService;
import com.example.be.service.SqlBackupService;
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
@RequestMapping("/api/settings")
@RequiredArgsConstructor
@Tag(name = "Settings", description = "Cài đặt hệ thống")
public class SettingController {

    private final SettingService settingService;
    private final SqlBackupService sqlBackupService;

    @GetMapping("/public")
    @Operation(summary = "Cài đặt công khai", description = "Không cần PIN — dùng cho màn hình khoá")
    public ResponseEntity<ApiResponse<SettingPublicResponse>> getPublic() {
        return ResponseEntity.ok(ApiResponse.success(settingService.getPublic()));
    }

    @GetMapping
    @Operation(summary = "Lấy cài đặt đầy đủ", description = "Cần header X-POS-Token")
    public ResponseEntity<ApiResponse<SettingResponse>> get() {
        return ResponseEntity.ok(ApiResponse.success(settingService.get()));
    }

    @PutMapping
    @Operation(summary = "Cập nhật cài đặt", description = "Đổi PIN: gửi currentPin + newPin (đúng 4 số)")
    public ResponseEntity<ApiResponse<SettingResponse>> update(@RequestBody @Valid SettingUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.updated(settingService.update(request)));
    }

    @PostMapping("/backup/now")
    @Operation(summary = "Backup SQL ngay", description = "Chạy dump MySQL ngay lập tức, không cần chờ lịch")
    public ResponseEntity<ApiResponse<SqlBackupNowResponse>> backupNow() {
        return ResponseEntity.ok(ApiResponse.success(sqlBackupService.backupNow()));
    }
}
