import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, RefreshCw, TestTube } from 'lucide-react';
import { useData } from '../../store/DataContext';
import { Card } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Input, Select } from '../../components/UI/Input';
import { Badge } from '../../components/UI/Badge';
import { ConnectionType, Currency } from '../../types';

export const AddSupplier: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { addSupplier, getSupplierById, updateSupplier } = useData();
  
  const existingSupplier = id ? getSupplierById(id) : null;
  const isEditing = !!existingSupplier;

  const [formData, setFormData] = useState({
    supplier_code: existingSupplier?.supplier_code || '',
    company_name: existingSupplier?.company_name || '',
    contact_person: existingSupplier?.contact_person || '',
    email: existingSupplier?.email || '',
    phone: existingSupplier?.phone || '',
    
    connection_type: (existingSupplier?.connection_type || 'smpp') as ConnectionType,
    
    // SMPP Settings
    smpp_host: existingSupplier?.smpp_host || '',
    smpp_port: existingSupplier?.smpp_port || 2775,
    smpp_username: existingSupplier?.smpp_username || '',
    smpp_password: existingSupplier?.smpp_password || '',
    system_id: existingSupplier?.system_id || '',
    
    // HTTP API Settings
    api_url: existingSupplier?.api_url || '',
    api_key: existingSupplier?.api_key || '',
    api_method: (existingSupplier?.api_method || 'POST') as 'GET' | 'POST',
    
    // Billing
    balance: existingSupplier?.balance || 0,
    credit_limit: existingSupplier?.credit_limit || 0,
    currency: (existingSupplier?.currency || 'EUR') as Currency,
    
    status: existingSupplier?.status || 'active',
    bind_status: existingSupplier?.bind_status || 'unbound',
    consecutive_failures: existingSupplier?.consecutive_failures || 0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const connectionTypes = [
    { value: 'smpp', label: 'SMPP', description: 'Standard SMPP protocol connection' },
    { value: 'http', label: 'HTTP API', description: 'REST API based messaging' },
    { value: 'ott_whatsapp', label: 'WhatsApp OTT', description: 'WhatsApp Business/Personal' },
    { value: 'ott_telegram', label: 'Telegram OTT', description: 'Telegram Bot messaging' },
    { value: 'voice_otp', label: 'Voice OTP', description: 'Voice call OTP delivery' },
    { value: 'local_bypass', label: 'Local Bypass', description: 'Local SIM/Gateway routing' },
    { value: 'rcs', label: 'RCS', description: 'Rich Communication Services' },
    { value: 'flash_sms', label: 'Flash SMS', description: 'Flash/Class 0 messages' },
  ];

  const generateCode = () => {
    const code = 'SUP' + String(Math.floor(Math.random() * 9000) + 1000);
    setFormData(prev => ({ ...prev, supplier_code: code }));
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, smpp_password: password }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.supplier_code) newErrors.supplier_code = 'Supplier code is required';
    if (!formData.company_name) newErrors.company_name = 'Company name is required';
    if (!formData.email) newErrors.email = 'Email is required';
    
    if (formData.connection_type === 'smpp') {
      if (!formData.smpp_host) newErrors.smpp_host = 'SMPP host is required';
      if (!formData.smpp_username) newErrors.smpp_username = 'SMPP username is required';
    }
    
    if (formData.connection_type === 'http') {
      if (!formData.api_url) newErrors.api_url = 'API URL is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTest = async () => {
    setTestResult(null);
    // Simulate connection test
    await new Promise(resolve => setTimeout(resolve, 2000));
    setTestResult({
      success: Math.random() > 0.3,
      message: Math.random() > 0.3 ? 'Connection successful!' : 'Connection failed: Host unreachable',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (isEditing && existingSupplier) {
      updateSupplier(existingSupplier.id, formData);
    } else {
      addSupplier(formData as any);
    }
    
    setLoading(false);
    navigate('/suppliers');
  };

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const renderConnectionSettings = () => {
    switch (formData.connection_type) {
      case 'smpp':
        return (
          <Card title="SMPP Connection Settings">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="SMPP Host"
                value={formData.smpp_host}
                onChange={(e) => updateField('smpp_host', e.target.value)}
                placeholder="smpp.provider.com"
                error={errors.smpp_host}
                required
              />
              <Input
                label="SMPP Port"
                type="number"
                value={formData.smpp_port}
                onChange={(e) => updateField('smpp_port', parseInt(e.target.value))}
              />
              <Input
                label="System ID / Username"
                value={formData.smpp_username}
                onChange={(e) => updateField('smpp_username', e.target.value)}
                error={errors.smpp_username}
                required
              />
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    label="Password"
                    value={formData.smpp_password}
                    onChange={(e) => updateField('smpp_password', e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={generatePassword}
                  className="mt-7 p-2.5 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  <RefreshCw size={18} className="text-gray-600" />
                </button>
              </div>
              <Input
                label="System Type"
                value={formData.system_id}
                onChange={(e) => updateField('system_id', e.target.value)}
                placeholder="Optional"
              />
            </div>
          </Card>
        );

      case 'http':
        return (
          <Card title="HTTP API Settings">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <Input
                  label="API URL"
                  value={formData.api_url}
                  onChange={(e) => updateField('api_url', e.target.value)}
                  placeholder="https://api.provider.com/sms/send"
                  error={errors.api_url}
                  required
                />
              </div>
              <Select
                label="HTTP Method"
                value={formData.api_method}
                onChange={(e) => updateField('api_method', e.target.value)}
                options={[
                  { value: 'POST', label: 'POST' },
                  { value: 'GET', label: 'GET' },
                ]}
              />
              <Input
                label="API Key"
                value={formData.api_key}
                onChange={(e) => updateField('api_key', e.target.value)}
                placeholder="Your API key"
              />
            </div>
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>URL Variables:</strong> {`{{to}}, {{from}}, {{text}}, {{message_id}}, {{apiKey}}`}
              </p>
            </div>
          </Card>
        );

      case 'ott_whatsapp':
        return (
          <Card title="WhatsApp OTT Settings">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Phone Number"
                value={formData.smpp_host}
                onChange={(e) => updateField('smpp_host', e.target.value)}
                placeholder="+1234567890"
                hint="WhatsApp registered number"
              />
              <Input
                label="API Token (if using Business API)"
                value={formData.api_key}
                onChange={(e) => updateField('api_key', e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="mt-4 p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-700">
                For WhatsApp Web pairing, go to <strong>OTT Devices</strong> after creating the supplier.
              </p>
            </div>
          </Card>
        );

      case 'ott_telegram':
        return (
          <Card title="Telegram OTT Settings">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Bot Token"
                value={formData.api_key}
                onChange={(e) => updateField('api_key', e.target.value)}
                placeholder="123456:ABC-DEF..."
                required
              />
              <Input
                label="Bot Username"
                value={formData.smpp_username}
                onChange={(e) => updateField('smpp_username', e.target.value)}
                placeholder="@YourBotName"
              />
            </div>
          </Card>
        );

      case 'voice_otp':
        return (
          <Card title="Voice OTP Settings">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="SIP Host"
                value={formData.smpp_host}
                onChange={(e) => updateField('smpp_host', e.target.value)}
                placeholder="sip.provider.com"
              />
              <Input
                label="SIP Port"
                type="number"
                value={formData.smpp_port}
                onChange={(e) => updateField('smpp_port', parseInt(e.target.value))}
              />
              <Input
                label="SIP Username"
                value={formData.smpp_username}
                onChange={(e) => updateField('smpp_username', e.target.value)}
              />
              <Input
                label="SIP Password"
                type="password"
                value={formData.smpp_password}
                onChange={(e) => updateField('smpp_password', e.target.value)}
              />
              <Input
                label="Caller ID"
                value={formData.system_id}
                onChange={(e) => updateField('system_id', e.target.value)}
                placeholder="+18001234567"
              />
            </div>
          </Card>
        );

      default:
        return (
          <Card title="Connection Settings">
            <div className="p-8 text-center text-gray-500">
              <p>Configure connection details for {formData.connection_type.toUpperCase()}</p>
            </div>
          </Card>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {isEditing ? 'Edit Supplier' : 'Add New Supplier'}
          </h1>
          <p className="text-gray-500 mt-1">
            {isEditing ? 'Update supplier configuration' : 'Configure a new vendor connection'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Information */}
        <Card title="Company Information">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  label="Supplier Code"
                  value={formData.supplier_code}
                  onChange={(e) => updateField('supplier_code', e.target.value)}
                  placeholder="SUP001"
                  error={errors.supplier_code}
                  required
                />
              </div>
              <button
                type="button"
                onClick={generateCode}
                className="mt-7 p-2.5 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                <RefreshCw size={18} className="text-gray-600" />
              </button>
            </div>
            <Input
              label="Company Name"
              value={formData.company_name}
              onChange={(e) => updateField('company_name', e.target.value)}
              placeholder="SMS Provider Ltd"
              error={errors.company_name}
              required
            />
            <Input
              label="Contact Person"
              value={formData.contact_person}
              onChange={(e) => updateField('contact_person', e.target.value)}
              placeholder="John Smith"
            />
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="contact@provider.com"
              error={errors.email}
              required
            />
            <Input
              label="Phone"
              value={formData.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              placeholder="+1234567890"
            />
          </div>
        </Card>

        {/* Connection Type Selection */}
        <Card title="Connection Type">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {connectionTypes.map(type => (
              <label
                key={type.value}
                className={`flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  formData.connection_type === type.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="connection_type"
                  value={type.value}
                  checked={formData.connection_type === type.value}
                  onChange={(e) => updateField('connection_type', e.target.value)}
                  className="sr-only"
                />
                <span className="font-medium text-gray-800">{type.label}</span>
                <span className="text-xs text-gray-500 mt-1">{type.description}</span>
              </label>
            ))}
          </div>
        </Card>

        {/* Connection Settings (dynamic based on type) */}
        {renderConnectionSettings()}

        {/* Billing Settings */}
        <Card title="Billing Settings">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Select
              label="Currency"
              value={formData.currency}
              onChange={(e) => updateField('currency', e.target.value)}
              options={[
                { value: 'EUR', label: 'Euro (EUR)' },
                { value: 'USD', label: 'US Dollar (USD)' },
                { value: 'GBP', label: 'British Pound (GBP)' },
              ]}
            />
            <Input
              label="Initial Balance"
              type="number"
              value={formData.balance}
              onChange={(e) => updateField('balance', parseFloat(e.target.value))}
            />
            <Input
              label="Credit Limit"
              type="number"
              value={formData.credit_limit}
              onChange={(e) => updateField('credit_limit', parseFloat(e.target.value))}
            />
          </div>
        </Card>

        {/* Test Connection */}
        {(formData.connection_type === 'smpp' || formData.connection_type === 'http') && (
          <Card title="Test Connection">
            <div className="flex items-center gap-4">
              <Button
                type="button"
                variant="secondary"
                icon={<TestTube size={18} />}
                onClick={handleTest}
              >
                Test Connection
              </Button>
              {testResult && (
                <Badge variant={testResult.success ? 'success' : 'danger'}>
                  {testResult.message}
                </Badge>
              )}
            </div>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button variant="secondary" type="button" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" icon={<Save size={18} />} loading={loading}>
            {isEditing ? 'Update Supplier' : 'Create Supplier'}
          </Button>
        </div>
      </form>
    </div>
  );
};
