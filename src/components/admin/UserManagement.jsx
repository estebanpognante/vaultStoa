import React, { useState, useEffect } from 'react';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut } from 'firebase/auth';
import { db, firebaseConfig } from '../../config/firebase';
import { collection, query, where, getDocs, addDoc, setDoc, serverTimestamp, doc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { useSecurity } from '../../context/SecurityContext';
import { Users, Mail, UserPlus, Shield, Check, X, Trash2, AlertTriangle, ToggleLeft, ToggleRight } from 'lucide-react';

const UserManagement = ({ inlineForm = false, isGlobalView = false }) => {
    const { user } = useSecurity();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showInviteForm, setShowInviteForm] = useState(false);

    // Force global view if prop is passed
    const [globalView, setGlobalView] = useState(isGlobalView);

    useEffect(() => {
        if (isGlobalView) setGlobalView(true);
    }, [isGlobalView]);

    // Invite Form State
    const [inviteData, setInviteData] = useState({
        email: '',
        displayName: '',
        role: 'user' // Default to user
    });
    const [inviteError, setInviteError] = useState(null);
    const [inviteSuccess, setInviteSuccess] = useState(null);

    useEffect(() => {
        if (!user) return;

        setLoading(true);
        let q;

        // RBAC Query Logic
        if (user.role === 'superadmin' && globalView) {
            // SuperAdmin Global: Fetch ALL users
            q = query(collection(db, 'users'));
        } else {
            // Regular Admin or SuperAdmin Personal: Fetch users owned by them
            // Note: Admins "own" the users they invite.
            q = query(collection(db, 'users'), where('ownerId', '==', user.uid));
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const userList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setUsers(userList);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching users:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, globalView]);

    const handleInviteChange = (e) => {
        setInviteData({ ...inviteData, [e.target.name]: e.target.value });
    };

    const handleInviteSubmit = async (e) => {
        e.preventDefault();
        setInviteError(null);
        setInviteSuccess(null);

        if (!inviteData.email || !inviteData.displayName) {
            setInviteError("Todos los campos son obligatorios.");
            return;
        }

        // Initialize secondary app to create user without logging out current admin
        const secondaryApp = initializeApp(firebaseConfig, "Secondary");
        const secondaryAuth = getAuth(secondaryApp);

        try {
            // 1. Create User in Auth (with random temp password)
            const tempPassword = Math.random().toString(36).slice(-8) + "Aa1!";
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, inviteData.email, tempPassword);
            const newUser = userCredential.user;

            // 2. Send Password Reset Email (The actual "Invite")
            await sendPasswordResetEmail(secondaryAuth, inviteData.email);

            // 3. Create User Profile in Firestore using the Auth UID
            await setDoc(doc(db, 'users', newUser.uid), {
                ...inviteData,
                ownerId: user.uid, // The inviter is the owner
                createdAt: serverTimestamp(),
                status: 'Invited' // Flag to indicate they haven't logged in yet
            });

            // 4. Cleanup Secondary App
            await signOut(secondaryAuth);

            setInviteSuccess(`Invitación enviada a ${inviteData.email}. Se ha enviado un correo para configurar la contraseña.`);
            setInviteData({ email: '', displayName: '', role: 'user' });
            setShowInviteForm(false);

        } catch (error) {
            console.error("Error inviting user:", error);
            if (error.code === 'auth/email-already-in-use') {
                setInviteError("Este correo ya está registrado en el sistema. Intente invitarlo nuevamente o contacte soporte.");
            } else {
                setInviteError("Error al invitar: " + error.message);
            }
        } finally {
            // Ensure app is deleted even if error occurs
            await deleteApp(secondaryApp);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (window.confirm("¿Seguro que desea eliminar/revocar acceso a este usuario?")) {
            try {
                await deleteDoc(doc(db, 'users', userId));
            } catch (error) {
                console.error("Error deleting user:", error);
            }
        }
    };

    return (
        <div className="space-y-6">
            {!inlineForm && (
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 flex items-center">
                            <Users className="w-6 h-6 mr-2 text-blue-600" />
                            Gestión de Equipo
                        </h2>
                        <p className="text-slate-500 text-sm">Administra el acceso de tus colaboradores.</p>
                    </div>
                    <div className="flex items-center space-x-4">
                        {user?.role === 'superadmin' && (
                            <button
                                onClick={() => setGlobalView(!globalView)}
                                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${globalView
                                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                                    }`}
                            >
                                {globalView ? <ToggleRight className="w-5 h-5 mr-2" /> : <ToggleLeft className="w-5 h-5 mr-2" />}
                                {globalView ? 'Vista Global (Dios)' : 'Vista Local'}
                            </button>
                        )}
                        <button
                            onClick={() => setShowInviteForm(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center shadow-lg shadow-blue-500/30 transition-all font-medium"
                        >
                            <UserPlus className="w-5 h-5 mr-2" />
                            Invitar Usuario
                        </button>
                    </div>
                </div>
            )}

            {inviteSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center animate-fadeIn">
                    <Check className="w-5 h-5 mr-2" />
                    {inviteSuccess}
                    <button onClick={() => setInviteSuccess(null)} className="ml-auto"><X className="w-4 h-4" /></button>
                </div>
            )}

            {/* Inline Invite Form for SuperAdmin */}
            {inlineForm && (
                <div className="bg-slate-50 border border-blue-100 rounded-xl p-6 mb-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                        <UserPlus className="w-5 h-5 mr-2 text-blue-600" />
                        Invitar Nuevo Usuario
                    </h3>

                    <form onSubmit={handleInviteSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="md:col-span-1">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                            <input
                                type="email"
                                name="email"
                                required
                                value={inviteData.email}
                                onChange={handleInviteChange}
                                className="block w-full rounded-lg border-slate-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2.5 border"
                                placeholder="email@ejemplo.com"
                            />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                            <input
                                type="text"
                                name="displayName"
                                required
                                value={inviteData.displayName}
                                onChange={handleInviteChange}
                                className="block w-full rounded-lg border-slate-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2.5 border"
                                placeholder="Nombre Apellido"
                            />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Rol</label>
                            <select
                                name="role"
                                value={inviteData.role}
                                onChange={handleInviteChange}
                                className="block w-full rounded-lg border-slate-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2.5 border"
                            >
                                <option value="user">Usuario</option>
                                <option value="admin">Administrador</option>
                                {user?.role === 'superadmin' && <option value="superadmin">Super Admin</option>}
                            </select>
                        </div>
                        <div className="md:col-span-1">
                            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg shadow-lg shadow-blue-500/30 transition-all">
                                Enviar Invitación
                            </button>
                        </div>
                    </form>
                    {inviteError && (
                        <div className="mt-3 text-red-600 text-sm flex items-center">
                            <AlertTriangle className="w-4 h-4 mr-1" /> {inviteError}
                        </div>
                    )}
                    {inviteSuccess && (
                        <div className="mt-3 text-green-600 text-sm flex items-center">
                            <Check className="w-4 h-4 mr-1" /> {inviteSuccess}
                        </div>
                    )}
                </div>
            )}

            {/* Modal Invite Form (Original) - Only show if NOT inline and requested */}
            {!inlineForm && showInviteForm && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-slate-800">Invitar Colaborador</h3>
                            <button onClick={() => setShowInviteForm(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleInviteSubmit} className="space-y-4">
                            {inviteError && (
                                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center">
                                    <AlertTriangle className="w-4 h-4 mr-2" /> {inviteError}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Email del Usuario</label>
                                <div className="relative">
                                    <Mail className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
                                    <input
                                        type="email"
                                        name="email"
                                        required
                                        value={inviteData.email}
                                        onChange={handleInviteChange}
                                        className="pl-10 block w-full rounded-lg border-slate-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2.5 border"
                                        placeholder="usuario@ejemplo.com"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Mostrado</label>
                                <input
                                    type="text"
                                    name="displayName"
                                    required
                                    value={inviteData.displayName}
                                    onChange={handleInviteChange}
                                    className="block w-full rounded-lg border-slate-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2.5 border"
                                    placeholder="Juan Pérez"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Rol</label>
                                <select
                                    name="role"
                                    value={inviteData.role}
                                    onChange={handleInviteChange}
                                    className="block w-full rounded-lg border-slate-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2.5 border"
                                >
                                    <option value="user">Usuario (Estándar)</option>
                                    <option value="admin">Administrador (Nuevo Tenant)</option>
                                    {/* Only SuperAdmin can create Admins? Ideally yes. For now let's allow flexibility or restrict in logic. 
                                        Logic: If I am an Admin, I can only create Users. 
                                        If I am SuperAdmin, I can create Admins.
                                    */}
                                    {user?.role === 'superadmin' && <option value="superadmin">Super Admin</option>}
                                </select>
                                <p className="text-xs text-slate-500 mt-1">
                                    {inviteData.role === 'admin' ?
                                        "Este usuario tendrá su propio espacio de datos aislado." :
                                        "Este usuario verá y gestionará TUS datos."
                                    }
                                </p>
                            </div>

                            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg shadow-lg shadow-blue-500/30 transition-all">
                                Enviar Invitación
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Usuario</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Rol</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Estado</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Fecha Alta</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {loading ? (
                                <tr><td colSpan="5" className="px-6 py-4 text-center">Cargando...</td></tr>
                            ) : users.length === 0 ? (
                                <tr><td colSpan="5" className="px-6 py-10 text-center text-slate-500 italic">No tienes usuarios en tu equipo aún.</td></tr>
                            ) : (
                                users.map(u => (
                                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                                    {(u.displayName || u.email || '?')[0].toUpperCase()}
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-slate-900">{u.displayName}</div>
                                                    <div className="text-sm text-slate-500">{u.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                ${u.role === 'superadmin' ? 'bg-purple-100 text-purple-800' :
                                                    u.role === 'admin' ? 'bg-green-100 text-green-800' :
                                                        'bg-blue-100 text-blue-800'}`}>
                                                {u.role ? u.role.toUpperCase() : 'USER'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {u.status === 'Invited' ? (
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                                    Invitado
                                                </span>
                                            ) : (
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                    Activo
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                            {u.createdAt?.toDate ? u.createdAt.toDate().toLocaleDateString() : 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {u.email !== user.email && ( // Prevent self-delete
                                                <button
                                                    onClick={() => handleDeleteUser(u.id)}
                                                    className="text-red-400 hover:text-red-600 transition-colors"
                                                    title="Eliminar Usuario"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default UserManagement;
