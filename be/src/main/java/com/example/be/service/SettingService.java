package com.example.be.service;

import com.example.be.dto.request.setting.SettingUpdateRequest;
import com.example.be.dto.response.setting.SettingPublicResponse;
import com.example.be.dto.response.setting.SettingResponse;

public interface SettingService {

    SettingPublicResponse getPublic();

    SettingResponse get();

    SettingResponse update(SettingUpdateRequest request);
}
