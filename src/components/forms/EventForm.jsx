import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, addDoc, doc, updateDoc, Timestamp, query, where, getDocs } from 'firebase/firestore';
import { Save, X, AlertTriangle } from 'lucide-react';
import { useSecurity } from '../../context/SecurityContext';

const EventForm = ({ companyId, initialData, onClose, onSuccess, readOnly = false }) => {
    const { user } = useSecurity();
    const [formData, setFormData] = useState({
        eventType: 'Maintenance',
        description: '',
        resolution: '',
        priority: 'Media',
        status: 'Closed', // Default: Finalizado
        eventDate: new Date().toISOString().slice(0, 16) // Default to now, format for datetime-local
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (initialData) {
            // Convert Timestamp or ISO string to datetime-local input format
            let dateStr = initialData.eventDate;
            if (initialData.eventDate?.toDate) {
                dateStr = initialData.eventDate.toDate().toISOString().slice(0, 16);
            }
            setFormData({ ...initialData, eventDate: dateStr });
        }
    }, [initialData]);

    // Relationship State
    const [relatedType, setRelatedType] = useState('none'); // none, staff, device, vault_entry, event
    const [relatedId, setRelatedId] = useState('');
    const [relatedOptions, setRelatedOptions] = useState([]);
    const [loadingOptions, setLoadingOptions] = useState(false);

    useEffect(() => {
        if (initialData) {
            // Convert Timestamp or ISO string to datetime-local input format
            let dateStr = initialData.eventDate;
            if (initialData.eventDate?.toDate) {
                dateStr = initialData.eventDate.toDate().toISOString().slice(0, 16);
            }
            setFormData({ ...initialData, eventDate: dateStr });
            setRelatedType(initialData.relatedType || 'none');
            setRelatedId(initialData.relatedId || '');
        }
    }, [initialData]);

    // Fetch Options based on Type
    useEffect(() => {
        const fetchOptions = async () => {
            if (relatedType === 'none') {
                setRelatedOptions([]);
                return;
            }

            setLoadingOptions(true);
            try {
                let collectionName = '';
                switch (relatedType) {
                    case 'staff': collectionName = 'staff'; break;
                    case 'device': collectionName = 'devices'; break;
                    case 'vault_entry': collectionName = 'vault_entries'; break;
                    case 'event': collectionName = 'events'; break;
                    default: return;
                }

                // If companyId is present, filter by it. If not (edit mode), try to use initialData's company.
                // Fallback to fetching all if no company context (though usually required).

                // Construct Query
                // Note: We need to import 'query', 'where', 'getDocs' at the top if not present.  Assuming typical Firebase pattern.
                // For simplicity in this specific file context, I'll assume we can list all for the company.

                const ref = collection(db, collectionName);

                // Determine Company Reference
                const targetCompanyId = companyId || (initialData?.companyId?.id);

                let q = ref;
                if (targetCompanyId) {
                    q = query(ref, where('companyId', '==', doc(db, 'companies', targetCompanyId)));
                }

                const snapshot = await getDocs(q);
                const options = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                setRelatedOptions(options);

            } catch (error) {
                console.error("Error fetching related options:", error);
                setRelatedOptions([]);
            } finally {
                setLoadingOptions(false);
            }
        };

        fetchOptions();
    }, [relatedType, companyId, initialData]);

    const handleChange = (e) => {
        if (readOnly) return;
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (readOnly) return;
        if (!companyId && !initialData) return alert("Error: No se seleccionó empresa.");

        setLoading(true);
        try {
            const payload = {
                ...formData,
                eventDate: Timestamp.fromDate(new Date(formData.eventDate)),
                relatedType,
                relatedId: relatedType === 'none' ? null : relatedId
            };

            if (initialData) {
                await updateDoc(doc(db, 'events', initialData.id), payload);
            } else {
                payload.companyId = doc(db, 'companies', companyId);
                payload.ownerId = user?.ownerId || null; // RBAC
                await addDoc(collection(db, 'events'), payload);
            }

            if (onSuccess) onSuccess();
            if (onClose) onClose();
        } catch (error) {
            console.error("Error saving event:", error);
            alert("Error al guardar evento: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
                    <div className="flex items-center space-x-2">
                        <AlertTriangle className={`w-5 h-5 ${readOnly ? 'text-blue-600' : 'text-orange-600'}`} />
                        <h2 className="text-xl font-bold text-slate-800">{readOnly ? 'Detalles del Evento' : (initialData ? 'Editar Evento' : 'Registrar Evento')}</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Tipo de Evento</label>
                            <select disabled={readOnly} name="eventType" value={formData.eventType} onChange={handleChange} className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm p-2.5 border">
                                <option value="Maintenance">Mantenimiento</option>
                                <option value="Security_Incident">Incidente de Seguridad</option>
                                <option value="Password_Change">Cambio de Clave</option>
                                <option value="Hardware_Update">Actualización Hardware</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700">Estado</label>
                            <select disabled={readOnly} name="status" value={formData.status} onChange={handleChange} className={`mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm p-2.5 border font-medium ${formData.status === 'Open' ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50'}`}>
                                <option value="Closed">Finalizado</option>
                                <option value="Open">Abierto (Pendiente)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700">Prioridad</label>
                            <select disabled={readOnly} name="priority" value={formData.priority} onChange={handleChange} className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm p-2.5 border">
                                <option value="Baja">Baja</option>
                                <option value="Media">Media</option>
                                <option value="Alta">Alta</option>
                                <option value="Crítica">Crítica</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700">Fecha y Hora</label>
                            <input disabled={readOnly} type="datetime-local" name="eventDate" value={formData.eventDate} onChange={handleChange} className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm p-2.5 border" />
                        </div>
                    </div>

                    {/* Relationship Section */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 animate-in fade-in zoom-in duration-300">
                        <label className="block text-sm font-bold text-slate-700 mb-3">Relacionado con (Opcional)</label>

                        <div className="flex flex-wrap gap-2 mb-4">

                            {(!readOnly ? [
                                { id: 'none', label: 'Ninguno' },
                                { id: 'staff', label: 'Persona' },
                                { id: 'device', label: 'Dispositivo' },
                                { id: 'vault_entry', label: 'Clave / Credencial' },
                                { id: 'event', label: 'Otro Evento' }
                            ] : [
                                // In read-only mode, only show the selected one (if any)
                                { id: 'none', label: 'Ninguno' },
                                { id: 'staff', label: 'Persona' },
                                { id: 'device', label: 'Dispositivo' },
                                { id: 'vault_entry', label: 'Clave / Credencial' },
                                { id: 'event', label: 'Otro Evento' }
                            ].filter(t => t.id === relatedType)).map(type => (
                                <button
                                    disabled={readOnly}
                                    key={type.id}
                                    type="button"
                                    onClick={() => { if (!readOnly) { setRelatedType(type.id); setRelatedId(''); } }}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${relatedType === type.id
                                        ? 'bg-orange-100 text-orange-800 border-orange-200'
                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                        } ${readOnly ? 'cursor-default opacity-100' : ''}`}
                                >
                                    {type.label}
                                </button>
                            ))}
                        </div>

                        {relatedType !== 'none' && (
                            <div className="animate-in slide-in-from-top-2 duration-200">
                                {loadingOptions ? (
                                    <div className="text-xs text-slate-500 flex items-center">
                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-orange-500 mr-2"></div>
                                        Cargando opciones...
                                    </div>
                                ) : (
                                    <select
                                        disabled={readOnly}
                                        value={relatedId}
                                        onChange={(e) => setRelatedId(e.target.value)}
                                        className="block w-full rounded-lg border-slate-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm p-2.5 border bg-white"
                                    >
                                        <option value="">-- Seleccionar Item --</option>
                                        {relatedOptions.map(opt => {
                                            let label = opt.id;
                                            if (relatedType === 'staff') label = `${opt.firstName} ${opt.lastName} (${opt.position || 'N/A'})`;
                                            if (relatedType === 'device') label = `${opt.deviceName} (${opt.deviceType})`;
                                            if (relatedType === 'vault_entry') label = `${opt.serviceName} - ${opt.username}`;
                                            if (relatedType === 'event') {
                                                const date = opt.eventDate?.toDate ? opt.eventDate.toDate().toLocaleDateString() : 'Fecha desc.';
                                                label = `${opt.eventType} (${date}) - ${opt.description?.substring(0, 30)}...`;
                                            }
                                            return <option key={opt.id} value={opt.id}>{label}</option>
                                        })}
                                    </select>
                                )}
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700">Descripción</label>
                        <textarea disabled={readOnly} required name="description" value={formData.description} onChange={handleChange} className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm p-2.5 border" rows="3" placeholder="Detalles del evento..."></textarea>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700">Resolución (Opcional)</label>
                        <textarea disabled={readOnly} name="resolution" value={formData.resolution} onChange={handleChange} className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm p-2.5 border" rows="2" placeholder="Acciones tomadas..."></textarea>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-slate-100">
                        {readOnly ? (
                            <button type="button" onClick={onClose} className="mr-3 px-4 py-2 border border-blue-300 shadow-sm text-sm font-medium rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors">
                                Cerrar
                            </button>
                        ) : (
                            <>
                                <button type="button" onClick={onClose} className="mr-3 px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition-colors">
                                    Cancelar
                                </button>
                                <button disabled={loading} type="submit" className="inline-flex justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors shadow-lg shadow-orange-500/30">
                                    {loading ? 'Guardando...' : <><Save className="w-4 h-4 mr-2" /> Guardar Evento</>}
                                </button>
                            </>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EventForm;
