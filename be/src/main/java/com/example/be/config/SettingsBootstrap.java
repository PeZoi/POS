package com.example.be.config;

import com.example.be.entity.SettingEntity;
import com.example.be.repository.SettingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@Order(0)
@RequiredArgsConstructor
public class SettingsBootstrap implements ApplicationRunner {

    private final SettingRepository settingRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(ApplicationArguments args) {
        if (settingRepository.findById(SettingEntity.SINGLETON_ID).isEmpty()) {
            SettingEntity e = new SettingEntity();
            e.setId(SettingEntity.SINGLETON_ID);
            e.setStoreName("Cửa hàng");
            e.setPinHash(passwordEncoder.encode("1234"));
            e.setEnableQr(true);
            e.setEnableCard(false);
            e.setEnablePrint(false);
            e.setDarkMode(false);
            e.setTelegramEnabled(false);
            e.setBackupEnabled(false);
            e.setBackupTime("02:00");
            settingRepository.save(e);
        }
    }
}
