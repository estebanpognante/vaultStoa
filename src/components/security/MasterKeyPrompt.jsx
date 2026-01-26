import React, { useState } from 'react';
import { useSecurity } from '../../context/SecurityContext';
import { Lock, ShieldCheck } from 'lucide-react';

const MasterKeyPrompt = () => {
    const { setMasterKey } = useSecurity();
    const [inputKey, setInputKey] = useState('');
    const [error, setError] = useState('');

    const handleUnlock = (e) => {
        e.preventDefault();
        if (inputKey.length < 8) {
            setError('Master Key must be at least 8 characters.');
            return;
        }
        // Set the key in volatile memory
        setMasterKey(inputKey);
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-slate-700 p-8 rounded-2xl shadow-2xl max-w-md w-full relative overflow-hidden">
                {/* Decorative Background Effect */}
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-32 h-32 bg-blue-500 rounded-full blur-3xl opacity-20"></div>
                <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-32 h-32 bg-purple-500 rounded-full blur-3xl opacity-20"></div>

                <div className="relative z-10 flex flex-col items-center">
                    <div className="bg-slate-700/50 p-4 rounded-full mb-6 ring-1 ring-slate-600">
                        <Lock className="w-10 h-10 text-blue-400" />
                    </div>

                    <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Vault-CRM</h1>
                    <p className="text-slate-400 mb-8 text-center text-sm">
                        Enter your Master Key to decrypt the secure vault.
                        This key is never stored and will be lost on refresh.
                    </p>

                    <form onSubmit={handleUnlock} className="w-full space-y-4">
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <ShieldCheck className="h-5 w-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                            </div>
                            <input
                                type="password"
                                className="block w-full pl-10 pr-3 py-3 border border-slate-600 rounded-lg leading-5 bg-slate-900/50 text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                placeholder="Enter Master Key"
                                value={inputKey}
                                onChange={(e) => setInputKey(e.target.value)}
                                autoFocus
                            />
                        </div>

                        {error && (
                            <p className="text-red-400 text-xs text-center animate-pulse">{error}</p>
                        )}

                        <button
                            type="submit"
                            className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-slate-900 transition-all duration-200 shadow-lg hover:shadow-blue-500/25"
                        >
                            Unlock Integrity System
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default MasterKeyPrompt;
