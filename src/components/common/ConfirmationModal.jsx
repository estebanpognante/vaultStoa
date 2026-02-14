import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Eliminar", cancelText = "Cancelar", isDestructive = true }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
                        <AlertTriangle className="w-6 h-6 text-red-600" />
                    </div>

                    <h3 className="text-xl font-bold text-center text-slate-800 mb-2">
                        {title}
                    </h3>

                    <p className="text-slate-600 text-center mb-6">
                        {message}
                    </p>

                    <div className="flex space-x-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-200"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className={`flex-1 px-4 py-2 text-white rounded-lg font-medium transition-colors shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 
                                ${isDestructive
                                    ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500 shadow-red-500/30'
                                    : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 shadow-blue-500/30'
                                }`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
