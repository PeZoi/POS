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
        // Ưu tiên các header thường gặp khi chạy sau reverse proxy / CDN
        String ip;

        // Cloudflare
        ip = firstNonEmpty(request.getHeader("CF-Connecting-IP"));
        if (isUsableIp(ip)) return ip;

        // Nginx / proxy
        ip = firstNonEmpty(request.getHeader("X-Real-IP"));
        if (isUsableIp(ip)) return ip;

        // Standard-ish
        ip = firstIpFromXff(request.getHeader("X-Forwarded-For"));
        if (isUsableIp(ip)) return ip;

        // RFC 7239 Forwarded: for=1.2.3.4;proto=https;by=...
        ip = firstIpFromForwarded(request.getHeader("Forwarded"));
        if (isUsableIp(ip)) return ip;

        String addr = request.getRemoteAddr();
        return isUsableIp(addr) ? addr : "unknown";
    }

    private static String firstNonEmpty(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    private static String firstIpFromXff(String xff) {
        if (xff == null || xff.isBlank()) return null;
        String first = xff.split(",")[0].trim();
        return first.isEmpty() ? null : first;
    }

    private static String firstIpFromForwarded(String forwarded) {
        if (forwarded == null || forwarded.isBlank()) return null;
        // lấy phần đầu tiên "for=..."
        String[] parts = forwarded.split(";");
        for (String p : parts) {
            String t = p.trim();
            if (t.regionMatches(true, 0, "for=", 0, 4)) {
                String v = t.substring(4).trim();
                // bỏ quote nếu có
                if (v.startsWith("\"") && v.endsWith("\"") && v.length() >= 2) {
                    v = v.substring(1, v.length() - 1).trim();
                }
                // Forwarded có thể là: for=1.2.3.4, for="[2001:db8::1]:1234"
                // bỏ ngoặc [] và port nếu có
                if (v.startsWith("[")) {
                    int end = v.indexOf(']');
                    if (end > 1) {
                        return v.substring(1, end);
                    }
                }
                int colon = v.indexOf(':');
                if (colon > 0 && v.indexOf('.') > -1) { // ipv4:port
                    return v.substring(0, colon);
                }
                return v;
            }
        }
        return null;
    }

    private static boolean isUsableIp(String ip) {
        if (ip == null) return false;
        String t = ip.trim();
        if (t.isEmpty() || "unknown".equalsIgnoreCase(t)) return false;
        // loại bỏ prefix thường gặp
        if (t.startsWith("::ffff:")) {
            t = t.substring("::ffff:".length());
        }
        // chấp nhận IPv4/IPv6 cơ bản (không validate strict)
        return t.matches("^[0-9a-fA-F:.]+$");
    }
}
