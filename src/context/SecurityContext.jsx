import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, googleProvider } from '../config/firebase';
import { signInWithPopup, signOut, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { authorizedUsers } from '../config/authorizedUsers';

const SecurityContext = createContext();

export const useSecurity = () => useContext(SecurityContext);

export const SecurityProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                // Check if user email is in the authorized list
                if (authorizedUsers.includes(currentUser.email)) {
                    setUser(currentUser);
                    setIsAuthenticated(true);
                } else {
                    console.warn(`Unauthorized login attempt: ${currentUser.email}`);
                    // We don't automatically sign out here to allow the UI to show "Unauthorized" message if needed,
                    // or we can sign out. For now, let's keep consistency with previous logic but maybe we act differently for email?
                    // Actually, let's Stick to the previous logic: if not authorized, sign out.
                    signOut(auth);
                    setUser(null);
                    setIsAuthenticated(false);
                }
            } else {
                setUser(null);
                setIsAuthenticated(false);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const login = async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;
            if (authorizedUsers.includes(user.email)) {
                return true;
            } else {
                await signOut(auth);
                return false;
            }
        } catch (error) {
            console.error("Login failed", error);
            throw error;
        }
    };

    const loginWithEmail = async (email, password) => {
        try {
            const result = await signInWithEmailAndPassword(auth, email, password);
            const user = result.user;
            if (authorizedUsers.includes(user.email)) {
                return true;
            } else {
                await signOut(auth);
                return false;
            }
        } catch (error) {
            console.error("Email Login failed", error);
            throw error;
        }
    };

    const registerWithEmail = async (email, password) => {
        try {
            // We create the user in Firebase
            await createUserWithEmailAndPassword(auth, email, password);
            // The onAuthStateChanged will trigger. 
            // If the email is NOT in authorizedUsers, it will sign them out immediately effectively.
            // This is correct behavior for a whitelist system: you can register, but you can't get in unless whitelisted.
            return true;
        } catch (error) {
            console.error("Registration failed", error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
            setUser(null);
            setIsAuthenticated(false);
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    // Master Key Management
    // In a real production app, this should be handled more securely (e.g. user input, KMS).
    // For this implementation, we use an Environment Variable or a fallback.
    const [masterKey, setMasterKey] = useState(import.meta.env.VITE_MASTER_KEY || "DEV_MASTER_KEY_FALLBACK_123");

    useEffect(() => {
        // Optional: Warn if using fallback in specific environments
        if (!import.meta.env.VITE_MASTER_KEY) {
            console.warn("Security Warning: Using default DEV_MASTER_KEY. Please set VITE_MASTER_KEY in .env");
        }
    }, []);

    return (
        <SecurityContext.Provider value={{ user, isAuthenticated, login, loginWithEmail, registerWithEmail, logout, loading, masterKey }}>
            {!loading && children}
        </SecurityContext.Provider>
    );
};
