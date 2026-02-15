# Vault-CRM Security & Database Configuration

## Database
- **Platform**: Cloud Firestore (Firebase).
- **Configuration**: Defined in `src/config/firebase.js` and `firebase.json`.

## Authentication & Authorization
- **Authentication Provider**: Firebase Auth.
- **Authorization Logic**:
  - **Client-side Check**: `src/config/authorizedUsers.js` contains an allowed list of emails.
    - Current allowed users: `estebanpognante@gmail.com`, `admin@example.com`.
  - **Server-side Enforcement**: `firestore.rules` enforces read/write access based on authentication token email.

## Security Rules (`firestore.rules`)
Access is restricted to authenticated users whose email matches the hardcoded allowed list.
```
allow read, write: if request.auth != null && 
  (request.auth.token.email == 'estebanpognante@gmail.com' || 
   request.auth.token.email == 'admin@example.com');
```

## Encryption
- **Library**: `crypto-js` (^4.2.0) is installed, suggesting client-side encryption capabilities for sensitive data before storage or transmission.

## Security Context
- **Context Provider**: `src/context/SecurityContext` manages the authentication state and exposes it to the application via `useSecurity` hook.
- **Protected Routes**: The main `App.jsx` checks `isAuthenticated` from `useSecurity` to conditionally render the `Dashboard` or `Login` screen.
