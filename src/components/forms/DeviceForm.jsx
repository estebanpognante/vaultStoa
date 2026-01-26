import React, { useState, useEffect } from 'react';
import { useSecurity } from '../../context/SecurityContext'; // New Import
import { EncryptionService } from '../../services/encryptionService'; // New Import
import { generateSearchVector } from '../../utils/searchVectorGenerator';
import { db } from '../../config/firebase';
import { collection, addDoc, doc, updateDoc, Timestamp, query, where, onSnapshot, getDocs } from 'firebase/firestore'; // Added getDocs
import { Save, X, Monitor, UserPlus, Info, Check, Key, Trash2, User } from 'lucide-react'; // Added User icon for visual indication

const DeviceForm = ({ companyId, initialData, onClose, onSuccess, onAddStaff }) => {
    const { masterKey } = useSecurity(); // Get Master Key
    const [formData, setFormData] = useState({
        deviceName: '',
        deviceType: 'Notebook',
        brand: '',
        model: '',
        serialNumber: '',
        processor: '',
        ramAmount: '',
        storageInfo: '',
        ipAddressStatic: '', // Kept
        status: 'In_Use',
        assignedUserIds: [],
        localAccounts: [] // New: Array of { username, password (encrypted) }
    });

    // Temporary state for new local account input
    const [newAccount, setNewAccount] = useState({ username: '', password: '' });

    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingStaff, setLoadingStaff] = useState(true);

    useEffect(() => {
        if (initialData) {
            setFormData({
                ...initialData,
                // Ensure localAccounts exists if editing old record
                localAccounts: initialData.localAccounts || []
            });
        }
    }, [initialData]);

    // Fetch Staff for Multi-select
    useEffect(() => {
        if (!companyId) return;

        const companyRef = doc(db, 'companies', companyId);
        const q = query(collection(db, 'staff'), where('companyId', '==', companyRef));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setStaffList(list);
            setLoadingStaff(false);
        });

        return () => unsubscribe();
    }, [companyId]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const toggleUserAssignment = (staffId) => {
        const currentAssignments = formData.assignedUserIds || [];
        if (currentAssignments.includes(staffId)) {
            setFormData({ ...formData, assignedUserIds: currentAssignments.filter(id => id !== staffId) });
        } else {
            setFormData({ ...formData, assignedUserIds: [...currentAssignments, staffId] });
        }
    };

    // --- Local Account Logic ---
    const handleAddAccount = () => {
        if (!newAccount.username || !newAccount.password) return alert("Ingrese usuario y contraseña");
        if (!masterKey) return alert("Error de Seguridad: Falta Master Key");

        const encrypted = EncryptionService.encrypt(newAccount.password, masterKey);
        if (!encrypted) return alert("Error al encriptar");

        setFormData({
            ...formData,
            localAccounts: [...(formData.localAccounts || []), {
                username: newAccount.username,
                password: encrypted,
                assignedUserId: newAccount.assignedUserId || '' // Link to functionality
            }]
        });
        setNewAccount({ username: '', password: '', assignedUserId: '' }); // Reset
    };

    const handleRemoveAccount = (index) => {
        const updated = [...(formData.localAccounts || [])];
        updated.splice(index, 1);
        setFormData({ ...formData, localAccounts: updated });
    };
    // ---------------------------

    const syncToVault = async (deviceId, deviceName, accounts) => {
        // This function ensures every local account has a corresponding Vault Entry
        // for searchability and unity.
        if (!accounts || accounts.length === 0) return;

        const currentVaultEntriesQuery = query(
            collection(db, 'vault_entries'),
            where('relatedId', '==', deviceId),
            where('category', '==', 'Device_Password')
        );

        const snapshot = await import('firebase/firestore').then(mod => mod.getDocs(currentVaultEntriesQuery));
        const existingEntries = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        for (const acc of accounts) {
            const match = existingEntries.find(e => e.username === acc.username);

            // Generate Search Vector
            const search_vector = generateSearchVector(
                `${deviceName} - ${acc.username}`,
                acc.username,
                'Device_Password',
                'Clave Local'
            );

            const payload = {
                category: 'Device_Password',
                serviceName: `${deviceName} - ${acc.username}`, // Standard Naming
                accessUrl: 'Local Device',
                username: acc.username,
                password: acc.password, // Already Encrypted
                relatedType: 'device',
                relatedId: deviceId,
                secondaryRelatedId: acc.assignedUserId || null, // The Physical Person
                search_vector,
                companyId: doc(db, 'companies', companyId)
            };

            if (match) {
                // Update if changed
                await updateDoc(doc(db, 'vault_entries', match.id), payload);
            } else {
                // Create new
                await addDoc(collection(db, 'vault_entries'), payload);
            }
        }
    };

    const [showUnsavedModal, setShowUnsavedModal] = useState(false);

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();

        // Validation: Check for unsaved Local Account data
        if (!showUnsavedModal && (newAccount.username || newAccount.password || newAccount.assignedUserId)) {
            setShowUnsavedModal(true);
            return;
        }

        if (!companyId && !initialData) return alert("Error: No se seleccionó empresa.");

        setLoading(true);
        try {
            let deviceId = initialData?.id;

            if (initialData) {
                await updateDoc(doc(db, 'devices', initialData.id), formData);
            } else {
                const docRef = await addDoc(collection(db, 'devices'), {
                    ...formData,
                    companyId: doc(db, 'companies', companyId),
                    purchaseDate: Timestamp.now()
                });
                deviceId = docRef.id;
            }

            // Sync Local Accounts to Vault
            if (deviceId && formData.localAccounts?.length > 0) {
                await syncToVault(deviceId, formData.deviceName, formData.localAccounts);
            }

            if (onSuccess) onSuccess(deviceId);
            if (onClose) onClose();
        } catch (error) {
            console.error("Error saving device:", error);
            alert("Error al guardar dispositivo: " + error.message);
        } finally {
            setLoading(false);
            setShowUnsavedModal(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative my-8">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
                    <div className="flex items-center space-x-2">
                        <Monitor className="w-5 h-5 text-purple-600" />
                        <h2 className="text-xl font-bold text-slate-800">Nuevo Dispositivo</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                        {/* Users Assignment Section */}
                        <div className="md:col-span-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-sm font-medium text-slate-700 uppercase tracking-wider flex items-center">
                                    <UserPlus className="w-4 h-4 mr-2" />
                                    Asignación de Usuarios
                                </h3>
                                <button
                                    type="button"
                                    onClick={onAddStaff}
                                    className="text-xs flex items-center text-blue-600 hover:text-blue-800 font-medium"
                                >
                                    <UserPlus className="w-3 h-3 mr-1" />
                                    Nuevo Personal
                                </button>
                            </div>

                            {loadingStaff ? (
                                <div className="text-xs text-slate-500">Cargando personal...</div>
                            ) : (
                                <div className="space-y-2">
                                    <select
                                        className="block w-full rounded-lg border-slate-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm p-2 bg-white"
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                toggleUserAssignment(e.target.value);
                                                e.target.value = ''; // Reset
                                            }
                                        }}
                                        defaultValue=""
                                    >
                                        <option value="" disabled>Seleccionar usuario para asignar...</option>
                                        {staffList.filter(s => !(formData.assignedUserIds || []).includes(s.id)).map(s => (
                                            <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.position})</option>
                                        ))}
                                    </select>

                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {(formData.assignedUserIds || []).map(uid => {
                                            const user = staffList.find(s => s.id === uid);
                                            return (
                                                <span key={uid} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                                    {user ? `${user.firstName} ${user.lastName}` : 'Usuario Desconocido'}
                                                    <button type="button" onClick={() => toggleUserAssignment(uid)} className="ml-1.5 inline-flex text-purple-600 hover:text-purple-800 focus:outline-none">
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </span>
                                            );
                                        })}
                                        {(formData.assignedUserIds || []).length === 0 && (
                                            <span className="text-xs text-slate-400 italic">Ningún usuario asignado.</span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Identifiers */}
                        <div className="md:col-span-3">
                            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">Identificación</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Nombre Equipo</label>
                                    <input required name="deviceName" value={formData.deviceName} onChange={handleChange} className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm p-2.5 border" placeholder="NB-VENTAS-01" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Tipo</label>
                                    <select name="deviceType" value={formData.deviceType} onChange={handleChange} className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm p-2.5 border">
                                        <option value="Notebook">Notebook</option>
                                        <option value="Desktop">Desktop</option>
                                        <option value="Server">Server</option>
                                        <option value="Tablet">Tablet</option>
                                        <option value="Mobile">Mobile</option>
                                        <option value="Switch">Switch</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Estado</label>
                                    <select name="status" value={formData.status} onChange={handleChange} className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm p-2.5 border">
                                        <option value="In_Use">En Uso</option>
                                        <option value="Stock">Stock</option>
                                        <option value="Repair">Reparación</option>
                                        <option value="Retired">Retirado</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Hardware */}
                        <div className="md:col-span-3 border-t border-slate-100 pt-4">
                            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">Hardware</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Marca</label>
                                    <input name="brand" value={formData.brand} onChange={handleChange} className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm p-2.5 border" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Modelo</label>
                                    <input name="model" value={formData.model} onChange={handleChange} className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm p-2.5 border" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Nro. Serie</label>
                                    <input name="serialNumber" value={formData.serialNumber} onChange={handleChange} className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm p-2.5 border" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Procesador</label>
                                    <input name="processor" value={formData.processor} onChange={handleChange} className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm p-2.5 border" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">RAM</label>
                                    <input name="ramAmount" value={formData.ramAmount} onChange={handleChange} className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm p-2.5 border" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Almacenamiento</label>
                                    <input name="storageInfo" value={formData.storageInfo} onChange={handleChange} className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm p-2.5 border" />
                                </div>
                            </div>
                        </div>

                        {/* Local Accounts & Net - REPLACED */}
                        <div className="md:col-span-3 border-t border-slate-100 pt-4">
                            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">Accesos Locales & Red</h3>

                            {/* Local Accounts Manager */}
                            <div className="mb-4 bg-orange-50 p-4 rounded-lg border border-orange-100">
                                <h4 className="text-xs font-bold text-orange-800 uppercase mb-2 flex items-center">
                                    <Key className="w-3 h-3 mr-1" /> Cuentas Locales del Equipo
                                </h4>

                                <div className="text-xs text-orange-600 mb-2">
                                    Estas cuentas se registrarán automáticamente en la Bóveda de Claves.
                                </div>

                                {/* Add New */}
                                <div className="flex flex-col md:flex-row gap-2 mb-3">
                                    <select
                                        className="flex-1 rounded-md border-orange-200 shadow-sm text-sm p-1.5 focus:border-orange-500 focus:ring-orange-500"
                                        value={newAccount.assignedUserId || ''}
                                        onChange={(e) => setNewAccount({ ...newAccount, assignedUserId: e.target.value })}
                                    >
                                        <option value="">-- Responsable (Opcional) --</option>
                                        {staffList.map(s => (
                                            <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
                                        ))}
                                    </select>
                                    <input
                                        placeholder="Usuario (ej. Admin)"
                                        className="flex-1 rounded-md border-orange-200 shadow-sm text-sm p-1.5"
                                        value={newAccount.username}
                                        onChange={(e) => setNewAccount({ ...newAccount, username: e.target.value })}
                                    />
                                    <input
                                        type="password"
                                        placeholder="Contraseña"
                                        className="flex-1 rounded-md border-orange-200 shadow-sm text-sm p-1.5"
                                        value={newAccount.password}
                                        onChange={(e) => setNewAccount({ ...newAccount, password: e.target.value })}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddAccount}
                                        className="bg-orange-600 text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-orange-700 transition-colors"
                                    >
                                        Agregar
                                    </button>
                                </div>

                                {/* List */}
                                {formData.localAccounts && formData.localAccounts.length > 0 ? (
                                    <div className="space-y-2">
                                        {formData.localAccounts.map((acc, idx) => {
                                            const assignedUser = staffList.find(s => s.id === acc.assignedUserId);
                                            return (
                                                <div key={idx} className="flex justify-between items-center bg-white p-2 rounded border border-orange-100 text-sm">
                                                    <div className="flex items-center space-x-2">
                                                        <span className="font-medium text-slate-700">{acc.username}</span>
                                                        <span className="text-slate-400 text-xs">••••••••</span>
                                                        {assignedUser && (
                                                            <span className="flex items-center text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                                                                <User className="w-3 h-3 mr-1" />
                                                                {assignedUser.firstName} {assignedUser.lastName}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveAccount(idx)}
                                                        className="text-red-400 hover:text-red-600 p-1"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-xs text-orange-400 italic">No hay cuentas locales configuradas.</p>
                                )}
                            </div>

                            {/* Static IP (Preserved) */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700">IP Estática</label>
                                <input name="ipAddressStatic" value={formData.ipAddressStatic} onChange={handleChange} className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm p-2.5 border" placeholder="Dejar vacío si es dinámica" />
                            </div>
                        </div>

                    </div>

                    <div className="flex justify-end pt-4 border-t border-slate-100">
                        <button type="button" onClick={onClose} className="mr-3 px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition-colors">
                            Cancelar
                        </button>
                        <button disabled={loading} type="submit" className="inline-flex justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors shadow-lg shadow-purple-500/30">
                            {loading ? 'Guardando...' : <><Save className="w-4 h-4 mr-2" /> Guardar Equipo</>}
                        </button>
                    </div>
                </form>

                {/* Custom Unsaved Data Modal */}
                {showUnsavedModal && (
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60]">
                        <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-orange-100 animate-in fade-in zoom-in duration-200">
                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-orange-100 mx-auto mb-4">
                                <Info className="w-6 h-6 text-orange-600" />
                            </div>
                            <h3 className="text-lg font-bold text-center text-slate-800 mb-2">Datos Pendientes</h3>
                            <p className="text-sm text-slate-600 text-center mb-6">
                                Tienes información en "Cuentas Locales" que no ha sido agregada a la lista. Si continúas, esos datos se perderán.
                            </p>
                            <div className="flex space-x-3">
                                <button
                                    onClick={() => setShowUnsavedModal(false)}
                                    className="flex-1 px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                                >
                                    Revisar
                                </button>
                                <button
                                    onClick={() => { setShowUnsavedModal(false); handleSubmit(null); }}
                                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
                                >
                                    Guardar Igual
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DeviceForm;
