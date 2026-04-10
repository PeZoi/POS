package com.example.be.service.impl;

import com.example.be.dto.request.auth.PinVerifyRequest;
import com.example.be.dto.response.auth.PinVerifyResponse;
import com.example.be.entity.PinClientLockEntity;
import com.example.be.entity.SettingEntity;
import com.example.be.exception.NotFoundException;
import com.example.be.exception.PinLockedException;
import com.example.be.exception.UnauthorizedException;
import com.example.be.repository.PinClientLockRepository;
import com.example.be.repository.SettingRepository;
import com.example.be.service.PinAuthService;
import com.example.be.service.PosSessionTokenService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

@Service
@RequiredArgsConstructor
public class PinAuthServiceImpl implements PinAuthService {

    private final SettingRepository settingRepository;
    private final PinClientLockRepository pinClientLockRepository;
    private final PasswordEncoder passwordEncoder;
    private final PosSessionTokenService posSessionTokenService;

    @Value("${pos.session.ttl-seconds:43200}")
    private long sessionTtlSeconds;

    @Value("${pos.pin.max-failed-attempts:5}")
    private int maxFailedAttempts;

    @Value("${pos.pin.lock-duration-minutes:1}")
    private int lockDurationMinutes;

    @Override
    @Transactional(
            noRollbackFor = {UnauthorizedException.class, PinLockedException.class}
    )
    public PinVerifyResponse verify(PinVerifyRequest request, String clientLockKey) {
        SettingEntity settings = settingRepository.findById(SettingEntity.SINGLETON_ID)
                .orElseThrow(() -> new NotFoundException("Settings not initialized"));

        PinClientLockEntity lock = pinClientLockRepository.findById(clientLockKey)
                .orElseGet(() -> {
                    PinClientLockEntity e = new PinClientLockEntity();
                    e.setLockKey(clientLockKey);
                    e.setFailedAttempts(0);
                    return e;
                });

        LocalDateTime now = LocalDateTime.now();

        if (lock.getLockedUntil() != null) {
            if (now.isBefore(lock.getLockedUntil())) {
                long seconds = Math.max(1L, ChronoUnit.SECONDS.between(now, lock.getLockedUntil()));
                throw new PinLockedException(
                        "Đã khóa do nhập sai quá nhiều lần trên thiết bị này. Thử lại sau " + seconds + " giây.",
                        seconds
                );
            }
            lock.setLockedUntil(null);
            lock.setFailedAttempts(0);
        }

        if (!passwordEncoder.matches(request.pin(), settings.getPinHash())) {
            int failed = lock.getFailedAttempts() == null ? 0 : lock.getFailedAttempts();
            failed++;
            lock.setFailedAttempts(failed);

            if (failed >= maxFailedAttempts) {
                lock.setLockedUntil(now.plusMinutes(lockDurationMinutes));
                lock.setFailedAttempts(0);
                pinClientLockRepository.save(lock);
                long seconds = Math.max(1L, ChronoUnit.SECONDS.between(now, lock.getLockedUntil()));
                throw new PinLockedException(
                        "Đã nhập sai " + maxFailedAttempts + " lần. Thiết bị này bị khóa " + lockDurationMinutes + " phút.",
                        seconds
                );
            }

            pinClientLockRepository.save(lock);
            throw new UnauthorizedException("Sai mã PIN");
        }

        lock.setFailedAttempts(0);
        lock.setLockedUntil(null);
        pinClientLockRepository.save(lock);

        String token = posSessionTokenService.createToken();
        long exp = Instant.now().getEpochSecond() + sessionTtlSeconds;
        return new PinVerifyResponse(exp, token);
    }
}
