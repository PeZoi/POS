---
name: project-architecture
description: |
  Enforce fullstack project architecture standards for React (Vite) frontend and Spring Boot backend.
  Defines mandatory folder structures, API response contract, pagination rules,
  reusable utilities policy, Swagger documentation, and testing constraints.
trigger:
  - when creating new feature
  - when scaffolding project
  - when adding new module
  - when generating files
priority: high
---

# PROJECT ARCHITECTURE SKILL

This project follows a STRICT fullstack architecture.
Agent MUST follow all rules below when generating or modifying code.
Never invent new structure unless explicitly requested.

---

# GLOBAL PRINCIPLES

1. Follow existing architecture before creating new patterns.
2. Prefer reuse over creation.
3. Maintain strict separation of concerns.
4. Generate minimal and consistent changes.
5. Types must ALWAYS be separated from implementation.
6. Utilities must NEVER be duplicated.

---

# 1️⃣ FRONTEND ARCHITECTURE (React + Vite)

## Tech Stack

* React (Vite)
* TypeScript (recommended; follow existing project)
* Router (React Router) if the app needs pages/routes
* TanStack Query for server state (recommended)
* Zustand/Redux only for client state (optional)
* TailwindCSS/shadcn/ui (optional; only if already used in repo or requested)

## Required Folder Structure

```
src/
│
├── components/
├── features/
├── hooks/
├── services/
├── store/
├── types/
├── validation/
├── utils/
├── constants/
├── configs/
└── styles/
```

## Folder Responsibilities

### components/

Reusable UI only.
Rules:

* NO API CALL
* NO BUSINESS LOGIC
* presentation only

### features/

Feature-based isolation.

```typescript
features/
   auth/
      components/
      hooks/
      services/
      types.ts
      validation.ts
```

### pages/ or routes/ (OPTIONAL)

If the frontend uses page routing (e.g. React Router), place route-level components in:

```
src/pages/   (or)   src/routes/
```

Rules:

* pages/routes compose features + components
* must not contain low-level API code (use hooks/services)

### hooks/

Custom reusable hooks.
Rules:

* may call services
* no UI rendering

### services/

API communication layer.
Rules:

* ALL API calls go here
* NEVER call fetch/axios inside components
* responses must be typed

### store/

Global client state only.
Rules:

* server state MUST use TanStack Query (if used)

### types/ (MANDATORY)

Rules:

* NEVER inline reusable types
* ALL interfaces centralized

Examples:

```
types/user.type.ts
types/api-response.type.ts
```

### validation/

Zod schemas only.

### utils/ (CRITICAL)

Before creating a util:

1. Search utils folder
2. If exists → reuse
3. If not → create new
   Never duplicate helper logic.

## shadcn/ui Policy

When UI is required:

1. Check if component exists in shadcn/ui.
2. Ask user before installing (only if shadcn is used).
3. If exists → install via shadcn CLI.
4. If not → create custom Tailwind component.

## Frontend Data Flow

```
Component
   ↓
Hook (TanStack Query)
   ↓
Service
   ↓
Backend API
```

Components MUST NOT call API directly.

---

# 2️⃣ BACKEND ARCHITECTURE (Spring Boot)

## Stack

* Spring Boot
* Spring Security
* OAuth2
* JWT
* MySQL
* Swagger OpenAPI
* JUnit Tests

## Required Structure

```text
src/main/java/com/project/

├── config/
├── controller/
├── service/
│   └── impl/
├── repository/
├── dto/
│   ├── request/
│   └── response/
├── entity/
├── mapper/
├── enums/
├── exception/
├── security/
├── util/
├── validation/
└── common/
```

## Layer Responsibilities

### controller/

* REST endpoints only
* NO business logic
* must return ApiResponse<T>

### service/

Contains business logic using interface + implementation pattern.

### repository/

Spring Data JPA repositories only.

### dto/

Strict separation:

```
dto/request/
dto/response/
```

Entities MUST NEVER be returned directly.

### entity/

Database models only with JPA annotations.

### mapper/

Entity ↔ DTO mapping (prefer MapStruct).

### security/

Contains OAuth2 configuration, JWT filters, handlers, and security configs.

### exception/

Global error handling including GlobalExceptionHandler and custom exceptions.

### config/

Application configurations:

* security
* swagger
* cors

### util/

Reusable backend helpers.
Same duplication rule as frontend utils.

### validation/

Custom validation annotations.

---

# 3️⃣ GLOBAL API RESPONSE FORMAT (MANDATORY)

All backend APIs MUST return unified response structure.
Agent MUST NEVER return raw DTO or entity.

## Standard Response

```json
{
  "code": "SUCCESS_CODE",
  "message": "Human readable message",
  "status": 200,
  "data": {},
  "timestamp": "ISO_DATE_TIME"
}
```

## Backend Implementation

```text
common/
   response/
      ApiResponse.java
      ResponseCode.java
```

### ApiResponse

Generic wrapper:

```java
public class ApiResponse<T> {
    private String code;
    private String message;
    private int status;
    private T data;
    private LocalDateTime timestamp;
}
```

Rules:

* ALL controllers return ApiResponse<T>
* provide factory methods: success(), error()

### ResponseCode Enum

Examples:

```
SUCCESS
CREATED
UPDATED
DELETED
VALIDATION_ERROR
UNAUTHORIZED
FORBIDDEN
NOT_FOUND
INTERNAL_ERROR
```

Reuse existing codes before creating new ones.

### Controller Rule

Correct:

```java
return ResponseEntity.ok(ApiResponse.success(data));
```

Forbidden:

```java
return userDto;
```

---

# 4️⃣ PAGINATION DESIGN (CONDITIONAL)

Pagination is OPTIONAL.
Agent MUST ONLY implement pagination when user explicitly requests:

* pagination
* paging
* page list
* infinite scroll
* large dataset listing

If user does NOT request pagination → DO NOT implement.

## Request Format

```
?page=0
&size=10
&sort=createdAt,desc
```

Use Spring Pageable.

## Pagination Response

```json
{
  "code": "SUCCESS",
  "message": "Fetched successfully",
  "status": 200,
  "data": {
    "items": [],
    "page": 0,
    "size": 10,
    "totalItems": 100,
    "totalPages": 10,
    "hasNext": true,
    "hasPrevious": false
  },
  "timestamp": "..."
}
```

## Pagination Wrapper

```text
common/pagination/PageResponse.java
```

Example:

```java
public class PageResponse<T> {
    private List<T> items;
    private int page;
    private int size;
    private long totalItems;
    private int totalPages;
    private boolean hasNext;
    private boolean hasPrevious;
}
```

Service layer converts Page<Entity> → PageResponse<DTO>.

Frontend pagination rules:

* use TanStack Query
* include page & size in queryKey
  Example:

```typescript
['users', page, size]
```

Forbidden:

* auto add pagination
* paginate small datasets
* mix pagination and non-pagination responses

Decision logic:

```
IF pagination requested
    → use PageResponse
ELSE
    → use ApiResponse<T>
```

---

# 5️⃣ SWAGGER REQUIREMENT (MANDATORY)

Every endpoint MUST include:

* summary
* description
* request example
* response example
* error responses

Swagger must auto-update when APIs change.

---

# 6️⃣ TEST REQUIREMENT (MANDATORY)

Each API MUST include tests.

Structure:

```
src/test/java/.../controller/
```

Tests must include:

* success case
* validation failure
* unauthorized case

Tests must run during build.

---

# 7️⃣ AUTHENTICATION FLOW

OAuth2 login
↓
JWT issued
↓
JWT used for secured endpoints

Agent must integrate new endpoints with security rules.

---

# 8️⃣ FORBIDDEN ACTIONS

DO NOT:

* mix layers
* duplicate utilities
* inline reusable types
* bypass DTO layer
* call repository from controller
* call API directly from component

---

# 9️⃣ AGENT EXECUTION CHECKLIST

Before finishing any task:

* correct folder selected
* type separated
* util duplication checked
* swagger updated
* tests generated
* shadcn rule respected
* API response format respected
