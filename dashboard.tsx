import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom/client';

// --- Global Declarations ---
declare var firebase: any;

// --- Types ---
interface ActivationKey {
    code: string;
    client: { name: string; phone: string; notes: string; };
    durationDays: number;
    status: 'unused' | 'activated' | 'expired';
    createdAt: number;
    deviceId: string | null;
    activatedAt: number | null;
    expiresAt: number | null;
}
type FirebaseConfig = { apiKey: string; authDomain: string; databaseURL: string; projectId: string; storageBucket: string; messagingSenderId: string; appId: string; measurementId?: string };
type ToastMessage = { id: number; message: string; type: 'success' | 'error' | 'info' };

// --- Helper Hooks & Functions ---
function useLocalStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(error);
            return initialValue;
        }
    });
    useEffect(() => {
        try {
            window.localStorage.setItem(key, JSON.stringify(storedValue));
        } catch (error) {
            console.error(error);
        }
    }, [key, storedValue]);
    return [storedValue, setStoredValue];
}
const formatDate = (timestamp: number | null) => timestamp ? new Date(timestamp).toLocaleString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

// --- Icons ---
const CheckCircleIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
const AlertTriangleIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const InfoIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>;
const CopyIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>;
const Trash2Icon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>;
const RotateCcwIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>;
const LogOutIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>;

// --- Components ---
function Toast({ message, onDismiss }: { message: ToastMessage, onDismiss: () => void }) {
    useEffect(() => { const timer = setTimeout(onDismiss, 4000); return () => clearTimeout(timer); }, [onDismiss]);
    const colors = { success: 'bg-green-500', error: 'bg-red-500', info: 'bg-blue-500' };
    const Icon = { success: CheckCircleIcon, error: AlertTriangleIcon, info: InfoIcon }[message.type];
    return (<div className={`fixed bottom-5 right-5 w-auto max-w-sm p-4 rounded-lg shadow-2xl flex items-center gap-4 text-white z-50 animate-fade-in-up ${colors[message.type]}`}><Icon className="w-6 h-6 flex-shrink-0" /><p className="font-semibold">{message.message}</p></div>);
};

function LoginScreen({ onLogin }: { onLogin: (password: string) => void }) {
    const [password, setPassword] = useState('');
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onLogin(password); };
    return (<div className="min-h-screen bg-gray-100 flex items-center justify-center p-4"><div className="w-full max-w-sm bg-white rounded-xl shadow-2xl p-8 space-y-6"><div className="text-center"><h1 className="text-3xl font-bold text-blue-600">لوحة التحكم</h1><p className="text-gray-500">الوصول للمشرفين فقط</p></div><form onSubmit={handleSubmit} className="space-y-4"><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="كلمة المرور" className="w-full p-3 bg-gray-50 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-center" required /><button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold text-lg text-white">دخول</button></form></div></div>);
};

function Dashboard({ onLogout, firebaseConfig }: { onLogout: () => void; firebaseConfig: FirebaseConfig }) {
    const [keys, setKeys] = useState<ActivationKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState<ToastMessage | null>(null);
    const [newClientData, setNewClientData] = useState({ clientName: '', clientPhone: '', durationDays: 30, clientNotes: '' });
    const [isCreating, setIsCreating] = useState(false);
    const [filter, setFilter] = useState('all');
    
    const showToast = useCallback((message: string, type: ToastMessage['type']) => {
        setToast({ id: Date.now(), message, type });
    }, []);

    useEffect(() => {
        try { if (!firebase.apps.length) firebase.initializeApp(firebaseConfig); } catch (e) { console.error(e); }
        const db = firebase.database();
        const keysRef = db.ref('activation_keys');
        const listener = keysRef.on('value', (snapshot: any) => {
            const data = snapshot.val();
            const keyList: ActivationKey[] = data ? Object.values(data) : [];
            // Check expiry status on load
            const now = Date.now();
            const updatedList = keyList.map(k => {
                if (k.status === 'activated' && k.expiresAt && now > k.expiresAt) {
                    k.status = 'expired';
                }
                return k;
            });
            setKeys(updatedList);
            setLoading(false);
        });
        return () => keysRef.off('value', listener);
    }, [firebaseConfig]);

    const handleCreateKey = async () => {
        const { clientName, clientPhone, durationDays, clientNotes } = newClientData;
        if (!durationDays || Number(durationDays) <= 0) {
            showToast('الرجاء إدخال مدة صلاحية صالحة بالأيام.', 'error');
            return;
        }

        setIsCreating(true);
        const newKey = `YSK-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        const keyData: Omit<ActivationKey, 'createdAt'> & { createdAt: object } = {
            code: newKey,
            client: { name: clientName, phone: clientPhone, notes: clientNotes },
            durationDays: Number(durationDays),
            status: 'unused',
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            deviceId: null,
            activatedAt: null,
            expiresAt: null,
        };

        try {
            await firebase.database().ref('activation_keys/' + newKey).set(keyData);
            navigator.clipboard.writeText(newKey);
            showToast('تم إنشاء الكود ونسخه بنجاح!', 'success');
            setNewClientData({ clientName: '', clientPhone: '', durationDays: 30, clientNotes: '' });
        } catch (error) {
            console.error("Failed to create key:", error);
            showToast('فشل إنشاء الكود. تحقق من اتصال Firebase.', 'error');
        } finally {
            setIsCreating(false);
        }
    };
    
    const handleDeleteKey = (code: string) => { if (window.confirm(`هل أنت متأكد من حذف الكود ${code}؟`)) { firebase.database().ref('activation_keys/' + code).remove().then(() => showToast('تم حذف الكود', 'success')).catch(() => showToast('فشل الحذف', 'error')); }};
    const handleResetKey = (code: string) => { if (window.confirm(`هل أنت متأكد من إعادة تعيين الكود ${code}؟ سيصبح الكود غير مستخدم ويمكن تفعيله على جهاز جديد.`)) { firebase.database().ref('activation_keys/' + code).update({ status: 'unused', deviceId: null, activatedAt: null, expiresAt: null }).then(() => showToast('تم إعادة تعيين الكود', 'success')).catch(() => showToast('فشل إعادة التعيين', 'error')); } };
    const handleCopy = (text: string) => { navigator.clipboard.writeText(text); showToast('تم النسخ إلى الحافظة', 'info'); };

    const filteredKeys = useMemo(() => keys.filter(k => filter === 'all' || k.status === filter).sort((a,b) => b.createdAt - a.createdAt), [keys, filter]);
    const statusMap: Record<ActivationKey['status'], string> = { unused: 'غير مستخدم', activated: 'نشط', expired: 'منتهي' };
    const statusColors: Record<ActivationKey['status'], string> = { unused: 'bg-gray-200 text-gray-800', activated: 'bg-green-200 text-green-800', expired: 'bg-red-200 text-red-800' };

    return (<div className="min-h-screen bg-gray-50"><header className="bg-white shadow-sm p-4 flex justify-between items-center"><h1 className="text-2xl font-bold text-blue-600">إدارة أكواد التفعيل</h1><button onClick={onLogout} className="flex items-center gap-2 text-gray-600 hover:text-red-500 font-semibold"><LogOutIcon className="w-5 h-5"/> تسجيل الخروج</button></header><main className="p-6 space-y-6"><div className="bg-white p-6 rounded-lg shadow-md border border-gray-200"><h2 className="text-xl font-bold mb-4">إنشاء كود جديد</h2><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end"><input value={newClientData.clientName} onChange={e => setNewClientData(d => ({ ...d, clientName: e.target.value }))} placeholder="اسم العميل (اختياري)" className="p-2 border rounded-md" /><input value={newClientData.clientPhone} onChange={e => setNewClientData(d => ({ ...d, clientPhone: e.target.value }))} placeholder="هاتف العميل (اختياري)" className="p-2 border rounded-md" /><input type="number" value={newClientData.durationDays} onChange={e => setNewClientData(d => ({ ...d, durationDays: +e.target.value }))} placeholder="مدة الصلاحية (أيام)" className="p-2 border rounded-md" min="1" /><button onClick={handleCreateKey} disabled={isCreating} className="w-full py-2 bg-blue-600 text-white rounded-md font-bold hover:bg-blue-700 disabled:bg-blue-300">{isCreating ? 'جاري الإنشاء...' : 'إنشاء ونسخ الكود'}</button></div></div><div className="bg-white p-6 rounded-lg shadow-md border border-gray-200"><div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold">الأكواد الحالية ({filteredKeys.length})</h2><div><select value={filter} onChange={e => setFilter(e.target.value)} className="p-2 border rounded-md"><option value="all">الكل</option><option value="unused">غير مستخدم</option><option value="activated">نشط</option><option value="expired">منتهي</option></select></div></div><div className="overflow-x-auto"><table className="w-full text-center"><thead><tr className="border-b-2"><th className="p-3">الكود</th><th className="p-3">العميل</th><th className="p-3">تاريخ الإنشاء</th><th className="p-3">تاريخ التفعيل</th><th className="p-3">تاريخ الانتهاء</th><th className="p-3">الحالة</th><th className="p-3">الإجراءات</th></tr></thead><tbody>{loading ? <tr><td colSpan={7} className="p-8 text-gray-500">جاري التحميل...</td></tr> : filteredKeys.map(key => (<tr key={key.code} className="border-b hover:bg-gray-50"><td className="p-3 font-mono text-sm">{key.code}</td><td className="p-3">{key.client.name || '-'}</td><td className="p-3 text-sm">{formatDate(key.createdAt)}</td><td className="p-3 text-sm">{formatDate(key.activatedAt)}</td><td className="p-3 text-sm">{formatDate(key.expiresAt)}</td><td className="p-3"><span className={`px-3 py-1 text-xs font-semibold rounded-full ${statusColors[key.status]}`}>{statusMap[key.status]}</span></td><td className="p-3"><div className="flex justify-center items-center gap-2"><button onClick={() => handleCopy(key.code)} title="نسخ"><CopyIcon className="w-5 h-5 text-gray-500 hover:text-blue-600"/></button><button onClick={() => handleResetKey(key.code)} title="إعادة تعيين"><RotateCcwIcon className="w-5 h-5 text-gray-500 hover:text-green-600"/></button><button onClick={() => handleDeleteKey(key.code)} title="حذف"><Trash2Icon className="w-5 h-5 text-gray-500 hover:text-red-600"/></button></div></td></tr>))}</tbody></table></div></div></main>{toast && <Toast message={toast} onDismiss={() => setToast(null)} />}</div>);
};

const App: React.FC = () => {
    const [isLoggedIn, setIsLoggedIn] = useLocalStorage('dashboard-loggedIn', false);
    const [firebaseConfig, setFirebaseConfig] = useLocalStorage<FirebaseConfig | null>('activation-firebase-config', null);
    
    const handleLogin = (password: string) => { if (password === 'yskadmin') setIsLoggedIn(true); else alert('كلمة المرور غير صحيحة'); };
    const handleLogout = () => setIsLoggedIn(false);

    if (!firebaseConfig) {
        return <LoginScreen onLogin={(pass) => {
            if (pass === 'yskadmin_config_setup') {
                const configStr = prompt("أدخل كائن إعدادات Firebase من مشروعك:");
                try {
                    const config = JSON.parse(configStr || '{}');
                    if (config.apiKey && config.databaseURL && config.projectId) {
                        setFirebaseConfig(config);
                    } else {
                        alert("الإعدادات غير صالحة. تأكد من نسخ الكائن كاملاً.");
                    }
                } catch(e) {
                    alert("JSON غير صالح. يرجى نسخ الكائن بشكل صحيح.");
                }
            } else {
                alert("كلمة مرور الإعداد غير صحيحة.");
            }
        }} />;
    }

    if (!isLoggedIn) return <LoginScreen onLogin={handleLogin} />;
    
    return <Dashboard onLogout={handleLogout} firebaseConfig={firebaseConfig} />;
};

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');
const root = ReactDOM.createRoot(rootElement);
root.render(<App />);
