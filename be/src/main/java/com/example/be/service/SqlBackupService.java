package com.example.be.service;

import com.example.be.dto.response.backup.SqlBackupNowResponse;

public interface SqlBackupService {

    /**
     * Chạy backup SQL ngay lập tức (không phụ thuộc lịch).
     * API sẽ trả kết quả thành công/thất bại theo tiến trình dump thực tế.
     */
    SqlBackupNowResponse backupNow();
}

