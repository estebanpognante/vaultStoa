import React, { useState, useEffect } from 'react';
import { Search, Building, Plus, Database, Settings, Users, Monitor, AlertTriangle, List, Shield, Activity, Trash2, LogOut, Key } from 'lucide-react';
import VaultCard from './VaultCard';
import EntityList from './EntityList';
import { useSecurity } from '../../context/SecurityContext';
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

import UserManagement from '../admin/UserManagement';

const Dashboard = () => {
    const [companies, setCompanies] = useState([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(false);

    // UI State
    const [activeTab, setActiveTab] = useState('staff'); // vault, staff, devices, events, users
    const [superAdminTab, setSuperAdminTab] = useState('App'); // SuperAdmin Top Level: App, Interna, Usuarios
    const [editingItem, setEditingItem] = useState(null);

    // Modals State
    const [showEntryForm, setShowEntryForm] = useState(false);
    const [showCompanyForm, setShowCompanyForm] = useState(false);
    const [showStaffForm, setShowStaffForm] = useState(false);
    const [showDeviceForm, setShowDeviceForm] = useState(false);
    const [showEventForm, setShowEventForm] = useState(false);

    // User Menu State
    const [showUserMenu, setShowUserMenu] = useState(false);
    const { logout, user } = useSecurity();

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
        if (!user) return;

        let q;
        if (user.role === 'superadmin') {
            q = query(collection(db, 'companies'));
        } else {
            // Admins/Users can only see companies they own (or belong to - if Users, they also have ownerId in their profile pointing to Admin)
            // But wait, Users don't "own" companies, their Admin does. 
            // The Security Rules say: `resource.data.ownerId == getUser().ownerId`.
            // So if I am a User, my `user.ownerId` is the Admin's ID. 
            // If I am Admin, my `user.ownerId` is MY OWN ID.
            // So `where('ownerId', '==', user.ownerId)` should work for BOTH Admin and User (assuming Company has ownerId set to Admin's ID).
            q = query(collection(db, 'companies'), where('ownerId', '==', user.ownerId));
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const companyList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setCompanies(companyList);
            if (companyList.length > 0 && !selectedCompanyId) {
                setSelectedCompanyId(companyList[0].id);
            }
        });
        return () => unsubscribe();
    }, [user]);

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
                            <span className="font-bold text-xl text-slate-800 tracking-tight">STOA - Vault</span>
                        </div>
                        <div className="flex items-center space-x-4">
                            <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                                <Settings className="w-5 h-5" />
                            </button>
                            <div className="relative">
                                <button
                                    onClick={() => setShowUserMenu(!showUserMenu)}
                                    className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs ring-2 ring-white shadow-sm hover:ring-blue-200 transition-all focus:outline-none"
                                >
                                    AD
                                </button>

                                {showUserMenu && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5 z-50">
                                        <button
                                            onClick={() => {
                                                setShowUserMenu(false);
                                                logout();
                                            }}
                                            className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 w-full text-left flex items-center"
                                        >
                                            <LogOut className="w-4 h-4 mr-2" />
                                            Cerrar Sesión
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* SuperAdmin Top Level Navigation */}
            {user?.role === 'superadmin' && (
                <div className="bg-slate-900 text-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex space-x-1">
                            {['App', 'Interna', 'Usuarios'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => {
                                        // Reset internal tab when switching Top Level
                                        if (superAdminTab !== tab) {
                                            setSuperAdminTab(tab);
                                        }
                                    }}
                                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${superAdminTab === tab
                                        ? 'border-blue-500 text-white bg-slate-800'
                                        : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                                        }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 overflow-x-hidden">

                {/* VIEW: USUARIOS (SuperAdmin Only) */}
                {user?.role === 'superadmin' && superAdminTab === 'Usuarios' && (
                    <UserManagement inlineForm={true} isGlobalView={true} />
                )}

                {/* VIEW: INTERNA (SuperAdmin Only - Placeholder) */}
                {user?.role === 'superadmin' && superAdminTab === 'Interna' && (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-slate-200 border-dashed">
                        <div className="animate-pulse bg-slate-200 rounded-full h-20 w-20 mb-4"></div>
                        <h2 className="text-xl font-bold text-slate-400">Vista Interna de Proyecto</h2>
                        <p className="text-slate-500">Próximamente...</p>
                    </div>
                )}

                {/* VIEW: APP (Default for everyone, or 'App' tab for SA) */}
                {((user?.role !== 'superadmin') || (user?.role === 'superadmin' && superAdminTab === 'App')) && (
                    <>
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
                            <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 no-scrollbar mb-4 lg:mb-0">
                                <button
                                    onClick={() => setShowStaffForm(true)}
                                    disabled={!selectedCompanyId}
                                    className="flex-1 lg:flex-none p-2.5 bg-white border border-slate-300 rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 flex justify-center"
                                    title="Nuevo Personal"
                                >
                                    <Users className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => setShowDeviceForm(true)}
                                    disabled={!selectedCompanyId}
                                    className="flex-1 lg:flex-none p-2.5 bg-white border border-slate-300 rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 flex justify-center"
                                    title="Nuevo Dispositivo"
                                >
                                    <Monitor className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => setShowEventForm(true)}
                                    disabled={!selectedCompanyId}
                                    className="flex-1 lg:flex-none p-2.5 bg-white border border-slate-300 rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 flex justify-center"
                                    title="Registrar Evento"
                                >
                                    <AlertTriangle className="w-5 h-5" />
                                </button>
                                <div className="h-6 w-px bg-slate-300 mx-2 hidden lg:block"></div>
                                <button
                                    onClick={() => setShowEntryForm(true)}
                                    disabled={!selectedCompanyId}
                                    className="flex-1 lg:flex-none p-2.5 bg-white border border-slate-300 rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 flex justify-center"
                                    title="Nueva Clave"
                                >
                                    <Key className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Tab Navigation */}
                        {/* Tab Navigation */}
                        <div className="mb-6 border-b border-slate-200">
                            <nav className="-mb-px grid grid-cols-6 lg:flex lg:space-x-8 lg:overflow-visible" aria-label="Tabs">
                                <button
                                    onClick={() => setActiveTab('staff')}
                                    className={`${activeTab === 'staff' ? 'border-green-500 text-green-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center justify-center lg:justify-start col-span-3 lg:col-span-1`}
                                >
                                    <Users className="w-4 h-4 mr-2" />
                                    Personal
                                </button>
                                <button
                                    onClick={() => setActiveTab('devices')}
                                    className={`${activeTab === 'devices' ? 'border-purple-500 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center justify-center lg:justify-start col-span-3 lg:col-span-1`}
                                >
                                    <Monitor className="w-4 h-4 mr-2" />
                                    Inventario
                                </button>
                                <button
                                    onClick={() => setActiveTab('events')}
                                    className={`${activeTab === 'events' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center justify-center lg:justify-start col-span-2 lg:col-span-1`}
                                >
                                    <Activity className="w-4 h-4 mr-2" />
                                    <span className="hidden sm:inline">Eventos / Logs</span>
                                    <span className="sm:hidden">Eventos</span>
                                </button>
                                <button
                                    onClick={() => setActiveTab('vault')}
                                    className={`${activeTab === 'vault' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center justify-center lg:justify-start col-span-2 lg:col-span-1`}
                                >
                                    <Shield className="w-4 h-4 mr-2" />
                                    Bóveda
                                </button>
                                {/* Only show Team tab for Admin (SuperAdmin uses top-level Users tab) */}
                                {user?.role === 'admin' && (
                                    <button
                                        onClick={() => setActiveTab('users')}
                                        className={`${activeTab === 'users' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center justify-center lg:justify-start col-span-2 lg:col-span-1`}
                                    >
                                        <Users className="w-4 h-4 mr-2" />
                                        Equipo
                                    </button>
                                )}
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
                                searchQuery={searchQuery}
                                onEdit={(item) => { setEditingItem(item); setShowStaffForm(true); }}
                            />
                        )}

                        {activeTab === 'devices' && (
                            <EntityList
                                collectionName="devices"
                                companyId={selectedCompanyId}
                                searchQuery={searchQuery}
                                onEdit={(item) => { setEditingItem(item); setShowDeviceForm(true); }}
                            />
                        )}

                        {activeTab === 'events' && (
                            <EntityList
                                collectionName="events"
                                companyId={selectedCompanyId}
                                searchQuery={searchQuery}
                                onEdit={(item) => { setEditingItem(item); setShowEventForm(true); }}
                            />
                        )}

                        {activeTab === 'users' && user?.role === 'admin' && (
                            <UserManagement />
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
                    </>
                )}
            </main>
        </div>
    );
};

export default Dashboard;
