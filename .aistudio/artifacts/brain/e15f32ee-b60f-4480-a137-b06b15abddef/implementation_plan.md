# Fix "Firestore REST list failed (403)" in Admin Command Console

Eliminates the `Firestore REST list failed (403)` / `Failed to fetch user list` error in the **Admin Command Console** while preserving strict owner-only document isolation in Firestore.

## User Review & Critical Decisions

> [!IMPORTANT]
> **Root Cause of `Firestore REST list failed (403)`:**
> Your Firebase project (`script-automation-studio`) enforces strict owner-only document access (`request.auth.uid == userId`), which allows reading your own `/users/{uid}` document (`getFirestoreDoc`) but blocks listing all documents across `/users` (`listFirestoreCollection`) using a client ID token (`403 PERMISSION_DENIED`).
>
> **How This Fix Solves It Permanently (100% Free):**
> 1. **Resilient Fallback in `GET /api/admin/users` (`server.ts`)**: When `listFirestoreCollection("users", token)` returns `403`, `server.ts` automatically falls back to reading your live admin profile via `getFirestoreDoc("users", userInfo.uid, token)` combined with a lightweight server-side authenticated user directory registry (updated whenever a user signs in or configures their API key).
> 2. **Automatic Profile Sync Ping (`AuthContext.tsx` $\rightarrow$ `POST /api/user/sync-directory`)**: Whenever any user signs in, the client sends their non-sensitive profile summary (`name`, `email`, `provider`, `hasApiKey`, `apiKeyMasked`) to the server directory registry so your Admin Command Console always displays every active user without needing permissive collection-wide Firestore `list` rules.
>
> Click **Proceed** to apply this fix immediately.

---

## 1. Overview & Core Concept

- **What It Does**: Prevents `GET /api/admin/users` from failing with a `500 / 403` error when Firestore enforces strict per-user document isolation, by maintaining a server-side masked user directory registry and falling back gracefully when `listFirestoreCollection` is restricted.
- **Target Audience / Persona**: Platform owner (`tahsinirshad7370@gmail.com`).
- **Key Value**: Your Admin Command Console works reliably 100% of the time, AND your Firestore database stays locked down so no client token can ever scrape the `/users` collection.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  - Opening **Admin Command Console** immediately loads the user directory without throwing `Failed to fetch user list` or `Firestore REST list failed (403)`.
  - Clicking **Refresh Directory** updates the list cleanly.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Server-Side Masked Directory Registry + Graceful `403` Fallback**
  - *Chosen Approach*: Store non-sensitive user metadata (`userId`, `name`, `email`, `provider`, `hasApiKey`, `apiKeyMasked`, `createdAt`, `updatedAt`) in a server-managed directory map (persisted to `.data/user-directory.json` on the server) whenever users authenticate, save/remove an API key, or delete their account. In `GET /api/admin/users`, try `listFirestoreCollection("users", token)` first, and if Firestore returns `403`, return the merged server directory + live owner profile (`getFirestoreDoc("users", userInfo.uid, token)`).
  - *Why*: Works on Firebase Spark ($0 cost), requires zero extra Firestore reads, and never fails even when Firestore blocks collection-wide listing.

---

## 4. Technical Architecture & Data Strategy

```
┌───────────────────────────────────────────────────────────────────┐
│               ADMIN COMMAND CONSOLE (AdminModal.tsx)              │
│                     GET /api/admin/users                          │
└─────────────────────────────────┬─────────────────────────────────┘
                                  │ Bearer ID Token
                                  ▼
┌───────────────────────────────────────────────────────────────────┐
│                  EXPRESS SERVER (server.ts)                       │
│  1. Verify caller is tahsinirshad7370@gmail.com                   │
│  2. Try listFirestoreCollection("users", token)                   │
│  3. If 403 (Owner-Only Firestore Rules):                          │
│     • Fetch getFirestoreDoc("users", adminUid, token)             │
│     • Merge with Server Masked User Directory Registry            │
│     • Return 200 OK { users } (Never throws 500/403)              │
└───────────────────────────────────────────────────────────────────┘
```

### Interactive Component & State Mapping
- **`server.ts`**:
  - Add a server-side masked user directory registry (`upsertDirectoryUser` / `removeDirectoryUser`) persisted safely on disk and updated automatically in `verifyUserAuth`, `/api/user/save-key`, `/api/user/remove-key`, `/api/user/delete-account`, and a new `/api/user/sync-directory` endpoint.
  - Wrap `listFirestoreCollection("users", token)` in `/api/admin/users` in a `try/catch` that falls back to `getFirestoreDoc("users", userInfo.uid, token)` + the server directory registry so it never throws a `403` or `500`.
- **`src/context/AuthContext.tsx`**:
  - After fetching the user's profile on sign-in, fire a non-blocking `POST /api/user/sync-directory` request so all signed-in users appear in the Admin Command Console directory.
