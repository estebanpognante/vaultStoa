# Vault-CRM Project Context

## Overview
Vault-CRM is a React-based CRM and Intranet application built with Vite and Firebase. It serves as a central hub for management, likely including a dashboard, data entry forms, and secure user authentication.

## Tech Stack
- **Frontend Framework**: React 19
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Routing**: React Router DOM 7
- **Backend/BaaS**: Firebase (Authentication, Firestore)
- **Encryption**: crypto-js

## Project Structure
- `src/`
  - `components/`: UI components organized by feature (dashboard, forms, security, common).
  - `config/`: Configuration files (Firebase setup, authorized users).
  - `context/`: React Context providers (e.g., SecurityContext for auth state).
  - `data/`: Static data files.
  - `services/`: API service layers (Firebase interactions).
  - `utils/`: Helper functions.
- `firebase.json` & `firestore.rules`: Firebase configuration and security rules.
- `tailwind.config.js`: Styling configuration.

## Key Features
- **Authentication**: secure login system using Firebase Auth.
- **Dashboard**: Main landing interface for authenticated users.
- **Role-Based Access**: Access control based on specific user emails/roles.
- **Forms**: Data entry interfaces for CRM entities.
