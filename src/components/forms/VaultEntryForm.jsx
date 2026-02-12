
import React, { useState, useEffect } from 'react';
import { useSecurity } from '../../context/SecurityContext';
import { EncryptionService } from '../../services/encryptionService';
import { generateSearchVector } from '../../utils/searchVectorGenerator';
import { db } from '../../config/firebase';
import { collection, addDoc, doc, updateDoc, query, where, onSnapshot, getDoc, arrayUnion } from 'firebase/firestore';
import { Save, X, User, Monitor, Link, ArrowRight, Eye, EyeOff } from 'lucide-react';

const VaultEntryForm = ({ companyId, initialData, onClose, onSuccess, readOnly = false }) => {
    const { masterKey } = useSecurity();
    const [formData, setFormData] = useState({
        serviceName: '',
        category: 'SaaS_App',
        username: '',
        password: '',
        accessUrl: '',
        accessNotes: '',
        port: '',
        relatedType: 'staff', // 'staff' or 'device'
        relatedId: '', // Primary assignment
        secondaryRelatedId: '' // For Device_Password double linking
    });

    const [showPassword, setShowPassword] = useState(false);

    const [staffList, setStaffList] = useState([]);
    const [deviceList, setDeviceList] = useState([]);
    const [loadingLists, setLoadingLists] = useState(true);
    const [loading, setLoading] = useState(false);

    // Load Staff and Devices
    useEffect(() => {
        if (!companyId && !initialData?.companyId) return;

        // If editing, initialData might have companyId ref, or we use passed companyId
        // Ideally we rely on passed companyId context
        const compId = companyId || initialData?.companyId?.id;
        if (!compId) return;

        const companyRef = doc(db, 'companies', compId);

        const qStaff = query(collection(db, 'staff'), where('companyId', '==', companyRef));
        const qDevices = query(collection(db, 'devices'), where('companyId', '==', companyRef));

        const unsubStaff = onSnapshot(qStaff, (snap) => {
            setStaffList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        const unsubDevices = onSnapshot(qDevices, (snap) => {
            setDeviceList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        setLoadingLists(false);

        return () => { unsubStaff(); unsubDevices(); };
    }, [companyId, initialData]);

    useEffect(() => {
        if (initialData) {
            setFormData({
                ...initialData,
                password: '', // Don't show encrypted password
                relatedType: initialData.relatedType || 'staff',
                relatedId: initialData.relatedId || '',
                secondaryRelatedId: initialData.secondaryRelatedId || ''
            });
        }
    }, [initialData]);

    const handleChange = (e) => {
        if (readOnly) return;
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const [errorMsg, setErrorMsg] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (readOnly) return;

        // Helper to show error
        const showError = (msg) => setErrorMsg(msg);

        if (!masterKey) return showError("Security Error: No Master Key active.");
        if (!companyId && !initialData) return showError("Error: No Company Selected.");

        // Mandatory Assignment Check
        if (!formData.relatedId) {
            return showError("Error: Es OBLIGATORIO asignar esta clave a un Usuario o a un Dispositivo.");
        }

        // Mandatory Secondary Linked Check for Device Passwords
        if (formData.category === 'Device_Password' && !formData.secondaryRelatedId) {
            const missingType = formData.relatedType === 'staff' ? "un Dispositivo" : "un Personal Responsable";
            return showError(`Error: Para 'Clave de Dispositivo' debe seleccionar ${missingType}.`);
        }

        setLoading(true);
        try {
            // 1. Password Handling
            let encryptedPassword = initialData?.password; // Default to existing
            if (formData.password) {
                encryptedPassword = EncryptionService.encrypt(formData.password, masterKey);
                if (!encryptedPassword) throw new Error("Encryption failed");
            }

            // 2. Search Vector
            const search_vector = generateSearchVector(
                formData.serviceName,
                formData.username,
                formData.category,
                formData.accessUrl
            );

            // 3. Payload - Ensure NO undefined values
            const payload = {
                category: formData.category || '',
                serviceName: formData.serviceName || '',
                accessUrl: formData.accessUrl || '',
                port: formData.port ? Number(formData.port) : null,
                username: formData.username || '',
                password: encryptedPassword || '',
                accessNotes: formData.accessNotes || '', // Fix: prevent undefined
                search_vector: search_vector || [],
                // Assignation
                relatedType: formData.relatedType || 'staff',
                relatedId: formData.relatedId || null,
                secondaryRelatedId: formData.secondaryRelatedId || null,

                // Only update reset date if password changed
                ...(formData.password ? { lastPasswordReset: new Date() } : {})
            };

            // 4. Handle "Device_Password" Auto-Updates
            if (formData.category === 'Device_Password' && formData.password) {
                // Determine IDs
                let targetDeviceId, targetStaffId;
                if (formData.relatedType === 'staff') {
                    targetStaffId = formData.relatedId;
                    targetDeviceId = formData.secondaryRelatedId;
                } else {
                    targetDeviceId = formData.relatedId;
                    targetStaffId = formData.secondaryRelatedId;
                }

                if (targetDeviceId) {
                    // Update Device Record
                    const deviceRef = doc(db, 'devices', targetDeviceId);
                    const deviceSnap = await getDoc(deviceRef);

                    if (deviceSnap.exists()) {
                        const deviceData = deviceSnap.data();
                        const existingAccounts = deviceData.localAccounts || [];
                        // Check if username exists, if so update, else push
                        const accountIndex = existingAccounts.findIndex(a => a.username === formData.username);
                        let newAccounts = [...existingAccounts];

                        if (accountIndex >= 0) {
                            newAccounts[accountIndex] = { username: formData.username, password: encryptedPassword };
                        } else {
                            newAccounts.push({ username: formData.username, password: encryptedPassword });
                        }

                        // Ensure we don't send undefined here either
                        await updateDoc(deviceRef, {
                            localAccounts: newAccounts,
                            assignedUserIds: arrayUnion(targetStaffId)
                        });
                        console.log("Device auto-updated with credential and user assignment.");
                    }
                }
            }

            if (!initialData) {
                // Create
                payload.companyId = doc(db, 'companies', companyId);
                payload.securityQuestion = '';
                payload.securityAnswer = '';
                payload.twoFactorSecret = '';
                await addDoc(collection(db, 'vault_entries'), payload);
            } else {
                // Update
                const docRef = doc(db, 'vault_entries', initialData.id);
                await updateDoc(docRef, payload);
            }

            if (onSuccess) onSuccess();
            if (onClose) onClose();

        } catch (error) {
            console.error("Error saving entry:", error);
            showError("Error saving entry: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className={`bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative ${readOnly ? 'border-4 border-blue-100' : ''}`}>
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
                    <h2 className="text-xl font-bold text-slate-800">{readOnly ? 'Detalles de la Credencial' : 'Nueva Credencial'}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">

                    {/* Mandatory Assignment Section */}
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 space-y-3">
                        <div className="flex justify-between items-start">
                            <label className="block text-sm font-bold text-blue-900 mb-2">
                                Asignación de Responsabilidad (Obligatorio)
                            </label>
                        </div>

                        {/* Primary Selection */}
                        <div className="flex items-center space-x-4 mb-2">
                            <label className="inline-flex items-center">
                                <input
                                    disabled={readOnly}
                                    type="radio"
                                    name="relatedType"
                                    value="staff"
                                    checked={formData.relatedType === 'staff'}
                                    onChange={(e) => { handleChange(e); setFormData(prev => ({ ...prev, relatedType: 'staff', secondaryRelatedId: '' })); }} // Clear secondary on switch
                                    className="text-blue-600 focus:ring-blue-500"
                                />
                                <span className="ml-2 flex items-center text-sm text-slate-700">
                                    <User className="w-4 h-4 mr-1 text-slate-500" /> Personal
                                </span>
                            </label>
                            <label className="inline-flex items-center">
                                <input
                                    disabled={readOnly}
                                    type="radio"
                                    name="relatedType"
                                    value="device"
                                    checked={formData.relatedType === 'device'}
                                    onChange={(e) => { handleChange(e); setFormData(prev => ({ ...prev, relatedType: 'device', secondaryRelatedId: '' })); }}
                                    className="text-blue-600 focus:ring-blue-500"
                                />
                                <span className="ml-2 flex items-center text-sm text-slate-700">
                                    <Monitor className="w-4 h-4 mr-1 text-slate-500" /> Dispositivo
                                </span>
                            </label>
                        </div>

                        <select
                            disabled={readOnly}
                            required
                            name="relatedId"
                            value={formData.relatedId}
                            onChange={handleChange}
                            className="block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 bg-white"
                        >
                            <option value="">-- Seleccionar --</option>
                            {formData.relatedType === 'staff' && staffList.map(s => (
                                <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.position})</option>
                            ))}
                            {formData.relatedType === 'device' && deviceList.map(d => (
                                <option key={d.id} value={d.id}>{d.deviceName} - {d.deviceType} ({d.serialNumber})</option>
                            ))}
                        </select>

                        {/* Secondary Selection (Conditional) */}
                        {formData.category === 'Device_Password' && (
                            <div className="mt-4 pt-3 border-t border-blue-200 animate-fadeIn">
                                <div className="flex items-center text-blue-800 mb-2">
                                    <Link className="w-4 h-4 mr-2" />
                                    <span className="text-sm font-semibold">Vinculación Adicional Requerida</span>
                                </div>
                                <div className="flex items-center space-x-2 mb-2">
                                    <span className="text-xs text-slate-500">
                                        {formData.relatedType === 'staff' ? 'Usuario Seleccionado' : 'Dispositivo Seleccionado'}
                                    </span>
                                    <ArrowRight className="w-3 h-3 text-slate-400" />
                                    <span className="text-xs font-bold text-blue-700">
                                        {formData.relatedType === 'staff' ? 'Asignar a Dispositivo:' : 'Responsable (Personal):'}
                                    </span>
                                </div>

                                <select
                                    disabled={readOnly}
                                    required
                                    name="secondaryRelatedId"
                                    value={formData.secondaryRelatedId}
                                    onChange={handleChange}
                                    className="block w-full rounded-md border-blue-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 bg-white"
                                >
                                    <option value="">-- Seleccionar {formData.relatedType === 'staff' ? 'Dispositivo' : 'Personal'} --</option>
                                    {formData.relatedType === 'staff' && deviceList.map(d => (
                                        <option key={d.id} value={d.id}>{d.deviceName} ({d.deviceType})</option>
                                    ))}
                                    {formData.relatedType === 'device' && staffList.map(s => (
                                        <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-blue-600 mt-1 italic">
                                    * Esta credencial se agregará automáticamente al dispositivo y vinculará al usuario.
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700">Nombre del Servicio</label>
                            <input disabled={readOnly} required name="serviceName" value={formData.serviceName} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border" placeholder="ej. Acceso Windows, BIOS, Admin Local..." />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700">Categoría</label>
                            <select disabled={readOnly} name="category" value={formData.category} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border">
                                <option value="SaaS_App">SaaS App</option>
                                <option value="Device_Password" className="font-bold bg-blue-50">🔐 Clave de Dispositivo</option>
                                <option value="OS_Login">OS Login</option>
                                <option value="Database">Database</option>
                                <option value="Remote_Access">Remote Access</option>
                                <option value="VPN">VPN</option>
                                <option value="Web_Admin">Web Admin</option>
                                <option value="Email">Email</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700">URL de Acceso / IP</label>
                            <input disabled={readOnly} name="accessUrl" value={formData.accessUrl} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border" placeholder="https://..." />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700">
                                {formData.category === 'Device_Password' ? 'Usuario del Dispositivo (Local)' : 'Usuario'}
                            </label>
                            <input disabled={readOnly} required name="username" value={formData.username} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border" placeholder={formData.category === 'Device_Password' ? "ej. Admin, User1..." : ""} />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700">
                                {formData.category === 'Device_Password' ? 'Contraseña del Dispositivo' : 'Contraseña'}
                            </label>
                            <div className="relative mt-1">
                                <input
                                    readOnly={readOnly}
                                    required={!initialData && !readOnly}
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border pr-10"
                                    placeholder={initialData && !formData.password ? "(Sin cambios)" : "••••••••"}
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!showPassword && !formData.password && initialData?.password) {
                                            const decrypted = EncryptionService.decrypt(initialData.password, masterKey);
                                            if (decrypted) setFormData(prev => ({ ...prev, password: decrypted }));
                                        }
                                        setShowPassword(!showPassword);
                                    }}
                                    className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-400 hover:text-blue-600 focus:outline-none"
                                    title={showPassword ? "Ocultar" : "Ver"}
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {!readOnly && <p className="text-xs text-slate-500 mt-1">Se encriptará con AES-256 antes de enviar.</p>}
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700">Notas</label>
                            <textarea disabled={readOnly} name="accessNotes" value={formData.accessNotes} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border" rows="3"></textarea>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        {readOnly ? (
                            <button type="button" onClick={onClose} className="mr-3 px-4 py-2 border border-blue-300 shadow-sm text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100">
                                Cerrar
                            </button>
                        ) : (
                            <>
                                <button type="button" onClick={onClose} className="mr-3 px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50">
                                    Cancelar
                                </button>
                                <button disabled={loading} type="submit" className="inline-flex justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-lg shadow-blue-500/30">
                                    {loading ? 'Encriptando...' : <><Save className="w-4 h-4 mr-2" /> Guardar Credencial</>}
                                </button>
                            </>
                        )}
                    </div>
                </form>

                {/* Custom Error Modal */}
                {errorMsg && (
                    <div className="absolute inset-x-0 top-0 p-4 z-[60]">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg flex items-start animate-in slide-in-from-top-2">
                            <div className="flex-shrink-0">
                                <X className="h-5 w-5 text-red-400" aria-hidden="true" />
                            </div>
                            <div className="ml-3 flex-1 md:flex md:justify-between">
                                <p className="text-sm text-red-700">{errorMsg}</p>
                                <p className="mt-3 text-sm md:mt-0 md:ml-6">
                                    <button
                                        type="button"
                                        onClick={() => setErrorMsg(null)}
                                        className="whitespace-nowrap font-medium text-red-700 hover:text-red-600"
                                    >
                                        Cerrar
                                    </button>
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VaultEntryForm;
