package com.example.be.util;

import jakarta.servlet.http.HttpServletRequest;

public final class PinLockKeyResolver {

    public static final String HEADER_DEVICE_ID = "X-POS-Device-Id";

    private PinLockKeyResolver() {
    }

    /**
     * Prefer stable device id header; otherwise fall back to client IP (X-Forwarded-For or remoteAddr).
     */
    public static String resolveLockKey(HttpServletRequest request, String deviceIdHeader) {
        String raw = deviceIdHeader == null ? null : deviceIdHeader.trim();
        if (raw != null && !raw.isEmpty() && raw.length() <= 64 && raw.matches("^[a-zA-Z0-9_-]+$")) {
            return "d:" + raw;
        }
        return "i:" + resolveClientIp(request);
    }

    public static String resolveClientIp(HttpServletRequest request) {
        if (request == null) {
            return "unknown";
        }
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        String addr = request.getRemoteAddr();
        return addr == null || addr.isBlank() ? "unknown" : addr;
    }
}
