import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, query, where, getDocs, doc } from 'firebase/firestore';
import { X, User, Monitor, Key, AlertTriangle, Briefcase, Mail, Phone, Edit2, Hash } from 'lucide-react';
import DeviceForm from '../forms/DeviceForm';
import VaultEntryForm from '../forms/VaultEntryForm';
import EventForm from '../forms/EventForm';

const StaffDetailsModal = ({ staff, onClose }) => {
    const [activeTab, setActiveTab] = useState('devices');
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);

    // Edit Modal States
    const [editingItem, setEditingItem] = useState(null);
    const [editType, setEditType] = useState(null); // 'device', 'vault_entry', 'event'
    const [isReadOnly, setIsReadOnly] = useState(false);

    useEffect(() => {
        if (!staff) return;
        fetchData();
    }, [staff, activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            let q;
            const staffId = staff.id;

            if (activeTab === 'devices') {
                // Devices assigned to this user
                q = query(collection(db, 'devices'), where('assignedUserIds', 'array-contains', staffId));
            } else if (activeTab === 'keys') {
                // Keys related to this user (Direct OR Secondary)
                const q1 = query(collection(db, 'vault_entries'), where('relatedId', '==', staffId), where('relatedType', '==', 'staff'));
                const q2 = query(collection(db, 'vault_entries'), where('secondaryRelatedId', '==', staffId));

                const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);

                // Merge and deduplicate by ID
                const mergedDocs = new Map();
                snap1.docs.forEach(d => mergedDocs.set(d.id, { id: d.id, ...d.data() }));
                snap2.docs.forEach(d => mergedDocs.set(d.id, { id: d.id, ...d.data() }));

                setItems(Array.from(mergedDocs.values()));
                setLoading(false); // custom finish here since we bypassed the standard single query flow
                return; // Exit here to avoid the common set items call below

            } else if (activeTab === 'events') {
                // Events related to this user
                q = query(collection(db, 'events'), where('relatedId', '==', staffId), where('relatedType', '==', 'staff'));
            }

            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // If keys tab, maybe fetch secondary relations too? 
            // Let's stick to primary first to avoid complexity unless requested.

            setItems(data);
        } catch (error) {
            console.error("Error fetching details:", error);
            setItems([]);
        } finally {
            setLoading(false);
        }
    };

    const handleViewRow = (item, type) => {
        setEditingItem(item);
        setEditType(type);
        setIsReadOnly(true);
    };

    const handleEditClick = (e, item, type) => {
        e.stopPropagation();
        setEditingItem(item);
        setEditType(type);
        setIsReadOnly(false);
    };

    const handleEditSuccess = () => {
        setEditingItem(null);
        setEditType(null);
        setIsReadOnly(false);
        fetchData(); // Refresh list
    };

    const handleCloseModal = () => {
        setEditingItem(null);
        setEditType(null);
        setIsReadOnly(false);
    };

    const StatusBadge = ({ status, type }) => {
        let colorClass = 'bg-slate-100 text-slate-800';
        if (status === 'Active' || status === 'In_Use' || status === 'Closed') colorClass = 'bg-green-100 text-green-800';
        if (status === 'Open') colorClass = 'bg-red-100 text-red-800';

        return (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
                {status || 'N/A'}
            </span>
        );
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">

                {/* Header Profile Section */}
                <div className="bg-slate-50 p-6 border-b border-slate-200 flex justify-between items-start">
                    <div className="flex items-start space-x-4">
                        <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-200 flex-shrink-0">
                            <User className="h-8 w-8 text-slate-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h2 className="text-2xl font-bold text-slate-800 break-words">{staff.firstName} {staff.lastName}</h2>
                            <div className="flex flex-col md:flex-row md:items-center text-slate-500 mt-1 md:space-x-4 text-sm space-y-1 md:space-y-0">
                                <span className="flex items-center whitespace-nowrap"><Briefcase className="w-4 h-4 mr-1 flex-shrink-0" /> {staff.position}</span>
                                <span className="flex items-center break-all"><Mail className="w-4 h-4 mr-1 flex-shrink-0" /> {staff.workEmail}</span>
                                {staff.phone && <span className="flex items-center whitespace-nowrap"><Phone className="w-4 h-4 mr-1 flex-shrink-0" /> {staff.phone}</span>}
                            </div>
                            <div className="mt-2">
                                <StatusBadge status={staff.employmentStatus} />
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-100 rounded-lg flex-shrink-0">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Navigation Tabs */}
                <div className="flex border-b border-slate-200 bg-white px-2 md:px-6 overflow-x-auto no-scrollbar">
                    <button
                        onClick={() => setActiveTab('devices')}
                        className={`py-4 px-3 md:px-6 text-sm font-medium border-b-2 transition-colors flex items-center whitespace-nowrap ${activeTab === 'devices'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            }`}
                    >
                        <Monitor className="w-4 h-4 mr-2" /> Dispositivos
                    </button>
                    <button
                        onClick={() => setActiveTab('keys')}
                        className={`py-4 px-3 md:px-6 text-sm font-medium border-b-2 transition-colors flex items-center whitespace-nowrap ${activeTab === 'keys'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            }`}
                    >
                        <Key className="w-4 h-4 mr-2" /> Claves y Accesos
                    </button>
                    <button
                        onClick={() => setActiveTab('events')}
                        className={`py-4 px-3 md:px-6 text-sm font-medium border-b-2 transition-colors flex items-center whitespace-nowrap ${activeTab === 'events'
                            ? 'border-orange-500 text-orange-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            }`}
                    >
                        <AlertTriangle className="w-4 h-4 mr-2" /> Eventos
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6">
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <div className="animate-spin h-8 w-8 border-b-2 border-blue-500 rounded-full"></div>
                        </div>
                    ) : items.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 bg-white rounded-lg border border-dashed border-slate-200">
                            <p>No se encontraron registros en esta sección.</p>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {items.map(item => (
                                <div
                                    key={item.id}
                                    onClick={() => handleViewRow(item, activeTab === 'keys' ? 'vault_entry' : activeTab === 'devices' ? 'device' : 'event')}
                                    className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all flex justify-between items-center group cursor-pointer hover:bg-slate-50"
                                >
                                    <div className="flex items-center space-x-3">
                                        <div className={`p-2 rounded-lg 
                                            ${activeTab === 'devices' ? 'bg-purple-50 text-purple-600' : ''}
                                            ${activeTab === 'keys' ? 'bg-blue-50 text-blue-600' : ''}
                                            ${activeTab === 'events' ? 'bg-orange-50 text-orange-600' : ''}
                                        `}>
                                            {activeTab === 'devices' && <Monitor className="w-5 h-5" />}
                                            {activeTab === 'keys' && <Key className="w-5 h-5" />}
                                            {activeTab === 'events' && <AlertTriangle className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <div className="font-medium text-slate-800">
                                                {activeTab === 'devices' && item.deviceName}
                                                {activeTab === 'keys' && item.serviceName}
                                                {activeTab === 'events' && item.eventType}
                                            </div>
                                            <div className="text-xs text-slate-500 flex items-center mt-0.5">
                                                {activeTab === 'devices' && `${item.deviceType} • ${item.serialNumber || 'S/N'}`}
                                                {activeTab === 'keys' && `${item.username} • ${item.category}`}
                                                {activeTab === 'events' && (
                                                    <>
                                                        <span className="mr-2">{item.eventDate?.toDate?.().toLocaleDateString()}</span>
                                                        <span>{item.description?.substring(0, 40)}...</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-3">
                                        <StatusBadge status={item.status || item.priority} />
                                        <button
                                            onClick={(e) => handleEditClick(e, item, activeTab === 'keys' ? 'vault_entry' : activeTab === 'devices' ? 'device' : 'event')}
                                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                            title="Editar"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Modals */}
            {editingItem && editType === 'device' && (
                <DeviceForm
                    initialData={editingItem}
                    companyId={staff.companyId?.id} // Assuming staff has company reference
                    onClose={handleCloseModal}
                    onSuccess={handleEditSuccess}
                    readOnly={isReadOnly}
                />
            )}
            {editingItem && editType === 'vault_entry' && (
                <VaultEntryForm
                    initialData={editingItem}
                    companyId={staff.companyId?.id}
                    onClose={handleCloseModal}
                    onSuccess={handleEditSuccess}
                    readOnly={isReadOnly}
                />
            )}
            {editingItem && editType === 'event' && (
                <EventForm
                    initialData={editingItem}
                    companyId={staff.companyId?.id}
                    onClose={handleCloseModal}
                    onSuccess={handleEditSuccess}
                    readOnly={isReadOnly}
                />
            )}

        </div>
    );
};

export default StaffDetailsModal;
