import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Users, 
  Search, 
  Download, 
  RefreshCw, 
  Trash2, 
  Eye, 
  EyeOff,
  CheckCircle, 
  LogOut, 
  Plus, 
  X, 
  Check, 
  AlertTriangle,
  Power,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Loader2,
  Calendar,
  MapPin,
  Phone,
  Mail,
  UserCheck,
  FileSpreadsheet,
  Edit3,
  Sparkles,
  Database,
  ShieldCheck,
  UserPlus,
  ShieldAlert,
  Settings,
  KeyRound,
  Shield,
  Activity,
  TrendingUp,
  Clock,
  Lock,
  Copy,
  ExternalLink
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { 
  fetchAllRegistrations, 
  updateParticipant, 
  deleteParticipant, 
  fetchProgramSettings,
  updateProgramSettings,
  subscribeToProgramSettings,
  generateFullDatabaseBackup,
  downloadBackupFile,
  fetchAllAdmins,
  subscribeToAdmins,
  addAdminToFirestore,
  updateAdminRoleInFirestore,
  removeAdminFromFirestore,
  isSuperAdminUser,
  changeAdminPassword,
  resetAdminPasswordBySuperAdmin
} from '../../firebase';

const ALL_COLUMNS = [
  { id: 'sno', label: 'S.No', default: true },
  { id: 'id', label: 'Registration ID', default: true },
  { id: 'name', label: 'Participant Name', default: true },
  { id: 'mobile', label: 'Mobile Number', default: true },
  { id: 'email', label: 'Email Address', default: false },
  { id: 'residence', label: 'Current Residence', default: true },
  { id: 'address', label: 'Address', default: false },
  { id: 'pincode', label: 'Pincode', default: false },
  { id: 'age', label: 'Age', default: false },
  { id: 'gender', label: 'Gender', default: false },
  { id: 'education', label: 'Qualification', default: false },
  { id: 'occupation', label: 'Occupation', default: false },
  { id: 'date', label: 'Registration Date', default: false },
  { id: 'actions', label: 'Actions', default: true },
];

export default function AdminDashboard({ adminUser, onLogout }) {
  // Navigation: 'participants' | 'settings'
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#settings' || hash === '#admin-settings') return 'settings';
    }
    return 'participants';
  });

  // Sync tab changes with URL hash
  const switchTab = (tab) => {
    setActiveTab(tab);
    if (tab === 'settings') {
      window.location.hash = 'settings';
    } else {
      window.location.hash = 'admin';
    }
  };

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#settings' || hash === '#admin-settings') {
        setActiveTab('settings');
      } else if (hash === '#admin' || hash === '#admin-dashboard') {
        setActiveTab('participants');
      }
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Registrations state
  const [registrations, setRegistrations] = useState(() => {
    try {
      const cached = localStorage.getItem('gita_amrita_cached_admin_regs');
      if (cached) return JSON.parse(cached);
      const local = localStorage.getItem('gita_amrita_registrations');
      if (local) return JSON.parse(local);
    } catch (e) {}
    return [];
  });

  const [loading, setLoading] = useState(false);

  // Settings: Registration Open / Closed
  const [settings, setSettings] = useState(() => {
    try {
      const cached = localStorage.getItem('gita_amrita_cached_settings');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return {
      isRegistrationOpen: true,
      closedNotice: 'Registrations for Gita Amrita are currently paused. Please contact program coordinators for upcoming schedules.'
    };
  });
  const [closedNoticeDraft, setClosedNoticeDraft] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination & Display Customizations
  const [pageSize, setPageSize] = useState('20');
  const [currentPage, setCurrentPage] = useState(1);

  // Column Visibility Customization
  const [columnVisibility, setColumnVisibility] = useState(() => {
    try {
      const saved = localStorage.getItem('gita_amrita_admin_cols');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    const initial = {};
    ALL_COLUMNS.forEach(c => {
      initial[c.id] = c.default;
    });
    return initial;
  });
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);
  const columnMenuRef = useRef(null);

  // Modals & Confirmation States
  const [detailParticipant, setDetailParticipant] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [isDeletingParticipant, setIsDeletingParticipant] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [statusConfirmTarget, setStatusConfirmTarget] = useState(null);

  // Admin Access Management State
  const [adminsList, setAdminsList] = useState([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [showNewAdminPassword, setShowNewAdminPassword] = useState(false);
  const [newAdminRole, setNewAdminRole] = useState('Admin');
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  const [adminActionError, setAdminActionError] = useState('');
  const [adminDeleteConfirm, setAdminDeleteConfirm] = useState(null);
  const [isDeletingAdmin, setIsDeletingAdmin] = useState(false);
  const [changingRoleId, setChangingRoleId] = useState(null);

  // Change Password State
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);
  const [passwordChangeMsg, setPasswordChangeMsg] = useState({ type: '', text: '' });

  // Reset Password for Coordinator by Super Admin State
  const [resetPasswordTarget, setResetPasswordTarget] = useState(null);
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [showResetNewPass, setShowResetNewPass] = useState(false);
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [showResetConfirmPass, setShowResetConfirmPass] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetPasswordError, setResetPasswordError] = useState('');

  // Latest Backup Info
  const [lastBackupInfo, setLastBackupInfo] = useState(() => {
    try {
      const stored = localStorage.getItem('gita_amrita_last_backup_meta');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return null;
  });

  const [notification, setNotification] = useState('');

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3500);
  };

  // Determine if current logged in user has Super Admin role
  const isSuperAdmin = useMemo(() => {
    return isSuperAdminUser(adminUser);
  }, [adminUser]);

  // Close column dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (columnMenuRef.current && !columnMenuRef.current.contains(event.target)) {
        setColumnMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Subscribe to program settings
  useEffect(() => {
    const unsubscribeSettings = subscribeToProgramSettings((latestSettings) => {
      if (latestSettings) {
        setSettings(latestSettings);
        if (latestSettings.closedNotice !== undefined) {
          setClosedNoticeDraft(latestSettings.closedNotice);
        }
      }
    });

    return () => {
      unsubscribeSettings();
    };
  }, []);

  // Subscribe to Authorized Admins List in real-time
  useEffect(() => {
    const unsubAdmins = subscribeToAdmins((list) => {
      if (list) setAdminsList(list);
    });
    return () => unsubAdmins();
  }, []);

  // Fetch data
  const loadData = async (forceSync = false) => {
    setLoading(true);
    try {
      const [regs, sett, adms] = await Promise.all([
        fetchAllRegistrations(),
        fetchProgramSettings(),
        fetchAllAdmins()
      ]);

      if (regs) {
        setRegistrations(regs);
        try {
          localStorage.setItem('gita_amrita_cached_admin_regs', JSON.stringify(regs));
        } catch (e) {}
      }

      if (sett) {
        setSettings(sett);
        setClosedNoticeDraft(sett.closedNotice || '');
        try {
          localStorage.setItem('gita_amrita_cached_settings', JSON.stringify(sett));
        } catch (e) {}
      }

      if (adms) {
        setAdminsList(adms);
        try {
          localStorage.setItem('gita_amrita_cached_admins', JSON.stringify(adms));
        } catch (e) {}
      }

      if (forceSync) {
        showNotification('Database synchronized successfully.');
      }
    } catch (err) {
      console.warn('Error loading admin data:', err);
      showNotification('Failed to sync live data. Using local cache.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Save Column settings to localStorage
  const toggleColumn = (columnId) => {
    setColumnVisibility(prev => {
      const updated = { ...prev, [columnId]: !prev[columnId] };
      try {
        localStorage.setItem('gita_amrita_admin_cols', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const resetColumns = () => {
    const initial = {};
    ALL_COLUMNS.forEach(c => {
      initial[c.id] = c.default;
    });
    setColumnVisibility(initial);
    try {
      localStorage.setItem('gita_amrita_admin_cols', JSON.stringify(initial));
    } catch (e) {}
  };

  // Toggle Registration Open/Closed Status
  const handleToggleRegistrationStatus = async (newStatus) => {
    if (isUpdatingStatus) return;
    setIsUpdatingStatus(true);
    try {
      const res = await updateProgramSettings({
        ...settings,
        isRegistrationOpen: newStatus
      });
      if (res.success) {
        setSettings(prev => ({ ...prev, isRegistrationOpen: newStatus }));
        showNotification(`Registration form is now ${newStatus ? 'OPEN' : 'CLOSED'}.`);
      }
    } catch (err) {
      showNotification('Failed to update registration status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Save Custom Pause Notice
  const handleSaveNoticeMessage = async (e) => {
    e?.preventDefault();
    try {
      const res = await updateProgramSettings({
        ...settings,
        closedNotice: closedNoticeDraft.trim()
      });
      if (res.success) {
        setSettings(prev => ({ ...prev, closedNotice: closedNoticeDraft.trim() }));
        showNotification('Custom registration pause notice saved.');
      }
    } catch (err) {
      showNotification('Failed to save notice message.');
    }
  };

  // Add / Grant Admin Access
  const handleAddAdmin = async (e) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      setAdminActionError('Access Denied: Only Super Administrators can add new admins.');
      return;
    }
    if (!newAdminEmail.trim() || !newAdminEmail.includes('@')) {
      setAdminActionError('Please enter a valid email address.');
      return;
    }
    if (!newAdminPassword.trim() || newAdminPassword.trim().length < 6) {
      setAdminActionError('Initial password must be at least 6 characters long.');
      return;
    }
    setAdminActionError('');
    setIsAddingAdmin(true);

    try {
      const res = await addAdminToFirestore({
        email: newAdminEmail.trim().toLowerCase(),
        name: newAdminName.trim() || newAdminEmail.trim().split('@')[0],
        password: newAdminPassword.trim(),
        role: newAdminRole,
        addedBy: adminUser?.email || adminUser?.name || 'Super Admin',
        callerUser: adminUser
      });

      if (res.success) {
        setNewAdminEmail('');
        setNewAdminName('');
        setNewAdminPassword('');
        setShowNewAdminPassword(false);
        setNewAdminRole('Admin');
        
        // Immediately update adminsList state so the new admin appears instantly
        setAdminsList(prev => {
          const next = [res.admin, ...prev.filter(a => (a.email || '').toLowerCase() !== (res.admin.email || '').toLowerCase())];
          next.sort((a, b) => {
            const aSuper = (a.role === 'Super Admin' || a.role === 'Super Administrator') ? 1 : 0;
            const bSuper = (b.role === 'Super Admin' || b.role === 'Super Administrator') ? 1 : 0;
            if (aSuper !== bSuper) return bSuper - aSuper;
            return (a.name || a.email || '').localeCompare(b.name || b.email || '');
          });
          return next;
        });

        showNotification(`Coordinator access granted to ${res.admin.email} (${res.admin.role})`);
      } else {
        setAdminActionError(res.error || 'Failed to grant admin access.');
      }
    } catch (err) {
      setAdminActionError('Error adding admin. Please try again.');
    } finally {
      setIsAddingAdmin(false);
    }
  };

  // Change Admin Role (Super Admin only)
  const handleChangeAdminRole = async (email, newRole) => {
    if (!isSuperAdmin) {
      showNotification('Access Denied: Only Super Administrators can modify roles.');
      return;
    }
    setChangingRoleId(email);
    try {
      const res = await updateAdminRoleInFirestore({
        email,
        newRole,
        callerUser: adminUser
      });
      if (res.success) {
        setAdminsList(prev => {
          const next = prev.map(a => {
            if ((a.email || '').toLowerCase() === email.toLowerCase()) {
              return { ...a, role: newRole };
            }
            return a;
          });
          next.sort((a, b) => {
            const aSuper = (a.role === 'Super Admin' || a.role === 'Super Administrator') ? 1 : 0;
            const bSuper = (b.role === 'Super Admin' || b.role === 'Super Administrator') ? 1 : 0;
            if (aSuper !== bSuper) return bSuper - aSuper;
            return (a.name || a.email || '').localeCompare(b.name || b.email || '');
          });
          return next;
        });
        showNotification(`Role updated to ${newRole} for ${email}`);
      } else {
        showNotification(res.error || 'Failed to update role.');
      }
    } catch (err) {
      showNotification('Error modifying role.');
    } finally {
      setChangingRoleId(null);
    }
  };

  // Remove / Revoke Admin Access (Instantly updates UI & database)
  const handleRemoveAdmin = async (adminIdOrEmail) => {
    if (!isSuperAdmin) {
      showNotification('Access Denied: Only Super Administrators can remove admins.');
      return;
    }
    setIsDeletingAdmin(true);
    setAdminActionError('');
    try {
      const res = await removeAdminFromFirestore(adminIdOrEmail, adminUser);
      if (res.success) {
        const targetClean = (adminIdOrEmail || '').toLowerCase();
        
        // Immediately filter out from state so the card instantly disappears
        setAdminsList(prev => prev.filter(a => {
          const em = (a.email || '').toLowerCase();
          const id = (a.id || '').toLowerCase();
          return em !== targetClean && id !== targetClean && em.split('@')[0] !== targetClean;
        }));
        
        setAdminDeleteConfirm(null);
        showNotification('Coordinator access revoked successfully.');
      } else {
        setAdminActionError(res.error || 'Could not revoke coordinator access.');
      }
    } catch (err) {
      setAdminActionError('Error revoking coordinator access.');
    } finally {
      setIsDeletingAdmin(false);
    }
  };

  // Change Password for Logged-In Admin (requires current password + new password 2 times)
  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!currentPasswordInput) {
      setPasswordChangeMsg({ type: 'error', text: 'Please enter your current password.' });
      return;
    }
    if (newPasswordInput.length < 6) {
      setPasswordChangeMsg({ type: 'error', text: 'New password must be at least 6 characters long.' });
      return;
    }
    if (newPasswordInput !== confirmPasswordInput) {
      setPasswordChangeMsg({ type: 'error', text: 'New passwords do not match. Please re-enter.' });
      return;
    }

    setPasswordChangeLoading(true);
    setPasswordChangeMsg({ type: '', text: '' });

    try {
      const res = await changeAdminPassword({
        adminEmail: adminUser?.email,
        currentPassword: currentPasswordInput,
        newPassword: newPasswordInput,
        callerUser: adminUser
      });
      if (res.success) {
        setPasswordChangeMsg({ type: 'success', text: res.message || 'Password updated successfully!' });
        setCurrentPasswordInput('');
        setNewPasswordInput('');
        setConfirmPasswordInput('');
        showNotification('Admin password updated successfully.');
      } else {
        setPasswordChangeMsg({ type: 'error', text: res.error || 'Failed to update password.' });
      }
    } catch (err) {
      setPasswordChangeMsg({ type: 'error', text: 'Unexpected error changing password.' });
    } finally {
      setPasswordChangeLoading(false);
    }
  };

  // Super Admin: Reset Password for an Admin directly
  const handleResetAdminPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!resetNewPassword || resetNewPassword.length < 6) {
      setResetPasswordError('New password must be at least 6 characters long.');
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      setResetPasswordError('Passwords do not match. Please re-enter.');
      return;
    }

    setIsResettingPassword(true);
    setResetPasswordError('');

    try {
      const res = await resetAdminPasswordBySuperAdmin({
        adminEmail: resetPasswordTarget?.email,
        newPassword: resetNewPassword,
        callerUser: adminUser
      });

      if (res.success) {
        showNotification(res.message || `Password for ${resetPasswordTarget?.email} reset successfully.`);
        setResetPasswordTarget(null);
        setResetNewPassword('');
        setResetConfirmPassword('');
      } else {
        setResetPasswordError(res.error || 'Failed to reset password.');
      }
    } catch (err) {
      setResetPasswordError('Unexpected error resetting password.');
    } finally {
      setIsResettingPassword(false);
    }
  };

  // Filter & Search Registrations
  const filteredRegistrations = useMemo(() => {
    return registrations.filter(item => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (item.fullName || item.name || '').toLowerCase().includes(q);
        const matchMobile = (item.mobile || '').replace(/\D/g, '').includes(q.replace(/\D/g, ''));
        const matchEmail = (item.email || '').toLowerCase().includes(q);
        const matchId = (item.registrationId || item.id || '').toLowerCase().includes(q);
        const matchCity = (item.currentResidence || item.city || '').toLowerCase().includes(q);
        const matchOcc = (item.occupation || '').toLowerCase().includes(q);
        if (!matchName && !matchMobile && !matchEmail && !matchId && !matchCity && !matchOcc) {
          return false;
        }
      }
      return true;
    });
  }, [registrations, searchQuery]);

  // Statistics Summary
  const stats = useMemo(() => {
    const total = registrations.length;
    const male = registrations.filter(r => (r.gender || '').toLowerCase() === 'male').length;
    const female = registrations.filter(r => (r.gender || '').toLowerCase() === 'female').length;

    // Calculate Today's Registrations
    const today = new Date();
    const todayDateStr = today.toISOString().slice(0, 10);
    const todayLocaleStr = today.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    let todayCount = 0;
    registrations.forEach(r => {
      if (r.createdAt?.toDate) {
        const d = r.createdAt.toDate();
        if (d.toISOString().slice(0, 10) === todayDateStr) {
          todayCount++;
        }
      } else if (r.createdAtFormatted && r.createdAtFormatted.includes(todayLocaleStr)) {
        todayCount++;
      }
    });

    return { total, male, female, todayCount };
  }, [registrations]);

  // Recent Activity Feed
  const recentActivities = useMemo(() => {
    return registrations.slice(0, 6).map(r => ({
      id: r.registrationId || r.id,
      name: r.fullName || 'Participant',
      city: r.currentResidence || r.city || 'Adilabad',
      date: r.createdAtFormatted || 'Recent',
      gender: r.gender || '—',
      education: r.education || '—'
    }));
  }, [registrations]);

  // Pagination
  const totalItems = filteredRegistrations.length;
  const itemsPerPage = pageSize === 'all' ? (totalItems || 1) : parseInt(pageSize, 10);
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  const paginatedRegistrations = useMemo(() => {
    if (pageSize === 'all') return filteredRegistrations;
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRegistrations.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRegistrations, currentPage, itemsPerPage, pageSize]);

  // Export to Excel
  const handleExportExcel = () => {
    if (!registrations || registrations.length === 0) {
      showNotification('No participant registrations available to export.');
      return;
    }

    try {
      const exportData = registrations.map((p, idx) => ({
        'S.No': idx + 1,
        'Registration ID': p.registrationId || p.id || '',
        'Full Name': p.fullName || p.name || '',
        'Mobile Number': p.mobile ? `${p.countryCode || '+91'} ${p.mobile}` : '',
        'Email Address': p.email || '',
        'Age': p.age || '',
        'Gender': p.gender || '',
        'Current Residence': p.currentResidence || p.city || '',
        'Address': p.fullAddress || p.address || p.area || '',
        'Pincode': p.pincode || '',
        'Qualification': p.education || '—',
        'Occupation': p.occupation || '',
        'Registration Date': p.createdAtFormatted || p.date || 'Recent'
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Gita_Amrita_Participants');

      const colWidths = [
        { wch: 6 },
        { wch: 14 },
        { wch: 22 },
        { wch: 18 },
        { wch: 26 },
        { wch: 6 },
        { wch: 10 },
        { wch: 20 },
        { wch: 30 },
        { wch: 10 },
        { wch: 18 },
        { wch: 20 },
        { wch: 22 }
      ];
      worksheet['!cols'] = colWidths;

      const dateStr = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(workbook, `Gita_Amrita_Participants_${dateStr}.xlsx`);

      const backupMeta = {
        type: 'Excel (.xlsx)',
        timestamp: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        count: registrations.length
      };
      setLastBackupInfo(backupMeta);
      try {
        localStorage.setItem('gita_amrita_last_backup_meta', JSON.stringify(backupMeta));
      } catch (e) {}

      showNotification(`Exported ${registrations.length} records to Excel.`);
    } catch (err) {
      console.error('Error generating Excel file:', err);
      showNotification('Failed to generate Excel file.');
    }
  };

  // Full Database Backup (.json)
  const handleBackupDatabase = async () => {
    setIsBackingUp(true);
    try {
      const backupData = await generateFullDatabaseBackup();
      downloadBackupFile(backupData);

      const backupMeta = {
        type: 'JSON Database Snapshot',
        timestamp: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        count: registrations.length
      };
      setLastBackupInfo(backupMeta);
      try {
        localStorage.setItem('gita_amrita_last_backup_meta', JSON.stringify(backupMeta));
      } catch (e) {}

      showNotification('Complete raw database backup downloaded.');
    } catch (err) {
      console.warn('Backup error:', err);
      showNotification('Failed to generate database backup.');
    } finally {
      setIsBackingUp(false);
    }
  };

  // Delete participant
  const handleConfirmDelete = async () => {
    if (!deleteConfirmId || isDeletingParticipant) return;
    setIsDeletingParticipant(true);
    try {
      await deleteParticipant(deleteConfirmId);
      setRegistrations(prev => prev.filter(r => r.id !== deleteConfirmId && r.registrationId !== deleteConfirmId));
      setDeleteConfirmId(null);
      showNotification('Participant deleted successfully.');
    } catch (err) {
      showNotification('Failed to delete participant.');
    } finally {
      setIsDeletingParticipant(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream-100 flex flex-col font-poppins text-temple-900 selection:bg-saffron-100 selection:text-saffron-900">
      
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-temple-900 text-cream-50 px-4 py-2.5 rounded-2xl shadow-soft-lg text-xs font-medium flex items-center gap-2 animate-fadeIn border border-saffron-500/30">
          <Sparkles className="w-3.5 h-3.5 text-saffron-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Admin Header with Icon-Only Clean Navigation */}
      <header className="sticky top-0 z-30 bg-cream-50/95 backdrop-blur-md border-b border-cream-200/80 shadow-2xs">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3">
          
          {/* Left: Brand */}
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
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                  isSuperAdmin 
                    ? 'text-purple-700 bg-purple-50 border-purple-200' 
                    : 'text-saffron-700 bg-saffron-50 border-saffron-200'
                }`}>
                  {isSuperAdmin ? 'Super Admin' : 'Admin'}
                </span>
              </div>
              <span className="text-[10px] text-temple-500 block">
                ISKCON Adilabad
              </span>
            </div>
          </div>

          {/* Center: Clean Icon Navigation */}
          <div className="flex items-center gap-1 bg-cream-200/80 p-1 rounded-2xl border border-cream-300">
            <button
              onClick={() => switchTab('participants')}
              className={`p-2 rounded-xl text-xs font-semibold transition-all cursor-pointer relative ${
                activeTab === 'participants'
                  ? 'bg-white text-saffron-700 shadow-soft font-bold'
                  : 'text-temple-500 hover:text-temple-900 hover:bg-cream-100/70'
              }`}
              title="Participants Registrations"
              aria-label="Participants Registrations"
            >
              <Users className="w-4 h-4" />
            </button>

            <button
              onClick={() => switchTab('settings')}
              className={`p-2 rounded-xl text-xs font-semibold transition-all cursor-pointer relative ${
                activeTab === 'settings'
                  ? 'bg-white text-saffron-700 shadow-soft font-bold'
                  : 'text-temple-500 hover:text-temple-900 hover:bg-cream-100/70'
              }`}
              title="System & Administrative Settings"
              aria-label="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

          {/* Right: Coordinator Details & Logout */}
          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <span className="text-xs font-semibold text-temple-800 block truncate max-w-[140px]">
                {adminUser?.name || 'Coordinator'}
              </span>
              <span className="text-[10px] text-temple-500 block truncate max-w-[140px]">
                {adminUser?.email || ''}
              </span>
            </div>
            
            <button
              onClick={() => setLogoutConfirmOpen(true)}
              className="inline-flex items-center gap-1 p-2 sm:px-3 sm:py-1.5 rounded-xl border border-cream-300 hover:border-red-200 bg-white hover:bg-red-50 text-temple-700 hover:text-red-700 text-xs font-medium transition-colors cursor-pointer shadow-2xs"
              title="Log out of Admin Dashboard"
              aria-label="Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-5 space-y-5">
        
        {/* TAB 1: PARTICIPANTS MANAGEMENT VIEW */}
        {activeTab === 'participants' && (
          <div className="space-y-4 animate-fadeIn">
            
            {/* Warm Welcome Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1">
              <div>
                <span className="text-xs font-semibold text-saffron-700 tracking-wide block">
                  Hare Krishna 🙏
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-temple-900 tracking-tight">
                  Welcome, {adminUser?.name || 'Coordinator'}
                </h2>
              </div>
              <div className="text-[11px] text-temple-500">
                Dedicated service to Sri Sri Radha Govinda &bull; ISKCON Adilabad
              </div>
            </div>
            
            {/* Top Bar: Title + Status Pill + Sync */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-temple-900">
                  Participant Registrations
                </h1>
                <span className="text-xs font-semibold text-temple-600 bg-cream-200/80 px-2.5 py-0.5 rounded-full">
                  {registrations.length} Total
                </span>
              </div>

              <div className="flex items-center gap-2 justify-between sm:justify-end">
                {/* Compact Registration Status Pill */}
                <div className={`px-2.5 py-1.5 rounded-xl border transition-all flex items-center gap-2 shadow-2xs ${
                  settings.isRegistrationOpen
                    ? 'bg-emerald-50/90 border-emerald-200'
                    : 'bg-amber-50/90 border-amber-200'
                }`}>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${settings.isRegistrationOpen ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                  <span className="text-[11px] font-semibold text-temple-800 whitespace-nowrap">
                    Form: {settings.isRegistrationOpen ? 'Open' : 'Closed'}
                  </span>
                </div>

                {/* Sync Button */}
                <button
                  onClick={() => loadData(true)}
                  className="inline-flex items-center gap-1 text-xs text-temple-600 hover:text-saffron-700 font-medium cursor-pointer p-1.5 rounded-xl border border-cream-200 bg-white hover:bg-cream-100 shadow-2xs"
                  title="Sync latest records from database"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-saffron-600' : ''}`} />
                  <span className="hidden sm:inline">Sync</span>
                </button>
              </div>
            </div>

            {/* Quick Stat Summary Cards */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
              <div className="bg-cream-50 rounded-2xl p-3 sm:p-4 border border-cream-200 shadow-soft text-left">
                <span className="text-[11px] uppercase tracking-wide text-temple-500 font-semibold block">
                  Total Participants
                </span>
                <span className="text-xl sm:text-2xl font-bold text-temple-900 font-mono">
                  {stats.total}
                </span>
              </div>

              <div className="bg-cream-50 rounded-2xl p-3 sm:p-4 border border-cream-200 shadow-soft text-left">
                <span className="text-[11px] uppercase tracking-wide text-saffron-700 font-semibold block">
                  Male Participants
                </span>
                <span className="text-xl sm:text-2xl font-bold text-saffron-900 font-mono">
                  {stats.male}
                </span>
              </div>

              <div className="bg-cream-50 rounded-2xl p-3 sm:p-4 border border-cream-200 shadow-soft text-left">
                <span className="text-[11px] uppercase tracking-wide text-emerald-700 font-semibold block">
                  Female Participants
                </span>
                <span className="text-xl sm:text-2xl font-bold text-emerald-900 font-mono">
                  {stats.female}
                </span>
              </div>
            </div>

            {/* Controls Bar: Search, Rows Selector, Columns */}
            <div className="bg-cream-50 rounded-2xl p-3 border border-cream-200 shadow-soft flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
              
              {/* Search */}
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-temple-400" />
                <input
                  type="text"
                  placeholder="Search name, phone, email, residence, ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-cream-300 bg-white text-xs text-temple-900 placeholder:text-temple-400 focus:outline-none focus:border-saffron-500 transition-all"
                />
              </div>

              {/* Action Tools */}
              <div className="flex items-center gap-2 flex-wrap justify-between sm:justify-end">
                
                {/* Rows per page */}
                <div className="flex items-center gap-1.5 text-xs text-temple-600">
                  <span className="text-[11px] font-medium hidden sm:inline">Show:</span>
                  <div className="relative inline-flex items-center">
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(e.target.value)}
                      className="appearance-none pl-3 pr-7 py-1.5 rounded-xl border border-cream-300 bg-white text-xs text-temple-800 focus:outline-none cursor-pointer font-medium shadow-2xs hover:border-cream-400 transition-colors"
                    >
                      <option value="10">10 rows</option>
                      <option value="20">20 rows</option>
                      <option value="30">30 rows</option>
                      <option value="50">50 rows</option>
                      <option value="all">All ({totalItems})</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 pointer-events-none text-temple-500" />
                  </div>
                </div>

                {/* Column Visibility Menu */}
                <div className="relative" ref={columnMenuRef}>
                  <button
                    type="button"
                    onClick={() => setColumnMenuOpen(!columnMenuOpen)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-cream-300 bg-white hover:bg-cream-100 text-temple-700 text-xs font-medium transition-colors cursor-pointer shadow-2xs"
                    title="Customize visible columns"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-saffron-600" />
                    <span>Columns</span>
                  </button>

                  {columnMenuOpen && (
                    <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-2xl p-2.5 shadow-soft-lg border border-cream-300 z-40 animate-fadeIn text-left">
                      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-cream-200">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-temple-700">Display Columns</span>
                        <button
                          type="button"
                          onClick={resetColumns}
                          className="text-[10px] text-saffron-600 hover:text-saffron-700 font-semibold cursor-pointer"
                        >
                          Reset
                        </button>
                      </div>
                      <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                        {ALL_COLUMNS.map(col => (
                          <label 
                            key={col.id} 
                            className="flex items-center gap-2 p-1 rounded hover:bg-cream-100 text-xs text-temple-800 cursor-pointer select-none"
                          >
                            <input
                              type="checkbox"
                              checked={Boolean(columnVisibility[col.id])}
                              onChange={() => toggleColumn(col.id)}
                              className="rounded border-cream-400 text-saffron-600 focus:ring-saffron-500 cursor-pointer"
                            />
                            <span>{col.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Export Excel */}
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-xs transition-colors shadow-soft cursor-pointer"
                  title="Download Microsoft Excel Sheet (.xlsx)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Export Excel</span>
                </button>

              </div>
            </div>

            {/* Participants Table */}
            <div className="bg-cream-50 rounded-2xl border border-cream-200 shadow-soft overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-cream-200/60 border-b border-cream-200 text-[10px] uppercase font-bold tracking-wider text-temple-600">
                      {columnVisibility.sno && <th className="py-2.5 px-3">S.No</th>}
                      {columnVisibility.id && <th className="py-2.5 px-3">ID</th>}
                      {columnVisibility.name && <th className="py-2.5 px-3">Participant</th>}
                      {columnVisibility.mobile && <th className="py-2.5 px-3">Mobile</th>}
                      {columnVisibility.email && <th className="py-2.5 px-3">Email</th>}
                      {columnVisibility.residence && <th className="py-2.5 px-3">Residence</th>}
                      {columnVisibility.address && <th className="py-2.5 px-3">Address</th>}
                      {columnVisibility.pincode && <th className="py-2.5 px-3">Pincode</th>}
                      {columnVisibility.age && <th className="py-2.5 px-3">Age</th>}
                      {columnVisibility.gender && <th className="py-2.5 px-3">Gender</th>}
                      {columnVisibility.education && <th className="py-2.5 px-3">Qualification</th>}
                      {columnVisibility.occupation && <th className="py-2.5 px-3">Occupation</th>}
                      {columnVisibility.date && <th className="py-2.5 px-3">Date</th>}
                      {columnVisibility.actions && <th className="py-2.5 px-3 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cream-200/80">
                    {paginatedRegistrations.length === 0 ? (
                      <tr>
                        <td colSpan={14} className="py-12 text-center text-temple-500">
                          <Users className="w-8 h-8 mx-auto text-temple-300 mb-2" />
                          <p className="font-semibold text-sm">No registrations found</p>
                          <p className="text-xs text-temple-400">Try adjusting your search query or sync the database.</p>
                        </td>
                      </tr>
                    ) : (
                      paginatedRegistrations.map((item, index) => {
                        const serialNum = pageSize === 'all' ? (index + 1) : ((currentPage - 1) * itemsPerPage + index + 1);

                        return (
                          <tr 
                            key={item.registrationId || item.id || index}
                            className="hover:bg-cream-100/70 transition-colors group"
                          >
                            {columnVisibility.sno && (
                              <td className="py-3 px-3 font-mono text-temple-400 text-[11px]">
                                {serialNum}
                              </td>
                            )}

                            {columnVisibility.id && (
                              <td className="py-3 px-3 font-mono font-semibold text-saffron-800">
                                {item.registrationId || item.id || '—'}
                              </td>
                            )}

                            {columnVisibility.name && (
                              <td className="py-3 px-3 font-semibold text-temple-900">
                                {item.fullName || item.name || '—'}
                              </td>
                            )}

                            {columnVisibility.mobile && (
                              <td className="py-3 px-3 font-mono text-temple-700">
                                {item.mobile ? `${item.countryCode || '+91'} ${item.mobile}` : '—'}
                              </td>
                            )}

                            {columnVisibility.email && (
                              <td className="py-3 px-3 text-temple-700 max-w-[140px] truncate" title={item.email}>
                                {item.email || '—'}
                              </td>
                            )}

                            {columnVisibility.residence && (
                              <td className="py-3 px-3 text-temple-700">
                                {item.currentResidence || item.city || '—'}
                              </td>
                            )}

                            {columnVisibility.address && (
                              <td className="py-3 px-3 text-temple-700 max-w-[150px] truncate" title={item.fullAddress || item.address}>
                                {item.fullAddress || item.address || '—'}
                              </td>
                            )}

                            {columnVisibility.pincode && (
                              <td className="py-3 px-3 font-mono text-temple-700">
                                {item.pincode || '—'}
                              </td>
                            )}

                            {columnVisibility.age && (
                              <td className="py-3 px-3 text-temple-700">
                                {item.age ? `${item.age} yrs` : '—'}
                              </td>
                            )}

                            {columnVisibility.gender && (
                              <td className="py-3 px-3 text-temple-700">
                                {item.gender || '—'}
                              </td>
                            )}

                            {columnVisibility.education && (
                              <td className="py-3 px-3 text-temple-700 max-w-[120px] truncate" title={item.education}>
                                {item.education || '—'}
                              </td>
                            )}

                            {columnVisibility.occupation && (
                              <td className="py-3 px-3 text-temple-700 max-w-[120px] truncate" title={item.occupation}>
                                {item.occupation || '—'}
                              </td>
                            )}

                            {columnVisibility.date && (
                              <td className="py-3 px-3 text-temple-500 text-[11px] whitespace-nowrap">
                                {item.createdAtFormatted || item.date || 'Recent'}
                              </td>
                            )}

                            {columnVisibility.actions && (
                              <td className="py-3 px-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => setDetailParticipant(item)}
                                    className="p-1.5 rounded-lg hover:bg-cream-200 text-temple-600 hover:text-saffron-700 transition-colors cursor-pointer"
                                    title="View Full Details"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmId(item.registrationId || item.id)}
                                    className="p-1.5 rounded-lg hover:bg-red-100 text-temple-400 hover:text-red-700 transition-colors cursor-pointer"
                                    title="Delete Participant"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {pageSize !== 'all' && totalPages > 1 && (
                <div className="py-2.5 px-4 border-t border-cream-200 flex items-center justify-between text-xs text-temple-600 bg-cream-100/50">
                  <span>
                    Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}
                  </span>
                  
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1 rounded-lg border border-cream-300 bg-white hover:bg-cream-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-2 font-medium">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-1 rounded-lg border border-cream-300 bg-white hover:bg-cream-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 2: DEDICATED SETTINGS & SYSTEM HUB */}
        {activeTab === 'settings' && (
          <div className="space-y-6 animate-fadeIn text-left">
            
            {/* Top Navigation Row: Header Title */}
            <div className="flex items-center justify-between gap-3 border-b border-cream-200 pb-4">
              <div>
                <h1 className="text-base sm:text-lg font-bold text-temple-900">
                  System &amp; Administration Settings
                </h1>
              </div>
            </div>

            {/* COMPACT SYSTEM OVERVIEW STRIP */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-white rounded-2xl px-4 py-3 sm:px-5 sm:py-3.5 border border-cream-200 shadow-2xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] sm:text-[11px] uppercase tracking-wide text-temple-500 font-semibold block">
                    Total Registrations
                  </span>
                  <span className="text-lg sm:text-2xl font-bold text-temple-900 font-mono">
                    {stats.total}
                  </span>
                </div>
                <Users className="w-5 h-5 text-temple-400 hidden sm:block" />
              </div>

              <div className="bg-white rounded-2xl px-4 py-3 sm:px-5 sm:py-3.5 border border-cream-200 shadow-2xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] sm:text-[11px] uppercase tracking-wide text-emerald-700 font-semibold block">
                    Today Registrations
                  </span>
                  <span className="text-lg sm:text-2xl font-bold text-emerald-800 font-mono">
                    {stats.todayCount}
                  </span>
                </div>
                <Activity className="w-5 h-5 text-emerald-500 hidden sm:block" />
              </div>
            </div>

            {/* SECTION 2: REGISTRATION SETTINGS */}
            <div className="bg-cream-50 rounded-3xl p-5 sm:p-6 border border-cream-200 shadow-soft space-y-4">
              <div className="flex items-center gap-2 border-b border-cream-200 pb-3">
                <Power className="w-4 h-4 text-saffron-600" />
                <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-temple-800">
                  Registration Form Controls
                </h2>
              </div>

              <div className="space-y-4">
                {/* Registration Switch Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-white border border-cream-200 gap-3">
                  <div>
                    <h3 className="text-xs sm:text-sm font-semibold text-temple-900">
                      Enable Registration Form
                    </h3>
                    <p className="text-xs text-temple-600">
                      When turned OFF, the public registration form is disabled and displays the notice message below.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleRegistrationStatus(true)}
                      disabled={isUpdatingStatus || settings.isRegistrationOpen}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        settings.isRegistrationOpen
                          ? 'bg-emerald-600 text-white shadow-soft ring-2 ring-emerald-500/20'
                          : 'bg-cream-100 text-temple-600 hover:bg-cream-200'
                      }`}
                    >
                      {isUpdatingStatus && settings.isRegistrationOpen ? 'Updating...' : 'Open (Active)'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setStatusConfirmTarget(false)}
                      disabled={isUpdatingStatus || !settings.isRegistrationOpen}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        !settings.isRegistrationOpen
                          ? 'bg-amber-600 text-white shadow-soft ring-2 ring-amber-500/20'
                          : 'bg-cream-100 text-temple-600 hover:bg-cream-200'
                      }`}
                    >
                      Paused (Closed)
                    </button>
                  </div>
                </div>

                {/* Custom Closed Notice Message Form */}
                <form onSubmit={handleSaveNoticeMessage} className="p-4 rounded-2xl bg-white border border-cream-200 space-y-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-temple-800 uppercase tracking-wide">
                      Registration Paused Notice Message
                    </label>
                    <p className="text-xs text-temple-500">
                      Message shown to visitors when registrations are paused.
                    </p>
                  </div>

                  <textarea
                    rows={3}
                    value={closedNoticeDraft}
                    onChange={(e) => setClosedNoticeDraft(e.target.value)}
                    placeholder="e.g. Registrations for Gita Amrita are currently paused. Please contact program coordinators for upcoming schedules."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 bg-cream-50 text-temple-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-saffron-500/20 focus:border-saffron-500 transition-all resize-none"
                  />

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-saffron-500 hover:bg-saffron-600 active:bg-saffron-700 text-white font-medium text-xs shadow-soft transition-all cursor-pointer"
                    >
                      Save Notice Message
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* SECTION 3: ADMIN MANAGEMENT & ROLE-BASED ACCESS CONTROL (Super Admin Only) */}
            {isSuperAdmin && (
              <div className="bg-cream-50 rounded-3xl p-5 sm:p-6 border border-cream-200 shadow-soft space-y-4">
                <div className="flex items-center gap-2 border-b border-cream-200 pb-3">
                  <ShieldCheck className="w-4 h-4 text-saffron-600" />
                  <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-temple-800">
                    Coordinator Access &amp; Role Management
                  </h2>
                </div>

                {/* Error Message */}
                {adminActionError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2 animate-fadeIn">
                    <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <span className="flex-1">{adminActionError}</span>
                  </div>
                )}

                {/* Form: Add New Administrator */}
                <div className="p-4 rounded-2xl bg-white border border-cream-200 space-y-3">
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-saffron-600" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-temple-800">
                      Grant Admin Access to New Coordinator
                    </h3>
                  </div>

                  <form onSubmit={handleAddAdmin} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                      {/* Email */}
                      <div className="sm:col-span-4 space-y-1">
                        <label className="block text-[11px] font-semibold text-temple-700 uppercase">
                          Email Address <span className="text-saffron-600">*</span>
                        </label>
                        <input
                          type="email"
                          required
                          placeholder="coordinator@domain.com"
                          value={newAdminEmail}
                          onChange={(e) => {
                            setNewAdminEmail(e.target.value);
                            if (adminActionError) setAdminActionError('');
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-cream-300 bg-cream-50 text-temple-900 placeholder:text-temple-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-saffron-500/20 focus:border-saffron-500 transition-all"
                        />
                      </div>

                      {/* Full Name */}
                      <div className="sm:col-span-3 space-y-1">
                        <label className="block text-[11px] font-semibold text-temple-700 uppercase">
                          Full Name / Title <span className="text-saffron-600">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Madhava Das"
                          value={newAdminName}
                          onChange={(e) => setNewAdminName(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-cream-300 bg-cream-50 text-temple-900 placeholder:text-temple-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-saffron-500/20 focus:border-saffron-500 transition-all"
                        />
                      </div>

                      {/* Initial Password with Eye toggle */}
                      <div className="sm:col-span-3 space-y-1">
                        <label className="block text-[11px] font-semibold text-temple-700 uppercase">
                          Initial Password <span className="text-saffron-600">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showNewAdminPassword ? 'text' : 'password'}
                            required
                            placeholder="Min 6 chars"
                            value={newAdminPassword}
                            onChange={(e) => {
                              setNewAdminPassword(e.target.value);
                              if (adminActionError) setAdminActionError('');
                            }}
                            className="w-full pl-3 pr-9 py-2 rounded-xl border border-cream-300 bg-cream-50 text-temple-900 placeholder:text-temple-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-saffron-500/20 focus:border-saffron-500 transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewAdminPassword(!showNewAdminPassword)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-temple-400 hover:text-temple-700 cursor-pointer"
                            title="Toggle password view"
                          >
                            {showNewAdminPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* Role Selector: Admin or Super Admin */}
                      <div className="sm:col-span-2 space-y-1">
                        <label className="block text-[11px] font-semibold text-temple-700 uppercase">
                          Role
                        </label>
                        <select
                          value={newAdminRole}
                          onChange={(e) => setNewAdminRole(e.target.value)}
                          className="w-full px-2.5 py-2 rounded-xl border border-cream-300 bg-cream-50 text-temple-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-saffron-500/20 focus:border-saffron-500 transition-all cursor-pointer font-medium"
                        >
                          <option value="Admin">Admin</option>
                          <option value="Super Admin">Super Admin</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        disabled={isAddingAdmin || !newAdminEmail.trim() || !newAdminPassword.trim()}
                        className="px-4 py-2 rounded-xl bg-saffron-500 hover:bg-saffron-600 active:bg-saffron-700 text-white font-medium text-xs shadow-soft transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isAddingAdmin ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Saving Account...</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Grant Admin Access</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>

                {/* List of Authorized Administrators (Sorted Super Admins first) */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-temple-800 flex items-center gap-1.5">
                      <span>Authorized Coordinators ({adminsList.length})</span>
                    </h3>
                    <span className="text-[11px] text-temple-500">
                      Database authorized
                    </span>
                  </div>

                  <div className="space-y-2">
                    {adminsList.map((adm) => {
                      const emailLower = (adm.email || '').toLowerCase();
                      const isSelf = adminUser?.email && emailLower === adminUser.email.toLowerCase();
                      const isAdmSuper = adm.role === 'Super Admin' || adm.role === 'Super Administrator';

                      return (
                        <div
                          key={adm.email || adm.id}
                          className="p-3.5 rounded-2xl bg-white border border-cream-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-cream-300 transition-all"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-9 h-9 rounded-2xl font-bold text-xs flex items-center justify-center flex-shrink-0 border uppercase ${
                              isAdmSuper 
                                ? 'bg-purple-100 text-purple-800 border-purple-200' 
                                : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            }`}>
                              {(adm.name || adm.email || 'A').slice(0, 2)}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-semibold text-temple-900 truncate">
                                  {adm.name || 'Coordinator'}
                                </span>

                                <div className="inline-flex items-center gap-1">
                                  <select
                                    value={isAdmSuper ? 'Super Admin' : 'Admin'}
                                    disabled={changingRoleId === emailLower || isSelf}
                                    onChange={(e) => handleChangeAdminRole(emailLower, e.target.value)}
                                    className="text-[10px] font-semibold px-2 py-0.5 rounded-md border border-cream-300 bg-cream-50 text-temple-800 focus:outline-none cursor-pointer"
                                  >
                                    <option value="Admin">Admin</option>
                                    <option value="Super Admin">Super Admin</option>
                                  </select>
                                  {changingRoleId === emailLower && (
                                    <Loader2 className="w-3 h-3 animate-spin text-saffron-600" />
                                  )}
                                </div>

                                {isSelf && (
                                  <span className="text-[10px] bg-saffron-50 text-saffron-800 border border-saffron-200 px-1.5 py-0.5 rounded font-medium">
                                    You
                                  </span>
                                )}
                              </div>

                              <div className="text-[11px] text-temple-500 truncate pt-0.5">
                                {adm.email}
                                {adm.addedBy && (
                                  <span className="text-temple-400"> &bull; Added by {adm.addedBy}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Actions: Reset Password & Revoke Buttons */}
                          <div className="flex items-center gap-2 justify-end flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setResetPasswordTarget(adm);
                                setResetNewPassword('');
                                setResetConfirmPassword('');
                                setShowResetNewPass(false);
                                setShowResetConfirmPass(false);
                                setResetPasswordError('');
                              }}
                              className="px-2.5 py-1 rounded-xl border border-saffron-200 bg-saffron-50 hover:bg-saffron-100 text-saffron-800 text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
                              title={`Reset password for ${adm.name || adm.email}`}
                            >
                              <KeyRound className="w-3 h-3 text-saffron-600" />
                              <span>Reset Password</span>
                            </button>

                            {isSelf ? (
                              <span className="text-[11px] text-temple-400 font-medium px-2">
                                Active Session
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setAdminDeleteConfirm(adm)}
                                className="px-2.5 py-1 rounded-xl border border-red-200 bg-red-50/60 hover:bg-red-100 text-red-700 text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
                                title="Revoke admin access"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Revoke</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 4: SECURITY & PASSWORD CREDENTIALS */}
            <div className="bg-cream-50 rounded-3xl p-5 sm:p-6 border border-cream-200 shadow-soft space-y-4">
              <div className="flex items-center gap-2 border-b border-cream-200 pb-3">
                <KeyRound className="w-4 h-4 text-saffron-600" />
                <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-temple-800">
                  Security &amp; Account Credentials
                </h2>
              </div>

              {/* Change Password Form with Eye Toggles */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-cream-200 space-y-3 max-w-2xl">
                <div className="space-y-1">
                  <h3 className="text-xs font-semibold text-temple-800 uppercase tracking-wide">
                    Change Coordinator Password
                  </h3>
                  <p className="text-xs text-temple-500">
                    Update your account password for secure portal sign in.
                  </p>
                </div>

                {passwordChangeMsg.text && (
                  <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    passwordChangeMsg.type === 'success'
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                      : 'bg-red-50 border border-red-200 text-red-800'
                  }`}>
                    {passwordChangeMsg.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-red-600" />}
                    <span>{passwordChangeMsg.text}</span>
                  </div>
                )}

                <form onSubmit={handleChangePasswordSubmit} className="space-y-3">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-temple-700 uppercase">
                      Current Password <span className="text-saffron-600">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPass ? 'text' : 'password'}
                        required
                        placeholder="Enter your current password"
                        value={currentPasswordInput}
                        onChange={(e) => setCurrentPasswordInput(e.target.value)}
                        className="w-full pl-3 pr-9 py-2 rounded-xl border border-cream-300 bg-cream-50 text-temple-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-saffron-500/20 focus:border-saffron-500 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPass(!showCurrentPass)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-temple-400 hover:text-temple-700 cursor-pointer"
                      >
                        {showCurrentPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-semibold text-temple-700 uppercase">
                        New Password <span className="text-saffron-600">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPass ? 'text' : 'password'}
                          required
                          placeholder="Min 6 characters"
                          value={newPasswordInput}
                          onChange={(e) => setNewPasswordInput(e.target.value)}
                          className="w-full pl-3 pr-9 py-2 rounded-xl border border-cream-300 bg-cream-50 text-temple-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-saffron-500/20 focus:border-saffron-500 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPass(!showNewPass)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-temple-400 hover:text-temple-700 cursor-pointer"
                        >
                          {showNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-semibold text-temple-700 uppercase">
                        Confirm New Password <span className="text-saffron-600">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPass ? 'text' : 'password'}
                          required
                          placeholder="Re-enter new password"
                          value={confirmPasswordInput}
                          onChange={(e) => setConfirmPasswordInput(e.target.value)}
                          className="w-full pl-3 pr-9 py-2 rounded-xl border border-cream-300 bg-cream-50 text-temple-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-saffron-500/20 focus:border-saffron-500 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPass(!showConfirmPass)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-temple-400 hover:text-temple-700 cursor-pointer"
                        >
                          {showConfirmPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={passwordChangeLoading || !currentPasswordInput || !newPasswordInput || !confirmPasswordInput}
                      className="px-4 py-2 rounded-xl bg-saffron-500 hover:bg-saffron-600 active:bg-saffron-700 text-white font-medium text-xs shadow-soft transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {passwordChangeLoading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Verifying &amp; Updating...</span>
                        </>
                      ) : (
                        <>
                          <KeyRound className="w-3.5 h-3.5" />
                          <span>Change Password</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* SECTION 5: BACKUP & DATA MANAGEMENT */}
            <div className="bg-cream-50 rounded-3xl p-5 sm:p-6 border border-cream-200 shadow-soft space-y-4">
              <div className="flex items-center gap-2 border-b border-cream-200 pb-3">
                <Database className="w-4 h-4 text-saffron-600" />
                <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-temple-800">
                  Backup &amp; Data Management
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Excel Export Card */}
                <div className="p-4 rounded-2xl bg-white border border-cream-200 shadow-2xs space-y-3 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-emerald-700">
                      <FileSpreadsheet className="w-5 h-5" />
                      <h3 className="text-xs sm:text-sm font-semibold text-temple-900">
                        Export to Excel (.xlsx)
                      </h3>
                    </div>
                    <p className="text-xs text-temple-600 leading-relaxed">
                      Download formatted spreadsheet of all {registrations.length} participant registrations with serial numbers, contact info, qualifications, and dates.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs transition-colors shadow-soft flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Download Excel Spreadsheet</span>
                  </button>
                </div>

                {/* Complete JSON Database Snapshot Card */}
                <div className="p-4 rounded-2xl bg-white border border-cream-200 shadow-2xs space-y-3 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-saffron-700">
                      <Database className="w-5 h-5" />
                      <h3 className="text-xs sm:text-sm font-semibold text-temple-900">
                        Full Database Backup (.json)
                      </h3>
                    </div>
                    <p className="text-xs text-temple-600 leading-relaxed">
                      Generate and download a complete JSON snapshot containing all participant registrations, program settings, and administrative access records.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleBackupDatabase}
                    disabled={isBackingUp}
                    className="w-full py-2.5 px-4 rounded-xl bg-saffron-600 hover:bg-saffron-700 active:bg-saffron-800 text-white font-semibold text-xs transition-colors shadow-soft flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Database className={`w-4 h-4 ${isBackingUp ? 'animate-spin' : ''}`} />
                    <span>{isBackingUp ? 'Generating Backup Snapshot...' : 'Download JSON Snapshot'}</span>
                  </button>
                </div>

              </div>

              {/* Latest Backup Log Metadata */}
              {lastBackupInfo && (
                <div className="p-3 rounded-2xl bg-white/80 border border-cream-200 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>Latest Export: <strong>{lastBackupInfo.type}</strong> ({lastBackupInfo.count} records)</span>
                  </div>
                  <span className="text-[11px] text-temple-500 font-mono">
                    {lastBackupInfo.timestamp}
                  </span>
                </div>
              )}
            </div>

          </div>
        )}

      </main>

      {/* Participant Detail Modal */}
      {detailParticipant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-temple-900/60 backdrop-blur-sm animate-fadeIn">
          <div 
            className="w-full max-w-lg bg-cream-50 rounded-3xl p-5 sm:p-7 border border-cream-300 shadow-soft-lg text-left space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-cream-200">
              <div className="space-y-0.5">
                <span className="text-[11px] uppercase font-bold text-saffron-700 tracking-wider">
                  Registration Pass
                </span>
                <h3 className="text-lg font-bold text-temple-900">
                  {detailParticipant.fullName || detailParticipant.name || 'Participant'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailParticipant(null)}
                className="p-1.5 rounded-full text-temple-400 hover:text-temple-800 hover:bg-cream-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-white border border-cream-200">
                <span className="text-temple-500 block text-[10px] uppercase">Registration ID</span>
                <span className="font-bold text-saffron-800 font-mono">{detailParticipant.registrationId || detailParticipant.id || '—'}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-cream-200">
                <span className="text-temple-500 block text-[10px] uppercase">Mobile Number</span>
                <span className="font-semibold">{detailParticipant.countryCode || '+91'} {detailParticipant.mobile || '—'}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-cream-200">
                <span className="text-temple-500 block text-[10px] uppercase">Email</span>
                <span className="font-semibold truncate block" title={detailParticipant.email}>{detailParticipant.email || '—'}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-cream-200">
                <span className="text-temple-500 block text-[10px] uppercase">Age / Gender</span>
                <span className="font-semibold">{detailParticipant.age || '—'} yrs &bull; {detailParticipant.gender || '—'}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-cream-200">
                <span className="text-temple-500 block text-[10px] uppercase">Educational Qualification</span>
                <span className="font-semibold">{detailParticipant.education || '—'}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-cream-200">
                <span className="text-temple-500 block text-[10px] uppercase">Occupation</span>
                <span className="font-semibold">{detailParticipant.occupation || '—'}</span>
              </div>
              <div className="col-span-2 p-2.5 rounded-xl bg-white border border-cream-200">
                <span className="text-temple-500 block text-[10px] uppercase">Current Residence</span>
                <span className="font-semibold">{detailParticipant.currentResidence || detailParticipant.city || '—'}</span>
              </div>
              <div className="col-span-2 p-2.5 rounded-xl bg-white border border-cream-200">
                <span className="text-temple-500 block text-[10px] uppercase">Address</span>
                <span className="font-semibold">{detailParticipant.fullAddress || detailParticipant.address || '—'} (Pincode: {detailParticipant.pincode || '—'})</span>
              </div>
              <div className="col-span-2 p-2.5 rounded-xl bg-white border border-cream-200">
                <span className="text-temple-500 block text-[10px] uppercase">Registration Date</span>
                <span className="font-semibold">{detailParticipant.createdAtFormatted || detailParticipant.date || 'Recent'}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setDetailParticipant(null)}
                className="px-4 py-2 rounded-xl bg-cream-200 hover:bg-cream-300 text-temple-800 text-xs font-semibold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-temple-900/60 backdrop-blur-sm animate-fadeIn">
          <div 
            className="w-full max-w-sm bg-cream-50 rounded-3xl p-6 border border-cream-300 shadow-soft-lg text-center space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="font-bold text-base text-temple-900">
                Delete Registration Record?
              </h3>
              <p className="text-xs text-temple-600">
                Are you sure you want to permanently delete participant <strong className="text-temple-900">{deleteConfirmId}</strong>? This action cannot be undone.
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                disabled={isDeletingParticipant}
                className="w-1/2 py-2.5 px-3 rounded-xl border border-cream-300 bg-white hover:bg-cream-100 text-xs font-semibold text-temple-700 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingParticipant}
                onClick={handleConfirmDelete}
                className="w-1/2 py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-semibold shadow-soft cursor-pointer transition-colors flex items-center justify-center gap-1.5"
              >
                {isDeletingParticipant ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete Record</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Close Confirmation Modal */}
      {statusConfirmTarget !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-temple-900/60 backdrop-blur-sm animate-fadeIn">
          <div 
            className="w-full max-w-sm bg-cream-50 rounded-3xl p-6 border border-cream-300 shadow-soft-lg text-center space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="font-bold text-base text-temple-900">
                Close Registration Form?
              </h3>
              <p className="text-xs text-temple-600">
                New seekers will not be able to register while the form is closed. You can re-open registrations at any time.
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setStatusConfirmTarget(null)}
                className="w-1/2 py-2.5 px-3 rounded-xl border border-cream-300 bg-white hover:bg-cream-100 text-xs font-semibold text-temple-700 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const target = statusConfirmTarget;
                  setStatusConfirmTarget(null);
                  await handleToggleRegistrationStatus(target);
                }}
                className="w-1/2 py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-semibold shadow-soft cursor-pointer transition-colors"
              >
                Confirm Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Coordinator Password Modal (Super Admin Only) */}
      {resetPasswordTarget && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-temple-900/60 backdrop-blur-sm animate-fadeIn">
          <div 
            className="w-full max-w-md bg-cream-50 rounded-3xl p-6 border border-cream-300 shadow-soft-lg text-left space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-cream-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-saffron-100 text-saffron-700 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-temple-900">
                    Reset Coordinator Password
                  </h3>
                  <p className="text-[11px] text-temple-500">
                    Set a new password for this coordinator account.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setResetPasswordTarget(null)}
                className="p-1 rounded-lg text-temple-400 hover:text-temple-700 hover:bg-cream-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target Account Summary */}
            <div className="p-3 rounded-xl bg-white border border-cream-200 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-temple-500">Coordinator:</span>
                <span className="font-semibold text-temple-900">{resetPasswordTarget.name || 'Coordinator'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-temple-500">Email:</span>
                <span className="font-mono text-temple-800 text-[11px]">{resetPasswordTarget.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-temple-500">Role:</span>
                <span className="font-medium text-purple-700">{resetPasswordTarget.role || 'Admin'}</span>
              </div>
            </div>

            {/* Error Message */}
            {resetPasswordError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <span>{resetPasswordError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleResetAdminPasswordSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-temple-700 uppercase">
                  New Password <span className="text-saffron-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showResetNewPass ? 'text' : 'password'}
                    required
                    placeholder="Min 6 characters"
                    value={resetNewPassword}
                    onChange={(e) => {
                      setResetNewPassword(e.target.value);
                      if (resetPasswordError) setResetPasswordError('');
                    }}
                    className="w-full pl-3 pr-9 py-2 rounded-xl border border-cream-300 bg-white text-temple-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-saffron-500/20 focus:border-saffron-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetNewPass(!showResetNewPass)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-temple-400 hover:text-temple-700 cursor-pointer"
                  >
                    {showResetNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-temple-700 uppercase">
                  Confirm New Password <span className="text-saffron-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showResetConfirmPass ? 'text' : 'password'}
                    required
                    placeholder="Re-enter new password"
                    value={resetConfirmPassword}
                    onChange={(e) => {
                      setResetConfirmPassword(e.target.value);
                      if (resetPasswordError) setResetPasswordError('');
                    }}
                    className="w-full pl-3 pr-9 py-2 rounded-xl border border-cream-300 bg-white text-temple-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-saffron-500/20 focus:border-saffron-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetConfirmPass(!showResetConfirmPass)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-temple-400 hover:text-temple-700 cursor-pointer"
                  >
                    {showResetConfirmPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setResetPasswordTarget(null)}
                  disabled={isResettingPassword}
                  className="w-1/2 py-2.5 px-3 rounded-xl border border-cream-300 bg-white hover:bg-cream-100 text-xs font-semibold text-temple-700 cursor-pointer transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isResettingPassword || !resetNewPassword || !resetConfirmPassword}
                  className="w-1/2 py-2.5 px-3 rounded-xl bg-saffron-500 hover:bg-saffron-600 active:bg-saffron-700 text-white text-xs font-semibold shadow-soft cursor-pointer transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isResettingPassword ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Resetting...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Update Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Revoke Admin Confirmation Dialog */}
      {adminDeleteConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-temple-900/60 backdrop-blur-sm animate-fadeIn">
          <div 
            className="w-full max-w-sm bg-cream-50 rounded-3xl p-6 border border-cream-300 shadow-soft-lg text-center space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="font-bold text-base text-temple-900">
                Revoke Administrator Access?
              </h3>
              <p className="text-xs text-temple-600 leading-relaxed">
                Are you sure you want to revoke coordinator access for <strong className="text-temple-900">{adminDeleteConfirm.email}</strong>? They will immediately lose access to the admin dashboard.
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setAdminDeleteConfirm(null)}
                disabled={isDeletingAdmin}
                className="w-1/2 py-2.5 px-3 rounded-xl border border-cream-300 bg-white hover:bg-cream-100 text-xs font-semibold text-temple-700 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingAdmin}
                onClick={() => handleRemoveAdmin(adminDeleteConfirm.email || adminDeleteConfirm.id)}
                className="w-1/2 py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-semibold shadow-soft cursor-pointer transition-colors flex items-center justify-center gap-1.5"
              >
                {isDeletingAdmin ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Revoking...</span>
                  </>
                ) : (
                  <span>Revoke Access</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {logoutConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-temple-900/60 backdrop-blur-sm animate-fadeIn">
          <div 
            className="w-full max-w-sm bg-cream-50 rounded-3xl p-6 border border-cream-300 shadow-soft-lg text-center space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="font-bold text-base text-temple-900">
                Confirm Logout
              </h3>
              <p className="text-xs text-temple-600">
                Are you sure you want to end your current coordinator session?
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setLogoutConfirmOpen(false)}
                className="w-1/2 py-2.5 px-3 rounded-xl border border-cream-300 bg-white hover:bg-cream-100 text-xs font-semibold text-temple-700 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setLogoutConfirmOpen(false);
                  onLogout();
                }}
                className="w-1/2 py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-semibold shadow-soft cursor-pointer transition-colors"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
