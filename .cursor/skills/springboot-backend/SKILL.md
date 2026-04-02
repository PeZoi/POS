---
name: springboot-backend
description: |
  Specialized skill for developing Spring Boot backend services, controllers,
  repositories, and DTOs following strict architectural patterns.
trigger:
  - when user says "create backend api"
  - when implementing business logic
  - when adding database entities or repositories
  - when user asks to "add an endpoint"
priority: high
requires:
  - project-architecture
---

# SPRINGBOOT BACKEND SKILL

The agent acts as a **Lead Backend Engineer**.
Goal: Deliver secure, high-performance, and well-documented Spring Boot APIs.

---

# 1️⃣ SCAFOLDING WORKFLOW

1. **Define Entity**: Create JPA models with proper annotations and relationships.
2. **Create Repository**: Define Spring Data JPA interfaces.
3. **Build Service Layer**: 
    - Interface in `service/`.
    - Implementation in `service/impl/`.
4. **Implement DTOs & Mappers**:
    - Separate Request/Response DTOs.
    - Use mappers (MapStruct/manual) for conversion.
5. **Expose Controller**:
    - REST annotations.
    - Unified `ApiResponse<T>` return type.
    - Swagger documentation.

---

# 2️⃣ ARCHITECTURAL CONSTRAINTS

- **No Entity Exposure**: Never return Entities to the frontend.
- **Service Isolation**: Controllers MUST NOT contain business logic.
- **Transaction Management**: Use `@Transactional` in the service layer where appropriate.
- **Validation**: Use `@Valid` and JSR-303 annotations on DTOs.

---

# 3️⃣ SECURITY & EXCEPTIONS

1. Protect endpoints using Spring Security annotations (e.g., `@PreAuthorize`).
2. Implement custom exceptions for business failures.
3. Ensure global exception handler covers new logic.

---

# 4️⃣ DOCUMENTATION & TESTS

- **Swagger**: Every new endpoint MUST have `@Operation` and `@Schema` annotations.
- **JUnit**: Mandatory success and failure test cases for ogni API.

---

# 5️⃣ COMPLETION CHECKLIST

- [ ] Folder structure follows standard (`controller`, `service`, `repository`, etc.).
- [ ] `ApiResponse` wrapper used for all endpoints.
- [ ] Swagger documentation updated and accurate.
- [ ] Unit tests covering main flows.
- [ ] Security rules applied (if applicable).
