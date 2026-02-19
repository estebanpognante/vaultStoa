import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, addDoc, doc, updateDoc, Timestamp, query, where, onSnapshot, getDocs, arrayUnion, arrayRemove, writeBatch } from 'firebase/firestore';
import { Save, X, Users, Monitor, Link, Plus, Trash2, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import DeviceForm from './DeviceForm';
import { seedJobPositions } from '../../data/jobPositions';
import { useSecurity } from '../../context/SecurityContext';

const StaffForm = ({ companyId, initialData, onClose, onSuccess }) => {
    const { user } = useSecurity();
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        dni: '',
        personalEmail: '',
        workEmail: '',
        phone: '',
        position: '',
        department: '', // Determine if we keep this or infer from position area? Keeping for flexibility.
        employmentStatus: 'Active',
        hasSubordinates: false,
        subordinateIds: []
    });

    // Positions & Staff Data
    const [jobPositions, setJobPositions] = useState([]);
    const [groupedPositions, setGroupedPositions] = useState({});
    const [allStaff, setAllStaff] = useState([]);

    // Device Management State
    const [showDeviceForm, setShowDeviceForm] = useState(false);
    const [allDevices, setAllDevices] = useState([]);
    const [assignedDeviceIds, setAssignedDeviceIds] = useState([]);
    const [devicesToLink, setDevicesToLink] = useState([]);
    const [devicesToUnlink, setDevicesToUnlink] = useState([]);

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (initialData) {
            setFormData({
                ...initialData,
                hasSubordinates: initialData.hasSubordinates || false,
                subordinateIds: initialData.subordinateIds || []
            });
        }
    }, [initialData]);

    // Fetch Job Positions & Staff
    useEffect(() => {
        const initData = async () => {
            // 1. Seed & Fetch Positions
            await seedJobPositions();
            const posSnapshot = await getDocs(collection(db, 'job_positions'));
            const positions = posSnapshot.docs.map(d => d.data());

            // Sort hierarchies
            positions.sort((a, b) => a.hierarchy - b.hierarchy);
            setJobPositions(positions);

            // Group by Area
            const grouped = positions.reduce((acc, pos) => {
                const area = pos.area || 'Otros';
                if (!acc[area]) acc[area] = [];
                acc[area].push(pos);
                return acc;
            }, {});
            setGroupedPositions(grouped);

            // 2. Fetch All Staff (for Subordinates)
            if (companyId || initialData?.companyId) {
                const coId = companyId || initialData?.companyId?.id;
                const staffQ = query(collection(db, 'staff'), where('companyId', '==', doc(db, 'companies', coId)));
                const staffSnap = await getDocs(staffQ);
                const staff = staffSnap.docs
                    .map(d => ({ id: d.id, ...d.data() }))
                    .filter(s => s.id !== initialData?.id); // Exclude self

                // Sort alphabetically
                staff.sort((a, b) => (a.firstName + a.lastName).localeCompare(b.firstName + b.lastName));
                setAllStaff(staff);
            }
        };
        initData();
    }, [companyId, initialData]);

    // --- Device Fetching (Kept separate for clarity) ---
    useEffect(() => {
        if (!companyId && !initialData?.companyId) return;
        const compId = companyId || initialData?.companyId?.id;
        const q = query(collection(db, 'devices'), where('companyId', '==', doc(db, 'companies', compId)));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const devices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAllDevices(devices);

            if (initialData?.id) {
                const assigned = devices.filter(d => (d.assignedUserIds || []).includes(initialData.id));
                setAssignedDeviceIds(prev => {
                    if (prev.length === 0 && devicesToLink.length === 0 && devicesToUnlink.length === 0) {
                        return assigned.map(d => d.id);
                    }
                    return prev;
                });
            }
        });
        return () => unsubscribe();
    }, [companyId, initialData]);


    const handleChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData({ ...formData, [e.target.name]: value });
    };

    const handleSubordinateChange = (staffId) => {
        const currentIds = formData.subordinateIds || [];
        if (currentIds.includes(staffId)) {
            setFormData({ ...formData, subordinateIds: currentIds.filter(id => id !== staffId) });
        } else {
            setFormData({ ...formData, subordinateIds: [...currentIds, staffId] });
        }
    };

    // --- Device Management Handlers ---
    const handleAssignDevice = (deviceId) => {
        if (!deviceId) return;
        if (assignedDeviceIds.includes(deviceId)) return;

        setAssignedDeviceIds([...assignedDeviceIds, deviceId]);
        setDevicesToLink([...devicesToLink, deviceId]);
        setDevicesToUnlink(devicesToUnlink.filter(id => id !== deviceId));
    };

    const handleUnassignDevice = (deviceId) => {
        setAssignedDeviceIds(assignedDeviceIds.filter(id => id !== deviceId));
        setDevicesToUnlink([...devicesToUnlink, deviceId]);
        setDevicesToLink(devicesToLink.filter(id => id !== deviceId));
    };

    const handleNewDeviceSuccess = (newDeviceId) => {
        if (newDeviceId) {
            handleAssignDevice(newDeviceId);
        }
        setShowDeviceForm(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        if (!companyId && !initialData) {
            setError("Error: No se seleccionó empresa.");
            return;
        }

        setLoading(true);
        try {
            let staffId = initialData?.id;

            // Clean payload
            const payload = {
                ...formData,
                companyId: initialData?.companyId || doc(db, 'companies', companyId),
                // Ensure array is saved
                subordinateIds: formData.hasSubordinates ? formData.subordinateIds : []
            };
            if (!formData.hasSubordinates) payload.subordinateIds = []; // Double safety

            if (initialData) {
                await updateDoc(doc(db, 'staff', initialData.id), payload);
            } else {
                // IMPORTANT: Add ownerId for RBAC
                if (user && user.ownerId) {
                    payload.ownerId = user.ownerId;
                }
                const docRef = await addDoc(collection(db, 'staff'), {
                    ...payload,
                    startDate: Timestamp.now()
                });
                staffId = docRef.id;
            }

            // --- Process Device Linking ---
            // (Only if we have a staffId to link to)
            if (staffId) {
                const batch = writeBatch(db);
                let batchCount = 0;

                // Link new devices
                for (const devId of devicesToLink) {
                    const devRef = doc(db, 'devices', devId);
                    batch.update(devRef, {
                        assignedUserIds: arrayUnion(staffId),
                        status: 'In_Use'
                    });
                    batchCount++;
                }

                // Unlink removed devices
                for (const devId of devicesToUnlink) {
                    const devRef = doc(db, 'devices', devId);
                    batch.update(devRef, {
                        assignedUserIds: arrayRemove(staffId)
                    });
                    batchCount++;
                }

                if (batchCount > 0) {
                    await batch.commit();
                }
            }
            // ------------------------------
            if (onSuccess) onSuccess();
            if (onClose) onClose();
        } catch (error) {
            console.error("Error saving staff:", error);
            setError("Error al guardar personal: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative my-8">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
                    <div className="flex items-center space-x-2">
                        <Users className="w-5 h-5 text-green-600" />
                        <h2 className="text-xl font-bold text-slate-800">Nuevo Personal</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded-r">
                            <div className="flex items-center">
                                <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Nombre</label>
                            <input required name="firstName" value={formData.firstName} onChange={handleChange} className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm p-2.5 border" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Apellido</label>
                            <input required name="lastName" value={formData.lastName} onChange={handleChange} className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm p-2.5 border" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700">DNI / ID</label>
                            <input required name="dni" value={formData.dni} onChange={handleChange} className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm p-2.5 border" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700">Cargo / Puesto</label>
                            <select
                                name="position"
                                value={formData.position}
                                onChange={(e) => {
                                    const selectedPos = jobPositions.find(p => p.title === e.target.value);
                                    setFormData(prev => ({
                                        ...prev,
                                        position: e.target.value,
                                        department: selectedPos?.area || prev.department // Auto-fill dept but allow override
                                    }));
                                }}
                                className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm p-2.5 border"
                            >
                                <option value="">-- Seleccionar Puesto --</option>
                                {Object.keys(groupedPositions).map(area => (
                                    <optgroup key={area} label={area}>
                                        {groupedPositions[area].map(pos => (
                                            <option key={pos.title} value={pos.title}>{pos.title}</option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700">Departamento</label>
                            <input name="department" value={formData.department} onChange={handleChange} className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm p-2.5 border" placeholder="Ej: Ventas, IT" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700">Estado</label>
                            <select name="employmentStatus" value={formData.employmentStatus} onChange={handleChange} className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm p-2.5 border">
                                <option value="Active">Activo</option>
                                <option value="On_Leave">Licencia</option>
                                <option value="Terminated">Baja</option>
                            </select>
                        </div>

                        <div className="md:col-span-2 space-y-4">
                            <div className="flex items-center">
                                <input
                                    id="hasSubordinates"
                                    name="hasSubordinates"
                                    type="checkbox"
                                    checked={formData.hasSubordinates}
                                    onChange={handleChange}
                                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                                />
                                <label htmlFor="hasSubordinates" className="ml-2 block text-sm font-medium text-slate-900">
                                    Tiene empleados a cargo (Líder / Gerente)
                                </label>
                            </div>

                            {formData.hasSubordinates && (
                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 animate-fadeIn">
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Selección de Equipo (Subordinados)</label>
                                    <div className="max-h-48 overflow-y-auto border border-slate-300 rounded-md bg-white p-2 space-y-1">
                                        {allStaff.length > 0 ? allStaff.map(staff => (
                                            <label key={staff.id} className="flex items-center hover:bg-slate-50 p-1 rounded cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.subordinateIds.includes(staff.id)}
                                                    onChange={() => handleSubordinateChange(staff.id)}
                                                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded mr-2"
                                                />
                                                <span className="text-sm text-slate-700">{staff.firstName} {staff.lastName} - <span className="text-xs text-slate-500">{staff.position || 'Sin Puesto'}</span></span>
                                            </label>
                                        )) : (
                                            <p className="text-xs text-slate-400 italic p-2">No hay otros empleados disponibles.</p>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">Seleccione las personas que reportan a este cargo.</p>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700">Email Corporativo</label>
                            <input type="email" name="workEmail" value={formData.workEmail} onChange={handleChange} className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm p-2.5 border" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700">Email Personal</label>
                            <input type="email" name="personalEmail" value={formData.personalEmail} onChange={handleChange} className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm p-2.5 border" />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700">Teléfono</label>
                            <input name="phone" value={formData.phone} onChange={handleChange} className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm p-2.5 border" />
                        </div>

                        {/* Device Management Section */}
                        <div className="md:col-span-2 border-t border-slate-100 pt-4">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-sm font-medium text-slate-700 uppercase tracking-wider flex items-center">
                                    <Monitor className="w-4 h-4 mr-2" />
                                    Asignación de Dispositivos
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setShowDeviceForm(true)}
                                    className="text-xs flex items-center text-blue-600 hover:text-blue-800 font-medium"
                                >
                                    <Plus className="w-3 h-3 mr-1" />
                                    Nuevo Dispositivo
                                </button>
                            </div>

                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                {/* Assigned List */}
                                {assignedDeviceIds.length > 0 ? (
                                    <div className="space-y-2 mb-4">
                                        {assignedDeviceIds.map(devId => {
                                            const dev = allDevices.find(d => d.id === devId);
                                            const isPendingLink = devicesToLink.includes(devId);
                                            return (
                                                <div key={devId} className="flex justify-between items-center bg-white p-2 rounded border border-slate-200 text-sm">
                                                    <div className="flex items-center">
                                                        <Monitor className="w-4 h-4 text-slate-400 mr-2" />
                                                        <div>
                                                            <div className="font-medium text-slate-700">{dev ? dev.deviceName : 'Cargando...'}</div>
                                                            <div className="text-xs text-slate-500">{dev ? `${dev.deviceType} - ${dev.serialNumber || 'S/N'}` : devId}</div>
                                                        </div>
                                                        {isPendingLink && <span className="ml-2 text-[10px] bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded-full">Pendiente</span>}
                                                    </div>
                                                    <button type="button" onClick={() => handleUnassignDevice(devId)} className="text-red-400 hover:text-red-600 p-1">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-sm text-slate-400 italic mb-4 text-center py-2">
                                        No tiene dispositivos asignados.
                                    </div>
                                )}

                                {/* Assignment Selector */}
                                <div className="flex space-x-2">
                                    <div className="flex-1 relative">
                                        <select
                                            className="block w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 bg-white pl-8"
                                            onChange={(e) => {
                                                if (e.target.value) {
                                                    handleAssignDevice(e.target.value);
                                                    e.target.value = '';
                                                }
                                            }}
                                            defaultValue=""
                                        >
                                            <option value="" disabled>Vincula un dispositivo existente...</option>
                                            {allDevices
                                                .filter(d => !assignedDeviceIds.includes(d.id)) // Filter out already assigned to THIS user
                                                .map(d => {
                                                    const isAssigned = d.assignedUserIds && d.assignedUserIds.length > 0;
                                                    return (
                                                        <option key={d.id} value={d.id}>
                                                            {d.deviceName} ({d.deviceType}) {isAssigned ? '- En uso' : '- Libre'}
                                                        </option>
                                                    );
                                                })}
                                        </select>
                                        <Link className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>

                    <div className="flex justify-end pt-4 border-t border-slate-100">
                        <button type="button" onClick={onClose} className="mr-3 px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition-colors">
                            Cancelar
                        </button>
                        <button disabled={loading} type="submit" className="inline-flex justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors shadow-lg shadow-green-500/30">
                            {loading ? 'Guardando...' : <><Save className="w-4 h-4 mr-2" /> Guardar Personal</>}
                        </button>
                    </div>
                </form>

                {/* Sub-Modal for New Device */}
                {showDeviceForm && (
                    <DeviceForm
                        companyId={companyId || initialData?.companyId?.id} // Ensure companyId is passed
                        onClose={() => setShowDeviceForm(false)}
                        onSuccess={handleNewDeviceSuccess}
                    />
                )}
            </div>
        </div>
    );
};

export default StaffForm;
