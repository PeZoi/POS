package com.example.be.service.impl;

import com.example.be.dto.request.setting.SettingUpdateRequest;
import com.example.be.dto.response.setting.SettingPublicResponse;
import com.example.be.dto.response.setting.SettingResponse;
import com.example.be.entity.SettingEntity;
import com.example.be.exception.BadRequestException;
import com.example.be.exception.NotFoundException;
import com.example.be.exception.UnauthorizedException;
import com.example.be.repository.SettingRepository;
import com.example.be.service.DnsProviderService;
import com.example.be.service.SettingService;
import com.example.be.util.ScanbotLicenseKeyNormalizer;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SettingServiceImpl implements SettingService {

    private final SettingRepository settingRepository;
    private final PasswordEncoder passwordEncoder;
    private final DnsProviderService dnsProviderService;

    @Override
    @Transactional(readOnly = true)
    public SettingPublicResponse getPublic() {
        SettingEntity e = loadSingleton();
        return new SettingPublicResponse(e.getStoreName(), e.getActiveDomain());
    }

    @Override
    @Transactional(readOnly = true)
    public SettingResponse get() {
        return toResponse(loadSingleton());
    }

    @Override
    @Transactional
    public SettingResponse update(SettingUpdateRequest req) {
        SettingEntity e = loadSingleton();
        String prevActiveDomain = e.getActiveDomain() == null ? "" : e.getActiveDomain().trim();

        if (req.storeName() != null) {
            String name = req.storeName().trim();
            if (name.isEmpty()) {
                throw new BadRequestException("storeName cannot be empty");
            }
            e.setStoreName(name);
        }
        if (req.enableQr() != null) {
            e.setEnableQr(req.enableQr());
        }
        if (req.enableCard() != null) {
            e.setEnableCard(req.enableCard());
        }
        if (req.enablePrint() != null) {
            e.setEnablePrint(req.enablePrint());
        }
        if (req.darkMode() != null) {
            e.setDarkMode(req.darkMode());
        }
        if (req.scanbotLicenseKey() != null) {
            // Chuyển toàn bộ normalize về BE (FE chỉ gửi raw key/snippet).
            e.setScanbotLicenseKey(ScanbotLicenseKeyNormalizer.normalize(req.scanbotLicenseKey()));
        }
        if (req.telegramEnabled() != null) {
            e.setTelegramEnabled(req.telegramEnabled());
        }
        if (req.backupEnabled() != null) {
            e.setBackupEnabled(req.backupEnabled());
        }
        if (req.backupTime() != null) {
            e.setBackupTime(req.backupTime());
        }
        if (req.cloudflareApiToken() != null) {
            e.setCloudflareApiToken(req.cloudflareApiToken().trim());
        }
        if (req.cloudflareZoneId() != null) {
            e.setCloudflareZoneId(req.cloudflareZoneId().trim());
        }
        if (req.rootDomain() != null) {
            String v = req.rootDomain().trim();
            if (v.isEmpty()) {
                throw new BadRequestException("rootDomain cannot be empty");
            }
            e.setRootDomain(v);
        }
        if (req.activeDomain() != null) {
            String v = req.activeDomain().trim();
            if (v.isEmpty()) {
                throw new BadRequestException("activeDomain cannot be empty");
            }
            e.setActiveDomain(v);
        }

        if (req.newPin() != null) {
            if (req.currentPin() == null) {
                throw new BadRequestException("currentPin is required when changing PIN");
            }
            if (!passwordEncoder.matches(req.currentPin(), e.getPinHash())) {
                throw new UnauthorizedException("Sai mã PIN");
            }
            e.setPinHash(passwordEncoder.encode(req.newPin()));
        }

        SettingEntity saved = settingRepository.save(e);

        // Nếu đổi activeDomain thì tự sync DNS record trùng tên (Cloudflare)
        String nextActiveDomain = saved.getActiveDomain() == null ? "" : saved.getActiveDomain().trim();
        if (req.activeDomain() != null && !prevActiveDomain.equalsIgnoreCase(nextActiveDomain)) {
            dnsProviderService.syncActiveDomainDnsName(prevActiveDomain, nextActiveDomain);
        }

        return toResponse(saved);
    }

    private SettingEntity loadSingleton() {
        return settingRepository.findById(SettingEntity.SINGLETON_ID)
                .orElseThrow(() -> new NotFoundException("Settings not initialized"));
    }

    private static SettingResponse toResponse(SettingEntity e) {
        return new SettingResponse(
                e.getStoreName(),
                Boolean.TRUE.equals(e.getEnableQr()),
                Boolean.TRUE.equals(e.getEnableCard()),
                Boolean.TRUE.equals(e.getEnablePrint()),
                Boolean.TRUE.equals(e.getDarkMode()),
                e.getScanbotLicenseKey(),
                Boolean.TRUE.equals(e.getTelegramEnabled()),
                Boolean.TRUE.equals(e.getBackupEnabled()),
                e.getBackupTime(),
                e.getLastBackupAt(),
                e.getCloudflareApiToken(),
                e.getCloudflareZoneId(),
                e.getRootDomain(),
                e.getActiveDomain()
        );
    }
}
