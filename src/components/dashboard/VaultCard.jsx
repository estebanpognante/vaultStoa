import React, { useState } from 'react';
import { Eye, EyeOff, Copy, ExternalLink, Key } from 'lucide-react';
import { useSecurity } from '../../context/SecurityContext';
import { EncryptionService } from '../../services/encryptionService';

const VaultCard = ({ entry }) => {
    const { masterKey } = useSecurity();
    const [decryptedPassword, setDecryptedPassword] = useState(null);
    const [isVisible, setIsVisible] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleToggleVisibility = () => {
        if (isVisible) {
            setIsVisible(false);
            setDecryptedPassword(null);
        } else {
            // Decrypt
            if (!masterKey) return; // Should be handled by global state
            const plain = EncryptionService.decrypt(entry.password, masterKey);
            setDecryptedPassword(plain);
            setIsVisible(true);
        }
    };

    const handleCopy = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy', err);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col">
            <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center space-x-3">
                        <div className="bg-blue-50 p-2 rounded-lg">
                            <Key className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-800 text-lg">{entry.serviceName}</h3>
                            <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">{entry.category}</span>
                        </div>
                    </div>
                    {entry.accessUrl && (
                        <a href={entry.accessUrl} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-blue-500 transition-colors">
                            <ExternalLink className="w-4 h-4" />
                        </a>
                    )}
                </div>

                <div className="space-y-3">
                    <div>
                        <label className="text-xs text-slate-400 font-medium uppercase">Username</label>
                        <div className="flex items-center justify-between group">
                            <p className="text-slate-700 font-mono text-sm">{entry.username}</p>
                            <button onClick={() => handleCopy(entry.username)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-100 rounded transition-all">
                                <Copy className="w-3 h-3 text-slate-400" />
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs text-slate-400 font-medium uppercase">Password</label>
                        <div className="flex items-center justify-between mt-1 bg-slate-50 p-2 rounded border border-slate-100">
                            <div className="font-mono text-sm text-slate-800 break-all">
                                {isVisible ? (decryptedPassword || <span className="text-red-500 text-xs">Decryption Failed</span>) : '••••••••••••'}
                            </div>
                            <div className="flex items-center space-x-1 pl-2">
                                {isVisible && (
                                    <button onClick={() => handleCopy(decryptedPassword)} className="p-1.5 hover:bg-slate-200 rounded text-slate-500 transition-colors" title="Copy">
                                        {copied ? <span className="text-xs text-green-600 font-bold">✓</span> : <Copy className="w-4 h-4" />}
                                    </button>
                                )}
                                <button onClick={handleToggleVisibility} className="p-1.5 hover:bg-slate-200 rounded text-slate-500 transition-colors" title={isVisible ? "Hide" : "Show"}>
                                    {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer / Meta */}
            {(entry.deviceName || entry.ipAddress) && (
                <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>{entry.deviceName || 'No Device Linked'}</span>
                    <span className="font-mono">{entry.ipAddress}</span>
                </div>
            )}
        </div>
    );
};

export default VaultCard;
