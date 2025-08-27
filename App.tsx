import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { Products } from './components/Products';
import { Settings } from './components/Settings';
import { Invoices } from './components/Invoices';
import { InvoiceList } from './components/InvoiceList';
import { Customers } from './components/Customers';
import { Expenses } from './components/Expenses';
import { Suppliers } from './components/Suppliers';
import { Bookings } from './components/Bookings';
import { Reports } from './components/Reports';
import type { Page } from './types';
import { ToastProvider, useToast } from './components/Toast';
import { AuthProvider, useAuth, StorageProvider, useStorage, DataProvider, SyncProvider } from './contexts/AuthContext';
import { Login } from './components/Login';
import { SplashScreen } from './components/SplashScreen';
import { StorageSetup } from './components/StorageSetup';
import { ActivationProvider, useActivation } from './contexts/ActivationContext';
import { ActivationScreen } from './components/ActivationScreen';
import { LockedScreen } from './components/LockedScreen';

const AppContent: React.FC = () => {
  const { hasPermission } = useAuth();
  const { addToast } = useToast();
  
  const [activePage, setActivePage] = useState<Page>('dashboard');

  const handlePageChange = (page: Page) => {
    if (hasPermission(page, 'view')) {
      setActivePage(page);
    } else {
      addToast('ليس لديك صلاحية لعرض هذه الصفحة.', 'error');
    }
  };

  const renderPage = () => {
    if (!hasPermission(activePage, 'view')) {
      return (
        <div className="p-8 text-center">
            <h2 className="text-2xl font-bold text-red-500">وصول مرفوض</h2>
            <p className="text-gray-600 mt-2">ليس لديك الصلاحية الكافية لعرض هذه الصفحة.</p>
        </div>
      );
    }
    switch (activePage) {
      case 'dashboard': return <Dashboard onNavigate={handlePageChange} />;
      case 'inventory': return <Products />;
      case 'settings': return <Settings />;
      case 'pos': return <Invoices />;
      case 'invoices': return <InvoiceList />;
      case 'customers': return <Customers />;
      case 'expenses': return <Expenses />;
      case 'suppliers': return <Suppliers />;
      case 'bookings': return <Bookings onNavigate={handlePageChange} />;
      case 'reports': return <Reports />;
      default: return <Dashboard onNavigate={handlePageChange} />;
    }
  };

  return (
      <div className="flex min-h-screen bg-gray-50 text-gray-800">
        <Sidebar activePage={activePage} onPageChange={handlePageChange} />
        <main className="flex-1">
          <Header onNavigate={handlePageChange} activePage={activePage} />
          <div className="h-[calc(100vh-80px)] overflow-y-auto">
            {renderPage()}
          </div>
        </main>
      </div>
  );
};

const AppCore: React.FC = () => {
    const { currentUser } = useAuth();

    if (!currentUser) {
        return <Login />;
    }

    return <AppContent />;
};

const MainApp: React.FC = () => {
    return (
        <AuthProvider>
            <DataProvider>
                <SyncProvider>
                    <AppCore />
                </SyncProvider>
            </DataProvider>
        </AuthProvider>
    );
};

const AppRouter: React.FC = () => {
    const { activationStatus, isLoading } = useActivation();
    const { isInitialized, storageMode } = useStorage();

    if (!isInitialized || isLoading) {
        if (storageMode === 'pending' || storageMode === 'error') {
            return <StorageSetup />;
        }
        return <SplashScreen />;
    }
    
    switch (activationStatus) {
        case 'active':
            return <MainApp />;
        case 'expired':
            return <LockedScreen message="انتهت صلاحية التفعيل. يرجى إدخال كود جديد." />;
        case 'tampered':
            return <LockedScreen message="تم اكتشاف تلاعب في وقت النظام. تم قفل التطبيق." />;
        case 'inactive':
        default:
            return <ActivationScreen />;
    }
};

const AppInitializer: React.FC = () => {
    return (
        <ActivationProvider>
            <AppRouter />
        </ActivationProvider>
    );
};

const AppWrapper: React.FC = () => {
    const [isAppLoading, setIsAppLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setIsAppLoading(false), 2000); 
        return () => clearTimeout(timer);
    }, []);

    if (isAppLoading) {
        return <SplashScreen />;
    }
    
    return (
        <ToastProvider>
            <StorageProvider>
                <AppInitializer />
            </StorageProvider>
        </ToastProvider>
    );
};

export default AppWrapper;
