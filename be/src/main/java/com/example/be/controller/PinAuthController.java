package com.example.be.controller;

import com.example.be.common.response.ApiResponse;
import com.example.be.dto.request.auth.PinVerifyRequest;
import com.example.be.dto.response.auth.PinVerifyResponse;
import com.example.be.service.PinAuthService;
import com.example.be.util.PinLockKeyResolver;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth/pin")
@RequiredArgsConstructor
@Tag(name = "PIN Auth", description = "Xac thuc ma PIN POS")
public class PinAuthController {

    private final PinAuthService pinAuthService;

    @PostMapping("/verify")
    @Operation(
            summary = "Xac thuc PIN",
            description = "Tra ve token; gui X-POS-Token. PIN mac dinh: 1234. "
                    + "Khoa nhap sai theo thiet bi: X-POS-Device-Id (UUID co dinh). "
                    + "Khong co header thi theo IP (X-Forwarded-For / remoteAddr)."
    )
    public ResponseEntity<ApiResponse<PinVerifyResponse>> verify(
            @RequestBody @Valid PinVerifyRequest request,
            HttpServletRequest httpRequest,
            @RequestHeader(value = PinLockKeyResolver.HEADER_DEVICE_ID, required = false) String deviceId
    ) {
        String lockKey = PinLockKeyResolver.resolveLockKey(httpRequest, deviceId);
        return ResponseEntity.ok(ApiResponse.success(pinAuthService.verify(request, lockKey)));
    }
}
