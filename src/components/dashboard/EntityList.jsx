import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, query, where, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { Edit2, Trash2, Users, AlertTriangle, Monitor } from 'lucide-react';
import StaffDetailsModal from './StaffDetailsModal';
import ConfirmationModal from '../common/ConfirmationModal';


const EntityList = ({ companyId, collectionName, onEdit, searchQuery }) => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedStaff, setSelectedStaff] = useState(null);

    // Deletion State
    const [itemToDelete, setItemToDelete] = useState(null);

    useEffect(() => {
        if (!companyId) {
            setLoading(false);
            setItems([]);
            return;
        }

        setLoading(true);
        // Assuming all managed collections have 'companyId' Reference
        const companyRef = doc(db, 'companies', companyId);
        const q = query(collection(db, collectionName), where('companyId', '==', companyRef));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setItems(list);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching " + collectionName, err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [companyId, collectionName]);

    const confirmDelete = async () => {
        if (!itemToDelete) return;
        try {
            await deleteDoc(doc(db, collectionName, itemToDelete.id));
            // Ensure selected staff is cleared if we just deleted them (though modal should block interaction)
            if (selectedStaff?.id === itemToDelete.id) {
                setSelectedStaff(null);
            }
        } catch (err) {
            console.error("Error deleting:", err);
            alert("Error eliminando: " + err.message);
        } finally {
            setItemToDelete(null);
        }
    };

    const handleDeleteClick = (e, item) => {
        e.stopPropagation(); // CRITICAL: Stop row click from firing
        setItemToDelete(item);
    };

    // Filter Items based on Search Query
    const filteredItems = items.filter(item => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();

        if (collectionName === 'staff') {
            return (
                item.firstName?.toLowerCase().includes(q) ||
                item.lastName?.toLowerCase().includes(q) ||
                item.workEmail?.toLowerCase().includes(q) ||
                item.position?.toLowerCase().includes(q)
            );
        }
        if (collectionName === 'devices') {
            return (
                item.deviceName?.toLowerCase().includes(q) ||
                item.brand?.toLowerCase().includes(q) ||
                item.model?.toLowerCase().includes(q) ||
                item.serialNumber?.toLowerCase().includes(q) ||
                item.ipAddressStatic?.toLowerCase().includes(q)
            );
        }
        if (collectionName === 'events') {
            return (
                item.eventType?.toLowerCase().includes(q) ||
                item.description?.toLowerCase().includes(q) ||
                item.priority?.toLowerCase().includes(q)
            );
        }
        return true;
    });

    if (loading) return <div className="text-center py-10"><div className="animate-spin h-6 w-6 border-b-2 border-blue-600 rounded-full mx-auto"></div></div>;

    if (filteredItems.length === 0) {
        return (
            <div className="text-center py-10 bg-white rounded-lg border border-slate-200 border-dashed">
                <p className="text-slate-500">No se encontraron registros{searchQuery ? ' coincidencias con la búsqueda' : ''}.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Identificador</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Detalles</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Estado</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {filteredItems.map((item) => (
                            <tr
                                key={item.id}
                                className={`transition-colors ${collectionName === 'staff' ? 'hover:bg-blue-50 cursor-pointer' : 'hover:bg-slate-50'}`}
                                onClick={() => collectionName === 'staff' && setSelectedStaff(item)}
                            >
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-slate-100 rounded-full text-slate-500">
                                            {collectionName === 'staff' && <Users className="w-5 h-5" />}
                                            {collectionName === 'devices' && <Monitor className="w-5 h-5" />}
                                            {collectionName === 'events' && <AlertTriangle className="w-5 h-5" />}
                                        </div>
                                        <div className="ml-4">
                                            <div className="text-sm font-medium text-slate-900">
                                                {/* Display Name Logic based on Collection */}
                                                {collectionName === 'staff' && `${item.firstName} ${item.lastName}`}
                                                {collectionName === 'devices' && item.deviceName}
                                                {collectionName === 'events' && item.eventType}
                                            </div>
                                            <div className="text-sm text-slate-500">
                                                {collectionName === 'staff' && item.position}
                                                {collectionName === 'devices' && item.serialNumber}
                                                {collectionName === 'events' && item.priority}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-slate-900">
                                        {collectionName === 'staff' && item.workEmail}
                                        {collectionName === 'devices' && `${item.brand} ${item.model}`}
                                        {collectionName === 'events' && `${item.priority} - ${item.description?.substring(0, 30)}`}
                                    </div>
                                    <div className="text-sm text-slate-500">
                                        {collectionName === 'staff' && item.phone}
                                        {collectionName === 'devices' && item.ipAddressStatic}
                                        {collectionName === 'events' && item.eventDate?.toDate ? item.eventDate.toDate().toLocaleDateString() : ''}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                        ${(item.employmentStatus === 'Active' || item.status === 'In_Use' || item.status === 'Closed') ? 'bg-green-100 text-green-800' : ''}
                                        ${(item.status === 'Open') ? 'bg-red-100 text-red-800' : ''}
                                        ${(!item.status && !item.employmentStatus) ? 'bg-slate-100 text-slate-800' : ''}
                                    `}>
                                        {collectionName === 'events'
                                            ? (item.status === 'Open' ? 'Abierto' : 'Finalizado')
                                            : (item.employmentStatus || item.status || item.priority)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                    <button onClick={(e) => { e.stopPropagation(); onEdit(item); }} className="text-blue-600 hover:text-blue-900 bg-blue-50 p-1.5 rounded-md transition-colors"><Edit2 className="w-4 h-4" /></button>
                                    <button onClick={(e) => handleDeleteClick(e, item)} className="text-red-600 hover:text-red-900 bg-red-50 p-1.5 rounded-md transition-colors"><Trash2 className="w-4 h-4" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden">
                <div className="divide-y divide-slate-200">
                    {filteredItems.map((item) => (
                        <div
                            key={item.id}
                            className="p-4 active:bg-slate-50 transition-colors"
                            onClick={() => collectionName === 'staff' && setSelectedStaff(item)}
                        >
                            <div className="flex items-start space-x-3 mb-2">
                                <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-slate-100 rounded-lg text-slate-500">
                                    {collectionName === 'staff' && <Users className="w-5 h-5" />}
                                    {collectionName === 'devices' && <Monitor className="w-5 h-5" />}
                                    {collectionName === 'events' && <AlertTriangle className="w-5 h-5" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-900 truncate">
                                        {collectionName === 'staff' && `${item.firstName} ${item.lastName}`}
                                        {collectionName === 'devices' && item.deviceName}
                                        {collectionName === 'events' && item.eventType}
                                    </p>
                                    <p className="text-xs text-slate-500 truncate">
                                        {collectionName === 'staff' && item.position}
                                        {collectionName === 'devices' && item.serialNumber}
                                        {collectionName === 'events' && item.priority}
                                    </p>
                                </div>
                            </div>

                            <div className="mb-3 pl-[3.25rem]">
                                <p className="text-sm text-slate-600 truncate">
                                    {collectionName === 'staff' && item.workEmail}
                                    {collectionName === 'devices' && `${item.brand} ${item.model}`}
                                    {collectionName === 'events' && item.description}
                                </p>
                            </div>

                            <div className="flex items-center justify-between pl-[3.25rem]">
                                <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full 
                                    ${(item.employmentStatus === 'Active' || item.status === 'In_Use' || item.status === 'Closed') ? 'bg-green-100 text-green-800' : ''}
                                    ${(item.status === 'Open') ? 'bg-red-100 text-red-800' : ''}
                                    ${(!item.status && !item.employmentStatus) ? 'bg-slate-100 text-slate-800' : ''}
                                `}>
                                    {collectionName === 'events'
                                        ? (item.status === 'Open' ? 'Abierto' : 'Finalizado')
                                        : (item.employmentStatus || item.status || item.priority)}
                                </span>

                                <div className="flex space-x-3">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onEdit(item); }}
                                        className="p-2 text-blue-600 bg-blue-50 rounded-lg active:bg-blue-100"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={(e) => handleDeleteClick(e, item)}
                                        className="p-2 text-red-600 bg-red-50 rounded-lg active:bg-red-100"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {selectedStaff && (
                <StaffDetailsModal
                    staff={selectedStaff}
                    onClose={() => setSelectedStaff(null)}
                />
            )}

            <ConfirmationModal
                isOpen={!!itemToDelete}
                onClose={() => setItemToDelete(null)}
                onConfirm={confirmDelete}
                title="¿Eliminar Elemento?"
                message="Esta acción no se puede deshacer. Se eliminará permanentemente del sistema."
                confirmText="Eliminar Definitivamente"
                isDestructive={true}
            />
        </div>
    );
};

export default EntityList;
