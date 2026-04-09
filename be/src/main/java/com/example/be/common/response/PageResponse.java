package com.example.be.common.response;

import java.util.List;

/**
 * Page response dạng \"slice\": không có totalElements/totalPages để tối ưu cho infinity scroll.
 */
public record PageResponse<T>(
        List<T> items,
        int page,
        int size,
        boolean hasNext
) {
}

