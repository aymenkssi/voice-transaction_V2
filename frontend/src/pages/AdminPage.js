import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import axios from 'axios';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import {
  Mic2, Users, FileAudio, Clock, Globe, TrendingUp,
  Trash2, ArrowLeft, Shield, Languages, CheckCircle,
  XCircle, Loader2, MoreVertical, Activity, Mail, MapPin,
  Settings, Crown, Save, Tag, Plus, Power, Calendar,
  Download, Search, Filter
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CHART_COLORS = ['#111111', '#8C8273', '#B8B0A4', '#D4CFC7', '#E5E5E0', '#6E6D68', '#2E4F3B', '#6B2B2B'];

const AdminPage = () => {
  const navigate = useNavigate();
  const { user, getAuthHeader } = useAuth();
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [dailyStats, setDailyStats] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [origins, setOrigins] = useState(null);
  const [users, setUsers] = useState([]);
  const [transcriptions, setTranscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('overview');
  const [error, setError] = useState(null);
  const [adminSettings, setAdminSettings] = useState(null);
  const [settingsForm, setSettingsForm] = useState({});
  const [savingSettings, setSavingSettings] = useState(false);
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [subscriptionsList, setSubscriptionsList] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [couponForm, setCouponForm] = useState({
    code: '', discount_percent: 10, max_uses: 100, expires_at: '', plan_type: null
  });
  const [addingCoupon, setAddingCoupon] = useState(false);
  const [transFilter, setTransFilter] = useState({ status: '', language: '', search: '' });
  const [userSearch, setUserSearch] = useState('');

  const fetchAll = useCallback(async () => {
    try {
      const headers = getAuthHeader();
      const [statsRes, dailyRes, langRes, originsRes, usersRes, transRes, settingsRes, subsRes, couponsRes] = await Promise.all([
        axios.get(`${API}/admin/stats`, { headers }),
        axios.get(`${API}/admin/stats/daily`, { headers }),
        axios.get(`${API}/admin/stats/languages`, { headers }),
        axios.get(`${API}/admin/stats/origins`, { headers }),
        axios.get(`${API}/admin/users`, { headers }),
        axios.get(`${API}/admin/transcriptions`, { headers }),
        axios.get(`${API}/admin/settings`, { headers }),
        axios.get(`${API}/admin/subscriptions`, { headers }),
        axios.get(`${API}/admin/coupons`, { headers }),
      ]);
      setStats(statsRes.data);
      setDailyStats(dailyRes.data);
      setLanguages(langRes.data);
      setOrigins(originsRes.data);
      setUsers(usersRes.data);
      setTranscriptions(transRes.data);
      setAdminSettings(settingsRes.data);
      setSettingsForm(settingsRes.data);
      setSubscriptionsList(subsRes.data);
      setCoupons(couponsRes.data);
      setError(null);
    } catch (err) {
      if (err.response?.status === 403) {
        setError('forbidden');
      } else {
        toast.error('Erreur lors du chargement des données admin');
      }
    } finally {
      setLoading(false);
    }
  }, [getAuthHeader]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Supprimer l'utilisateur "${userName}" et toutes ses transcriptions ?`)) return;
    try {
      await axios.delete(`${API}/admin/users/${userId}`, { headers: getAuthHeader() });
      toast.success('Utilisateur supprimé');
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur');
    }
  };

  const handleDeleteTranscription = async (id) => {
    if (!window.confirm('Supprimer cette transcription ?')) return;
    try {
      await axios.delete(`${API}/admin/transcriptions/${id}`, { headers: getAuthHeader() });
      toast.success('Transcription supprimée');
      fetchAll();
    } catch (err) {
      toast.error('Erreur');
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await axios.put(`${API}/admin/settings`, settingsForm, { headers: getAuthHeader() });
      setAdminSettings(res.data);
      toast.success(t('adminSettings.saved'));
    } catch (err) {
      toast.error('Error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleCreatePlan = async () => {
    setCreatingPlan(true);
    try {
      const res = await axios.post(`${API}/admin/create-paypal-plan`, {}, { headers: getAuthHeader() });
      toast.success(t('adminSettings.planCreated'));
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error');
    } finally {
      setCreatingPlan(false);
    }
  };

  const handleAddCoupon = async () => {
    if (!couponForm.code.trim()) return;
    setAddingCoupon(true);
    try {
      const payload = {
        code: couponForm.code.trim(),
        discount_percent: parseInt(couponForm.discount_percent) || 10,
        max_uses: parseInt(couponForm.max_uses) || 100,
        expires_at: couponForm.expires_at || null,
        plan_type: couponForm.plan_type || null,
      };
      await axios.post(`${API}/admin/coupons`, payload, { headers: getAuthHeader() });
      toast.success(t('adminSettings.couponAdded'));
      setCouponForm({ code: '', discount_percent: 10, max_uses: 100, expires_at: '', plan_type: null });
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error');
    } finally {
      setAddingCoupon(false);
    }
  };

  const handleToggleCoupon = async (couponId) => {
    try {
      await axios.patch(`${API}/admin/coupons/${couponId}`, {}, { headers: getAuthHeader() });
      toast.success(t('adminSettings.couponToggled'));
      fetchAll();
    } catch (err) {
      toast.error('Error');
    }
  };

  const handleDeleteCoupon = async (couponId) => {
    if (!window.confirm('Supprimer ce coupon ?')) return;
    try {
      await axios.delete(`${API}/admin/coupons/${couponId}`, { headers: getAuthHeader() });
      toast.success(t('adminSettings.couponDeleted'));
      fetchAll();
    } catch (err) {
      toast.error('Error');
    }
  };

  const exportCSV = (data, filename) => {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => {
        const val = row[h] ?? '';
        return typeof val === 'string' && (val.includes(',') || val.includes('"')) ? `"${val.replace(/"/g, '""')}"` : val;
      }).join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    toast.success('CSV exported');
  };

  const filteredTranscriptions = transcriptions.filter(t => {
    if (transFilter.status && t.status !== transFilter.status) return false;
    if (transFilter.language && t.detected_language !== transFilter.language) return false;
    if (transFilter.search) {
      const s = transFilter.search.toLowerCase();
      if (!t.filename?.toLowerCase().includes(s) && !t.user_email?.toLowerCase().includes(s) && !t.user_name?.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  const filteredUsers = users.filter(u => {
    if (!userSearch) return true;
    const s = userSearch.toLowerCase();
    return u.name?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s) || u.email_domain?.toLowerCase().includes(s);
  });

  const formatDuration = (seconds) => {
    if (!seconds) return '0s';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  };

  const LANG_NAMES = {
    en: 'Anglais', fr: 'Français', es: 'Espagnol', de: 'Allemand',
    it: 'Italien', pt: 'Portugais', ja: 'Japonais', zh: 'Chinois',
    ko: 'Coréen', ar: 'Arabe', dutch: 'Néerlandais', russian: 'Russe',
    french: 'Français', english: 'Anglais', spanish: 'Espagnol',
    german: 'Allemand', italian: 'Italien', portuguese: 'Portugais'
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stele-bg flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-stele-accent animate-spin" strokeWidth={1} />
      </div>
    );
  }

  if (error === 'forbidden') {
    return (
      <div className="min-h-screen bg-stele-bg flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 text-stele-error mx-auto mb-6" strokeWidth={1} />
          <h1 className="font-playfair text-3xl text-stele-primary mb-3">{t('admin.forbidden')}</h1>
          <p className="font-inter text-sm text-stele-muted mb-8">{t('admin.forbiddenMsg')}</p>
          <button onClick={() => navigate('/dashboard')} className="btn-stele-outline text-xs" data-testid="back-to-dashboard">
            {t('admin.backToDashboard')}
          </button>
        </div>
      </div>
    );
  }

  const sections = [
    { id: 'overview', label: t('admin.tabs.overview'), icon: Activity },
    { id: 'origins', label: t('admin.tabs.origins'), icon: MapPin },
    { id: 'users', label: t('admin.tabs.users'), icon: Users },
    { id: 'transcriptions', label: t('admin.tabs.transcriptions'), icon: FileAudio },
    { id: 'settings', label: t('adminSettings.title'), icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-stele-bg">
      {/* Header */}
      <header className="bg-stele-bg/90 backdrop-blur-xl border-b border-stele-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              data-testid="admin-back-btn"
              className="w-8 h-8 border border-stele-secondary flex items-center justify-center hover:border-stele-primary transition-colors duration-300"
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-stele-primary flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="font-manrope font-bold text-lg text-stele-primary tracking-tight">Administration</h1>
                <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-stele-accent">TranscriptFlow</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <span className="font-inter text-sm text-stele-muted">{user?.name}</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 md:px-12 py-12">
        {/* Section Nav */}
        <div className="flex items-center gap-0 mb-12 border-b border-stele-border overflow-x-auto" data-testid="admin-nav">
          {sections.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              data-testid={`admin-tab-${s.id}`}
              className={`flex items-center gap-2 px-5 py-4 font-inter text-xs tracking-wider whitespace-nowrap transition-colors duration-300 border-b-2 -mb-px ${
                activeSection === s.id
                  ? 'border-stele-primary text-stele-primary'
                  : 'border-transparent text-stele-muted hover:text-stele-primary'
              }`}
            >
              <s.icon className="w-3.5 h-3.5" strokeWidth={1.5} />
              {s.label.toUpperCase()}
            </button>
          ))}
        </div>

        {/* ===== OVERVIEW ===== */}
        {activeSection === 'overview' && stats && (
          <div className="space-y-12">
            {/* Export Button */}
            <div className="flex justify-end">
              <button onClick={() => exportCSV([{
                users: stats.total_users, transcriptions: stats.total_transcriptions,
                completed: stats.completed, failed: stats.failed, processing: stats.processing,
                total_duration_s: stats.total_duration_seconds, total_words: stats.total_words,
                translations: stats.translations_count, success_rate: stats.success_rate
              }], 'stats_overview')} className="btn-stele-outline text-[10px] px-3 py-2 flex items-center gap-1.5" data-testid="export-stats-csv">
                <Download className="w-3 h-3" strokeWidth={1.5} />Export CSV
              </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-stele-border" data-testid="admin-stats-grid">
              {[
                { label: 'Utilisateurs', value: stats.total_users, icon: Users },
                { label: 'Transcriptions', value: stats.total_transcriptions, icon: FileAudio },
                { label: 'Durée totale', value: formatDuration(stats.total_duration_seconds), icon: Clock },
                { label: 'Mots transcrits', value: stats.total_words.toLocaleString('fr-FR'), icon: TrendingUp },
                { label: 'Terminées', value: stats.completed, icon: CheckCircle },
                { label: 'Échouées', value: stats.failed, icon: XCircle },
                { label: 'Traductions', value: stats.translations_count, icon: Languages },
                { label: 'Taux réussite', value: `${stats.success_rate}%`, icon: Activity },
              ].map((item, i) => (
                <div key={i} className="bg-white p-8" data-testid={`stat-${item.label.toLowerCase().replace(/\s/g, '-')}`}>
                  <item.icon className="w-4 h-4 text-stele-accent mb-4" strokeWidth={1.5} />
                  <p className="font-mono text-2xl md:text-3xl text-stele-primary tracking-tight">{item.value}</p>
                  <p className="font-inter text-xs text-stele-muted mt-2 tracking-wide">{item.label}</p>
                </div>
              ))}
            </div>

            {/* Charts Row */}
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Daily Transcriptions */}
              <div className="border border-stele-secondary bg-white">
                <div className="px-8 py-5 border-b border-stele-border">
                  <span className="font-mono text-xs tracking-[0.15em] uppercase text-stele-accent">
                    Transcriptions par jour
                  </span>
                </div>
                <div className="p-8">
                  {dailyStats.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={dailyStats}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E0" />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6E6D68' }} tickFormatter={v => v.slice(5)} />
                        <YAxis tick={{ fontSize: 10, fill: '#6E6D68' }} />
                        <Tooltip
                          contentStyle={{ border: '1px solid #E5E5E0', borderRadius: 0, fontSize: 12 }}
                          labelFormatter={v => `Date: ${v}`}
                        />
                        <Bar dataKey="completed" fill="#111111" name="Terminées" />
                        <Bar dataKey="failed" fill="#B8B0A4" name="Échouées" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="font-inter text-sm text-stele-muted text-center py-12">Aucune donnée</p>
                  )}
                </div>
              </div>

              {/* Languages */}
              <div className="border border-stele-secondary bg-white">
                <div className="px-8 py-5 border-b border-stele-border">
                  <span className="font-mono text-xs tracking-[0.15em] uppercase text-stele-accent">
                    Langues détectées
                  </span>
                </div>
                <div className="p-8">
                  {languages.length > 0 ? (
                    <div className="flex items-center gap-8">
                      <ResponsiveContainer width="50%" height={200}>
                        <PieChart>
                          <Pie
                            data={languages}
                            dataKey="count"
                            nameKey="language"
                            cx="50%" cy="50%"
                            outerRadius={80}
                            strokeWidth={1}
                            stroke="#F8F8F6"
                          >
                            {languages.map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ border: '1px solid #E5E5E0', borderRadius: 0, fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex-1 space-y-3">
                        {languages.map((lang, i) => (
                          <div key={lang.language} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}></div>
                              <span className="font-inter text-sm text-stele-primary">
                                {LANG_NAMES[lang.language] || lang.language}
                              </span>
                            </div>
                            <span className="font-mono text-sm text-stele-accent">{lang.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="font-inter text-sm text-stele-muted text-center py-12">Aucune donnée</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== ORIGINS ===== */}
        {activeSection === 'origins' && origins && (
          <div className="space-y-12">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Email Domains */}
              <div className="border border-stele-secondary bg-white">
                <div className="px-8 py-5 border-b border-stele-border flex items-center gap-2">
                  <Mail className="w-4 h-4 text-stele-accent" strokeWidth={1.5} />
                  <span className="font-mono text-xs tracking-[0.15em] uppercase text-stele-accent">
                    Domaines Email
                  </span>
                </div>
                <div className="p-8">
                  {origins.email_domains.length > 0 ? (
                    <div className="space-y-4">
                      {origins.email_domains.map((d, i) => {
                        const maxCount = origins.email_domains[0]?.count || 1;
                        const pct = Math.round((d.count / maxCount) * 100);
                        return (
                          <div key={d.domain} data-testid={`domain-${d.domain}`}>
                            <div className="flex justify-between mb-1.5">
                              <span className="font-mono text-sm text-stele-primary">{d.domain}</span>
                              <span className="font-mono text-xs text-stele-accent">{d.count}</span>
                            </div>
                            <div className="w-full h-1 bg-stele-secondary">
                              <div className="h-full bg-stele-primary transition-all duration-500" style={{ width: `${pct}%` }}></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="font-inter text-sm text-stele-muted text-center py-8">Aucune donnée</p>
                  )}
                </div>
              </div>

              {/* TLD Distribution */}
              <div className="border border-stele-secondary bg-white">
                <div className="px-8 py-5 border-b border-stele-border flex items-center gap-2">
                  <Globe className="w-4 h-4 text-stele-accent" strokeWidth={1.5} />
                  <span className="font-mono text-xs tracking-[0.15em] uppercase text-stele-accent">
                    Extensions (TLD)
                  </span>
                </div>
                <div className="p-8">
                  {origins.tld_distribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={origins.tld_distribution}
                          dataKey="count"
                          nameKey="tld"
                          cx="50%" cy="50%"
                          outerRadius={90}
                          innerRadius={50}
                          strokeWidth={1}
                          stroke="#F8F8F6"
                          label={({ tld, count }) => `.${tld} (${count})`}
                        >
                          {origins.tld_distribution.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ border: '1px solid #E5E5E0', borderRadius: 0, fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="font-inter text-sm text-stele-muted text-center py-8">Aucune donnée</p>
                  )}
                </div>
              </div>

              {/* Registrations Timeline */}
              <div className="border border-stele-secondary bg-white">
                <div className="px-8 py-5 border-b border-stele-border flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-stele-accent" strokeWidth={1.5} />
                  <span className="font-mono text-xs tracking-[0.15em] uppercase text-stele-accent">
                    Inscriptions
                  </span>
                </div>
                <div className="p-8">
                  {origins.registrations_by_day.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={origins.registrations_by_day}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E0" />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6E6D68' }} tickFormatter={v => v.slice(5)} />
                        <YAxis tick={{ fontSize: 10, fill: '#6E6D68' }} allowDecimals={false} />
                        <Tooltip contentStyle={{ border: '1px solid #E5E5E0', borderRadius: 0, fontSize: 12 }} />
                        <Line type="monotone" dataKey="count" stroke="#111111" strokeWidth={2} dot={{ fill: '#111111', r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="font-inter text-sm text-stele-muted text-center py-8">Aucune donnée</p>
                  )}
                </div>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-stele-border">
              <div className="bg-white p-8" data-testid="origin-total-domains">
                <p className="font-mono text-3xl text-stele-primary">{origins.email_domains.length}</p>
                <p className="font-inter text-xs text-stele-muted mt-2">Domaines uniques</p>
              </div>
              <div className="bg-white p-8" data-testid="origin-total-tlds">
                <p className="font-mono text-3xl text-stele-primary">{origins.tld_distribution.length}</p>
                <p className="font-inter text-xs text-stele-muted mt-2">Extensions uniques</p>
              </div>
              <div className="bg-white p-8" data-testid="origin-top-domain">
                <p className="font-mono text-xl text-stele-primary truncate">{origins.email_domains[0]?.domain || '-'}</p>
                <p className="font-inter text-xs text-stele-muted mt-2">Domaine principal</p>
              </div>
              <div className="bg-white p-8" data-testid="origin-top-tld">
                <p className="font-mono text-xl text-stele-primary">.{origins.tld_distribution[0]?.tld || '-'}</p>
                <p className="font-inter text-xs text-stele-muted mt-2">Extension principale</p>
              </div>
            </div>
          </div>
        )}

        {/* ===== USERS ===== */}
        {activeSection === 'users' && (
          <div>
            <div className="flex items-end justify-between mb-6">
              <div>
                <p className="overline mb-2">Gestion</p>
                <h2 className="font-playfair text-2xl text-stele-primary">Utilisateurs</h2>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => exportCSV(users, 'users')} className="btn-stele-outline text-[10px] px-3 py-2 flex items-center gap-1.5" data-testid="export-users-csv">
                  <Download className="w-3 h-3" strokeWidth={1.5} />CSV
                </button>
                <p className="font-mono text-xs tracking-widest text-stele-accent">{filteredUsers.length} COMPTES</p>
              </div>
            </div>

            {/* Search */}
            <div className="mb-4">
              <div className="relative max-w-sm">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stele-accent" strokeWidth={1.5} />
                <input
                  type="text" value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Rechercher..."
                  className="input-stele w-full pl-9 text-sm"
                  data-testid="user-search-input"
                />
              </div>
            </div>

            <div className="w-full h-px bg-stele-secondary mb-6"></div>

            {/* Table */}
            <div className="border border-stele-secondary bg-white overflow-x-auto">
              <table className="w-full" data-testid="admin-users-table">
                <thead>
                  <tr className="border-b border-stele-border">
                    {['Nom', 'Email', 'Domaine', 'Transcriptions', 'Inscrit le', ''].map(h => (
                      <th key={h} className="px-6 py-4 text-left font-mono text-[10px] tracking-[0.2em] uppercase text-stele-accent font-normal">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stele-border">
                  {filteredUsers.map(u => (
                    <tr key={u.id} className="hover:bg-stele-bg/50 transition-colors" data-testid={`user-row-${u.id}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-inter text-sm font-medium text-stele-primary">{u.name}</span>
                          {u.is_admin && (
                            <span className="font-mono text-[9px] tracking-wider bg-stele-primary text-white px-2 py-0.5">ADMIN</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-inter text-sm text-stele-muted">{u.email}</td>
                      <td className="px-6 py-4 font-mono text-xs text-stele-accent">{u.email_domain}</td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm text-stele-primary">{u.completed_count}</span>
                        <span className="font-mono text-xs text-stele-muted">/{u.transcription_count}</span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-stele-muted">{formatDate(u.created_at)}</td>
                      <td className="px-6 py-4">
                        {!u.is_admin && (
                          <button
                            onClick={() => handleDeleteUser(u.id, u.name)}
                            className="text-stele-muted hover:text-stele-error transition-colors"
                            data-testid={`delete-user-${u.id}`}
                          >
                            <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===== TRANSCRIPTIONS ===== */}
        {activeSection === 'transcriptions' && (
          <div>
            <div className="flex items-end justify-between mb-6">
              <div>
                <p className="overline mb-2">Gestion</p>
                <h2 className="font-playfair text-2xl text-stele-primary">Transcriptions</h2>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => exportCSV(transcriptions.map(t => ({
                  filename: t.filename, user: t.user_email, language: t.detected_language || '', status: t.status, date: t.created_at
                })), 'transcriptions')} className="btn-stele-outline text-[10px] px-3 py-2 flex items-center gap-1.5" data-testid="export-trans-csv">
                  <Download className="w-3 h-3" strokeWidth={1.5} />CSV
                </button>
                <p className="font-mono text-xs tracking-widest text-stele-accent">{filteredTranscriptions.length} FICHIERS</p>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="relative flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stele-accent" strokeWidth={1.5} />
                <input
                  type="text" value={transFilter.search}
                  onChange={(e) => setTransFilter(prev => ({ ...prev, search: e.target.value }))}
                  placeholder="Rechercher..."
                  className="input-stele w-full pl-9 text-sm"
                  data-testid="trans-search-input"
                />
              </div>
              <select
                value={transFilter.status}
                onChange={(e) => setTransFilter(prev => ({ ...prev, status: e.target.value }))}
                className="input-stele text-sm border-b border-stele-secondary pb-2 pr-6"
                data-testid="trans-status-filter"
              >
                <option value="">Tous statuts</option>
                <option value="completed">Terminé</option>
                <option value="processing">En cours</option>
                <option value="failed">Échoué</option>
              </select>
              <select
                value={transFilter.language}
                onChange={(e) => setTransFilter(prev => ({ ...prev, language: e.target.value }))}
                className="input-stele text-sm border-b border-stele-secondary pb-2 pr-6"
                data-testid="trans-language-filter"
              >
                <option value="">Toutes langues</option>
                {[...new Set(transcriptions.map(t => t.detected_language).filter(Boolean))].map(lang => (
                  <option key={lang} value={lang}>{LANG_NAMES[lang] || lang}</option>
                ))}
              </select>
              {(transFilter.status || transFilter.language || transFilter.search) && (
                <button onClick={() => setTransFilter({ status: '', language: '', search: '' })}
                  className="font-inter text-xs text-stele-muted hover:text-stele-primary" data-testid="clear-filters-btn">
                  Effacer filtres
                </button>
              )}
            </div>

            <div className="w-full h-px bg-stele-secondary mb-6"></div>

            <div className="border border-stele-secondary bg-white overflow-x-auto">
              <table className="w-full" data-testid="admin-transcriptions-table">
                <thead>
                  <tr className="border-b border-stele-border">
                    {['Fichier', 'Utilisateur', 'Langue', 'Statut', 'Date', ''].map(h => (
                      <th key={h} className="px-6 py-4 text-left font-mono text-[10px] tracking-[0.2em] uppercase text-stele-accent font-normal">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stele-border">
                  {filteredTranscriptions.map(t => (
                    <tr key={t.id} className="hover:bg-stele-bg/50 transition-colors" data-testid={`trans-row-${t.id}`}>
                      <td className="px-6 py-4 font-inter text-sm font-medium text-stele-primary max-w-[200px] truncate">
                        {t.filename}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-inter text-sm text-stele-primary">{t.user_name}</p>
                        <p className="font-mono text-[10px] text-stele-muted">{t.user_email}</p>
                      </td>
                      <td className="px-6 py-4 font-inter text-sm text-stele-muted">
                        {LANG_NAMES[t.detected_language] || t.detected_language || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`font-mono text-xs tracking-wider ${
                          t.status === 'completed' ? 'text-stele-success' :
                          t.status === 'failed' ? 'text-stele-error' :
                          'text-stele-accent'
                        }`}>
                          {t.status === 'completed' ? 'TERMINÉ' : t.status === 'failed' ? 'ÉCHEC' : 'EN COURS'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-stele-muted">{formatDate(t.created_at)}</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleDeleteTranscription(t.id)}
                          className="text-stele-muted hover:text-stele-error transition-colors"
                          data-testid={`delete-trans-${t.id}`}
                        >
                          <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===== SETTINGS ===== */}
        {activeSection === 'settings' && adminSettings && (
          <div className="space-y-8">
            <div>
              <p className="overline mb-2">{t('adminSettings.subscriptionSection')}</p>
              <h2 className="font-playfair text-2xl text-stele-primary">{t('adminSettings.title')}</h2>
            </div>

            <div className="border border-stele-secondary bg-white">
              <div className="px-8 py-5 border-b border-stele-border flex items-center gap-2">
                <Crown className="w-4 h-4 text-stele-accent" strokeWidth={1.5} />
                <span className="font-mono text-xs tracking-[0.15em] uppercase text-stele-accent">{t('adminSettings.subscriptionSection')}</span>
              </div>
              <div className="p-8 space-y-8">
                {/* Enable Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-inter text-sm font-medium text-stele-primary">{t('adminSettings.enableSubscription')}</p>
                    <p className="font-inter text-xs text-stele-muted mt-1">
                      {settingsForm.subscription_enabled ? t('adminSettings.enabledDesc') : t('adminSettings.disabledDesc')}
                    </p>
                  </div>
                  <button
                    onClick={() => setSettingsForm(prev => ({ ...prev, subscription_enabled: !prev.subscription_enabled }))}
                    data-testid="toggle-subscription"
                    className={`w-12 h-6 rounded-full flex items-center px-0.5 transition-colors ${settingsForm.subscription_enabled ? 'bg-stele-primary justify-end' : 'bg-stele-secondary justify-start'}`}
                  >
                    <div className="w-5 h-5 bg-white rounded-full shadow"></div>
                  </button>
                </div>

                {settingsForm.subscription_enabled && (
                  <>
                    <div className="h-px bg-stele-border"></div>

                    {/* Free Limit */}
                    <div>
                      <label className="font-inter text-xs tracking-[0.15em] uppercase text-stele-accent block mb-3">{t('adminSettings.freeLimit')}</label>
                      <input
                        type="number" min="0" step="60"
                        value={settingsForm.free_limit_seconds || 300}
                        onChange={(e) => setSettingsForm(prev => ({ ...prev, free_limit_seconds: parseInt(e.target.value) || 0 }))}
                        className="input-stele w-full max-w-xs"
                        data-testid="free-limit-input"
                      />
                      <p className="font-inter text-xs text-stele-muted mt-2">
                        {t('adminSettings.freeLimitHelp')} ({Math.floor((settingsForm.free_limit_seconds || 300) / 60)} min)
                      </p>
                    </div>

                    {/* Pricing Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="font-inter text-xs tracking-[0.15em] uppercase text-stele-accent block mb-3">{t('adminSettings.monthlyPrice')}</label>
                        <input
                          type="number" min="0" step="0.01"
                          value={settingsForm.monthly_price ?? 9.99}
                          onChange={(e) => setSettingsForm(prev => ({ ...prev, monthly_price: parseFloat(e.target.value) || 0 }))}
                          className="input-stele w-full"
                          data-testid="price-input"
                        />
                      </div>
                      <div>
                        <label className="font-inter text-xs tracking-[0.15em] uppercase text-stele-accent block mb-3">{t('adminSettings.yearlyPrice')}</label>
                        <input
                          type="number" min="0" step="0.01"
                          value={settingsForm.yearly_price ?? 99.90}
                          onChange={(e) => setSettingsForm(prev => ({ ...prev, yearly_price: parseFloat(e.target.value) || 0 }))}
                          className="input-stele w-full"
                          data-testid="yearly-price-input"
                        />
                      </div>
                      <div>
                        <label className="font-inter text-xs tracking-[0.15em] uppercase text-stele-accent block mb-3">{t('adminSettings.currency')}</label>
                        <select
                          value={settingsForm.currency || 'USD'}
                          onChange={(e) => setSettingsForm(prev => ({ ...prev, currency: e.target.value }))}
                          className="input-stele w-full border-b border-stele-secondary pb-3"
                          data-testid="currency-select"
                        >
                          <option value="USD">USD ($)</option>
                          <option value="EUR">EUR</option>
                          <option value="GBP">GBP</option>
                          <option value="MAD">MAD</option>
                        </select>
                      </div>
                    </div>

                    {/* Yearly Toggle */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-inter text-sm font-medium text-stele-primary">{t('adminSettings.yearlyEnabled')}</p>
                        <p className="font-inter text-xs text-stele-muted mt-1">{t('adminSettings.yearlyEnabledDesc')}</p>
                      </div>
                      <button
                        onClick={() => setSettingsForm(prev => ({ ...prev, yearly_enabled: !prev.yearly_enabled }))}
                        data-testid="toggle-yearly"
                        className={`w-12 h-6 rounded-full flex items-center px-0.5 transition-colors ${settingsForm.yearly_enabled ? 'bg-stele-primary justify-end' : 'bg-stele-secondary justify-start'}`}
                      >
                        <div className="w-5 h-5 bg-white rounded-full shadow"></div>
                      </button>
                    </div>

                    <div className="h-px bg-stele-border"></div>

                    {/* PayPal Plans */}
                    <div>
                      <label className="font-inter text-xs tracking-[0.15em] uppercase text-stele-accent block mb-3">PayPal Plans</label>
                      <div className="space-y-3">
                        {adminSettings.paypal_plan_id ? (
                          <div className="flex items-center gap-3">
                            <CheckCircle className="w-4 h-4 text-stele-success" strokeWidth={1.5} />
                            <span className="font-inter text-sm text-stele-success">{t('adminSettings.monthlyPlanId')}</span>
                            <span className="font-mono text-xs text-stele-muted">{adminSettings.paypal_plan_id}</span>
                          </div>
                        ) : null}
                        {adminSettings.paypal_yearly_plan_id ? (
                          <div className="flex items-center gap-3">
                            <CheckCircle className="w-4 h-4 text-stele-success" strokeWidth={1.5} />
                            <span className="font-inter text-sm text-stele-success">{t('adminSettings.yearlyPlanId')}</span>
                            <span className="font-mono text-xs text-stele-muted">{adminSettings.paypal_yearly_plan_id}</span>
                          </div>
                        ) : null}
                        {(!adminSettings.paypal_plan_id || !adminSettings.paypal_yearly_plan_id) && (
                          <button onClick={handleCreatePlan} disabled={creatingPlan} className="btn-stele text-xs flex items-center gap-2" data-testid="create-plan-btn">
                            {creatingPlan ? <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} /> : <Crown className="w-3.5 h-3.5" strokeWidth={1.5} />}
                            {t('adminSettings.createPlan')}
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}

                <div className="h-px bg-stele-border"></div>

                <button onClick={handleSaveSettings} disabled={savingSettings} className="btn-stele text-xs flex items-center gap-2" data-testid="save-settings-btn">
                  {savingSettings ? <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} /> : <Save className="w-3.5 h-3.5" strokeWidth={1.5} />}
                  {t('adminSettings.saveSettings')}
                </button>
              </div>
            </div>

            {/* Coupons Section */}
            <div className="border border-stele-secondary bg-white">
              <div className="px-8 py-5 border-b border-stele-border flex items-center gap-2">
                <Tag className="w-4 h-4 text-stele-accent" strokeWidth={1.5} />
                <span className="font-mono text-xs tracking-[0.15em] uppercase text-stele-accent">{t('adminSettings.couponsSection')}</span>
              </div>
              <div className="p-8 space-y-6">
                {/* Add Coupon Form */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-end">
                  <div>
                    <label className="font-inter text-[10px] tracking-[0.15em] uppercase text-stele-accent block mb-2">{t('adminSettings.couponCode')}</label>
                    <input
                      type="text" placeholder="PROMO20"
                      value={couponForm.code}
                      onChange={(e) => setCouponForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                      className="input-stele w-full"
                      data-testid="coupon-code-input"
                    />
                  </div>
                  <div>
                    <label className="font-inter text-[10px] tracking-[0.15em] uppercase text-stele-accent block mb-2">{t('adminSettings.couponDiscount')}</label>
                    <input
                      type="number" min="1" max="100"
                      value={couponForm.discount_percent}
                      onChange={(e) => setCouponForm(prev => ({ ...prev, discount_percent: parseInt(e.target.value) || 0 }))}
                      className="input-stele w-full"
                      data-testid="coupon-discount-input"
                    />
                  </div>
                  <div>
                    <label className="font-inter text-[10px] tracking-[0.15em] uppercase text-stele-accent block mb-2">{t('adminSettings.couponMaxUses')}</label>
                    <input
                      type="number" min="1"
                      value={couponForm.max_uses}
                      onChange={(e) => setCouponForm(prev => ({ ...prev, max_uses: parseInt(e.target.value) || 1 }))}
                      className="input-stele w-full"
                      data-testid="coupon-max-uses-input"
                    />
                  </div>
                  <div>
                    <label className="font-inter text-[10px] tracking-[0.15em] uppercase text-stele-accent block mb-2">{t('adminSettings.couponPlanType')}</label>
                    <select
                      value={couponForm.plan_type || ''}
                      onChange={(e) => setCouponForm(prev => ({ ...prev, plan_type: e.target.value || null }))}
                      className="input-stele w-full border-b border-stele-secondary pb-3"
                      data-testid="coupon-plan-type-select"
                    >
                      <option value="">{t('adminSettings.couponPlanAll')}</option>
                      <option value="monthly">{t('adminSettings.couponPlanMonthly')}</option>
                      <option value="yearly">{t('adminSettings.couponPlanYearly')}</option>
                    </select>
                  </div>
                  <div>
                    <button
                      onClick={handleAddCoupon}
                      disabled={addingCoupon || !couponForm.code.trim()}
                      className="btn-stele text-xs flex items-center gap-2 w-full justify-center"
                      data-testid="add-coupon-btn"
                    >
                      {addingCoupon ? <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} /> : <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />}
                      {t('adminSettings.addCoupon')}
                    </button>
                  </div>
                </div>

                {/* Coupons List */}
                {coupons.length > 0 ? (
                  <div className="border border-stele-border overflow-x-auto">
                    <table className="w-full" data-testid="coupons-table">
                      <thead>
                        <tr className="border-b border-stele-border bg-stele-bg/50">
                          {[t('adminSettings.couponCode'), t('adminSettings.couponDiscount'), t('adminSettings.couponMaxUses'), t('adminSettings.couponPlanType'), 'Status', ''].map(h => (
                            <th key={h} className="px-4 py-3 text-left font-mono text-[10px] tracking-[0.2em] uppercase text-stele-accent font-normal">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stele-border">
                        {coupons.map(c => (
                          <tr key={c.id} className="hover:bg-stele-bg/30 transition-colors" data-testid={`coupon-row-${c.id}`}>
                            <td className="px-4 py-3 font-mono text-sm font-medium text-stele-primary">{c.code}</td>
                            <td className="px-4 py-3 font-mono text-sm text-stele-accent">{c.discount_percent}%</td>
                            <td className="px-4 py-3 font-mono text-xs text-stele-muted">{c.used_count}/{c.max_uses} {t('adminSettings.uses')}</td>
                            <td className="px-4 py-3 font-mono text-xs text-stele-muted uppercase">{c.plan_type || t('adminSettings.couponPlanAll')}</td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => handleToggleCoupon(c.id)}
                                data-testid={`toggle-coupon-${c.id}`}
                                className={`font-mono text-[10px] tracking-wider px-2 py-0.5 ${c.active ? 'bg-stele-success/10 text-stele-success' : 'bg-stele-error/10 text-stele-error'}`}
                              >
                                {c.active ? t('adminSettings.active') : t('adminSettings.inactive')}
                              </button>
                            </td>
                            <td className="px-4 py-3">
                              <button onClick={() => handleDeleteCoupon(c.id)} className="text-stele-muted hover:text-stele-error transition-colors" data-testid={`delete-coupon-${c.id}`}>
                                <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="font-inter text-sm text-stele-muted text-center py-6">{t('adminSettings.noCoupons')}</p>
                )}
              </div>
            </div>

            {/* Subscriptions List */}
            {subscriptionsList.length > 0 && (
              <div className="border border-stele-secondary bg-white">
                <div className="px-8 py-5 border-b border-stele-border">
                  <span className="font-mono text-xs tracking-[0.15em] uppercase text-stele-accent">{t('adminSettings.subscriptions')} ({subscriptionsList.length})</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full" data-testid="subscriptions-table">
                    <thead>
                      <tr className="border-b border-stele-border">
                        {['User', 'PayPal ID', 'Status', 'Date', 'Expires'].map(h => (
                          <th key={h} className="px-6 py-4 text-left font-mono text-[10px] tracking-[0.2em] uppercase text-stele-accent font-normal">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stele-border">
                      {subscriptionsList.map((s, i) => (
                        <tr key={i} className="hover:bg-stele-bg/50">
                          <td className="px-6 py-4">
                            <p className="font-inter text-sm text-stele-primary">{s.user_name}</p>
                            <p className="font-mono text-[10px] text-stele-muted">{s.user_email}</p>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-stele-muted">{s.paypal_subscription_id}</td>
                          <td className="px-6 py-4">
                            <span className={`font-mono text-xs tracking-wider ${s.status === 'active' ? 'text-stele-success' : 'text-stele-muted'}`}>
                              {s.status?.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-stele-muted">{formatDate(s.created_at)}</td>
                          <td className="px-6 py-4 font-mono text-xs text-stele-muted">{s.expires_at ? formatDate(s.expires_at) : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminPage;
