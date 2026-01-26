import React, { createContext, useContext, useState, useEffect } from 'react';

const SecurityContext = createContext();

export const useSecurity = () => useContext(SecurityContext);

export const SecurityProvider = ({ children }) => {
    const [masterKey, setMasterKeyState] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Volatile storage: Key is only in State.
    // We do NOT save to localStorage.

    const setMasterKey = (key) => {
        if (key && key.length > 0) {
            setMasterKeyState(key);
            setIsAuthenticated(true);
            return true;
        }
        return false;
    };

    const clearMasterKey = () => {
        setMasterKeyState(null);
        setIsAuthenticated(false);
    };

    return (
        <SecurityContext.Provider value={{ masterKey, isAuthenticated, setMasterKey, clearMasterKey }}>
            {children}
        </SecurityContext.Provider>
    );
};
