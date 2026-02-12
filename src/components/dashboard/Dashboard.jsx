import React, { useState, useEffect } from 'react';
import { Search, Building, Plus, Database, Settings, Users, Monitor, AlertTriangle, List, Shield, Activity, Trash2 } from 'lucide-react';
import VaultCard from './VaultCard';
import EntityList from './EntityList';
// In a real app, we would fetch from Firestore here. 
// For Phase 3 Verification, I'll mock the data if DB is empty or implement the hook.
// I'll implement the actual Firestore subscription.
import { collection, query, where, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import VaultEntryForm from '../forms/VaultEntryForm';
import CompanyForm from '../forms/CompanyForm';
import StaffForm from '../forms/StaffForm';
import DeviceForm from '../forms/DeviceForm';
import EventForm from '../forms/EventForm';

const Dashboard = () => {
    const [companies, setCompanies] = useState([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(false);

    // UI State
    const [activeTab, setActiveTab] = useState('staff'); // vault, staff, devices, events
    const [editingItem, setEditingItem] = useState(null);

    // Modals State
    const [showEntryForm, setShowEntryForm] = useState(false);
    const [showCompanyForm, setShowCompanyForm] = useState(false);
    const [showStaffForm, setShowStaffForm] = useState(false);
    const [showDeviceForm, setShowDeviceForm] = useState(false);
    const [showEventForm, setShowEventForm] = useState(false);

    const handleDeleteEntry = async (id) => {
        if (window.confirm("¿Confirma que desea eliminar esta clave de la bóveda?")) {
            try {
                await deleteDoc(doc(db, 'vault_entries', id));
            } catch (error) {
                console.error("Error deleting entry:", error);
                alert("Error eliminando entrada: " + error.message);
            }
        }
    };

    // Fetch Companies
    useEffect(() => {
        const q = query(collection(db, 'companies'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const companyList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setCompanies(companyList);
            if (companyList.length > 0 && !selectedCompanyId) {
                setSelectedCompanyId(companyList[0].id);
            }
        });
        return () => unsubscribe();
    }, []);

    // Fetch Entries based on Company
    useEffect(() => {
        if (!selectedCompanyId) {
            setEntries([]);
            return;
        }

        setLoading(true);

        // Create Document Reference for the company
        const companyRef = doc(db, 'companies', selectedCompanyId);

        // Filter by Reference as per spec
        const q = query(collection(db, 'vault_entries'), where('companyId', '==', companyRef));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const entryList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setEntries(entryList);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching entries:", error); // Likely Permission Denied if Rules block it
            setLoading(false);
        });
        return () => unsubscribe();
    }, [selectedCompanyId]);

    // Filter entries locally for "Universal Search" experience
    const filteredEntries = entries.filter(entry => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();

        // Check Search Vector if exists, else check fields
        if (entry.search_vector && Array.isArray(entry.search_vector)) {
            return entry.search_vector.some(tag => tag.toLowerCase().includes(q));
        }

        // Fallback search
        return (
            entry.serviceName?.toLowerCase().includes(q) ||
            entry.username?.toLowerCase().includes(q) ||
            entry.deviceName?.toLowerCase().includes(q)
        );
    });

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Top Navigation */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center">
                            <Database className="w-8 h-8 text-blue-600 mr-3" />
                            <span className="font-bold text-xl text-slate-800 tracking-tight">Vault-CRM</span>
                        </div>
                        <div className="flex items-center space-x-4">
                            <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                                <Settings className="w-5 h-5" />
                            </button>
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs ring-2 ring-white shadow-sm">
                                AD
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 overflow-x-hidden">

                {/* Controls: Company Selector & Search */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">

                    {/* Company Selector & Add Button */}
                    <div className="flex items-center gap-2 min-w-full lg:min-w-[200px]">
                        <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Building className="h-4 w-4 text-slate-400" />
                            </div>
                            <select
                                value={selectedCompanyId || ''}
                                onChange={(e) => setSelectedCompanyId(e.target.value)}
                                className="block w-full pl-10 pr-10 py-2.5 text-base border-slate-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg shadow-sm bg-white"
                            >
                                {companies.length === 0 ? <option>Seleccionar Empresa</option> : null}
                                {companies.map(c => (
                                    <option key={c.id} value={c.id}>{c.legalName || 'Sin Nombre'}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={() => setShowCompanyForm(true)}
                            className="p-2.5 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-500 shrink-0"
                            title="Nueva Empresa"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                        {selectedCompanyId && (
                            <button
                                onClick={() => {
                                    const company = companies.find(c => c.id === selectedCompanyId);
                                    setEditingItem(company);
                                    setShowCompanyForm(true);
                                }}
                                className="p-2.5 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-500 shrink-0"
                                title="Editar Empresa"
                            >
                                <Settings className="w-5 h-5" />
                            </button>
                        )}
                    </div>

                    {/* Universal Search */}
                    <div className="relative flex-1 w-full lg:max-w-2xl">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg leading-5 bg-white placeholder-slate-400 focus:outline-none focus:placeholder-slate-500 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm shadow-sm transition-shadow"
                            placeholder="Search vault... (e.g. 'Gmail', 'Admin', 'Server')"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 no-scrollbar">
                        <button
                            onClick={() => setShowStaffForm(true)}
                            disabled={!selectedCompanyId}
                            className="p-2.5 bg-white border border-slate-300 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                            title="Nuevo Personal"
                        >
                            <Users className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setShowDeviceForm(true)}
                            disabled={!selectedCompanyId}
                            className="p-2.5 bg-white border border-slate-300 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                            title="Nuevo Dispositivo"
                        >
                            <Monitor className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setShowEventForm(true)}
                            disabled={!selectedCompanyId}
                            className="p-2.5 bg-white border border-slate-300 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                            title="Registrar Evento"
                        >
                            <AlertTriangle className="w-5 h-5" />
                        </button>
                        <div className="h-6 w-px bg-slate-300 mx-2 hidden lg:block"></div>
                        <button
                            onClick={() => setShowEntryForm(true)}
                            disabled={!selectedCompanyId}
                            className={`inline-flex items-center px-4 py-2.5 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white transition-colors shrink-0 ${!selectedCompanyId ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                        >
                            <Plus className="-ml-1 mr-2 h-4 w-4" />
                            Nueva Clave
                        </button>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="mb-6 border-b border-slate-200 overflow-x-auto no-scrollbar">
                    <nav className="-mb-px flex space-x-8 px-1" aria-label="Tabs">
                        <button
                            onClick={() => setActiveTab('staff')}
                            className={`${activeTab === 'staff' ? 'border-green-500 text-green-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center shrink-0`}
                        >
                            <Users className="w-4 h-4 mr-2" />
                            Personal
                        </button>
                        <button
                            onClick={() => setActiveTab('devices')}
                            className={`${activeTab === 'devices' ? 'border-purple-500 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center shrink-0`}
                        >
                            <Monitor className="w-4 h-4 mr-2" />
                            Inventario
                        </button>
                        <button
                            onClick={() => setActiveTab('events')}
                            className={`${activeTab === 'events' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center shrink-0`}
                        >
                            <Activity className="w-4 h-4 mr-2" />
                            Eventos / Logs
                        </button>
                        <button
                            onClick={() => setActiveTab('vault')}
                            className={`${activeTab === 'vault' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center shrink-0`}
                        >
                            <Shield className="w-4 h-4 mr-2" />
                            Bóveda
                        </button>
                    </nav>
                </div>

                {/* Content Area */}
                {activeTab === 'vault' && (
                    <>
                        {loading ? (
                            <div className="flex justify-center py-20">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            </div>
                        ) : (
                            <>
                                {filteredEntries.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {filteredEntries.map(entry => (
                                            <div key={entry.id} className="relative group">
                                                <VaultCard entry={entry} />
                                                {/* Simple Edit Overlay for Vault needed? Or click to details? 
                                             For now, let's add a small Edit button in the card via prop or overlay here
                                             But VaultCard needs to support onEdit. 
                                             I will simply overlay a button here for now or update VaultCard later.
                                             Actually, let's keep it simple: Vault Card is read-only decrypt. 
                                             I'll add an edit button at the top right of the card wrapper.
                                         */}
                                                <button
                                                    onClick={() => { setEditingItem(entry); setShowEntryForm(true); }}
                                                    className="absolute top-2 right-9 p-1.5 bg-white/90 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-blue-600 z-10"
                                                    title="Editar"
                                                >
                                                    <Settings className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteEntry(entry.id)}
                                                    className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-red-600 z-10"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-20 bg-white rounded-xl border border-slate-100 border-dashed">
                                        <div className="mx-auto h-12 w-12 text-slate-300">
                                            <Database className="h-12 w-12" />
                                        </div>
                                        <h3 className="mt-2 text-sm font-medium text-slate-900">No entries found</h3>
                                        <p className="mt-1 text-sm text-slate-500">
                                            {companies.length === 0 ? "Create a company to get started." : "No credentials match your search."}
                                        </p>
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}

                {activeTab === 'staff' && (
                    <EntityList
                        collectionName="staff"
                        companyId={selectedCompanyId}
                        onEdit={(item) => { setEditingItem(item); setShowStaffForm(true); }}
                    />
                )}

                {activeTab === 'devices' && (
                    <EntityList
                        collectionName="devices"
                        companyId={selectedCompanyId}
                        onEdit={(item) => { setEditingItem(item); setShowDeviceForm(true); }}
                    />
                )}

                {activeTab === 'events' && (
                    <EntityList
                        collectionName="events"
                        companyId={selectedCompanyId}
                        onEdit={(item) => { setEditingItem(item); setShowEventForm(true); }}
                    />
                )}
                {/* Modals */}
                {showEntryForm && (
                    <VaultEntryForm
                        companyId={selectedCompanyId}
                        initialData={editingItem}
                        onClose={() => { setShowEntryForm(false); setEditingItem(null); }}
                        onSuccess={() => { /* maybe refresh */ }}
                    />
                )}
                {showCompanyForm && (
                    <CompanyForm
                        initialData={editingItem}
                        onClose={() => { setShowCompanyForm(false); setEditingItem(null); }}
                    />
                )}
                {showStaffForm && (
                    <StaffForm
                        companyId={selectedCompanyId}
                        initialData={editingItem}
                        onClose={() => { setShowStaffForm(false); setEditingItem(null); }}
                    />
                )}
                {showDeviceForm && (
                    <DeviceForm
                        companyId={selectedCompanyId}
                        initialData={editingItem}
                        onClose={() => { setShowDeviceForm(false); setEditingItem(null); }}
                        onAddStaff={() => setShowStaffForm(true)}
                    />
                )}
                {showEventForm && (
                    <EventForm
                        companyId={selectedCompanyId}
                        initialData={editingItem}
                        onClose={() => { setShowEventForm(false); setEditingItem(null); }}
                    />
                )}
            </main>
        </div>
    );
};

export default Dashboard;
