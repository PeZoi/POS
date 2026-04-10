package com.example.be.config;

import com.example.be.common.response.ApiResponse;
import com.example.be.common.response.ResponseCode;
import com.example.be.service.PosSessionTokenService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class PosSessionFilter extends OncePerRequestFilter {

    private static final String HEADER = "X-POS-Token";

    private static final ObjectMapper JSON = new ObjectMapper().registerModule(new JavaTimeModule());

    private final PosSessionTokenService posSessionTokenService;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String uri = request.getRequestURI();
        return !uri.startsWith("/api/");
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String uri = request.getRequestURI();
        String method = request.getMethod();

        if (isPublicApi(uri, method)) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = request.getHeader(HEADER);
        if (!posSessionTokenService.isValid(token)) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding("UTF-8");
            var body = ApiResponse.error(ResponseCode.UNAUTHORIZED, "Phiên hết hạn hoặc chưa nhập PIN", 401);
            JSON.writeValue(response.getOutputStream(), body);
            return;
        }

        filterChain.doFilter(request, response);
    }

    private static boolean isPublicApi(String uri, String method) {
        if ("OPTIONS".equalsIgnoreCase(method)) {
            return true;
        }
        if ("/api/auth/pin/verify".equals(uri) && "POST".equalsIgnoreCase(method)) {
            return true;
        }
        return "/api/settings/public".equals(uri) && "GET".equalsIgnoreCase(method);
    }
}
