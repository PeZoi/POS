package com.example.be.service;

import com.example.be.dto.request.auth.PinVerifyRequest;
import com.example.be.dto.response.auth.PinVerifyResponse;

public interface PinAuthService {

    PinVerifyResponse verify(PinVerifyRequest request, String clientLockKey, String clientIp);
}
