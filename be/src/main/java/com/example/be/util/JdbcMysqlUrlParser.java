package com.example.be.util;

import java.net.URI;
import java.net.URISyntaxException;

/**
 * Trích host, port, database từ {@code jdbc:mysql://...} (tương thích URL kiểu Spring).
 */
public final class JdbcMysqlUrlParser {

    public record MysqlTarget(String host, int port, String database) {
    }

    private JdbcMysqlUrlParser() {
    }

    /**
     * @param jdbcUrl ví dụ {@code jdbc:mysql://localhost:3306/pos?serverTimezone=UTC}
     */
    public static MysqlTarget parse(String jdbcUrl) {
        if (jdbcUrl == null || jdbcUrl.isBlank()) {
            throw new IllegalArgumentException("jdbcUrl is blank");
        }
        String u = jdbcUrl.trim();
        if (!u.startsWith("jdbc:mysql://") && !u.startsWith("jdbc:mariadb://")) {
            throw new IllegalArgumentException("Not a MySQL/MariaDB jdbc URL: " + u);
        }
        String scheme = u.startsWith("jdbc:mysql://") ? "jdbc:mysql://" : "jdbc:mariadb://";
        String rest = u.substring(scheme.length());
        int slash = rest.indexOf('/');
        if (slash < 0) {
            throw new IllegalArgumentException("Missing database segment in JDBC URL");
        }
        String hostPort = rest.substring(0, slash);
        String dbPart = rest.substring(slash + 1);
        int q = dbPart.indexOf('?');
        String database = (q >= 0 ? dbPart.substring(0, q) : dbPart).trim();
        if (database.isEmpty()) {
            throw new IllegalArgumentException("Empty database name in JDBC URL");
        }

        String host;
        int port;
        if (hostPort.startsWith("[")) {
            int endBracket = hostPort.indexOf(']');
            if (endBracket < 0) {
                throw new IllegalArgumentException("Invalid IPv6 host in JDBC URL");
            }
            host = hostPort.substring(1, endBracket);
            if (endBracket + 1 < hostPort.length() && hostPort.charAt(endBracket + 1) == ':') {
                port = Integer.parseInt(hostPort.substring(endBracket + 2));
            } else {
                port = 3306;
            }
        } else {
            try {
                URI synthetic = new URI("mysql://" + hostPort);
                host = synthetic.getHost();
                if (host == null || host.isBlank()) {
                    throw new IllegalArgumentException("Could not parse host from: " + hostPort);
                }
                port = synthetic.getPort() > 0 ? synthetic.getPort() : 3306;
            } catch (URISyntaxException e) {
                throw new IllegalArgumentException("Invalid host:port in JDBC URL: " + hostPort, e);
            }
        }
        return new MysqlTarget(host, port, database);
    }
}
