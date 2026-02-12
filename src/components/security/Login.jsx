import React, { useState } from 'react';
import { useSecurity } from '../../context/SecurityContext';
import { Lock, Mail, Key } from 'lucide-react';

const Login = () => {
    const { login, loginWithEmail, registerWithEmail } = useSecurity();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError('');
        try {
            const success = await login();
            if (!success) {
                setError('Access denied: Your account is not authorized.');
            }
        } catch (err) {
            console.error(err);
            setError('Failed to sign in with Google. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleEmailSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            setLoading(false);
            return;
        }

        try {
            let success;
            if (isRegistering) {
                success = await registerWithEmail(email, password);
                if (success) {
                    // If registration successful, we might need to explain they need to be whitelisted
                    // But existing logic in Context will sign them out if not valid.
                    // Let's assume the context handles the "Access denied" state mostly via the auth state change
                    // However, for better UX on registration we might want to say "Account created. Please contact admin for access."
                }
            } else {
                success = await loginWithEmail(email, password);
            }

            if (!success) {
                if (isRegistering) {
                    setError('Account created, but not authorized. Contact administrator.');
                } else {
                    setError('Access denied: Your account is not authorized or invalid credentials.');
                }
            }
        } catch (err) {
            console.error(err);
            if (err.code === 'auth/email-already-in-use') {
                setError('Email already in use.');
            } else if (err.code === 'auth/invalid-credential') {
                setError('Invalid email or password.');
            } else {
                setError(`Failed to ${isRegistering ? 'register' : 'sign in'}. Please try again.`);
            }
        } finally {
            setLoading(false);
        }
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

                    <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">STOA - Vault</h1>
                    <p className="text-slate-400 mb-8 text-center text-sm">
                        {isRegistering ? 'Create an account to access the Vault.' : 'Sign in to access the Vault.'}
                    </p>

                    <div className="w-full space-y-6">
                        {error && (
                            <p className="text-red-400 text-xs text-center animate-pulse bg-red-900/20 p-2 rounded border border-red-900/50">{error}</p>
                        )}

                        {/* Email/Password Form */}
                        <form onSubmit={handleEmailSubmit} className="space-y-4">
                            <div className="relative">
                                <Mail className="absolute left-3 top-3.5 h-5 w-5 text-slate-500" />
                                <input
                                    type="email"
                                    placeholder="Email address"
                                    className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors placeholder-slate-500"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="relative">
                                <Key className="absolute left-3 top-3.5 h-5 w-5 text-slate-500" />
                                <input
                                    type="password"
                                    placeholder="Password"
                                    className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors placeholder-slate-500"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-slate-700 hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-all duration-200"
                            >
                                {loading ? 'Processing...' : (isRegistering ? 'Create Account' : 'Sign In')}
                            </button>
                        </form>

                        <div className="relative flex items-center justify-center">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-600"></div>
                            </div>
                            <div className="relative bg-slate-800 px-4 text-sm text-slate-500">Or continue with</div>
                        </div>

                        <button
                            onClick={handleGoogleLogin}
                            disabled={loading}
                            className={`w-full flex justify-center items-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-slate-900 transition-all duration-200 shadow-lg hover:shadow-blue-500/25 ${loading ? 'opacity-75 cursor-not-allowed' : ''}`}
                        >
                            {loading && !email ? (
                                <span className="flex items-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Signing in...
                                </span>
                            ) : (
                                <span className="flex items-center">
                                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" />
                                    </svg>
                                    Sign in with Google
                                </span>
                            )}
                        </button>

                        <div className="text-center mt-4">
                            <button
                                onClick={() => {
                                    setIsRegistering(!isRegistering);
                                    setError('');
                                }}
                                className="text-sm text-blue-400 hover:text-blue-300 transition-colors focus:outline-none"
                            >
                                {isRegistering ? 'Already have an account? Sign In' : 'Need an account? Register'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
