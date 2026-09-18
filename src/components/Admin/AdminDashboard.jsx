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
  Clock,
  Megaphone,
  Pin,
  Power,
  Bell
} from 'lucide-react';
import { 
  fetchAllRegistrations, 
  updateParticipant, 
  deleteParticipant, 
  fetchBatchesFromFirestore, 
  saveBatchToFirestore, 
  deleteBatchFromFirestore,
  fetchProgramSettings,
  updateProgramSettings,
  subscribeToProgramSettings,
  fetchAnnouncements,
  saveAnnouncementToFirestore,
  deleteAnnouncementFromFirestore
} from '../../firebase';
import BatchFormModal from './BatchFormModal';

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
    return [];
  });

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('participants'); // 'participants' | 'batches' | 'announcements'

  // Settings: Registration Open / Closed
  const [settings, setSettings] = useState(() => {
    try {
      const cached = localStorage.getItem('gita_amrita_cached_settings');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return {
      isRegistrationOpen: true,
      closedNotice: 'Registrations for current batches are currently closed. Please contact temple coordinators for upcoming batch schedules.'
    };
  });
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [regStatusDraft, setRegStatusDraft] = useState(true);
  const [closedNoticeDraft, setClosedNoticeDraft] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Announcements
  const [announcements, setAnnouncements] = useState(() => {
    try {
      const cached = localStorage.getItem('gita_amrita_cached_announcements');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return [];
  });
  const [announcementModalOpen, setAnnouncementModalOpen] = useState(false);
  const [deleteAnnConfirmId, setDeleteAnnConfirmId] = useState(null);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    content: '',
    type: 'General',
    target: 'All',
    isPinned: false
  });

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModeFilter, setSelectedModeFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');

  // Modals & Selected
  const [detailParticipant, setDetailParticipant] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [editingBatch, setEditingBatch] = useState(null);
  const [deleteBatchConfirmId, setDeleteBatchConfirmId] = useState(null);
  const [isDeletingBatch, setIsDeletingBatch] = useState(false);
  const [batchModalOpen, setBatchModalOpen] = useState(false);

  const [notification, setNotification] = useState('');

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3000);
  };

  // Background fetch
  const loadData = async (isManual = false) => {
    if (isManual) setLoading(true);
    try {
      const [regs, batchList, sett, annList] = await Promise.all([
        fetchAllRegistrations(),
        fetchBatchesFromFirestore(),
        fetchProgramSettings(),
        fetchAnnouncements()
      ]);
      setRegistrations(regs);
      setBatches(batchList);
      if (sett) {
        setSettings(sett);
        setClosedNoticeDraft(sett.closedNotice || '');
      }
      if (annList) setAnnouncements(annList);
      try {
        localStorage.setItem('gita_amrita_cached_admin_regs', JSON.stringify(regs));
        localStorage.setItem('gita_amrita_cached_batches', JSON.stringify(batchList));
        if (sett) localStorage.setItem('gita_amrita_cached_settings', JSON.stringify(sett));
        if (annList) localStorage.setItem('gita_amrita_cached_announcements', JSON.stringify(annList));
      } catch (e) {}
    } catch (err) {
      console.warn('Sync note:', err);
    } finally {
      if (isManual) setLoading(false);
    }
  };

  useEffect(() => {
    loadData(false);

    const unsubSettings = subscribeToProgramSettings((latestSettings) => {
      if (latestSettings) {
        setSettings(latestSettings);
        setClosedNoticeDraft(latestSettings.closedNotice || '');
        setRegStatusDraft(Boolean(latestSettings.isRegistrationOpen));
      }
    });

    return () => unsubSettings();
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

  // Unique Batches (prevent duplicate cards from multiple clicks or remote duplicates)
  const uniqueBatches = useMemo(() => {
    const seen = new Set();
    const unique = [];
    for (const b of batches) {
      if (!b) continue;
      const key = b.id || '';
      const contentKey = `${(b.title || '').trim().toLowerCase()}_${(b.schedule || '').trim().toLowerCase()}_${(b.mode || '').toLowerCase()}_${b.startDate || ''}_${b.endDate || ''}`;
      if ((key && seen.has(key)) || seen.has(contentKey)) {
        continue;
      }
      if (key) seen.add(key);
      seen.add(contentKey);
      unique.push(b);
    }
    return unique;
  }, [batches]);

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

  // Add new batch (with deduplication)
  const handleCreateBatch = async (batchData) => {
    try {
      const res = await saveBatchToFirestore(batchData);
      if (res.success) {
        setBatches(prev => {
          const filtered = prev.filter(b => b.id !== res.batch.id);
          const updated = [...filtered, res.batch];
          try {
            localStorage.setItem('gita_amrita_cached_batches', JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });
        setBatchModalOpen(false);
        showNotification('Batch created successfully.');
      }
    } catch (err) {
      showNotification('Failed to create batch.');
    }
  };

  // Update batch
  const handleUpdateBatch = async (batchData) => {
    if (!batchData) return;
    try {
      const res = await saveBatchToFirestore(batchData);
      if (res.success) {
        setBatches(prev => {
          const updated = prev.map(b => b.id === batchData.id ? { ...b, ...batchData } : b);
          try {
            localStorage.setItem('gita_amrita_cached_batches', JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });
        setEditingBatch(null);
        showNotification('Batch updated successfully.');
      }
    } catch (err) {
      showNotification('Failed to update batch.');
    }
  };

  // Delete batch (via UI modal confirmation with loading state)
  const handleConfirmDeleteBatch = async () => {
    if (!deleteBatchConfirmId || isDeletingBatch) return;
    setIsDeletingBatch(true);
    try {
      await deleteBatchFromFirestore(deleteBatchConfirmId);
      setBatches(prev => {
        const updated = prev.filter(b => b.id !== deleteBatchConfirmId);
        try {
          localStorage.setItem('gita_amrita_cached_batches', JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });
      showNotification('Batch removed successfully.');
      setDeleteBatchConfirmId(null);
    } catch (err) {
      showNotification('Failed to delete batch.');
    } finally {
      setIsDeletingBatch(false);
    }
  };

  // Open Registration Settings Modal
  const handleOpenRegistrationModal = () => {
    setRegStatusDraft(Boolean(settings.isRegistrationOpen));
    setClosedNoticeDraft(settings.closedNotice || '');
    setSettingsModalOpen(true);
  };

  // Save Settings from Modal
  const handleSaveRegistrationSettings = async () => {
    setIsSavingSettings(true);
    const updated = {
      ...settings,
      isRegistrationOpen: regStatusDraft,
      closedNotice: (closedNoticeDraft || '').trim()
    };
    setSettings(updated);
    try {
      localStorage.setItem('gita_amrita_cached_settings', JSON.stringify(updated));
    } catch (e) {}
    setSettingsModalOpen(false);
    setIsSavingSettings(false);
    showNotification(regStatusDraft ? 'Registration is now OPEN.' : 'Registration is now CLOSED.');
    await updateProgramSettings(updated);
  };

  // Create Announcement
  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    if (!newAnnouncement.title.trim() || !newAnnouncement.content.trim()) return;
    try {
      const res = await saveAnnouncementToFirestore(newAnnouncement);
      if (res.success) {
        const updated = [res.announcement, ...announcements.filter(a => a.id !== res.announcement.id)];
        setAnnouncements(updated);
        try {
          localStorage.setItem('gita_amrita_cached_announcements', JSON.stringify(updated));
        } catch (e) {}
        setAnnouncementModalOpen(false);
        setNewAnnouncement({
          title: '',
          content: '',
          type: 'General',
          target: 'All',
          isPinned: false
        });
        showNotification('Announcement posted successfully.');
      }
    } catch (err) {
      showNotification('Failed to post announcement.');
    }
  };

  // Delete Announcement
  const handleDeleteAnnouncement = async () => {
    if (!deleteAnnConfirmId) return;
    try {
      await deleteAnnouncementFromFirestore(deleteAnnConfirmId);
      const updated = announcements.filter(a => a.id !== deleteAnnConfirmId);
      setAnnouncements(updated);
      try {
        localStorage.setItem('gita_amrita_cached_announcements', JSON.stringify(updated));
      } catch (e) {}
      setDeleteAnnConfirmId(null);
      showNotification('Announcement removed.');
    } catch (err) {
      showNotification('Failed to delete announcement.');
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

          {/* Right: Compact Registration Status Button & Logout */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenRegistrationModal}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-bold border transition-all cursor-pointer shadow-2xs hover:opacity-90 active:scale-95 ${
                settings.isRegistrationOpen
                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-red-50 hover:bg-red-100 text-red-800 border-red-300'
              }`}
              title="Click to manage registration status"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${settings.isRegistrationOpen ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="font-extrabold uppercase tracking-wider">
                {settings.isRegistrationOpen ? 'OPEN' : 'CLOSED'}
              </span>
            </button>

            <button
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-cream-300 hover:border-red-200 bg-white hover:bg-red-50 text-temple-700 hover:text-red-700 text-xs font-medium transition-colors cursor-pointer"
              title="Log out of Admin Dashboard"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>

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
              Batches ({uniqueBatches.length})
            </button>
            <button
              onClick={() => setActiveTab('announcements')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'announcements'
                  ? 'bg-white text-temple-900 shadow-sm'
                  : 'text-temple-600 hover:text-temple-900'
              }`}
            >
              Announcements ({announcements.length})
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
            {/* Registration Status Control Card */}
            <div className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-soft ${
              settings.isRegistrationOpen 
                ? 'bg-gradient-to-r from-emerald-50 via-cream-50 to-cream-100 border-emerald-200' 
                : 'bg-gradient-to-r from-red-50 via-cream-50 to-cream-100 border-red-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-xs ${
                  settings.isRegistrationOpen ? 'bg-emerald-600' : 'bg-red-600'
                }`}>
                  {settings.isRegistrationOpen ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs sm:text-sm font-bold text-temple-900">
                      Public Registration Status:
                    </span>
                    <span className={`text-[11px] uppercase font-extrabold px-2 py-0.5 rounded-full ${
                      settings.isRegistrationOpen 
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                        : 'bg-red-100 text-red-800 border border-red-300'
                    }`}>
                      {settings.isRegistrationOpen ? 'Currently Open' : 'Currently Closed'}
                    </span>
                  </div>
                  <p className="text-[11px] text-temple-600 mt-0.5">
                    {settings.isRegistrationOpen 
                      ? 'Devotees can register for any batch on the website.'
                      : 'Admissions are paused. Devotees see the notice message and WhatsApp link.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={handleOpenRegistrationModal}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 flex items-center gap-1.5 bg-temple-900 hover:bg-temple-800 text-white"
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>Change Status</span>
                </button>
              </div>
            </div>

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

            {uniqueBatches.length === 0 ? (
              <div className="bg-cream-50 rounded-2xl p-8 border border-cream-200 text-center space-y-2">
                <p className="text-sm font-semibold text-temple-800">No batches created yet.</p>
                <p className="text-xs text-temple-600">Click "+ Add Batch" above to create your first class batch.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {uniqueBatches.map((b) => {
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
                          {b.startDate && (
                            <div className="text-[11px] font-semibold text-temple-700 flex items-center gap-1 my-0.5">
                              <Calendar className="w-3 h-3 text-saffron-600 flex-shrink-0" />
                              <span>{b.startDate} {b.endDate ? `to ${b.endDate}` : ''}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 flex-wrap text-xs font-medium">
                            <span className="text-saffron-700">{b.schedule}</span>
                          </div>
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
            )}
          </div>
        )}

        {/* TAB 3: ANNOUNCEMENTS */}
        {activeTab === 'announcements' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-cream-50 p-4 rounded-2xl border border-cream-200 shadow-soft">
              <div>
                <h3 className="font-bold text-sm text-temple-900 flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-saffron-600" />
                  Devotee Announcements & Updates
                </h3>
                <p className="text-xs text-temple-600">
                  Broadcast class links, schedule changes, orientation notices, or temple events to students.
                </p>
              </div>
              <button
                onClick={() => setAnnouncementModalOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-saffron-500 hover:bg-saffron-600 active:bg-saffron-700 text-white font-semibold text-xs shadow-soft transition-all cursor-pointer flex-shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Post Announcement</span>
              </button>
            </div>

            {announcements.length === 0 ? (
              <div className="bg-cream-50 rounded-2xl p-10 border border-cream-200 text-center space-y-2.5">
                <div className="w-12 h-12 rounded-full bg-saffron-100 border border-saffron-200 flex items-center justify-center mx-auto text-saffron-700">
                  <Megaphone className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-sm text-temple-900">No Announcements Active</h4>
                <p className="text-xs text-temple-600 max-w-sm mx-auto">
                  Keep your students informed by posting daily reminders, Zoom links, or festival invitations.
                </p>
                <button
                  onClick={() => setAnnouncementModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cream-100 hover:bg-cream-200 border border-cream-300 text-temple-800 text-xs font-semibold cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-saffron-600" />
                  <span>Create First Announcement</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {announcements.map((ann) => (
                  <div 
                    key={ann.id} 
                    className={`rounded-2xl p-4 sm:p-5 border shadow-soft text-left space-y-2.5 relative transition-all ${
                      ann.isPinned 
                        ? 'bg-saffron-50/70 border-saffron-300 ring-1 ring-saffron-300/60' 
                        : 'bg-cream-50 border-cream-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {ann.isPinned && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900 border border-amber-300">
                            <Pin className="w-2.5 h-2.5" />
                            Pinned
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          ann.type === 'Urgent' ? 'bg-red-100 text-red-900 border-red-200' :
                          ann.type === 'Online' ? 'bg-blue-100 text-blue-900 border-blue-200' :
                          ann.type === 'Offline' ? 'bg-emerald-100 text-emerald-900 border-emerald-200' :
                          'bg-saffron-100 text-saffron-900 border-saffron-200'
                        }`}>
                          {ann.type || 'General'}
                        </span>
                        <span className="text-[10px] text-temple-500 font-medium">
                          Audience: <strong>{ann.target || 'All Devotees'}</strong>
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setDeleteAnnConfirmId(ann.id)}
                        className="p-1.5 rounded-lg text-temple-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Delete Announcement"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <h4 className="font-bold text-sm text-temple-900 leading-snug">
                      {ann.title}
                    </h4>

                    <p className="text-xs text-temple-700 whitespace-pre-line leading-relaxed">
                      {ann.content}
                    </p>

                    <div className="pt-2 border-t border-cream-200/80 flex items-center justify-between text-[11px] text-temple-500">
                      <span>{ann.dateString} {ann.timeString ? `• ${ann.timeString}` : ''}</span>
                      <span className="text-saffron-700 font-medium">Visible to students</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
      <BatchFormModal
        isOpen={batchModalOpen}
        onClose={() => setBatchModalOpen(false)}
        modalTitle="Add New Batch"
        initialBatch={null}
        onSubmit={handleCreateBatch}
        submitLabel="Create Batch"
      />

      {/* Edit Batch Modal with Duration & Digit Time Picker */}
      <BatchFormModal
        isOpen={Boolean(editingBatch)}
        onClose={() => setEditingBatch(null)}
        modalTitle="Edit Batch"
        initialBatch={editingBatch || {}}
        onSubmit={handleUpdateBatch}
        submitLabel="Save Changes"
      />

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
                disabled={isDeletingBatch}
                onClick={() => setDeleteBatchConfirmId(null)}
                className="w-1/2 py-2 rounded-xl border border-cream-300 bg-cream-100 hover:bg-cream-200 disabled:opacity-50 text-xs font-semibold text-temple-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingBatch}
                onClick={handleConfirmDeleteBatch}
                className="w-1/2 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-75 text-white text-xs font-semibold shadow-soft cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isDeletingBatch ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Registration Open/Close Control Modal */}
      {settingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-temple-900/60 backdrop-blur-sm animate-fadeIn">
          <div 
            className="w-full max-w-sm bg-cream-50 rounded-2xl p-5 border border-cream-300 shadow-soft text-left space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-cream-200 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-saffron-100 text-saffron-700 flex items-center justify-center">
                  <Power className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-sm text-temple-900">Registration Control</h4>
              </div>
              <button 
                type="button" 
                onClick={() => setSettingsModalOpen(false)}
                className="p-1 rounded text-temple-400 hover:text-temple-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Status Switch Buttons */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-temple-800">
                Are Registrations Open?
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRegStatusDraft(true)}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    regStatusDraft
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm ring-2 ring-emerald-400/40'
                      : 'bg-white text-temple-700 border-cream-300 hover:bg-cream-100'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${regStatusDraft ? 'bg-white' : 'bg-emerald-500'}`} />
                  <span>OPEN</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRegStatusDraft(false)}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    !regStatusDraft
                      ? 'bg-red-600 text-white border-red-700 shadow-sm ring-2 ring-red-400/40'
                      : 'bg-white text-temple-700 border-cream-300 hover:bg-cream-100'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${!regStatusDraft ? 'bg-white' : 'bg-red-500'}`} />
                  <span>CLOSED</span>
                </button>
              </div>
            </div>

            {/* Closed Notice message customization */}
            <div className="space-y-1.5 text-xs">
              <label className="block font-semibold text-temple-800">
                Notice Message When Closed
              </label>
              <textarea
                rows={3}
                value={closedNoticeDraft}
                onChange={(e) => setClosedNoticeDraft(e.target.value)}
                placeholder="e.g. Registrations for this batch are currently full. Join our WhatsApp group to be notified when the next batch opens."
                className="w-full p-2.5 border border-cream-300 rounded-xl bg-white text-xs text-temple-900 focus:ring-1 focus:ring-saffron-500 focus:outline-none leading-relaxed"
              />
              <p className="text-[10px] text-temple-500 leading-tight">
                Devotees will see this friendly notice if registrations are closed.
              </p>
            </div>

            <div className="flex gap-2 pt-1 border-t border-cream-200">
              <button
                type="button"
                onClick={() => setSettingsModalOpen(false)}
                className="w-1/2 py-2.5 rounded-xl border border-cream-300 bg-cream-100 hover:bg-cream-200 text-xs font-semibold text-temple-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingSettings}
                onClick={handleSaveRegistrationSettings}
                className="w-1/2 py-2.5 rounded-xl bg-saffron-500 hover:bg-saffron-600 active:bg-saffron-700 text-white text-xs font-semibold shadow-soft hover:shadow transition-all cursor-pointer"
              >
                {isSavingSettings ? 'Saving...' : 'Save & Apply'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post Announcement Modal */}
      {announcementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-temple-900/60 backdrop-blur-sm animate-fadeIn">
          <form 
            onSubmit={handleCreateAnnouncement}
            className="w-full max-w-md bg-cream-50 rounded-2xl p-5 border border-cream-300 shadow-soft text-left space-y-3.5 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-cream-200 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-saffron-100 text-saffron-700 flex items-center justify-center">
                  <Megaphone className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-sm sm:text-base text-temple-900">Post Announcement</h4>
              </div>
              <button 
                type="button" 
                onClick={() => setAnnouncementModalOpen(false)}
                className="p-1 rounded text-temple-400 hover:text-temple-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Title */}
              <div>
                <label className="block font-semibold mb-1 text-temple-800">Announcement Title</label>
                <input
                  type="text"
                  required
                  value={newAnnouncement.title}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                  placeholder="e.g. Orientation Session & Zoom Link"
                  className="w-full p-2 border border-cream-300 rounded-lg bg-white text-xs text-temple-900 focus:ring-1 focus:ring-saffron-500 focus:outline-none"
                />
              </div>

              {/* Tag & Target */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1 text-temple-800">Category Tag</label>
                  <select
                    value={newAnnouncement.type}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, type: e.target.value })}
                    className="w-full p-2 border border-cream-300 rounded-lg bg-white text-xs font-medium text-temple-800 cursor-pointer"
                  >
                    <option value="General">General</option>
                    <option value="Urgent">Important / Urgent</option>
                    <option value="Online">Online Class Update</option>
                    <option value="Offline">Temple Hall Event</option>
                    <option value="Prasadam">Prasadam Feast</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-temple-800">Target Audience</label>
                  <select
                    value={newAnnouncement.target}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, target: e.target.value })}
                    className="w-full p-2 border border-cream-300 rounded-lg bg-white text-xs font-medium text-temple-800 cursor-pointer"
                  >
                    <option value="All">All Devotees</option>
                    <option value="Online">Online Batches Only</option>
                    <option value="Offline">Offline Temple Only</option>
                  </select>
                </div>
              </div>

              {/* Content Body */}
              <div>
                <label className="block font-semibold mb-1 text-temple-800">Message Content</label>
                <textarea
                  rows={4}
                  required
                  value={newAnnouncement.content}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                  placeholder="Type your message, Zoom credentials, timings, or sacred instructions here..."
                  className="w-full p-2.5 border border-cream-300 rounded-lg bg-white text-xs text-temple-900 focus:ring-1 focus:ring-saffron-500 focus:outline-none leading-relaxed"
                />
              </div>

              {/* Pin checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="pinAnnouncement"
                  checked={newAnnouncement.isPinned}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, isPinned: e.target.checked })}
                  className="w-4 h-4 rounded border-cream-300 text-saffron-600 focus:ring-saffron-500 cursor-pointer"
                />
                <label htmlFor="pinAnnouncement" className="text-xs font-medium text-temple-800 cursor-pointer flex items-center gap-1">
                  <Pin className="w-3 h-3 text-saffron-600" />
                  <span>Pin this announcement at the top of the feed</span>
                </label>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-cream-200">
              <button
                type="button"
                onClick={() => setAnnouncementModalOpen(false)}
                className="w-1/2 py-2.5 rounded-xl border border-cream-300 bg-cream-100 hover:bg-cream-200 text-xs font-semibold text-temple-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-1/2 py-2.5 rounded-xl bg-saffron-500 hover:bg-saffron-600 text-white text-xs font-semibold shadow-soft cursor-pointer"
              >
                Post Now
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Announcement Confirmation UI Modal */}
      {deleteAnnConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-temple-900/60 backdrop-blur-sm animate-fadeIn">
          <div 
            className="w-full max-w-xs bg-cream-50 rounded-2xl p-5 border border-cream-300 shadow-soft text-center space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-200">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-temple-900">Remove Announcement?</h4>
              <p className="text-xs text-temple-600 mt-0.5">
                Are you sure you want to remove this announcement? It will no longer appear on student dashboards.
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeleteAnnConfirmId(null)}
                className="w-1/2 py-2 rounded-xl border border-cream-300 bg-cream-100 hover:bg-cream-200 text-xs font-semibold text-temple-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAnnouncement}
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
