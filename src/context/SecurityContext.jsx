import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, googleProvider, db } from '../config/firebase';
import { signInWithPopup, signOut, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';

const SecurityContext = createContext();

export const useSecurity = () => useContext(SecurityContext);

export const SecurityProvider = ({ children }) => {
    const [user, setUser] = useState(null); // This user object will contain { ...firebaseUser, role, ownerId }
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                try {
                    // Fetch user profile from Firestore
                    const userDocRef = doc(db, 'users', currentUser.uid);
                    const userSnap = await getDoc(userDocRef);

                    if (userSnap.exists()) {
                        const userData = userSnap.data();
                        setUser({ ...currentUser, ...userData, id: currentUser.uid });
                        setIsAuthenticated(true);
                    } else {
                        // Check if there is a pending invite for this email
                        const q = query(collection(db, 'users'), where('email', '==', currentUser.email));
                        const inviteSnap = await getDocs(q);

                        if (!inviteSnap.empty) {
                            // Invite Found! Claim it.
                            const inviteDoc = inviteSnap.docs[0];
                            const inviteData = inviteDoc.data();

                            if (inviteDoc.id !== currentUser.uid) {
                                console.log("Found invite for email:", currentUser.email);

                                const newUserData = {
                                    ...inviteData,
                                    id: currentUser.uid, // Set correct ID
                                    status: 'Active', // Activate status
                                    linkedAt: serverTimestamp()
                                };

                                // Create the real user doc with UID
                                await setDoc(userDocRef, newUserData);

                                // Delete the old invite doc
                                await deleteDoc(doc(db, 'users', inviteDoc.id));

                                setUser({ ...currentUser, ...newUserData });
                                setIsAuthenticated(true);
                                setLoading(false);
                                return;
                            }
                        }

                        // Bootstrapping Logic for SuperAdmin
                        // If the email matches the hardcoded Owner, create the profile automatically
                        if (currentUser.email === 'estebanpognante@gmail.com') {
                            const newSuperAdmin = {
                                email: currentUser.email,
                                role: 'superadmin',
                                ownerId: currentUser.uid, // SuperAdmin owns their own data
                                displayName: currentUser.displayName || 'Super Admin',
                                createdAt: serverTimestamp(),
                            };
                            await setDoc(userDocRef, newSuperAdmin);
                            setUser({ ...currentUser, ...newSuperAdmin, id: currentUser.uid });
                            setIsAuthenticated(true);
                            console.log("SuperAdmin profile created automatically.");
                        } else {
                            // If not the Owner email and no profile exists, they are unauthorized.
                            console.warn(`Unauthorized login attempt (No Profile): ${currentUser.email}`);
                            await signOut(auth);
                            setUser(null);
                            setIsAuthenticated(false);
                        }
                    }
                } catch (error) {
                    console.error("Error fetching user profile:", error);
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
            await signInWithPopup(auth, googleProvider);
            // The onAuthStateChanged listener handles the rest
            return true;
        } catch (error) {
            console.error("Login failed", error);
            throw error;
        }
    };

    const loginWithEmail = async (email, password) => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
            // The onAuthStateChanged listener handles the rest
            return true;
        } catch (error) {
            console.error("Email Login failed", error);
            throw error;
        }
    };

    const registerWithEmail = async (email, password) => {
        try {
            // New Registration Logic:
            // Ideally, only existing users invited (pre-created in DB) can "register/login".
            // Since we rely on 'users' collection for authorization, 
            // creating a Firebase Auth user alone isn't enough.
            // However, the 'invite' flow typically creates the auth user OR waits for them to sign up.
            // Here we just create the Auth user. If an Admin has pre-created their Firestore doc (invite),
            // then onAuthStateChanged will pick it up (mapping by email would be needed, but for now we map by UID).

            // NOTE: The current plan relies on admins creating the user doc *after* the user has a UID,
            // OR inviting by email and creating a doc with that email *before* they sign up (requires different logic).
            // Simplified approach: Admin creates a "Pending Invite" doc. When user signs up, we match email.
            // For now, let's keep it simple: registration creates Auth user. Listener checks Firestore.
            // If they weren't invited (no doc), they get logged out.

            await createUserWithEmailAndPassword(auth, email, password);
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

    // Master Key Management (Optional/Legacy, keeping for compatibility if needed)
    const [masterKey, setMasterKey] = useState(import.meta.env.VITE_MASTER_KEY || "DEV_MASTER_KEY_FALLBACK_123");

    useEffect(() => {
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
