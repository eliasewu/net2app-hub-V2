import React, { useState } from 'react';
import { Plus, Search, Edit, Trash2, Play, Mic, Upload, Globe, Phone, Clock } from 'lucide-react';
import { Card } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Badge } from '../../components/UI/Badge';
import { Modal } from '../../components/UI/Modal';
import { Input, Select } from '../../components/UI/Input';
import { Table } from '../../components/UI/Table';

interface VoiceConfig {
  id: string; language: string; language_code: string; greeting_text: string;
  retry_text: string; audio_file_url: string | null; sip_host: string;
  sip_port: number; caller_id: string; is_active: boolean;
}

interface CallLog {
  id: string; call_id: string; destination: string; otp_code: string;
  language: string; duration: number; status: string; created_at: string;
}

const defaultConfigs: VoiceConfig[] = [
  { id:'1', language:'English', language_code:'en-US', greeting_text:'Your verification code is', retry_text:'I repeat, your code is', audio_file_url:null, sip_host:'sip.provider.com', sip_port:5060, caller_id:'+18001234567', is_active:true },
  { id:'2', language:'Spanish', language_code:'es-ES', greeting_text:'Su código de verificación es', retry_text:'Repito, su código es', audio_file_url:null, sip_host:'sip.provider.com', sip_port:5060, caller_id:'+18001234568', is_active:true },
  { id:'3', language:'French', language_code:'fr-FR', greeting_text:'Votre code de vérification est', retry_text:'Je répète, votre code est', audio_file_url:null, sip_host:'sip.provider.com', sip_port:5060, caller_id:'+18001234569', is_active:true },
  { id:'4', language:'German', language_code:'de-DE', greeting_text:'Ihr Bestätigungscode lautet', retry_text:'Ich wiederhole, Ihr Code lautet', audio_file_url:null, sip_host:'sip.provider.com', sip_port:5060, caller_id:'+18001234570', is_active:true },
  { id:'5', language:'Arabic', language_code:'ar-SA', greeting_text:'رمز التحقق الخاص بك هو', retry_text:'أكرر، رمزك هو', audio_file_url:null, sip_host:'sip.provider.com', sip_port:5060, caller_id:'+18001234571', is_active:false },
];

const defaultLogs: CallLog[] = [
  { id:'1', call_id:'CALL-001', destination:'+1234567890', otp_code:'123456', language:'English', duration:12, status:'completed', created_at:'2024-03-20T10:00:00Z' },
  { id:'2', call_id:'CALL-002', destination:'+1987654321', otp_code:'789012', language:'Spanish', duration:8, status:'completed', created_at:'2024-03-20T10:05:00Z' },
  { id:'3', call_id:'CALL-003', destination:'+1555666777', otp_code:'345678', language:'French', duration:0, status:'failed', created_at:'2024-03-20T10:10:00Z' },
  { id:'4', call_id:'CALL-004', destination:'+1444555666', otp_code:'901234', language:'English', duration:15, status:'completed', created_at:'2024-03-20T10:15:00Z' },
];

const allLanguages = [
  { code:'en-US', name:'English' },{ code:'es-ES', name:'Spanish' },{ code:'fr-FR', name:'French' },
  { code:'de-DE', name:'German' },{ code:'it-IT', name:'Italian' },{ code:'pt-BR', name:'Portuguese (Brazil)' },
  { code:'ru-RU', name:'Russian' },{ code:'zh-CN', name:'Chinese (Mandarin)' },{ code:'ja-JP', name:'Japanese' },
  { code:'ko-KR', name:'Korean' },{ code:'ar-SA', name:'Arabic' },{ code:'hi-IN', name:'Hindi' },
  { code:'tr-TR', name:'Turkish' },{ code:'nl-NL', name:'Dutch' },{ code:'pl-PL', name:'Polish' },
  { code:'sv-SE', name:'Swedish' },{ code:'da-DK', name:'Danish' },{ code:'fi-FI', name:'Finnish' },
  { code:'nb-NO', name:'Norwegian' },{ code:'cs-CZ', name:'Czech' },{ code:'ro-RO', name:'Romanian' },
  { code:'el-GR', name:'Greek' },{ code:'th-TH', name:'Thai' },{ code:'vi-VN', name:'Vietnamese' },
  { code:'id-ID', name:'Indonesian' },{ code:'ms-MY', name:'Malay' },{ code:'uk-UA', name:'Ukrainian' },
];

export const VoiceOTP: React.FC = () => {
  const [configs, setConfigs] = useState<VoiceConfig[]>(defaultConfigs);
  const [logs] = useState<CallLog[]>(defaultLogs);
  const [search, setSearch] = useState('');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<VoiceConfig | null>(null);
  const [activeTab, setActiveTab] = useState<'configs'|'logs'|'sip'>('configs');

  const [form, setForm] = useState({
    language: '', language_code: '', greeting_text: '', retry_text: '',
    audio_file_url: '', sip_host: 'sip.provider.com', sip_port: 5060, caller_id: '', is_active: true,
  });

  const [sipForm, setSipForm] = useState({ host: 'sip.provider.com', port: 5060, caller_id: '+18001234567', username: '', password: '' });

  const openConfig = (cfg?: VoiceConfig) => {
    if (cfg) { setEditingConfig(cfg); setForm({ language: cfg.language, language_code: cfg.language_code, greeting_text: cfg.greeting_text, retry_text: cfg.retry_text, audio_file_url: cfg.audio_file_url || '', sip_host: cfg.sip_host, sip_port: cfg.sip_port, caller_id: cfg.caller_id, is_active: cfg.is_active }); }
    else { setEditingConfig(null); setForm({ language: '', language_code: '', greeting_text: 'Your verification code is', retry_text: 'I repeat, your code is', audio_file_url: '', sip_host: 'sip.provider.com', sip_port: 5060, caller_id: '', is_active: true }); }
    setShowConfigModal(true);
  };

  const handleSaveConfig = () => {
    if (editingConfig) { setConfigs(prev => prev.map(c => c.id === editingConfig.id ? { ...c, ...form } : c)); }
    else { setConfigs(prev => [...prev, { ...form, id: Date.now().toString(), audio_file_url: form.audio_file_url || null }]); }
    setShowConfigModal(false);
  };

  const langColumns = [
    { key: 'language', header: 'Language', render: (cfg: VoiceConfig) => <div className="flex items-center gap-2"><Globe size={16} className="text-gray-400" /><span className="font-medium">{cfg.language}</span></div> },
    { key: 'code', header: 'Code', render: (cfg: VoiceConfig) => <Badge variant="info">{cfg.language_code}</Badge> },
    { key: 'greeting', header: 'Greeting', render: (cfg: VoiceConfig) => <span className="text-sm">{cfg.greeting_text}</span> },
    { key: 'caller_id', header: 'Caller ID', render: (cfg: VoiceConfig) => <span className="font-mono text-sm">{cfg.caller_id}</span> },
    { key: 'audio', header: 'Audio', render: (cfg: VoiceConfig) => <Badge variant={cfg.audio_file_url ? 'success' : 'default'}>{cfg.audio_file_url ? 'Uploaded' : 'None'}</Badge> },
    { key: 'status', header: 'Status', render: (cfg: VoiceConfig) => <Badge variant={cfg.is_active ? 'success' : 'danger'} dot>{cfg.is_active ? 'Active' : 'Inactive'}</Badge> },
    { key: 'actions', header: '', render: (cfg: VoiceConfig) => <div className="flex gap-1"><button onClick={() => openConfig(cfg)} className="p-1.5 rounded hover:bg-gray-100"><Edit size={14} className="text-gray-500" /></button><button onClick={() => setConfigs(prev => prev.filter(c => c.id !== cfg.id))} className="p-1.5 rounded hover:bg-gray-100"><Trash2 size={14} className="text-red-500" /></button></div> },
  ];

  const logColumns = [
    { key: 'call_id', header: 'Call ID', render: (l: CallLog) => <span className="font-mono text-xs">{l.call_id}</span> },
    { key: 'destination', header: 'Destination', render: (l: CallLog) => <span className="font-mono text-sm">{l.destination}</span> },
    { key: 'otp', header: 'OTP', render: (l: CallLog) => <span className="font-mono font-semibold">{l.otp_code}</span> },
    { key: 'language', header: 'Language', render: (l: CallLog) => <Badge variant="info">{l.language}</Badge> },
    { key: 'duration', header: 'Duration', render: (l: CallLog) => <span>{l.duration > 0 ? `${l.duration}s` : '-'}</span> },
    { key: 'status', header: 'Status', render: (l: CallLog) => <Badge variant={l.status === 'completed' ? 'success' : 'danger'}>{l.status}</Badge> },
    { key: 'time', header: 'Time', render: (l: CallLog) => <span className="text-xs text-gray-500">{new Date(l.created_at).toLocaleString()}</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold text-gray-800">Voice OTP</h1><p className="text-gray-500 mt-1">Configure voice OTP settings and manage call logs</p></div><Button icon={<Plus size={18} />} onClick={() => openConfig()}>Add Language</Button></div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white"><Mic size={20} className="mb-2" /><p className="text-sm opacity-80">Languages</p><p className="text-2xl font-bold">{configs.length}</p></div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white"><Phone size={20} className="mb-2" /><p className="text-sm opacity-80">Active</p><p className="text-2xl font-bold">{configs.filter(c=>c.is_active).length}</p></div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 text-white"><Play size={20} className="mb-2" /><p className="text-sm opacity-80">Calls Today</p><p className="text-2xl font-bold">{logs.length}</p></div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-5 text-white"><Clock size={20} className="mb-2" /><p className="text-sm opacity-80">Success Rate</p><p className="text-2xl font-bold">{((logs.filter(l=>l.status==='completed').length/logs.length)*100).toFixed(0)}%</p></div>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        {(['configs','logs','sip'] as const).map(tab=><button key={tab} onClick={()=>setActiveTab(tab)} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${activeTab===tab?'border-blue-600 text-blue-600':'border-transparent text-gray-500 hover:text-gray-700'}`}>{tab}</button>)}
      </div>

      {activeTab==='configs'&&<Card title="Language Configurations" subtitle="40+ supported languages" noPadding><div className="p-4"><div className="relative"><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="text" placeholder="Search languages..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm" /></div></div><Table columns={langColumns} data={configs.filter(c=>c.language.toLowerCase().includes(search.toLowerCase()))} keyExtractor={c=>c.id} /></Card>}

      {activeTab==='logs'&&<Card title="Call Logs" subtitle="Voice OTP delivery history" noPadding><Table columns={logColumns} data={logs} keyExtractor={l=>l.id} /></Card>}

      {activeTab==='sip'&&<Card title="SIP / Asterisk Settings"><div className="grid grid-cols-2 gap-4 max-w-lg">
        <Input label="SIP Host" value={sipForm.host} onChange={e=>setSipForm(prev=>({...prev,host:e.target.value}))} />
        <Input label="SIP Port" type="number" value={sipForm.port} onChange={e=>setSipForm(prev=>({...prev,port:parseInt(e.target.value)}))} />
        <Input label="Username" value={sipForm.username} onChange={e=>setSipForm(prev=>({...prev,username:e.target.value}))} />
        <Input label="Password" type="password" value={sipForm.password} onChange={e=>setSipForm(prev=>({...prev,password:e.target.value}))} />
        <Input label="Default Caller ID" value={sipForm.caller_id} onChange={e=>setSipForm(prev=>({...prev,caller_id:e.target.value}))} placeholder="+18001234567" />
        <div className="col-span-2"><Button onClick={()=>{}}>Save SIP Settings</Button></div>
      </div></Card>}

      <Modal isOpen={showConfigModal} onClose={()=>setShowConfigModal(false)} title={editingConfig?'Edit Language':'Add Language'} footer={<div className="flex justify-end gap-3"><Button variant="secondary" onClick={()=>setShowConfigModal(false)}>Cancel</Button><Button onClick={handleSaveConfig}>{editingConfig?'Update':'Add'}</Button></div>}>
        <div className="space-y-4">
          <Select label="Language" value={form.language_code} onChange={e=>{const lang=allLanguages.find(l=>l.code===e.target.value);setForm(prev=>({...prev,language_code:e.target.value,language:lang?.name||''}));}} options={allLanguages.map(l=>({value:l.code,label:`${l.name} (${l.code})`}))} required />
          <Input label="Greeting Text" value={form.greeting_text} onChange={e=>setForm(prev=>({...prev,greeting_text:e.target.value}))} required />
          <Input label="Retry Text" value={form.retry_text} onChange={e=>setForm(prev=>({...prev,retry_text:e.target.value}))} />
          <Input label="Caller ID" value={form.caller_id} onChange={e=>setForm(prev=>({...prev,caller_id:e.target.value}))} placeholder="+18001234567" />
          <Input label="SIP Host" value={form.sip_host} onChange={e=>setForm(prev=>({...prev,sip_host:e.target.value}))} />
          <div className="flex items-center gap-4"><Button variant="secondary" icon={<Upload size={16} />}>Upload Audio (MP3/WAV)</Button><span className="text-xs text-gray-500">{form.audio_file_url ? 'File uploaded' : 'No file'}</span></div>
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_active} onChange={e=>setForm(prev=>({...prev,is_active:e.target.checked}))} className="w-4 h-4 rounded border-gray-300 text-blue-600" /><span className="text-sm">Active</span></label>
        </div>
      </Modal>
    </div>
  );
};
