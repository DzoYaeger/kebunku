import { useEffect, useState } from 'react';
import { Redirect, Route } from 'react-router-dom';
import {
  IonApp,
  IonRouterOutlet,
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
  IonSpinner,
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import {
  pieChart,
  pieChartOutline,
  medkit,
  medkitOutline,
  leaf,
  leafOutline,
  wallet,
  walletOutline,
  chatbubbleEllipses,
} from 'ionicons/icons';

import { useAuthStore } from './store/authStore';
import { useSyncStore } from './store/syncStore';
import { useOnline } from './hooks/useOnline';
import { startSyncEngine, runSync } from './sync/SyncEngine';
import { hydrateFromServer } from './sync/hydrate';
import { UNAUTHORIZED_EVENT } from './api/token';

import Login from './pages/Login';
import Register from './pages/Register';
import DashboardPage from './pages/Dashboard/DashboardPage';
import LahanListPage from './pages/Lahan/LahanListPage';
import TanamanDetailPage from './pages/Lahan/TanamanDetailPage';
import AktivitasListPage from './pages/Aktivitas/AktivitasListPage';
import KeuanganPage from './pages/Keuangan/KeuanganPage';
import ManajemenPupukPage from './pages/Perawatan/ManajemenPupukPage';
import SettingsPage from './pages/Settings/SettingsPage';
import ChatListPage from './pages/Chat/ChatListPage';
import ChatRoomPage from './pages/Chat/ChatRoomPage';
import PanenListPage from './pages/Panen/PanenListPage';

// Shell tab utama
function MainTabs(): React.JSX.Element {
  return (
    <IonTabs>
      <IonRouterOutlet>
        <Route exact path="/app/dashboard" component={DashboardPage} />
        <Route exact path="/app/tanaman" component={LahanListPage} />
        <Route exact path="/app/tanaman/:uuid" component={TanamanDetailPage} />
        <Route exact path="/app/panen" component={PanenListPage} />
        <Route exact path="/app/aktivitas" component={AktivitasListPage} />
        <Route exact path="/app/keuangan" component={KeuanganPage} />
        <Route exact path="/app/manajemen-pupuk" component={ManajemenPupukPage} />
        <Route exact path="/app/pengaturan" component={SettingsPage} />
        <Route exact path="/app/chat" component={ChatListPage} />
        <Route exact path="/app/chat/:id" component={ChatRoomPage} />
        <Route exact path="/app">
          <Redirect to="/app/dashboard" />
        </Route>
      </IonRouterOutlet>
      <IonTabBar slot="bottom" className="kbn-tabbar">
        <IonTabButton tab="dashboard" href="/app/dashboard">
          <IonIcon aria-hidden="true" className="icon-inactive" icon={pieChartOutline} />
          <IonIcon aria-hidden="true" className="icon-active" icon={pieChart} />
          <IonLabel>Ringkasan</IonLabel>
        </IonTabButton>
        <IonTabButton tab="tanaman" href="/app/tanaman">
          <IonIcon aria-hidden="true" className="icon-inactive" icon={leafOutline} />
          <IonIcon aria-hidden="true" className="icon-active" icon={leaf} />
          <IonLabel>Tanaman</IonLabel>
        </IonTabButton>
        <IonTabButton tab="chat" href="/app/chat" className="kbn-tab-center">
          <div className="kbn-fab-chat">
            <IonIcon aria-hidden="true" icon={chatbubbleEllipses} />
          </div>
          <IonLabel className="kbn-tab-center-label">Konsultasi</IonLabel>
        </IonTabButton>
        <IonTabButton tab="keuangan" href="/app/keuangan">
          <IonIcon aria-hidden="true" className="icon-inactive" icon={walletOutline} />
          <IonIcon aria-hidden="true" className="icon-active" icon={wallet} />
          <IonLabel>Keuangan</IonLabel>
        </IonTabButton>
        <IonTabButton tab="pupuk" href="/app/manajemen-pupuk">
          <IonIcon aria-hidden="true" className="icon-inactive" icon={medkitOutline} />
          <IonIcon aria-hidden="true" className="icon-active" icon={medkit} />
          <IonLabel>Pupuk</IonLabel>
        </IonTabButton>
      </IonTabBar>
    </IonTabs>
  );
}

export default function App(): React.JSX.Element {
  const status = useAuthStore((s) => s.status);
  const loadMe = useAuthStore((s) => s.loadMe);
  const logout = useAuthStore((s) => s.logout);
  const setOnline = useSyncStore((s) => s.setOnline);
  const online = useOnline();
  const [booted, setBooted] = useState(false);

  // Cek sesi + start sync engine sekali saat app start.
  useEffect(() => {
    void (async (): Promise<void> => {
      await loadMe();
      setBooted(true);
    })();
    startSyncEngine();

    const onUnauthorized = (): void => {
      void logout();
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [loadMe, logout]);

  // Sinkronkan status online ke syncStore; saat kembali online, hydrate + sync.
  useEffect(() => {
    setOnline(online);
    if (online && status === 'authenticated') {
      void hydrateFromServer().catch(() => undefined);
      void runSync();
    }
  }, [online, status, setOnline]);

  if (!booted || status === 'unknown') {
    return (
      <IonApp>
        <div className="flex h-full items-center justify-center">
          <IonSpinner name="crescent" color="primary" />
        </div>
      </IonApp>
    );
  }

  const isAuth = status === 'authenticated';

  return (
    <IonApp>
      <IonReactRouter>
        <IonRouterOutlet>
          <Route exact path="/login">
            {isAuth ? <Redirect to="/app/tanaman" /> : <Login />}
          </Route>
          <Route exact path="/register">
            {isAuth ? <Redirect to="/app/tanaman" /> : <Register />}
          </Route>
          <Route path="/app">
            {isAuth ? <MainTabs /> : <Redirect to="/login" />}
          </Route>
          <Route exact path="/">
            <Redirect to={isAuth ? '/app/dashboard' : '/login'} />
          </Route>
        </IonRouterOutlet>
      </IonReactRouter>
    </IonApp>
  );
}
