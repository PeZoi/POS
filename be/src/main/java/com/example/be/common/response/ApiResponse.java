package com.example.be.common.response;

import java.time.LocalDateTime;

public record ApiResponse<T>(
        String code,
        String message,
        int status,
        T data,
        LocalDateTime timestamp
) {
    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(ResponseCode.SUCCESS.name(), "Success", 200, data, LocalDateTime.now());
    }

    public static <T> ApiResponse<T> created(T data) {
        return new ApiResponse<>(ResponseCode.CREATED.name(), "Created", 201, data, LocalDateTime.now());
    }

    public static <T> ApiResponse<T> updated(T data) {
        return new ApiResponse<>(ResponseCode.UPDATED.name(), "Updated", 200, data, LocalDateTime.now());
    }

    public static <T> ApiResponse<T> deleted(T data) {
        return new ApiResponse<>(ResponseCode.DELETED.name(), "Deleted", 200, data, LocalDateTime.now());
    }

    public static <T> ApiResponse<T> error(ResponseCode code, String message, int status) {
        return new ApiResponse<>(code.name(), message, status, null, LocalDateTime.now());
    }

    public static <T> ApiResponse<T> error(ResponseCode code, String message, int status, T data) {
        return new ApiResponse<>(code.name(), message, status, data, LocalDateTime.now());
    }
}

