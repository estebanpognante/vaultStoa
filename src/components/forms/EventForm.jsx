import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, addDoc, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { Save, X, AlertTriangle } from 'lucide-react';

const EventForm = ({ companyId, initialData, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        eventType: 'Maintenance',
        description: '',
        resolution: '',
        priority: 'Media',
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

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!companyId && !initialData) return alert("Error: No se seleccionó empresa.");

        setLoading(true);
        try {
            const payload = {
                ...formData,
                eventDate: Timestamp.fromDate(new Date(formData.eventDate))
            };

            if (initialData) {
                await updateDoc(doc(db, 'events', initialData.id), payload);
            } else {
                payload.companyId = doc(db, 'companies', companyId);
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
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
                    <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-5 h-5 text-orange-600" />
                        <h2 className="text-xl font-bold text-slate-800">Registrar Evento</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Tipo de Evento</label>
                        <select name="eventType" value={formData.eventType} onChange={handleChange} className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm p-2.5 border">
                            <option value="Maintenance">Mantenimiento</option>
                            <option value="Security_Incident">Incidente de Seguridad</option>
                            <option value="Password_Change">Cambio de Clave</option>
                            <option value="Hardware_Update">Actualización Hardware</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700">Prioridad</label>
                        <select name="priority" value={formData.priority} onChange={handleChange} className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm p-2.5 border">
                            <option value="Baja">Baja</option>
                            <option value="Media">Media</option>
                            <option value="Alta">Alta</option>
                            <option value="Crítica">Crítica</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700">Fecha y Hora</label>
                        <input type="datetime-local" name="eventDate" value={formData.eventDate} onChange={handleChange} className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm p-2.5 border" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700">Descripción</label>
                        <textarea required name="description" value={formData.description} onChange={handleChange} className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm p-2.5 border" rows="3" placeholder="Detalles del evento..."></textarea>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700">Resolución (Opcional)</label>
                        <textarea name="resolution" value={formData.resolution} onChange={handleChange} className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm p-2.5 border" rows="2" placeholder="Acciones tomadas..."></textarea>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-slate-100">
                        <button type="button" onClick={onClose} className="mr-3 px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition-colors">
                            Cancelar
                        </button>
                        <button disabled={loading} type="submit" className="inline-flex justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors shadow-lg shadow-orange-500/30">
                            {loading ? 'Guardando...' : <><Save className="w-4 h-4 mr-2" /> Guardar Evento</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EventForm;
