package com.example.be.web;

import com.example.be.entity.SettingEntity;
import com.example.be.repository.SettingRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.Set;

/**
 * Redirect động: nếu user vào root domain (pos-toy.click / www.pos-toy.click) thì 301 sang activeDomain.
 * Mục tiêu: đổi URL trên thanh địa chỉ user mà không cần redeploy Nginx mỗi lần đổi "active domain".
 */
@Component
public class RootDomainRedirectFilter extends OncePerRequestFilter {

    private static final Set<String> SKIP_PREFIXES = Set.of(
            "/api",
            "/swagger-ui",
            "/v3/api-docs"
    );

    private final SettingRepository settingRepository;

    private volatile Cached cached = new Cached(null, null, 0L);

    public RootDomainRedirectFilter(SettingRepository settingRepository) {
        this.settingRepository = settingRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        if (!isGetOrHead(request)) {
            filterChain.doFilter(request, response);
            return;
        }

        String path = request.getRequestURI();
        if (path != null) {
            for (String p : SKIP_PREFIXES) {
                if (path.startsWith(p)) {
                    filterChain.doFilter(request, response);
                    return;
                }
            }
        }

        // iOS "Add to Home Screen": mở start_url /?homescreen=1 để luôn vào root domain trước.
        // Sau khi FE load xong sẽ tự quyết định redirect (nếu cần).
        String homescreen = request.getParameter("homescreen");
        if ("1".equals(homescreen) || "true".equalsIgnoreCase(homescreen)) {
            filterChain.doFilter(request, response);
            return;
        }

        String host = safeLower(firstHeaderHost(request));
        Cached s = loadCached();
        if (s.rootDomain == null || s.activeDomain == null || s.activeDomain.isBlank()) {
            filterChain.doFilter(request, response);
            return;
        }

        boolean isRoot = host.equals(s.rootDomain) || host.equals("www." + s.rootDomain);
        if (!isRoot) {
            filterChain.doFilter(request, response);
            return;
        }

        // Anti-cache hop: nếu chưa có tmp, redirect về chính root với tmp=<timestamp>
        // để tránh dính cache redirect/DNS/socket ở một số browser.
        // Lưu ý: nếu browser đã cache 301/HSTS cứng và tự nhảy sang domain khác mà không gửi request,
        // thì không thể "chữa" hoàn toàn bằng server-side.
        if (request.getParameter("tmp") == null) {
            String proto = safeLower(request.getHeader("X-Forwarded-Proto"));
            if (proto == null || proto.isBlank()) proto = "https";
            String qs = request.getQueryString();
            String nextQs = (qs == null || qs.isBlank()) ? ("tmp=" + Instant.now().toEpochMilli()) : (qs + "&tmp=" + Instant.now().toEpochMilli());
            String location = proto + "://" + host + (path == null ? "/" : path) + "?" + nextQs;

            response.setStatus(HttpServletResponse.SC_FOUND);
            response.setHeader("Location", location);
            response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
            response.setHeader("Pragma", "no-cache");
            response.setDateHeader("Expires", 0);
            return;
        }

        // Tránh loop nếu activeDomain trùng root.
        if (host.equals(s.activeDomain)) {
            filterChain.doFilter(request, response);
            return;
        }

        String proto = safeLower(request.getHeader("X-Forwarded-Proto"));
        if (proto == null || proto.isBlank()) proto = "https";
        String qs = stripQueryParam(request.getQueryString(), "tmp");
        String location = proto + "://" + s.activeDomain + (path == null ? "/" : path) + (qs == null || qs.isBlank() ? "" : "?" + qs);

        // Dùng 302 để tránh browser cache cứng như 301 (active domain có thể đổi nhiều lần).
        response.setStatus(HttpServletResponse.SC_FOUND);
        response.setHeader("Location", location);
        response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
        response.setHeader("Pragma", "no-cache");
        response.setDateHeader("Expires", 0);
    }

    private Cached loadCached() {
        Cached cur = cached;
        long now = Instant.now().toEpochMilli();
        // Cache ngắn để đổi active domain "ăn liền" (tránh bị trễ do cache).
        // (Mọi caching ở browser/Cloudflare vẫn có thể tồn tại, nên FE sẽ kèm cache-buster khi lưu.)
        if (now - cur.loadedAtMs < 750 && cur.rootDomain != null && cur.activeDomain != null) {
            return cur;
        }
        SettingEntity e = settingRepository.findById(SettingEntity.SINGLETON_ID).orElse(null);
        if (e == null) {
            Cached next = new Cached(null, null, now);
            cached = next;
            return next;
        }
        String root = trimLower(e.getRootDomain());
        String active = trimLower(e.getActiveDomain());
        Cached next = new Cached(root, active, now);
        cached = next;
        return next;
    }

    private static boolean isGetOrHead(HttpServletRequest req) {
        String m = req.getMethod();
        return "GET".equalsIgnoreCase(m) || "HEAD".equalsIgnoreCase(m);
    }

    private static String firstHeaderHost(HttpServletRequest req) {
        String h = req.getHeader("X-Forwarded-Host");
        if (h == null || h.isBlank()) h = req.getHeader("Host");
        if (h == null) return "";
        // nếu dạng "a,b" lấy phần đầu
        int comma = h.indexOf(',');
        if (comma >= 0) h = h.substring(0, comma);
        // strip port
        int colon = h.indexOf(':');
        if (colon >= 0) h = h.substring(0, colon);
        return h.trim();
    }

    private static String safeLower(String s) {
        if (s == null) return null;
        return s.trim().toLowerCase();
    }

    private static String stripQueryParam(String qs, String key) {
        if (qs == null || qs.isBlank() || key == null || key.isBlank()) return qs;
        String k = key.trim();
        String[] parts = qs.split("&");
        StringBuilder out = new StringBuilder();
        for (String p : parts) {
            if (p == null || p.isBlank()) continue;
            String part = p.trim();
            // match "key" or "key=..."
            if (part.equals(k) || part.startsWith(k + "=")) continue;
            if (out.length() > 0) out.append('&');
            out.append(part);
        }
        return out.toString();
    }

    private static String trimLower(String s) {
        return s == null ? null : s.trim().toLowerCase();
    }

    private record Cached(String rootDomain, String activeDomain, long loadedAtMs) {}
}

