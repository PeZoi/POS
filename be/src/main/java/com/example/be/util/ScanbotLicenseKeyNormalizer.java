package com.example.be.util;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class ScanbotLicenseKeyNormalizer {

    private static final Pattern QUOTED = Pattern.compile("\"((?:\\\\.|[^\"\\\\])*)\"");

    private ScanbotLicenseKeyNormalizer() {
    }

    /**
     * Dành cho input Telegram/snippet: hỗ trợ join các đoạn "..." và đổi \\n -> newline.
     */
    public static String normalize(String raw) {
        if (raw == null) {
            return "";
        }
        String s = raw;
        if (s.trim().isEmpty()) {
            return "";
        }

        // Heuristic: nếu có dấu " và có LICENSE_KEY hoặc có dấu + nối chuỗi => parse kiểu snippet
        boolean looksLikeSnippet = s.contains("\"") && (s.contains("LICENSE_KEY") || s.contains("+") || s.contains("="));
        if (!looksLikeSnippet) {
            // Với key dán trực tiếp: giữ newline nhưng bỏ khoảng trắng/tab thừa ở đầu/cuối mỗi dòng
            return normalizeWhitespaceAroundLines(s);
        }

        StringBuilder out = new StringBuilder();
        Matcher m = QUOTED.matcher(s);
        int n = 0;
        while (m.find()) {
            n++;
            // Nếu trong snippet có literal \n thì chuyển thành xuống dòng thật.
            out.append(unescapeNewlines(m.group(1)));
        }

        // Nếu không bắt được chuỗi quoted nào thì fallback input gốc
        if (n == 0) {
            return normalizeWhitespaceAroundLines(s);
        }
        return normalizeWhitespaceAroundLines(out.toString());
    }

    /**
     * Dành cho input từ FE (đã format ở client): chỉ sanitize nhẹ để tránh lỗi copy-paste.
     * - Giữ newline
     * - Chuẩn hoá CRLF -> LF
     * - Xoá space/tab thừa ở đầu/cuối mỗi dòng
     */
    public static String sanitizeOnly(String raw) {
        if (raw == null) {
            return "";
        }
        if (raw.trim().isEmpty()) {
            return "";
        }
        return normalizeWhitespaceAroundLines(raw);
    }

    private static String unescapeNewlines(String s) {
        StringBuilder out = new StringBuilder(s.length());
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c != '\\' || i == s.length() - 1) {
                out.append(c);
                continue;
            }
            char n = s.charAt(++i);
            switch (n) {
                case 'n' -> out.append('\n');
                case 'r' -> out.append('\r');
                case 't' -> out.append('\t');
                case '\\' -> out.append('\\');
                case '"' -> out.append('"');
                default -> out.append('\\').append(n);
            }
        }
        return out.toString();
    }

    /**
     * Giữ nguyên newline, nhưng xoá space/tab ở đầu/cuối mỗi dòng (hay gặp khi copy-paste).
     * Đồng thời chuẩn hoá CRLF về LF để ổn định.
     */
    private static String normalizeWhitespaceAroundLines(String s) {
        String x = s.replace("\r\n", "\n").replace("\r", "\n");
        String[] lines = x.split("\n", -1);
        StringBuilder out = new StringBuilder(x.length());
        for (int i = 0; i < lines.length; i++) {
            String line = stripSpacesTabs(lines[i]);
            out.append(line);
            if (i < lines.length - 1) {
                out.append('\n');
            }
        }
        return out.toString();
    }

    private static String stripSpacesTabs(String s) {
        int start = 0;
        int end = s.length();
        while (start < end) {
            char c = s.charAt(start);
            if (c == ' ' || c == '\t') {
                start++;
            } else {
                break;
            }
        }
        while (end > start) {
            char c = s.charAt(end - 1);
            if (c == ' ' || c == '\t') {
                end--;
            } else {
                break;
            }
        }
        return s.substring(start, end);
    }
}

