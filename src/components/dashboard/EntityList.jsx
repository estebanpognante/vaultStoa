import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, query, where, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { Edit2, Trash2, Smartphone, Users, AlertTriangle, Monitor } from 'lucide-react';

const EntityList = ({ companyId, collectionName, onEdit }) => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!companyId) return;

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

    const handleDelete = async (id) => {
        if (window.confirm("¿Está seguro de eliminar este elemento? Esta acción no se puede deshacer.")) {
            try {
                await deleteDoc(doc(db, collectionName, id));
            } catch (err) {
                alert("Error eliminando: " + err.message);
            }
        }
    };

    if (loading) return <div className="text-center py-10"><div className="animate-spin h-6 w-6 border-b-2 border-blue-600 rounded-full mx-auto"></div></div>;

    if (items.length === 0) {
        return (
            <div className="text-center py-10 bg-white rounded-lg border border-slate-200 border-dashed">
                <p className="text-slate-500">No hay registros encontrados.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
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
                        {items.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
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
                                        {collectionName === 'events' && item.description?.substring(0, 30)}
                                    </div>
                                    <div className="text-sm text-slate-500">
                                        {collectionName === 'staff' && item.phone}
                                        {collectionName === 'devices' && item.ipAddressStatic}
                                        {collectionName === 'events' && item.eventDate?.toDate ? item.eventDate.toDate().toLocaleDateString() : ''}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                        ${(item.employmentStatus === 'Active' || item.status === 'In_Use') ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}`}>
                                        {item.employmentStatus || item.status || item.priority}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                    <button onClick={() => onEdit(item)} className="text-blue-600 hover:text-blue-900 bg-blue-50 p-1.5 rounded-md transition-colors"><Edit2 className="w-4 h-4" /></button>
                                    <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-900 bg-red-50 p-1.5 rounded-md transition-colors"><Trash2 className="w-4 h-4" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default EntityList;
