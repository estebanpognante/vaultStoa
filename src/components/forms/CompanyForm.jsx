import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, addDoc, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { Save, X, Building } from 'lucide-react';

const CompanyForm = ({ initialData, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        legalName: '',
        taxId: '',
        address: '',
        contactPhone: '',
        contactEmail: '',
        industry: '',
        notes: '',
        isActive: true
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (initialData) setFormData(initialData);
    }, [initialData]);

    const handleChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData({ ...formData, [e.target.name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (initialData) {
                await updateDoc(doc(db, 'companies', initialData.id), formData);
            } else {
                await addDoc(collection(db, 'companies'), {
                    ...formData,
                    contractDate: Timestamp.now()
                });
            }

            if (onSuccess) onSuccess();
            if (onClose) onClose();
        } catch (error) {
            console.error("Error saving company:", error);
            alert("Error al guardar empresa: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
                    <div className="flex items-center space-x-2">
                        <Building className="w-5 h-5 text-blue-600" />
                        <h2 className="text-xl font-bold text-slate-800">Nueva Empresa</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700">Razón Social</label>
                            <input required name="legalName" value={formData.legalName} onChange={handleChange} className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5 border transition-all" placeholder="Ej: Tech Solutions S.A." />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700">Identificación Fiscal (CUIT/Tax ID)</label>
                            <input required name="taxId" value={formData.taxId} onChange={handleChange} className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5 border" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700">Industria / Rubro</label>
                            <input name="industry" value={formData.industry} onChange={handleChange} className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5 border" />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700">Dirección Completa</label>
                            <input name="address" value={formData.address} onChange={handleChange} className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5 border" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700">Email Contacto</label>
                            <input type="email" name="contactEmail" value={formData.contactEmail} onChange={handleChange} className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5 border" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700">Teléfono</label>
                            <input name="contactPhone" value={formData.contactPhone} onChange={handleChange} className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5 border" />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700">Observaciones</label>
                            <textarea name="notes" value={formData.notes} onChange={handleChange} className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5 border" rows="3"></textarea>
                        </div>

                        <div className="flex items-center">
                            <input
                                id="isActive"
                                name="isActive"
                                type="checkbox"
                                checked={formData.isActive}
                                onChange={handleChange}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="isActive" className="ml-2 block text-sm text-slate-900">
                                Cliente Activo
                            </label>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-slate-100">
                        <button type="button" onClick={onClose} className="mr-3 px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition-colors">
                            Cancelar
                        </button>
                        <button disabled={loading} type="submit" className="inline-flex justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-lg shadow-blue-500/30">
                            {loading ? 'Guardando...' : <><Save className="w-4 h-4 mr-2" /> Guardar Empresa</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CompanyForm;
