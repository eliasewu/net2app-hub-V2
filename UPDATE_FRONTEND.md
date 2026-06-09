# Frontend localStorage → PostgreSQL Migration

## Files to update (in order of priority):

### 1. src/store/AuthContext.tsx
- loadUsers() - Currently loads from localStorage 'pg_users_db' → Change to fetch from /api/users
- loadPasswords() - Currently loads from localStorage → Change to use /api/auth/login
- saveUsers() - Remove, use API
- savePasswords() - Remove, use API

### 2. src/store/DataContext.tsx
- load() function - Currently uses localStorage → Change to fetch from API
- save() function - Currently uses localStorage → Change to POST/PUT to API

### 3. src/pages/System/License.tsx
- loadLicense() - Change to fetch from /api/license
- saveLicense() - Change to POST /api/license

### 4. src/services/api.ts (already mostly correct)
- Already uses localStorage only for auth_token (this is OK)
- API calls already go to /api endpoints

## The server.cjs ALREADY handles all API endpoints with PostgreSQL
