package com.example.be.service.impl;

import com.example.be.service.PosSessionTokenService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;

@Service
public class PosSessionTokenServiceImpl implements PosSessionTokenService {

    private static final String HMAC_ALGO = "HmacSHA256";

    @Value("${pos.session.secret:pos-dev-secret-change-in-production-min-32-chars}")
    private String secret;

    @Value("${pos.session.ttl-seconds:43200}")
    private long ttlSeconds;

    @Override
    public String createToken() {
        long exp = Instant.now().getEpochSecond() + ttlSeconds;
        String nonce = UUID.randomUUID().toString();
        String inner = exp + "|" + nonce;
        String sig = sign(inner);
        String payload = inner + "|" + sig;
        return Base64.getUrlEncoder().withoutPadding().encodeToString(payload.getBytes(StandardCharsets.UTF_8));
    }

    @Override
    public boolean isValid(String token) {
        if (token == null || token.isBlank()) {
            return false;
        }
        try {
            String decoded = new String(Base64.getUrlDecoder().decode(token), StandardCharsets.UTF_8);
            int last = decoded.lastIndexOf('|');
            if (last <= 0) {
                return false;
            }
            String inner = decoded.substring(0, last);
            String sig = decoded.substring(last + 1);
            if (!constantTimeEquals(sign(inner), sig)) {
                return false;
            }
            int sep = inner.indexOf('|');
            if (sep <= 0) {
                return false;
            }
            long exp = Long.parseLong(inner.substring(0, sep));
            return Instant.now().getEpochSecond() <= exp;
        } catch (RuntimeException e) {
            return false;
        }
    }

    private String sign(String message) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGO);
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), HMAC_ALGO));
            byte[] raw = mac.doFinal(message.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(raw);
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new IllegalStateException("HMAC init failed", e);
        }
    }

    private static boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null || a.length() != b.length()) {
            return false;
        }
        int r = 0;
        for (int i = 0; i < a.length(); i++) {
            r |= a.charAt(i) ^ b.charAt(i);
        }
        return r == 0;
    }
}
