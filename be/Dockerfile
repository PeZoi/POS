ARG BUILD_IMAGE=eclipse-temurin:17-jdk-alpine
ARG RUNTIME_IMAGE=eclipse-temurin:17-jre-alpine

FROM ${BUILD_IMAGE} AS build
WORKDIR /app

# Cache tốt hơn: copy pom trước để tận dụng layer cache.
# (Không dùng dependency:go-offline vì một số môi trường DNS có thể chập chờn với Maven Central trong build container.)
COPY mvnw pom.xml ./
COPY .mvn .mvn
RUN chmod +x mvnw
COPY src src
RUN ./mvnw -q -B -DskipTests package

FROM ${RUNTIME_IMAGE}
ENV TZ=Asia/Ho_Chi_Minh
# mysqldump cho job backup SQL (SqlBackupScheduler) — JDBC tới mysql:3306 vẫn dùng client trong container này
# MySQL 8 default auth plugin = caching_sha2_password; cần plugin .so cho mariadb client trên Alpine
RUN apk add --no-cache mariadb-client mariadb-connector-c tzdata
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080

# Chạy non-root (an toàn hơn). Backup dir mặc định ./backups sẽ nằm trong /app/backups.
RUN addgroup -S app && adduser -S -G app app \
  && mkdir -p /app/backups \
  && chown -R app:app /app
USER app

ENTRYPOINT ["java","-jar","/app/app.jar"]
