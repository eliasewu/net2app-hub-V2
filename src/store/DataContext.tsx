import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Client, Supplier, Trunk, Route, RoutePlan, Rate, MCCMNC, Invoice, Payment, SMSLog, EmailTemplate, OTTDevice, APIConnector, User, DashboardStats, Notification, Campaign, Translation, VoiceOTPConfig } from '../types';
import { mockRoutes, mockUsers, hourlyTrafficData, dailyRevenueData, topDestinations } from './mockData';
import { api } from '../services/api';

// API-based CRUD helpers
async function apiLoad<T>(endpoint: string, fallback: T): Promise<T> {
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) return fallback;
    const res = await api.get<any>(endpoint);
    if (res.success && res.data) return res.data as T;
    return fallback;
  } catch { return fallback; }
}

async function apiSave(endpoint: string, data: any): Promise<any> {
  try {
    const res = await api.post<any>(endpoint, data);
    return res;
  } catch (e) { console.error('API save error:', e); return null; }
}

async function apiUpdate(endpoint: string, id: string, data: any): Promise<any> {
  try {
    const res = await api.put<any>(`${endpoint}/${id}`, data);
    return res;
  } catch (e) { console.error('API update error:', e); return null; }
}

async function apiDelete(endpoint: string, id: string): Promise<any> {
  try {
    const res = await api.delete<any>(`${endpoint}/${id}`);
    return res;
  } catch (e) { console.error('API delete error:', e); return null; }
}

interface DataContextType {
  clients: Client[]; suppliers: Supplier[]; trunks: Trunk[]; routes: Route[]; routePlans: RoutePlan[];
  rates: Rate[]; mccmnc: MCCMNC[]; invoices: Invoice[]; payments: Payment[]; smsLogs: SMSLog[];
  ottDevices: OTTDevice[]; apiConnectors: APIConnector[]; users: User[];
  emailTemplates: EmailTemplate[]; notifications: Notification[]; campaigns: Campaign[];
  translations: Translation[]; voiceOTPConfigs: VoiceOTPConfig[];
  dashboardStats: DashboardStats; hourlyTraffic: typeof hourlyTrafficData; dailyRevenue: typeof dailyRevenueData; topDest: typeof topDestinations;
  addClient:(c:Omit<Client,'id'|'created_at'|'updated_at'>)=>void; updateClient:(id:string,c:Partial<Client>)=>void; deleteClient:(id:string)=>void;
  addSupplier:(s:Omit<Supplier,'id'|'created_at'|'updated_at'>)=>void; updateSupplier:(id:string,s:Partial<Supplier>)=>void; deleteSupplier:(id:string)=>void;
  addSMSLog:(log:Omit<SMSLog,'id'|'created_at'|'submit_time'>)=>void;
  addTrunk:(t:Omit<Trunk,'id'|'created_at'>)=>void; updateTrunk:(id:string,t:Partial<Trunk>)=>void; deleteTrunk:(id:string)=>void;
  addRoute:(r:Omit<Route,'id'|'created_at'>)=>void; updateRoute:(id:string,r:Partial<Route>)=>void; deleteRoute:(id:string)=>void;
  addRoutePlan:(p:Omit<RoutePlan,'id'|'created_at'>)=>void; updateRoutePlan:(id:string,p:Partial<RoutePlan>)=>void; deleteRoutePlan:(id:string)=>void;
  addRate:(r:Omit<Rate,'id'>)=>void; updateRate:(id:string,r:Partial<Rate>)=>void; deleteRate:(id:string)=>void;
  addMCCMNC:(m:Omit<MCCMNC,'id'>)=>void; updateMCCMNC:(id:string,m:Partial<MCCMNC>)=>void; deleteMCCMNC:(id:string)=>void;
  addInvoice:(i:Omit<Invoice,'id'|'created_at'>)=>void; updateInvoice:(id:string,i:Partial<Invoice>)=>void;
  addPayment:(p:Omit<Payment,'id'|'created_at'>)=>void;
  addOTTDevice:(d:Omit<OTTDevice,'id'|'created_at'>)=>void; updateOTTDevice:(id:string,d:Partial<OTTDevice>)=>void; deleteOTTDevice:(id:string)=>void;
  markNotificationRead:(id:string)=>void;
  addCampaign:(c:Omit<Campaign,'id'|'created_at'>)=>void; updateCampaign:(id:string,c:Partial<Campaign>)=>void; deleteCampaign:(id:string)=>void;
  addTranslation:(t:Omit<Translation,'id'|'created_at'>)=>void; updateTranslation:(id:string,t:Partial<Translation>)=>void; deleteTranslation:(id:string)=>void;
  getClientById:(id:string)=>Client|undefined; getSupplierById:(id:string)=>Supplier|undefined; getTrunkById:(id:string)=>Trunk|undefined;
  updateEmailTemplate:(id:string,data:Partial<EmailTemplate>)=>void;
  platformSettings:Record<string,string>; updatePlatformSetting:(key:string,value:string)=>void;
  smtpConfig:any; updateSMTPConfig:(data:any)=>void;
  loading: boolean;
}

const DataContext = createContext<DataContextType|undefined>(undefined);
const gid=()=>'rec_'+Date.now()+'_'+Math.random().toString(36).substr(2,9);

export const DataProvider:React.FC<{children:ReactNode}> = ({children}) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [trunks, setTrunks] = useState<Trunk[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [routePlans, setRoutePlans] = useState<RoutePlan[]>([]);
  const [rates, setRates] = useState<Rate[]>([]);
  const [mccmnc, setMCCMNC] = useState<MCCMNC[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [smsLogs, setSMSLogs] = useState<SMSLog[]>([]);
  const [ottDevices, setOTTDevices] = useState<OTTDevice[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [voiceOTPConfigs] = useState<VoiceOTPConfig[]>([]);
  const [platformSettings, setPlatformSettings] = useState<Record<string,string>>({platform_name:'NET2APP Hub',currency:'EUR',default_tax_rate:'19.00'});
  const [smtpConfig, setSMTPConfig] = useState<any>({host:'smtp.gmail.com',port:587,encryption:'tls'});
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // Load ALL data from PostgreSQL API on mount
  useEffect(() => {
    const loadAll = async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) { setLoading(false); return; }
      
      try {
        const results = await Promise.allSettled([
          apiLoad<Client[]>('/clients', []),
          apiLoad<Supplier[]>('/suppliers', []),
          apiLoad<Trunk[]>('/trunks', []),
          apiLoad<Route[]>('/routes', mockRoutes),
          apiLoad<RoutePlan[]>('/route_plans', []),
          apiLoad<Rate[]>('/rates', []),
          apiLoad<MCCMNC[]>('/mccmnc', []),
          apiLoad<Invoice[]>('/billing/invoices', []),
          apiLoad<Payment[]>('/payments', []),
        ]);
        
        const [c, s, t, r, rp, ra, m, i, p] = results;
        if (c.status === 'fulfilled' && c.value?.length > 0) setClients(c.value);
        if (s.status === 'fulfilled' && s.value?.length > 0) setSuppliers(s.value);
        if (t.status === 'fulfilled' && t.value?.length > 0) setTrunks(t.value);
        if (r.status === 'fulfilled' && r.value?.length > 0) setRoutes(r.value);
        if (rp.status === 'fulfilled' && rp.value?.length > 0) setRoutePlans(rp.value);
        if (ra.status === 'fulfilled' && ra.value?.length > 0) setRates(ra.value);
        if (m.status === 'fulfilled' && m.value?.length > 0) setMccmnc(m.value);
        if (i.status === 'fulfilled' && i.value?.length > 0) setInvoices(i.value);
        if (p.status === 'fulfilled' && p.value?.length > 0) setPayments(p.value);
      } catch (e) { console.error('Load error:', e); }
      setLoading(false);
    };
    loadAll();
  }, []);

  // Client CRUD — save to PostgreSQL API
  const addClient = useCallback(async (c: Omit<Client,'id'|'created_at'|'updated_at'>) => {
    const newClient = { ...c, id: gid(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    setClients(p => [...p, newClient as Client]);
    await apiSave('/clients', c);
  }, []);
  
  const updateClient = useCallback(async (id: string, c: Partial<Client>) => {
    setClients(p => p.map(x => x.id === id ? { ...x, ...c, updated_at: new Date().toISOString() } : x));
    await apiUpdate('/clients', id, c);
  }, []);
  
  const deleteClient = useCallback(async (id: string) => {
    setClients(p => p.filter(x => x.id !== id));
    await apiDelete('/clients', id);
  }, []);

  // Supplier CRUD — save to PostgreSQL API
  const addSupplier = useCallback(async (s: Omit<Supplier,'id'|'created_at'|'updated_at'>) => {
    const newSupplier = { ...s, id: gid(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    setSuppliers(p => [...p, newSupplier as Supplier]);
    await apiSave('/suppliers', s);
  }, []);
  
  const updateSupplier = useCallback(async (id: string, s: Partial<Supplier>) => {
    setSuppliers(p => p.map(x => x.id === id ? { ...x, ...s, updated_at: new Date().toISOString() } : x));
    await apiUpdate('/suppliers', id, s);
  }, []);
  
  const deleteSupplier = useCallback(async (id: string) => {
    setSuppliers(p => p.filter(x => x.id !== id));
    await apiDelete('/suppliers', id);
  }, []);

  // Simple implementations for other functions (keep localStorage for now, can migrate later)
  const addSMSLog = useCallback((log: any) => { setSMSLogs(p => [{...log, id: gid(), submit_time: new Date().toISOString()}, ...p]); }, []);
  const addTrunk = useCallback(async (t: any) => { setTrunks(p => [...p, {...t, id: gid()}]); await apiSave('/trunks', t); }, []);
  const updateTrunk = useCallback(async (id: string, t: any) => { setTrunks(p => p.map(x => x.id===id ? {...x, ...t} : x)); await apiUpdate('/trunks', id, t); }, []);
  const deleteTrunk = useCallback(async (id: string) => { setTrunks(p => p.filter(x => x.id!==id)); await apiDelete('/trunks', id); }, []);
  const addRoute = useCallback(async (r: any) => { setRoutes(p => [...p, {...r, id: gid()}]); await apiSave('/routes', r); }, []);
  const updateRoute = useCallback(async (id: string, r: any) => { setRoutes(p => p.map(x => x.id===id ? {...x, ...r} : x)); await apiUpdate('/routes', id, r); }, []);
  const deleteRoute = useCallback(async (id: string) => { setRoutes(p => p.filter(x => x.id!==id)); await apiDelete('/routes', id); }, []);
  const addRoutePlan = useCallback(async (p: any) => { setRoutePlans(prev => [...prev, {...p, id: gid()}]); await apiSave('/route_plans', p); }, []);
  const updateRoutePlan = useCallback(async (id: string, p: any) => { setRoutePlans(prev => prev.map(x => x.id===id ? {...x, ...p} : x)); await apiUpdate('/route_plans', id, p); }, []);
  const deleteRoutePlan = useCallback(async (id: string) => { setRoutePlans(prev => prev.filter(x => x.id!==id)); await apiDelete('/route_plans', id); }, []);
  const addRate = useCallback(async (r: any) => { setRates(p => [...p, {...r, id: gid()}]); await apiSave('/rates', r); }, []);
  const updateRate = useCallback(async (id: string, r: any) => { setRates(p => p.map(x => x.id===id ? {...x, ...r} : x)); await apiUpdate('/rates', id, r); }, []);
  const deleteRate = useCallback(async (id: string) => { setRates(p => p.filter(x => x.id!==id)); await apiDelete('/rates', id); }, []);
  const addMCCMNC = useCallback(async (m: any) => { setMccmnc(p => [...p, {...m, id: gid()}]); await apiSave('/mccmnc', m); }, []);
  const updateMCCMNC = useCallback(async (id: string, m: any) => { setMccmnc(p => p.map(x => x.id===id ? {...x, ...m} : x)); await apiUpdate('/mccmnc', id, m); }, []);
  const deleteMCCMNC = useCallback(async (id: string) => { setMccmnc(p => p.filter(x => x.id!==id)); await apiDelete('/mccmnc', id); }, []);
  const addInvoice = useCallback(async (i: any) => { setInvoices(p => [...p, {...i, id: gid()}]); await apiSave('/billing/invoices', i); }, []);
  const updateInvoice = useCallback(async (id: string, i: any) => { setInvoices(p => p.map(x => x.id===id ? {...x, ...i} : x)); await apiUpdate('/billing/invoices', id, i); }, []);
  const addPayment = useCallback(async (p: any) => { setPayments(prev => [...prev, {...p, id: gid()}]); await apiSave('/payments', p); }, []);
  const addOTTDevice = useCallback((d: any) => { setOTTDevices(p => [...p, {...d, id: gid()}]); }, []);
  const updateOTTDevice = useCallback((id: string, d: any) => { setOTTDevices(p => p.map(x => x.id===id ? {...x, ...d} : x)); }, []);
  const deleteOTTDevice = useCallback((id: string) => { setOTTDevices(p => p.filter(x => x.id!==id)); }, []);
  const markNotificationRead = useCallback((id: string) => { setNotifications(p => p.map(x => x.id===id ? {...x, is_read: true} : x)); }, []);
  const addCampaign = useCallback((c: any) => { setCampaigns(p => [...p, {...c, id: gid()}]); }, []);
  const updateCampaign = useCallback((id: string, c: any) => { setCampaigns(p => p.map(x => x.id===id ? {...x, ...c} : x)); }, []);
  const deleteCampaign = useCallback((id: string) => { setCampaigns(p => p.filter(x => x.id!==id)); }, []);
  const addTranslation = useCallback((t: any) => { setTranslations(p => [...p, {...t, id: gid()}]); }, []);
  const updateTranslation = useCallback((id: string, t: any) => { setTranslations(p => p.map(x => x.id===id ? {...x, ...t} : x)); }, []);
  const deleteTranslation = useCallback((id: string) => { setTranslations(p => p.filter(x => x.id!==id)); }, []);
  const getClientById = useCallback((id: string) => clients.find(x => x.id === id), [clients]);
  const getSupplierById = useCallback((id: string) => suppliers.find(x => x.id === id), [suppliers]);
  const getTrunkById = useCallback((id: string) => trunks.find(x => x.id === id), [trunks]);
  const updateEmailTemplate = useCallback((id: string, data: any) => { setEmailTemplates(p => p.map(x => x.id===id ? {...x, ...data} : x)); }, []);
  const updatePlatformSetting = useCallback((key: string, value: string) => { setPlatformSettings(p => ({...p, [key]: value})); }, []);
  const updateSMTPConfig = useCallback((data: any) => { setSMTPConfig((p: any) => ({...p, ...data})); }, []);

  const dashboardStats: DashboardStats = {
    total_clients: clients.length,
    active_clients: clients.filter(c => c.status === 'active').length,
    total_suppliers: suppliers.length,
    active_suppliers: suppliers.filter(s => s.status === 'active').length,
    total_sms_today: smsLogs.length,
    total_sms_month: smsLogs.length,
    delivered_percentage: smsLogs.length > 0 ? smsLogs.filter(l => l.status === 'delivered').length / smsLogs.length * 100 : 0,
    failed_percentage: smsLogs.length > 0 ? smsLogs.filter(l => l.status === 'failed').length / smsLogs.length * 100 : 0,
    revenue_today: 0, revenue_month: 0, cost_today: 0, cost_month: 0, profit_today: 0, profit_month: 0,
    active_binds: suppliers.filter(s => s.bind_status === 'bound').length,
    total_binds: suppliers.length,
  };

  return (
    <DataContext.Provider value={{
      clients, suppliers, trunks, routes, routePlans, rates, mccmnc, invoices, payments,
      smsLogs, ottDevices, apiConnectors: [], users: mockUsers,
      emailTemplates, notifications, campaigns, translations, voiceOTPConfigs,
      dashboardStats, hourlyTraffic: hourlyTrafficData, dailyRevenue: dailyRevenueData, topDest: topDestinations,
      addClient, updateClient, deleteClient,
      addSupplier, updateSupplier, deleteSupplier,
      addSMSLog, addTrunk, updateTrunk, deleteTrunk,
      addRoute, updateRoute, deleteRoute,
      addRoutePlan, updateRoutePlan, deleteRoutePlan,
      addRate, updateRate, deleteRate,
      addMCCMNC, updateMCCMNC, deleteMCCMNC,
      addInvoice, updateInvoice, addPayment,
      addOTTDevice, updateOTTDevice, deleteOTTDevice,
      markNotificationRead, addCampaign, updateCampaign, deleteCampaign,
      addTranslation, updateTranslation, deleteTranslation,
      getClientById, getSupplierById, getTrunkById,
      updateEmailTemplate, platformSettings, updatePlatformSetting,
      smtpConfig, updateSMTPConfig, loading
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData required');
  return ctx;
};
