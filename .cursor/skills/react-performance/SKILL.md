---
name: react-performance
description: |
  Specialized skill for high-performance React development (React + Vite friendly).
  Focuses on eliminating waterfalls, optimizing re-renders, and efficient data fetching.
trigger:
  - when user asks "optimize frontend performance"
  - when reviewing frontend code
  - when implementing data fetching logic
  - when dealing with re-render issues
priority: high
---

# REACT PERFORMANCE SKILL

The agent acts as a **Frontend Performance Engineer**.
Goal: Ensure the React application is fast, scalable, and follows elite best practices.

---

# 1️⃣ ELIMINATING WATERFALLS (ASYNC)

Independent operations MUST be executed concurrently. Avoid sequential `await` calls that don't depend on each other.

**🔴 Incorrect (Sequential, 3 round trips):**
```typescript
const user = await fetchUser();
const posts = await fetchPosts();
const comments = await fetchComments();
```

**🟢 Correct (Parallel, 1 round trip):**
```typescript
const [user, posts, comments] = await Promise.all([
  fetchUser(),
  fetchPosts(),
  fetchComments()
]);
```

---

# 2️⃣ TANSTACK QUERY OPTIMIZATION

- **Stable Query Keys**: Always use stable query keys (e.g., `['users', userId]`).
- **Prefetching**: Use `queryClient.prefetchQuery` for data likely to be needed soon.
- **Cache Management**: Set appropriate `staleTime` to avoid unnecessary background refetches.

---

# 3️⃣ RE-RENDER OPTIMIZATION

- **Component Splitting**: Break large components into smaller ones so only the changed part re-renders.
- **Memoization**: Use `useMemo` for expensive calculations and `useCallback` for functions passed as props to memoized children.
- **Avoid Inline Objects**: Don't pass inline objects/arrays as props to components wrapped in `React.memo`.

# 4️⃣ REACT + VITE BEST PRACTICES

- **Code splitting**: Use `React.lazy` + `Suspense` for route-level or heavy components.
- **Bundle hygiene**: Avoid importing large libraries globally; import per-module and prefer lightweight alternatives.
- **Assets**: Prefer modern formats and lazy-load heavy images where appropriate (no `next/image` in Vite).
- **Avoid render-blocking work**: Move expensive computation off the render path; consider Web Workers for CPU-heavy tasks.

---

# 5️⃣ PERFORMANCE QUALITY GATE

During review, the agent MUST flag:
- [ ] Multiple independent `await` calls not wrapped in `Promise.all`.
- [ ] API calls inside `useEffect` (prefer TanStack Query).
- [ ] Passing huge objects as props to complex children without `useMemo`.
- [ ] Over-fetching (fetching data in multiple components instead of one shared query or normalized cache).

---

# 6️⃣ Vietnamese Support
When explaining performance issues, use Vietnamese for the context, but keep technical terms (rerender, waterfall, hydration) as standard convention.
