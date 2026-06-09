import React, { useState, useEffect } from 'react';
import { Shield, Server, Users, MessageSquare, CheckCircle, XCircle, AlertTriangle, Copy, Plus, Edit, Trash2, Gauge, BarChart3, Key, Clock, Zap } from 'lucide-react';
import { useAuth } from '../../store/AuthContext';
import { Card } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Badge } from '../../components/UI/Badge';
import { Modal } from '../../components/UI/Modal';
import { Input, Select } from '../../components/UI/Input';
import { Table } from '../../components/UI/Table';

// ============================================================
// LICENSE DATABASE (saved to localStorage → PostgreSQL in prod)
// ============================================================
interface LicenseInfo {
  key: string;
  type: 'trial' | 'standard' | 'enterprise' | 'unlimited';
  trial_mode: 'none' | '7day' | '14day' | '30day';
  status: 'active' | 'expired' | 'invalid';
  issued_to: string;
  issued_date: string;
  expiry_date: string;
  system_ip: string;
  system_mac: string;
  features: { smpp: boolean; http: boolean; whatsapp: boolean; telegram: boolean; rcs: boolean; voice_otp: boolean; };
  limits: { max_clients: number; max_suppliers: number; max_sms_monthly: number; max_tps: number; max_sms_per_client: number; max_tps_per_client: number; };
  usage: { sms_this_month: number; sms_total: number; days_used: number; };
  activated_at: string;
}

interface Tenant {
  id: string; name: string; code: string; status: 'active' | 'inactive' | 'suspended';
  features: { smpp: boolean; http: boolean; whatsapp: boolean; telegram: boolean; rcs: boolean; voice_otp: boolean; };
  limits: { max_sms_monthly: number; max_tps: number; };
  usage: { sms_this_month: number; current_tps: number; sms_today: number; };
  ip: string; mac: string; license_expiry: string;
  created_at: string;
}

// Default license
const defaultLicense: LicenseInfo = {
  key: 'N2A-TRI-2026-UZ1P-IQGQ-7Z7F',
  type: 'trial',
  trial_mode: '7day',
  status: 'active',
  issued_to: 'NET2APP Hub',
  issued_date: new Date().toISOString().split('T')[0],
  expiry_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
  system_ip: '192.168.1.100',
  system_mac: '00:1A:2B:3C:4D:5E',
  features: { smpp: true, http: true, whatsapp: false, telegram: false, rcs: false, voice_otp: false },
  limits: { max_clients: 5, max_suppliers: 3, max_sms_monthly: 500, max_tps: 10, max_sms_per_client: 100, max_tps_per_client: 5 },
  usage: { sms_this_month: 0, sms_total: 0, days_used: 0 },
  activated_at: new Date().toISOString(),
};

const defaultTenants: Tenant[] = [
  { id:'1', name:'TechCorp Global', code:'TCG', status:'active', features:{ smpp:true, http:true, whatsapp:false, telegram:false, rcs:false, voice_otp:false }, limits:{ max_sms_monthly:100,max_tps:5 }, usage:{ sms_this_month:45, current_tps:2, sms_today:8 }, ip:'192.168.1.101', mac:'00:1A:2B:3C:4D:5F', license_expiry: new Date(Date.now()+7*86400000).toISOString().split('T')[0], created_at:'2024-06-01' },
  { id:'2', name:'MegaBank Ltd', code:'MBL', status:'active', features:{ smpp:true, http:false, whatsapp:false, telegram:false, rcs:false, voice_otp:false }, limits:{ max_sms_monthly:200,max_tps:5 }, usage:{ sms_this_month:120, current_tps:3, sms_today:22 }, ip:'192.168.1.102', mac:'00:1A:2B:3C:4D:60', license_expiry: new Date(Date.now()+14*86400000).toISOString().split('T')[0], created_at:'2024-06-05' },
];

function loadLicense(): LicenseInfo {
  try { const s = localStorage.getItem('license_active'); if (s) return JSON.parse(s); } catch {}
  localStorage.setItem('license_active', JSON.stringify(defaultLicense));
  return defaultLicense;
}
function saveLicense(l: LicenseInfo) { localStorage.setItem('license_active', JSON.stringify(l)); }
function loadTenants(): Tenant[] {
  try { const s = localStorage.getItem('license_tenants'); if (s) return JSON.parse(s); } catch {}
  localStorage.setItem('license_tenants', JSON.stringify(defaultTenants));
  return defaultTenants;
}
function saveTenants(t: Tenant[]) { localStorage.setItem('license_tenants', JSON.stringify(t)); }

// ============================================================
// TRIAL MODES
// ============================================================
const trialModes: Record<string, { days: number; sms: number; label: string; features: LicenseInfo['features']; limits: LicenseInfo['limits'] }> = {
  '7day': {
    days: 7, sms: 500,
    label: '7 Day Trial — 500 SMS',
    features: { smpp: true, http: false, whatsapp: false, telegram: false, rcs: false, voice_otp: false },
    limits: { max_clients: 3, max_suppliers: 2, max_sms_monthly: 500, max_tps: 10, max_sms_per_client: 200, max_tps_per_client: 5 },
  },
  '14day': {
    days: 14, sms: 1000,
    label: '14 Day Trial — 1,000 SMS',
    features: { smpp: true, http: true, whatsapp: false, telegram: false, rcs: false, voice_otp: false },
    limits: { max_clients: 5, max_suppliers: 3, max_sms_monthly: 1000, max_tps: 20, max_sms_per_client: 300, max_tps_per_client: 10 },
  },
  '30day': {
    days: 30, sms: 1000,
    label: '30 Day Trial — 1,000 SMS',
    features: { smpp: true, http: true, whatsapp: true, telegram: false, rcs: false, voice_otp: false },
    limits: { max_clients: 10, max_suppliers: 5, max_sms_monthly: 1000, max_tps: 50, max_sms_per_client: 300, max_tps_per_client: 15 },
  },
};

export const License: React.FC = () => {
  const { user, verifySuperAdmin } = useAuth();
  const isSuperUser = user?.role === 'super_admin';
  const [license, setLicense] = useState<LicenseInfo>(loadLicense);
  const [tenants, setTenants] = useState<Tenant[]>(loadTenants);

  // Super admin verification
  const [superAuthModal, setSuperAuthModal] = useState(false);
  const [superPassword, setSuperPassword] = useState('');
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [authError, setAuthError] = useState('');

  // Modals
  const [showActivate, setShowActivate] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [showTenantModal, setShowTenantModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [showTrialSelect, setShowTrialSelect] = useState(false);

  // Forms
  const [licenseKeyInput, setLicenseKeyInput] = useState('');
  const [systemIP, setSystemIP] = useState(license.system_ip);
  const [systemMAC, setSystemMAC] = useState(license.system_mac);
  const [generatedKey, setGeneratedKey] = useState('');
  const [tenantForm, setTenantForm] = useState({ name:'', code:'', ip:'', mac:'', features:{ smpp:true, http:false, whatsapp:false, telegram:false, rcs:false, voice_otp:false }, limits:{ max_sms_monthly:100, max_tps:5 } });
  const [generateForm, setGenerateForm] = useState({ type:'trial', trial_mode:'7day', company_name:'', system_ip:'', system_mac:'', features:{ smpp:true, http:true, whatsapp:false, telegram:false, rcs:false, voice_otp:false }, limits:{ max_clients:100, max_suppliers:50, max_sms_monthly:10000000, max_tps:5000 } });

  // Auto-update trial days remaining
  useEffect(() => {
    const interval = setInterval(() => {
      setLicense(prev => {
        const daysUsed = Math.ceil((Date.now() - new Date(prev.activated_at).getTime()) / 86400000);
        const trialDays = trialModes[prev.trial_mode]?.days || 7;
        if (daysUsed >= trialDays && prev.status === 'active') {
          const expired = { ...prev, status: 'expired' as const, usage: { ...prev.usage, days_used: daysUsed } };
          saveLicense(expired);
          return expired;
        }
        if (prev.usage.days_used !== daysUsed) {
          const updated = { ...prev, usage: { ...prev.usage, days_used: daysUsed } };
          saveLicense(updated);
          return updated;
        }
        return prev;
      });
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const requireSuperAuth = (action: () => void) => {
    if (!isSuperUser) { alert('🔒 Only SUPER ADMIN can perform this action.'); return; }
    setPendingAction(() => action); setSuperPassword(''); setAuthError(''); setSuperAuthModal(true);
  };
  const confirmSuperAuth = () => {
    if (verifySuperAdmin(superPassword)) { setSuperAuthModal(false); if (pendingAction) pendingAction(); setPendingAction(null); }
    else { setAuthError('Invalid super admin password'); }
  };

  // Activate license
  const handleActivate = () => {
    if (!licenseKeyInput) { alert('Please enter a license key'); return; }
    const updated = { ...license, key: licenseKeyInput, system_ip: systemIP, system_mac: systemMAC, issued_date: new Date().toISOString().split('T')[0], activated_at: new Date().toISOString(), status: 'active' as const };
    setLicense(updated); saveLicense(updated); setShowActivate(false);
    alert('✅ License activated: ' + licenseKeyInput);
  };

  // Select trial mode
  const handleSelectTrial = (mode: string) => {
    const config = trialModes[mode];
    if (!config) return;
    const expiry = new Date(Date.now() + config.days * 86400000).toISOString().split('T')[0];
    const updated: LicenseInfo = {
      ...license, trial_mode: mode as any, type: 'trial',
      features: config.features, limits: config.limits,
      expiry_date: expiry, status: 'active',
      activated_at: new Date().toISOString(), issued_date: new Date().toISOString().split('T')[0],
      usage: { sms_this_month: 0, sms_total: 0, days_used: 0 },
    };
    setLicense(updated); saveLicense(updated); setShowTrialSelect(false);
    alert(`✅ Trial activated: ${config.label}`);
  };

  // Generate key
  const generateKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let k = 'N2A-' + generateForm.type.substring(0, 3).toUpperCase() + '-' + new Date().getFullYear() + '-';
    for (let i = 0; i < 3; i++) { let p = ''; for (let j = 0; j < 4; j++) p += chars.charAt(Math.floor(Math.random() * chars.length)); k += p + (i < 2 ? '-' : ''); }
    setGeneratedKey(k);
  };
  const copyKey = (text: string) => { navigator.clipboard.writeText(text); alert('Copied!'); };

  // Tenants
  const openTenant = (t?: Tenant) => {
    if (t) { setEditingTenant(t); setTenantForm({ name:t.name, code:t.code, ip:t.ip||'', mac:t.mac||'', features:t.features, limits:t.limits }); }
    else { setEditingTenant(null); setTenantForm({ name:'', code:'', ip:'', mac:'', features:{ smpp:true, http:false, whatsapp:false, telegram:false, rcs:false, voice_otp:false }, limits:{ max_sms_monthly:100, max_tps:5 } }); }
    setShowTenantModal(true);
  };
  const saveTenant = () => {
    requireSuperAuth(() => {
      if (editingTenant) { setTenants(p => { const n = p.map(t => t.id === editingTenant.id ? { ...t, ...tenantForm } : t); saveTenants(n); return n; }); }
      else { setTenants(p => { const n = [...p, { ...tenantForm, id: Date.now().toString(), status: 'active' as const, usage: { sms_this_month: 0, current_tps: 0, sms_today: 0 }, license_expiry: license.expiry_date, created_at: new Date().toISOString().split('T')[0] }]; saveTenants(n); return n; }); }
      setShowTenantModal(false);
    });
  };
  const deleteTenant = (id: string) => { requireSuperAuth(() => { setTenants(p => { const n = p.filter(t => t.id !== id); saveTenants(n); return n; }); }); };

  const trialConfig = trialModes[license.trial_mode];
  const daysRemaining = trialConfig ? Math.max(0, trialConfig.days - license.usage.days_used) : 0;
  const smsRemaining = trialConfig ? Math.max(0, license.limits.max_sms_monthly - license.usage.sms_this_month) : 0;

  const tenantCols = [
    { key:'name', header:'Tenant', render:(t:Tenant) => <div><p className="font-medium text-sm">{t.name}</p><p className="text-[10px] text-gray-500">{t.code}</p></div> },
    { key:'features', header:'Features', render:(t:Tenant) => <div className="flex gap-0.5">{t.features.smpp&&<Badge variant="info" size="sm">SMPP</Badge>}{t.features.http&&<Badge variant="purple" size="sm">HTTP</Badge>}{t.features.voice_otp&&<Badge variant="warning" size="sm">Voice</Badge>}</div> },
    { key:'usage', header:'SMS Counter', render:(t:Tenant) => { const pct = (t.usage.sms_this_month / t.limits.max_sms_monthly) * 100; return <div className="w-28"><div className="flex justify-between text-[10px] mb-0.5"><span>{t.usage.sms_this_month}</span><span className="text-gray-400">/ {t.limits.max_sms_monthly}</span></div><div className="w-full bg-gray-200 rounded-full h-1.5"><div className={`h-1.5 rounded-full ${pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} /></div></div>; } },
    { key:'tps', header:'TPS', render:(t:Tenant) => <span className="text-xs font-mono">{t.usage.current_tps}<span className="text-gray-400">/{t.limits.max_tps}</span></span> },
    { key:'ip', header:'IP', render:(t:Tenant) => <span className="font-mono text-[10px]">{t.ip || '-'}</span> },
    { key:'status', header:'Status', render:(t:Tenant) => <Badge variant={t.status==='active'?'success':'danger'} dot size="sm">{t.status}</Badge> },
    { key:'actions', header:'', render:(t:Tenant) => <div className="flex gap-1"><button onClick={()=>openTenant(t)} className="p-1 rounded hover:bg-gray-100"><Edit size={14} className="text-gray-500"/></button><button onClick={()=>deleteTenant(t.id)} className="p-1 rounded hover:bg-gray-100"><Trash2 size={14} className="text-red-500"/></button></div> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">License Management</h1>
          <p className="text-gray-500 mt-1">{isSuperUser ? <span className="text-green-600 font-medium">🔒 Super Admin Access</span> : <span className="text-red-600">⛔ Super Admin only</span>}</p>
        </div>
        <div className="flex gap-2">
          {isSuperUser && <>
            <Button variant="secondary" icon={<Clock size={16} />} onClick={() => setShowTrialSelect(true)}>Trial Mode</Button>
            <Button variant="secondary" icon={<Key size={16} />} onClick={() => requireSuperAuth(() => setShowActivate(true))}>🔒 Activate License</Button>
            <Button icon={<Plus size={16} />} onClick={() => setShowGenerate(true)}>Generate Key</Button>
          </>}
        </div>
      </div>

      {/* License Status Card */}
      <Card>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className={`p-4 rounded-xl ${license.status==='active'?'bg-green-100':'bg-red-100'}`}>{license.status==='active'?<Shield size={32} className="text-green-600"/>:<AlertTriangle size={32} className="text-red-600"/>}</div>
            <div>
              <h3 className="text-xl font-semibold">{license.type.toUpperCase()} License {license.trial_mode !== 'none' && <Badge variant="warning">{trialModes[license.trial_mode]?.label}</Badge>}</h3>
              <p className="text-gray-500">{license.issued_to}</p>
            </div>
          </div>
          <Badge variant={license.status==='active'?'success':'danger'} size="md">{license.status.toUpperCase()}</Badge>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 mb-3"><div className="flex items-center justify-between"><span className="text-sm text-gray-500">License Key</span><button onClick={()=>copyKey(license.key)} className="p-1 rounded hover:bg-gray-200"><Copy size={14} className="text-gray-500"/></button></div><p className="font-mono text-sm">{license.key}</p></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><p className="text-xs text-gray-500">System IP</p><p className="font-mono text-sm">{license.system_ip}</p></div>
          <div><p className="text-xs text-gray-500">System MAC</p><p className="font-mono text-sm">{license.system_mac}</p></div>
          <div><p className="text-xs text-gray-500">Activated</p><p>{license.issued_date}</p></div>
          <div><p className="text-xs text-gray-500">Expires</p><p className={daysRemaining < 3 ? 'text-red-600 font-semibold' : ''}>{license.expiry_date} ({daysRemaining}d remaining)</p></div>
        </div>
      </Card>

      {/* Trial Counters */}
      {license.trial_mode !== 'none' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white"><Clock size={20} className="mb-1"/><p className="text-2xl font-bold">{daysRemaining}</p><p className="text-sm opacity-80">Days Remaining</p></div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white"><MessageSquare size={20} className="mb-1"/><p className="text-2xl font-bold">{license.usage.sms_this_month} / {license.limits.max_sms_monthly}</p><p className="text-sm opacity-80">SMS Used (Monthly)</p></div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white"><Gauge size={20} className="mb-1"/><p className="text-2xl font-bold">{license.limits.max_tps}</p><p className="text-sm opacity-80">Max TPS</p></div>
          <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-4 text-white"><BarChart3 size={20} className="mb-1"/><p className="text-2xl font-bold">{smsRemaining}</p><p className="text-sm opacity-80">SMS Remaining</p></div>
        </div>
      )}

      {/* Volume Limits & Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Volume Limits & TPS"><div className="space-y-2">
          {[{label:'Monthly SMS',val:license.limits.max_sms_monthly.toLocaleString(),icon:<MessageSquare size={14}/>},{label:'Max TPS',val:license.limits.max_tps,icon:<Gauge size={14}/>},{label:'Max Clients',val:license.limits.max_clients,icon:<Users size={14}/>},{label:'Max Suppliers',val:license.limits.max_suppliers,icon:<Server size={14}/>},{label:'SMS Per Client',val:license.limits.max_sms_per_client.toLocaleString(),icon:<BarChart3 size={14}/>},{label:'TPS Per Client',val:license.limits.max_tps_per_client,icon:<Zap size={14}/>}].map((l,i)=><div key={i} className="flex justify-between items-center p-2.5 bg-gray-50 rounded-lg"><div className="flex items-center gap-2"><span className="text-blue-500">{l.icon}</span><span className="text-sm text-gray-600">{l.label}</span></div><span className="font-semibold text-sm">{l.val}</span></div>)}
        </div></Card>
        <Card title="Enabled Features"><div className="space-y-2">{Object.entries(license.features).map(([f,e])=><div key={f} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg"><span className="text-sm font-medium uppercase">{f.replace('_',' ')}</span>{e?<CheckCircle size={18} className="text-green-500"/>:<XCircle size={18} className="text-gray-300"/>}</div>)}
          {isSuperUser && <Button size="sm" variant="secondary" className="w-full mt-2" onClick={()=>requireSuperAuth(()=>alert('Feature toggle would update license'))}>🔒 Update Features</Button>}
        </div></Card>
      </div>

      {/* Tenant Counter Table */}
      <Card title="Tenant Counters & Volume Limits" subtitle={`${tenants.length} tenants — SMS usage tracked per tenant`} action={isSuperUser?<Button size="sm" icon={<Plus size={16}/>} onClick={()=>openTenant()}>Add Tenant</Button>:undefined} noPadding>
        <Table columns={tenantCols} data={tenants} keyExtractor={t=>t.id}/>
      </Card>

      {/* Super Admin Verification Modal */}
      <Modal isOpen={superAuthModal} onClose={()=>{setSuperAuthModal(false);setPendingAction(null);}} title="🔒 Super Admin Verification" footer={<div className="flex justify-end gap-3"><Button variant="secondary" onClick={()=>{setSuperAuthModal(false);setPendingAction(null);}}>Cancel</Button><Button onClick={confirmSuperAuth}>Verify</Button></div>}>
        <div className="space-y-3"><div className="bg-yellow-50 p-3 rounded-lg text-sm"><p className="font-medium">License changes require password verification.</p><p className="text-xs mt-1">Logged in as: {user?.username} ({user?.role})</p></div>{authError&&<p className="text-sm text-red-600 flex items-center gap-1"><AlertTriangle size={14}/>{authError}</p>}<Input label="Super Admin Password" type="password" value={superPassword} onChange={e=>setSuperPassword(e.target.value)} placeholder="Enter password" onKeyDown={e=>{if(e.key==='Enter')confirmSuperAuth();}}/></div>
      </Modal>

      {/* Activate License Modal */}
      <Modal isOpen={showActivate} onClose={()=>setShowActivate(false)} title="Activate License" footer={<div className="flex justify-end gap-3"><Button variant="secondary" onClick={()=>setShowActivate(false)}>Cancel</Button><Button onClick={handleActivate}>Activate</Button></div>}>
        <div className="space-y-3"><Input label="License Key *" value={licenseKeyInput} onChange={e=>setLicenseKeyInput(e.target.value)} placeholder="N2A-XXX-XXXX-XXXX-XXXX-XXXX"/><Input label="System IP" value={systemIP} onChange={e=>setSystemIP(e.target.value)} placeholder="192.168.1.100"/><Input label="System MAC" value={systemMAC} onChange={e=>setSystemMAC(e.target.value)} placeholder="00:1A:2B:3C:4D:5E"/></div>
      </Modal>

      {/* Trial Selection Modal */}
      <Modal isOpen={showTrialSelect} onClose={()=>setShowTrialSelect(false)} title="Select Trial Mode" footer={<div className="flex justify-end gap-3"><Button variant="secondary" onClick={()=>setShowTrialSelect(false)}>Cancel</Button></div>}>
        <div className="space-y-3">
          {Object.entries(trialModes).map(([key, config]) => (
            <button key={key} onClick={() => requireSuperAuth(() => handleSelectTrial(key))}
              className={`w-full text-left p-4 rounded-xl border-2 transition ${license.trial_mode === key ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <div className="flex items-center justify-between">
                <div><p className="font-semibold text-gray-800">{config.label}</p><p className="text-xs text-gray-500">{config.days} days • SMS {config.sms.toLocaleString()} • Max TPS: {config.limits.max_tps}</p></div>
                {license.trial_mode === key && <CheckCircle size={20} className="text-green-500"/>}
              </div>
            </button>
          ))}
        </div>
      </Modal>

      {/* Tenant Modal */}
      <Modal isOpen={showTenantModal} onClose={()=>setShowTenantModal(false)} title={editingTenant?'Edit Tenant':'Add Tenant'} footer={<div className="flex justify-end gap-3"><Button variant="secondary" onClick={()=>setShowTenantModal(false)}>Cancel</Button><Button onClick={saveTenant}>🔒 Save (Verification Required)</Button></div>}>
        <div className="space-y-3"><div className="grid grid-cols-2 gap-3"><Input label="Name" value={tenantForm.name} onChange={e=>setTenantForm(p=>({...p,name:e.target.value}))} required/><Input label="Code" value={tenantForm.code} onChange={e=>setTenantForm(p=>({...p,code:e.target.value.toUpperCase()}))} required/></div><div className="grid grid-cols-2 gap-3"><Input label="IP" value={tenantForm.ip} onChange={e=>setTenantForm(p=>({...p,ip:e.target.value}))}/><Input label="MAC" value={tenantForm.mac} onChange={e=>setTenantForm(p=>({...p,mac:e.target.value}))}/></div>
          <div className="grid grid-cols-2 gap-3"><Input label="Monthly SMS Limit" type="number" value={tenantForm.limits.max_sms_monthly} onChange={e=>setTenantForm(p=>({...p,limits:{...p.limits,max_sms_monthly:parseInt(e.target.value)}}))}/><Input label="Max TPS" type="number" value={tenantForm.limits.max_tps} onChange={e=>setTenantForm(p=>({...p,limits:{...p.limits,max_tps:parseInt(e.target.value)}}))}/></div></div>
      </Modal>

      {/* Generate Key Modal */}
      <Modal isOpen={showGenerate} onClose={()=>{setShowGenerate(false);setGeneratedKey('');}} title="Generate License Key" size="lg" footer={<div className="flex justify-end gap-3"><Button variant="secondary" onClick={()=>{setShowGenerate(false);setGeneratedKey('');}}>Close</Button>{!generatedKey && <Button onClick={() => requireSuperAuth(generateKey)}>🔒 Generate Key</Button>}</div>}>
        {generatedKey ? (
          <div className="text-center py-4"><CheckCircle size={48} className="mx-auto text-green-500 mb-3"/><h3 className="font-semibold">Key Generated</h3><div className="bg-gray-100 p-3 rounded-lg my-3"><p className="font-mono text-sm break-all">{generatedKey}</p></div><div className="flex justify-center gap-2"><Button size="sm" variant="secondary" icon={<Copy size={14}/>} onClick={()=>copyKey(generatedKey)}>Copy</Button></div></div>
        ) : (
          <div className="space-y-3">
            <Select label="Type" value={generateForm.type} onChange={e=>setGenerateForm(p=>({...p,type:e.target.value}))} options={[{value:'trial',label:'Trial'},{value:'standard',label:'Standard'},{value:'enterprise',label:'Enterprise'},{value:'unlimited',label:'Unlimited'}]}/>
            <Input label="Company Name" value={generateForm.company_name} onChange={e=>setGenerateForm(p=>({...p,company_name:e.target.value}))}/>
            <div className="grid grid-cols-2 gap-3"><Input label="System IP" value={generateForm.system_ip} onChange={e=>setGenerateForm(p=>({...p,system_ip:e.target.value}))}/><Input label="MAC Address" value={generateForm.system_mac} onChange={e=>setGenerateForm(p=>({...p,system_mac:e.target.value}))}/></div>
          </div>
        )}
      </Modal>
    </div>
  );
};
