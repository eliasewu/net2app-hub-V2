import React, { useState } from 'react';
import { Search, Download, Filter, RefreshCw, Eye } from 'lucide-react';
import { useData } from '../store/DataContext';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Badge } from '../components/UI/Badge';
import { Table, Pagination } from '../components/UI/Table';
import { Modal } from '../components/UI/Modal';
import { SMSLog } from '../types';

export const SMSLogs: React.FC = () => {
  const { smsLogs, clients } = useData();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [detailModal, setDetailModal] = useState<SMSLog | null>(null);

  const itemsPerPage = 20;

  const filteredLogs = smsLogs.filter(log => {
    const matchesSearch = 
      log.message_id.toLowerCase().includes(search.toLowerCase()) ||
      log.destination.includes(search) ||
      log.sender_id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    const matchesClient = clientFilter === 'all' || log.client_id === clientFilter;
    return matchesSearch && matchesStatus && matchesClient;
  });

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
      delivered: 'success',
      sent: 'info',
      pending: 'warning',
      failed: 'danger',
      expired: 'default',
      rejected: 'danger',
    };
    return <Badge variant={statusMap[status] || 'default'}>{status}</Badge>;
  };

  const columns = [
    {
      key: 'message_id',
      header: 'Message ID',
      render: (log: SMSLog) => (
        <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{log.message_id.slice(0, 12)}...</span>
      ),
    },
    {
      key: 'client',
      header: 'Client',
      render: (log: SMSLog) => (
        <Badge variant="info">{log.client_code}</Badge>
      ),
    },
    {
      key: 'sender_id',
      header: 'Sender',
      render: (log: SMSLog) => (
        <span className="font-medium text-gray-800">{log.sender_id}</span>
      ),
    },
    {
      key: 'destination',
      header: 'Destination',
      render: (log: SMSLog) => (
        <div>
          <p className="font-mono text-sm text-gray-800">{log.destination}</p>
          <p className="text-xs text-gray-500">{log.country} • {log.operator}</p>
        </div>
      ),
    },
    {
      key: 'route',
      header: 'Route',
      render: (log: SMSLog) => (
        <div className="text-xs">
          <p className="text-gray-700">{log.route_name}</p>
          <p className="text-gray-500">{log.supplier_code}</p>
        </div>
      ),
    },
    {
      key: 'rates',
      header: 'Rates',
      align: 'right' as const,
      render: (log: SMSLog) => (
        <div className="text-right text-xs">
          <p className="text-gray-700">€{log.client_rate.toFixed(4)}</p>
          <p className="text-green-600">+€{log.profit.toFixed(4)}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (log: SMSLog) => getStatusBadge(log.status),
    },
    {
      key: 'time',
      header: 'Time',
      render: (log: SMSLog) => (
        <span className="text-xs text-gray-500">{new Date(log.submit_time).toLocaleString()}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '50px',
      render: (log: SMSLog) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setDetailModal(log);
          }}
          className="p-1.5 rounded hover:bg-gray-100"
        >
          <Eye size={16} className="text-gray-500" />
        </button>
      ),
    },
  ];

  const stats = {
    total: smsLogs.length,
    delivered: smsLogs.filter(l => l.status === 'delivered').length,
    failed: smsLogs.filter(l => l.status === 'failed').length,
    pending: smsLogs.filter(l => l.status === 'pending').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">SMS Logs</h1>
          <p className="text-gray-500 mt-1">View all SMS traffic and delivery reports</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={<RefreshCw size={16} />}>Refresh</Button>
          <Button variant="secondary" icon={<Download size={16} />}>Export</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-sm text-gray-500">Total Messages</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{stats.total.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-sm text-gray-500">Delivered</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{stats.delivered.toLocaleString()}</p>
          <p className="text-xs text-gray-500">{((stats.delivered / stats.total) * 100).toFixed(1)}%</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-sm text-gray-500">Failed</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{stats.failed.toLocaleString()}</p>
          <p className="text-xs text-gray-500">{((stats.failed / stats.total) * 100).toFixed(1)}%</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-sm text-gray-500">Pending</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending.toLocaleString()}</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by message ID, destination, sender..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Clients</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.client_code}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="delivered">Delivered</option>
              <option value="sent">Sent</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="rejected">Rejected</option>
            </select>
            <Button variant="secondary" icon={<Filter size={16} />}>More Filters</Button>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card noPadding>
        <Table
          columns={columns}
          data={paginatedLogs}
          keyExtractor={(log) => log.id}
          onRowClick={(log) => setDetailModal(log)}
        />
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={filteredLogs.length}
          itemsPerPage={itemsPerPage}
        />
      </Card>

      {/* Detail Modal */}
      <Modal
        isOpen={!!detailModal}
        onClose={() => setDetailModal(null)}
        title="SMS Details"
        size="lg"
      >
        {detailModal && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Message ID</p>
                <p className="font-mono text-sm bg-gray-100 px-2 py-1 rounded mt-1">{detailModal.message_id}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Status</p>
                <div className="mt-1">{getStatusBadge(detailModal.status)}</div>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Sender ID</p>
                <p className="font-medium text-gray-800 mt-1">{detailModal.sender_id}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Destination</p>
                <p className="font-mono text-gray-800 mt-1">{detailModal.destination}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Country / Operator</p>
                <p className="text-gray-800 mt-1">{detailModal.country} / {detailModal.operator}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">MCC/MNC</p>
                <p className="text-gray-800 mt-1">{detailModal.mcc}{detailModal.mnc}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Client</p>
                <p className="text-gray-800 mt-1">{detailModal.client_code}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Route / Trunk</p>
                <p className="text-gray-800 mt-1">{detailModal.route_name || 'Auto'} / {detailModal.trunk_name || 'Direct'}</p>
              </div>
              {detailModal.supplier_code && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Supplier (SMPP)</p>
                  <p className="text-gray-800 mt-1"><Badge variant="purple">{detailModal.supplier_code}</Badge></p>
                </div>
              )}
            </div>

            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Message Content</p>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-sm text-gray-800">{detailModal.message}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-xs text-blue-600 font-medium">Client Rate</p>
                <p className="text-xl font-bold text-blue-700">€{detailModal.client_rate.toFixed(4)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-600 font-medium">Supplier Rate</p>
                <p className="text-xl font-bold text-gray-700">€{detailModal.supplier_rate.toFixed(4)}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-xs text-green-600 font-medium">Profit</p>
                <p className="text-xl font-bold text-green-700">€{detailModal.profit.toFixed(4)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-500">Submit Time</p>
                <p className="text-gray-800">{new Date(detailModal.submit_time).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Delivery Time</p>
                <p className="text-gray-800">{detailModal.delivery_time ? new Date(detailModal.delivery_time).toLocaleString() : '-'}</p>
              </div>
              {detailModal.error_code && (
                <>
                  <div>
                    <p className="text-xs text-gray-500">Error Code</p>
                    <p className="text-red-600 font-mono">{detailModal.error_code}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Error Message</p>
                    <p className="text-red-600">{detailModal.error_message}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
