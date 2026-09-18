import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Download, 
  RefreshCw, 
  Trash2, 
  Edit,
  Eye, 
  CheckCircle, 
  Calendar, 
  MapPin, 
  Phone, 
  Mail, 
  LogOut, 
  Plus, 
  X, 
  Check, 
  AlertTriangle,
  Clock
} from 'lucide-react';
import { 
  fetchAllRegistrations, 
  updateParticipant, 
  deleteParticipant, 
  fetchBatchesFromFirestore, 
  saveBatchToFirestore, 
  deleteBatchFromFirestore,
  DEFAULT_BATCHES 
} from '../../firebase';

export default function AdminDashboard({ adminUser, onLogout }) {
  // Initialize state immediately from cache to eliminate any flash of "0"
  const [registrations, setRegistrations] = useState(() => {
    try {
      const cached = localStorage.getItem('gita_amrita_cached_admin_regs');
      if (cached) return JSON.parse(cached);
      const local = localStorage.getItem('gita_amrita_registrations');
      if (local) return JSON.parse(local);
    } catch (e) {}
    return [];
  });

  const [batches, setBatches] = useState(() => {
    try {
      const cached = localStorage.getItem('gita_amrita_cached_batches');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return DEFAULT_BATCHES;
  });

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('participants'); // 'participants' | 'batches'

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModeFilter, setSelectedModeFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');

  // Modals & Selected
  const [detailParticipant, setDetailParticipant] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [editingBatch, setEditingBatch] = useState(null);
  const [deleteBatchConfirmId, setDeleteBatchConfirmId] = useState(null);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [newBatch, setNewBatch] = useState({
    title: 'Bhagavad Gita',
    duration: '18 Days',
    schedule: 'Daily • 7:00 PM',
    mode: 'Offline',
    location: 'ISKCON Temple, Edulapuram',
    status: 'Upcoming'
  });

  const [notification, setNotification] = useState('');

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3000);
  };

  // Background fetch
  const loadData = async (isManual = false) => {
    if (isManual) setLoading(true);
    try {
      const [regs, batchList] = await Promise.all([
        fetchAllRegistrations(),
        fetchBatchesFromFirestore()
      ]);
      setRegistrations(regs);
      setBatches(batchList);
      try {
        localStorage.setItem('gita_amrita_cached_admin_regs', JSON.stringify(regs));
        localStorage.setItem('gita_amrita_cached_batches', JSON.stringify(batchList));
      } catch (e) {}
    } catch (err) {
      console.warn('Sync note:', err);
    } finally {
      if (isManual) setLoading(false);
    }
  };

  useEffect(() => {
    loadData(false);
  }, []);

  // Filtered registrations
  const filteredRegistrations = useMemo(() => {
    return registrations.filter((item) => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = !query || 
        (item.fullName || '').toLowerCase().includes(query) ||
        (item.registrationId || item.id || '').toLowerCase().includes(query) ||
        (item.mobile || '').includes(query) ||
        (item.email || '').toLowerCase().includes(query) ||
        (item.city || '').toLowerCase().includes(query);

      const matchesMode = selectedModeFilter === 'all' || 
        (item.batchMode || '').toLowerCase() === selectedModeFilter.toLowerCase();

      const matchesStatus = selectedStatusFilter === 'all' || 
        (item.status || 'Confirmed').toLowerCase() === selectedStatusFilter.toLowerCase();

      return matchesSearch && matchesMode && matchesStatus;
    });
  }, [registrations, searchQuery, selectedModeFilter, selectedStatusFilter]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = registrations.length;
    const online = registrations.filter(r => (r.batchMode || '').toLowerCase() === 'online').length;
    const offline = registrations.filter(r => (r.batchMode || '').toLowerCase() === 'offline').length;
    return { total, online, offline };
  }, [registrations]);

  // Export CSV
  const handleExportCSV = () => {
    if (!filteredRegistrations.length) {
      showNotification('No participant records to export.');
      return;
    }

    const headers = [
      'Registration ID',
      'Full Name',
      'Age',
      'Gender',
      'Mobile',
      'Email',
      'City',
      'Area',
      'Occupation',
      'Gita Experience',
      'Batch Title',
      'Batch Mode',
      'Batch Schedule',
      'Referral Source',
      'Status',
      'Registration Date'
    ];

    const rows = filteredRegistrations.map(r => [
      r.registrationId || r.id || '',
      `"${(r.fullName || '').replace(/"/g, '""')}"`,
      r.age || '',
      r.gender || '',
      `"${r.countryCode || '+91'} ${r.mobile || ''}"`,
      `"${r.email || ''}"`,
      `"${(r.city || '').replace(/"/g, '""')}"`,
      `"${(r.area || '').replace(/"/g, '""')}"`,
      `"${r.occupation || ''}"`,
      `"${r.gitaExperience || ''}"`,
      `"${r.batchTitle || 'Bhagavad Gita'}"`,
      r.batchMode || '',
      `"${r.batchSchedule || ''}"`,
      `"${r.referralSource || ''}"`,
      r.status || 'Confirmed',
      `"${r.createdAtFormatted || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `gita_amrita_participants_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('Exported CSV successfully!');
  };

  // Delete participant
  const handleDeleteParticipant = async (id) => {
    try {
      await deleteParticipant(id);
      const updated = registrations.filter(p => p.id !== id);
      setRegistrations(updated);
      try {
        localStorage.setItem('gita_amrita_cached_admin_regs', JSON.stringify(updated));
      } catch (e) {}
      setDeleteConfirmId(null);
      showNotification('Participant removed.');
    } catch (err) {
      showNotification('Failed to delete participant.');
    }
  };

  // Add new batch
  const handleCreateBatch = async (e) => {
    e.preventDefault();
    try {
      const res = await saveBatchToFirestore(newBatch);
      if (res.success) {
        const updated = [...batches, res.batch];
        setBatches(updated);
        try {
          localStorage.setItem('gita_amrita_cached_batches', JSON.stringify(updated));
        } catch (e) {}
        setBatchModalOpen(false);
        setNewBatch({
          title: 'Bhagavad Gita',
          duration: '18 Days',
          schedule: 'Daily • 7:00 PM',
          mode: 'Offline',
          location: 'ISKCON Temple, Edulapuram',
          status: 'Upcoming'
        });
        showNotification('Batch created.');
      }
    } catch (err) {
      showNotification('Failed to create batch.');
    }
  };

  // Update batch
  const handleUpdateBatch = async (e) => {
    e.preventDefault();
    if (!editingBatch) return;
    try {
      const res = await saveBatchToFirestore(editingBatch);
      if (res.success) {
        const updated = batches.map(b => b.id === editingBatch.id ? { ...b, ...editingBatch } : b);
        setBatches(updated);
        try {
          localStorage.setItem('gita_amrita_cached_batches', JSON.stringify(updated));
        } catch (e) {}
        setEditingBatch(null);
        showNotification('Batch updated successfully.');
      }
    } catch (err) {
      showNotification('Failed to update batch.');
    }
  };

  // Delete batch (via UI modal confirmation)
  const handleConfirmDeleteBatch = async () => {
    if (!deleteBatchConfirmId) return;
    try {
      await deleteBatchFromFirestore(deleteBatchConfirmId);
      const updated = batches.filter(b => b.id !== deleteBatchConfirmId);
      setBatches(updated);
      try {
        localStorage.setItem('gita_amrita_cached_batches', JSON.stringify(updated));
      } catch (e) {}
      showNotification('Batch removed successfully.');
    } catch (err) {
      showNotification('Failed to delete batch.');
    } finally {
      setDeleteBatchConfirmId(null);
    }
  };

  return (
    <div className="min-h-screen bg-cream-100 flex flex-col font-poppins text-temple-900 selection:bg-saffron-100 selection:text-saffron-900">
      
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 bg-temple-900 text-cream-50 px-4 py-2.5 rounded-xl shadow-soft flex items-center gap-2 text-xs font-medium animate-fadeIn">
          <Check className="w-3.5 h-3.5 text-saffron-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Clean, Simple Admin Header */}
      <header className="sticky top-0 z-30 bg-cream-50/95 backdrop-blur-md border-b border-cream-200 shadow-soft">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between">
          
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <img
              src="/assets/iskcon_logo.webp"
              alt="ISKCON Logo"
              className="h-8 w-auto object-contain"
            />
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-temple-900 leading-tight">
                  Gita Amrita
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider bg-saffron-50 text-saffron-700 px-1.5 py-0.2 rounded border border-saffron-200">
                  Admin
                </span>
              </div>
              <span className="text-[10px] text-temple-500 block">
                ISKCON Adilabad
              </span>
            </div>
          </div>

          {/* Right: Clean Logout */}
          <button
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cream-300 hover:border-red-200 bg-white hover:bg-red-50 text-temple-700 hover:text-red-700 text-xs font-medium transition-colors cursor-pointer"
            title="Log out of Admin Dashboard"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>

        </div>
      </header>

      {/* Simple Admin Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-5 space-y-5">
        
        {/* Simple Tab Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 bg-cream-200/60 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('participants')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'participants'
                  ? 'bg-white text-temple-900 shadow-sm'
                  : 'text-temple-600 hover:text-temple-900'
              }`}
            >
              Participants ({registrations.length})
            </button>
            <button
              onClick={() => setActiveTab('batches')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'batches'
                  ? 'bg-white text-temple-900 shadow-sm'
                  : 'text-temple-600 hover:text-temple-900'
              }`}
            >
              Batches ({batches.length})
            </button>
          </div>

          <button
            onClick={() => loadData(true)}
            className="inline-flex items-center gap-1 text-xs text-temple-600 hover:text-saffron-700 font-medium cursor-pointer p-1.5"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-saffron-600' : ''}`} />
            <span className="hidden sm:inline">Sync</span>
          </button>
        </div>

        {/* TAB 1: PARTICIPANTS */}
        {activeTab === 'participants' && (
          <div className="space-y-4 animate-fadeIn">
            
            {/* Clean, Simple Stat Chips */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
              <div className="bg-cream-50 rounded-2xl p-3 sm:p-4 border border-cream-200 shadow-soft text-left">
                <span className="text-[11px] uppercase tracking-wide text-temple-500 font-semibold block">
                  Total Devotees
                </span>
                <span className="text-xl sm:text-2xl font-bold text-temple-900 font-mono">
                  {stats.total}
                </span>
              </div>

              <div className="bg-cream-50 rounded-2xl p-3 sm:p-4 border border-cream-200 shadow-soft text-left">
                <span className="text-[11px] uppercase tracking-wide text-blue-700 font-semibold block">
                  Online
                </span>
                <span className="text-xl sm:text-2xl font-bold text-blue-900 font-mono">
                  {stats.online}
                </span>
              </div>

              <div className="bg-cream-50 rounded-2xl p-3 sm:p-4 border border-cream-200 shadow-soft text-left">
                <span className="text-[11px] uppercase tracking-wide text-emerald-700 font-semibold block">
                  Temple (Offline)
                </span>
                <span className="text-xl sm:text-2xl font-bold text-emerald-900 font-mono">
                  {stats.offline}
                </span>
              </div>
            </div>

            {/* Simple Search & Filter Bar */}
            <div className="bg-cream-50 rounded-2xl p-3 border border-cream-200 shadow-soft flex flex-col sm:flex-row gap-2.5 items-center justify-between">
              
              {/* Search */}
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-temple-400" />
                <input
                  type="text"
                  placeholder="Search name, phone, email, ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-cream-300 bg-white text-xs text-temple-900 placeholder:text-temple-400 focus:outline-none focus:border-saffron-500 transition-all"
                />
              </div>

              {/* Mode & Export Controls */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <select
                  value={selectedModeFilter}
                  onChange={(e) => setSelectedModeFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-cream-300 bg-white text-xs text-temple-800 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Modes</option>
                  <option value="Offline">Offline (Temple)</option>
                  <option value="Online">Online</option>
                </select>

                <button
                  onClick={handleExportCSV}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-saffron-500 hover:bg-saffron-600 text-white font-semibold text-xs transition-colors shadow-soft cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
              </div>

            </div>

            {/* Clean Table */}
            <div className="bg-cream-50 rounded-2xl border border-cream-200 shadow-soft overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-cream-200/60 border-b border-cream-200 text-[10px] uppercase font-bold tracking-wider text-temple-600">
                      <th className="py-2.5 px-3.5">ID</th>
                      <th className="py-2.5 px-3.5">Devotee</th>
                      <th className="py-2.5 px-3.5">Contact</th>
                      <th className="py-2.5 px-3.5">Batch</th>
                      <th className="py-2.5 px-3.5">City</th>
                      <th className="py-2.5 px-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cream-200/70">
                    {filteredRegistrations.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-8 text-center text-temple-500 text-xs">
                          No registered devotees found.
                        </td>
                      </tr>
                    ) : (
                      filteredRegistrations.map((item) => (
                        <tr key={item.id} className="hover:bg-cream-100/60 transition-colors">
                          <td className="py-2.5 px-3.5 font-mono font-bold text-saffron-800">
                            {item.registrationId || item.id}
                          </td>
                          <td className="py-2.5 px-3.5 font-semibold text-temple-900">
                            {item.fullName || 'Participant'}
                          </td>
                          <td className="py-2.5 px-3.5 text-temple-700">
                            {item.countryCode || '+91'} {item.mobile}
                          </td>
                          <td className="py-2.5 px-3.5 text-temple-800">
                            <span className="font-medium">{item.batchMode}</span> &bull; {item.batchSchedule}
                          </td>
                          <td className="py-2.5 px-3.5 text-temple-600">
                            {item.city || 'Adilabad'}
                          </td>
                          <td className="py-2.5 px-3.5 text-right space-x-1">
                            <button
                              onClick={() => setDetailParticipant(item)}
                              className="p-1 rounded text-temple-500 hover:text-saffron-600 hover:bg-cream-200 transition-colors cursor-pointer"
                              title="View details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(item.id)}
                              className="p-1 rounded text-temple-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Delete record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: BATCHES */}
        {activeTab === 'batches' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="text-xs text-temple-600 font-medium">Program Batches</span>
              <button
                onClick={() => setBatchModalOpen(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-saffron-500 hover:bg-saffron-600 text-white font-semibold text-xs shadow-soft transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Batch</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {batches.map((b) => {
                const count = registrations.filter(r => 
                  r.batchId === b.id || 
                  (r.batchSchedule && b.schedule && r.batchSchedule.toLowerCase() === b.schedule.toLowerCase())
                ).length;

                return (
                  <div key={b.id} className="bg-cream-50 rounded-2xl p-4 border border-cream-200 shadow-soft text-left space-y-2 relative">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                          b.mode === 'Offline' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-blue-50 text-blue-800 border-blue-200'
                        }`}>
                          {b.mode}
                        </span>
                        <h4 className="font-bold text-sm text-temple-900 mt-1">{b.title}</h4>
                        <p className="text-xs text-saffron-700 font-medium">{b.schedule}</p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingBatch({ ...b })}
                          className="p-1 rounded text-temple-500 hover:text-saffron-600 hover:bg-cream-200 transition-colors cursor-pointer"
                          title="Edit Batch"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteBatchConfirmId(b.id)}
                          className="p-1 rounded text-temple-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          title="Remove Batch"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-cream-200 pt-2 text-[11px]">
                      <span className="text-temple-500 truncate max-w-[140px]">{b.location}</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-saffron-50 border border-saffron-200 text-saffron-800 font-semibold text-[11px] flex-shrink-0">
                        <Users className="w-3 h-3" />
                        <span>{count} {count === 1 ? 'Devotee' : 'Devotees'}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </main>

      {/* Participant Detail Modal */}
      {detailParticipant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-temple-900/60 backdrop-blur-sm animate-fadeIn">
          <div 
            className="w-full max-w-sm bg-cream-50 rounded-3xl p-5 border border-cream-300 shadow-soft-lg text-left space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-cream-200 pb-2">
              <div>
                <h3 className="font-bold text-base text-temple-900">{detailParticipant.fullName}</h3>
                <span className="text-xs font-mono text-saffron-800 font-bold">{detailParticipant.registrationId || detailParticipant.id}</span>
              </div>
              <button
                onClick={() => setDetailParticipant(null)}
                className="p-1 rounded-full text-temple-500 hover:text-temple-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5 text-xs text-temple-700">
              <p><strong>Mobile:</strong> {detailParticipant.countryCode || '+91'} {detailParticipant.mobile}</p>
              <p><strong>Email:</strong> {detailParticipant.email || '—'}</p>
              <p><strong>Age &amp; Gender:</strong> {detailParticipant.age || '—'} yrs &bull; {detailParticipant.gender || '—'}</p>
              <p><strong>City &amp; Area:</strong> {detailParticipant.city}, {detailParticipant.area}</p>
              <p><strong>Occupation:</strong> {detailParticipant.occupation || 'Student'}</p>
              <p><strong>Familiarity:</strong> {detailParticipant.gitaExperience || 'Beginner'}</p>
              <p><strong>Batch:</strong> {detailParticipant.batchMode} &bull; {detailParticipant.batchSchedule}</p>
              {detailParticipant.referralSource && (
                <p><strong>Referral:</strong> {detailParticipant.referralSource}</p>
              )}
            </div>

            <button
              onClick={() => setDetailParticipant(null)}
              className="w-full py-2 bg-cream-200 hover:bg-cream-300 text-temple-800 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-temple-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-xs bg-cream-50 rounded-2xl p-5 border border-cream-300 shadow-soft text-center space-y-3">
            <h4 className="font-bold text-sm text-temple-900">Remove Devotee?</h4>
            <p className="text-xs text-temple-600">Are you sure you want to delete this participant record?</p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="w-1/2 py-2 rounded-xl border border-cream-300 bg-cream-100 text-xs font-semibold text-temple-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteParticipant(deleteConfirmId)}
                className="w-1/2 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Batch Modal */}
      {batchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-temple-900/60 backdrop-blur-sm animate-fadeIn">
          <form 
            onSubmit={handleCreateBatch}
            className="w-full max-w-sm bg-cream-50 rounded-2xl p-5 border border-cream-300 shadow-soft text-left space-y-3"
          >
            <div className="flex items-center justify-between border-b border-cream-200 pb-2">
              <h4 className="font-bold text-sm text-temple-900">Add New Batch</h4>
              <button type="button" onClick={() => setBatchModalOpen(false)}>
                <X className="w-4 h-4 text-temple-500" />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div>
                <label className="block font-semibold mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={newBatch.title}
                  onChange={(e) => setNewBatch({ ...newBatch, title: e.target.value })}
                  className="w-full p-2 border border-cream-300 rounded-lg bg-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Mode</label>
                  <select
                    value={newBatch.mode}
                    onChange={(e) => setNewBatch({ ...newBatch, mode: e.target.value })}
                    className="w-full p-2 border border-cream-300 rounded-lg bg-white"
                  >
                    <option value="Offline">Offline</option>
                    <option value="Online">Online</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Schedule</label>
                  <input
                    type="text"
                    required
                    value={newBatch.schedule}
                    onChange={(e) => setNewBatch({ ...newBatch, schedule: e.target.value })}
                    className="w-full p-2 border border-cream-300 rounded-lg bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Location</label>
                <input
                  type="text"
                  value={newBatch.location}
                  onChange={(e) => setNewBatch({ ...newBatch, location: e.target.value })}
                  className="w-full p-2 border border-cream-300 rounded-lg bg-white"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBatchModalOpen(false)}
                className="w-1/2 py-2 rounded-xl border border-cream-300 bg-cream-100 text-xs font-semibold text-temple-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-1/2 py-2 rounded-xl bg-saffron-500 hover:bg-saffron-600 text-white text-xs font-semibold"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Batch Modal */}
      {editingBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-temple-900/60 backdrop-blur-sm animate-fadeIn">
          <form 
            onSubmit={handleUpdateBatch}
            className="w-full max-w-sm bg-cream-50 rounded-2xl p-5 border border-cream-300 shadow-soft text-left space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-cream-200 pb-2">
              <h4 className="font-bold text-sm text-temple-900">Edit Batch</h4>
              <button 
                type="button" 
                onClick={() => setEditingBatch(null)}
                className="p-1 rounded text-temple-400 hover:text-temple-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div>
                <label className="block font-semibold mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={editingBatch.title || ''}
                  onChange={(e) => setEditingBatch({ ...editingBatch, title: e.target.value })}
                  className="w-full p-2 border border-cream-300 rounded-lg bg-white text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Mode</label>
                  <select
                    value={editingBatch.mode || 'Offline'}
                    onChange={(e) => setEditingBatch({ ...editingBatch, mode: e.target.value })}
                    className="w-full p-2 border border-cream-300 rounded-lg bg-white text-xs cursor-pointer"
                  >
                    <option value="Offline">Offline</option>
                    <option value="Online">Online</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Schedule</label>
                  <input
                    type="text"
                    required
                    value={editingBatch.schedule || ''}
                    onChange={(e) => setEditingBatch({ ...editingBatch, schedule: e.target.value })}
                    className="w-full p-2 border border-cream-300 rounded-lg bg-white text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Location / Platform</label>
                <input
                  type="text"
                  value={editingBatch.location || ''}
                  onChange={(e) => setEditingBatch({ ...editingBatch, location: e.target.value })}
                  className="w-full p-2 border border-cream-300 rounded-lg bg-white text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Duration</label>
                <input
                  type="text"
                  value={editingBatch.duration || '18 Days'}
                  onChange={(e) => setEditingBatch({ ...editingBatch, duration: e.target.value })}
                  className="w-full p-2 border border-cream-300 rounded-lg bg-white text-xs"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingBatch(null)}
                className="w-1/2 py-2 rounded-xl border border-cream-300 bg-cream-100 text-xs font-semibold text-temple-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-1/2 py-2 rounded-xl bg-saffron-500 hover:bg-saffron-600 text-white text-xs font-semibold shadow-soft cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Batch Confirmation UI Modal */}
      {deleteBatchConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-temple-900/60 backdrop-blur-sm animate-fadeIn">
          <div 
            className="w-full max-w-xs bg-cream-50 rounded-2xl p-5 border border-cream-300 shadow-soft text-center space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-200">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-temple-900">Remove Batch?</h4>
              <p className="text-xs text-temple-600 mt-0.5">
                Are you sure you want to remove this batch? Devotees won't be able to select it during registration.
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeleteBatchConfirmId(null)}
                className="w-1/2 py-2 rounded-xl border border-cream-300 bg-cream-100 hover:bg-cream-200 text-xs font-semibold text-temple-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteBatch}
                className="w-1/2 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-soft cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
