import { useState, useEffect, useCallback } from 'react';
import api from '../services/api.js';
import { useToast } from '../hooks/useToast.js';
import { getErrorMessage } from '../utils/error.js';
import Button from '../components/ui/Button.jsx';
import Alert from '../components/ui/Alert.jsx';
import Badge from '../components/ui/Badge.jsx';
import AdminStatsGrid from '../components/admin/AdminStatsGrid.jsx';
import AdminReportsList from '../components/admin/AdminReportsList.jsx';
import AdminActionModal from '../components/admin/AdminActionModal.jsx';

export default function AdminPage() {
  const { showToast } = useToast();

  // Stats state
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState(null);

  // Reports state
  const [reports, setReports] = useState([]);
  const [statusFilter, setStatusFilter] = useState('open');
  const [loadingReports, setLoadingReports] = useState(true);
  const [reportsError, setReportsError] = useState(null);

  // Action modal state
  const [selectedReport, setSelectedReport] = useState(null);
  const [modalAction, setModalAction] = useState(null); // 'dismiss' | 'warn' | 'suspend'
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch admin platform statistics
  const fetchStats = useCallback(async () => {
    try {
      setLoadingStats(true);
      setStatsError(null);
      const res = await api.get('/admin/stats');
      setStats(res.data?.stats || null);
    } catch (err) {
      setStatsError(getErrorMessage(err, 'Failed to load platform stats.'));
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // Fetch incident reports filtered by status
  const fetchReports = useCallback(async (filter) => {
    try {
      setLoadingReports(true);
      setReportsError(null);
      const res = await api.get(`/admin/reports?status=${filter}`);
      setReports(res.data?.reports || []);
    } catch (err) {
      setReportsError(getErrorMessage(err, 'Failed to load moderation reports.'));
    } finally {
      setLoadingReports(false);
    }
  }, []);

  // Initial load of stats
  useEffect(() => {
    let isMounted = true;

    async function loadInitialStats() {
      try {
        const res = await api.get('/admin/stats');
        if (isMounted) {
          setStats(res.data?.stats || null);
          setStatsError(null);
        }
      } catch (err) {
        if (isMounted) {
          setStatsError(getErrorMessage(err, 'Failed to load platform stats.'));
        }
      } finally {
        if (isMounted) {
          setLoadingStats(false);
        }
      }
    }

    loadInitialStats();
    return () => {
      isMounted = false;
    };
  }, []);

  // Load reports whenever filter changes
  useEffect(() => {
    let isMounted = true;

    async function loadFilteredReports() {
      try {
        const res = await api.get(`/admin/reports?status=${statusFilter}`);
        if (isMounted) {
          setReports(res.data?.reports || []);
          setReportsError(null);
        }
      } catch (err) {
        if (isMounted) {
          setReportsError(getErrorMessage(err, 'Failed to load moderation reports.'));
        }
      } finally {
        if (isMounted) {
          setLoadingReports(false);
        }
      }
    }

    loadFilteredReports();
    return () => {
      isMounted = false;
    };
  }, [statusFilter]);

  // Handle opening action modal
  const handleOpenAction = (report, action) => {
    setSelectedReport(report);
    setModalAction(action);
    setIsActionModalOpen(true);
  };

  const handleCloseAction = () => {
    if (actionLoading) return;
    setIsActionModalOpen(false);
    setSelectedReport(null);
    setModalAction(null);
  };

  // Submit moderation action
  const handleSubmitAction = async ({ action, note }) => {
    if (!selectedReport) return;

    try {
      setActionLoading(true);
      await api.patch(`/admin/reports/${selectedReport.id}`, {
        action,
        note,
      });

      showToast({
        type: 'success',
        message:
          action === 'suspend'
            ? `User ${selectedReport.reported_user?.name} has been suspended.`
            : action === 'warn'
            ? `Warning sent to ${selectedReport.reported_user?.name}.`
            : 'Report dismissed.',
      });

      handleCloseAction();

      // Refresh reports list & stats
      await Promise.all([
        fetchReports(statusFilter),
        fetchStats(),
      ]);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="primary" size="sm">
              Staff Portal
            </Badge>
            <span className="text-xs text-slate-400 font-mono">
              Admin Access Only
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Campus Administration & Moderation
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitor platform metrics, protect student safety, and moderate reported incidents across campus.
          </p>
        </div>

        {/* Global Refresh Button */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              fetchStats();
              fetchReports(statusFilter);
            }}
            disabled={loadingStats || loadingReports}
            className="flex items-center gap-1.5"
          >
            <svg
              className={`w-4 h-4 text-slate-500 ${loadingStats || loadingReports ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Dashboard
          </Button>
        </div>
      </div>

      {/* Global Error Banner */}
      {(statsError || reportsError) && (
        <Alert variant="danger" title="Error loading admin data">
          {statsError || reportsError}
        </Alert>
      )}

      {/* Stats Section with Confirmed Roommate Pairs Highlighted */}
      <section aria-labelledby="platform-stats-heading" className="space-y-3">
        <h2 id="platform-stats-heading" className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Platform Activity & Key Metrics
        </h2>
        <AdminStatsGrid stats={stats} loading={loadingStats} />
      </section>

      {/* Reports Section */}
      <section aria-labelledby="reports-heading" className="space-y-3">
        <AdminReportsList
          reports={reports}
          statusFilter={statusFilter}
          onFilterChange={(newFilter) => setStatusFilter(newFilter)}
          onAction={handleOpenAction}
          loading={loadingReports}
        />
      </section>

      {/* Moderation Action Modal */}
      <AdminActionModal
        isOpen={isActionModalOpen}
        onClose={handleCloseAction}
        report={selectedReport}
        action={modalAction}
        onSubmit={handleSubmitAction}
        loading={actionLoading}
      />
    </div>
  );
}
