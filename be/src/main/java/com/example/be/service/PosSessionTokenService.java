package com.example.be.service;

public interface PosSessionTokenService {

    String createToken();

    boolean isValid(String token);
}
