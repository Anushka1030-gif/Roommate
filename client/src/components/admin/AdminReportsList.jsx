import Card from '../ui/Card.jsx';
import Badge from '../ui/Badge.jsx';
import Button from '../ui/Button.jsx';
import Spinner from '../ui/Spinner.jsx';

const FILTER_TABS = [
  { id: 'open', label: 'Open Reports' },
  { id: 'pending', label: 'Pending' },
  { id: 'reviewed', label: 'Reviewed' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'dismissed', label: 'Dismissed' },
  { id: 'all', label: 'All Reports' },
];

const REASON_LABELS = {
  harassment: 'Harassment & Abuse',
  fake_profile: 'Fake Profile / Misrepresentation',
  inappropriate_content: 'Inappropriate Content',
  spam: 'Spam / Commercial',
  offensive_bio: 'Offensive Profile Bio',
  safety_concern: 'Safety Threat',
  other: 'Other Concern',
};

export default function AdminReportsList({
  reports = [],
  statusFilter = 'open',
  onFilterChange,
  onAction,
  loading = false,
}) {
  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning" size="sm" dot>Pending Review</Badge>;
      case 'reviewed':
        return <Badge variant="info" size="sm" dot>Reviewed / Warned</Badge>;
      case 'resolved':
        return <Badge variant="danger" size="sm" dot>Resolved / Suspended</Badge>;
      case 'dismissed':
        return <Badge variant="neutral" size="sm">Dismissed</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  return (
    <Card className="overflow-hidden">
      {/* Table Header & Status Filter Tabs */}
      <div className="p-4 sm:p-6 border-b border-surface-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-text-primary tracking-tight">
            Incident Reports & Moderation
          </h3>
          <p className="text-xs text-text-secondary mt-0.5">
            Review complaints submitted by verified students regarding misconduct, safety, or spam.
          </p>
        </div>

        {/* Filter Pills */}
        <div
          role="tablist"
          aria-label="Filter reports by status"
          className="flex items-center gap-1 overflow-x-auto p-1 bg-beige/70 rounded-xl shrink-0 border border-surface-border"
        >
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={statusFilter === tab.id}
              onClick={() => onFilterChange(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-surface text-text-primary shadow-xs ring-1 ring-surface-border'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reports List / Table Content */}
      <div className="p-4 sm:p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-text-secondary space-y-3">
            <Spinner size="lg" className="text-peach-deep" />
            <p className="text-xs font-medium">Loading reports...</p>
          </div>
        ) : reports.length === 0 ? (
          <div
            data-testid="reports-empty-state"
            className="flex flex-col items-center justify-center py-12 text-center space-y-3"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#5E9C76]/15 text-[#5E9C76] flex items-center justify-center border border-[#5E9C76]/30">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h4 className="text-base font-semibold text-text-primary">
                {statusFilter === 'open' ? 'No open reports' : 'No reports found'}
              </h4>
              <p className="text-xs text-text-secondary max-w-sm mt-1">
                {statusFilter === 'open'
                  ? 'All student incident reports have been reviewed or resolved. Community looks healthy!'
                  : `There are currently no reports with status "${statusFilter}".`}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => {
              const isTargetSuspended = report.reported_user?.status === 'suspended';

              return (
                <div
                  key={report.id}
                  data-testid={`report-item-${report.id}`}
                  className="rounded-xl border border-surface-border hover:border-peach/50 p-4 sm:p-5 transition-all bg-surface space-y-3"
                >
                  {/* Top Bar: IDs, Status, and Timestamp */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-surface-border">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-text-secondary">
                        #{report.id}
                      </span>
                      {getStatusBadge(report.status)}
                      <Badge variant="neutral" size="sm">
                        {REASON_LABELS[report.reason] || report.reason}
                      </Badge>
                    </div>
                    <span className="text-[11px] text-text-secondary/70">
                      Reported {new Date(report.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </div>

                  {/* Users Grid: Reporter vs Reported */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-beige-50/70 p-3 rounded-lg border border-surface-border">
                    {/* Reporter */}
                    <div>
                      <span className="text-text-secondary/70 uppercase tracking-wider text-[10px] font-semibold block mb-0.5">
                        Reporter
                      </span>
                      <p className="font-semibold text-text-primary">
                        {report.reporter?.name}
                      </p>
                      <p className="font-mono text-text-secondary text-[11px] truncate">
                        {report.reporter?.email}
                      </p>
                    </div>

                    {/* Reported User */}
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-text-secondary/70 uppercase tracking-wider text-[10px] font-semibold block mb-0.5">
                          Reported User
                        </span>
                        {report.reported_user?.total_reports_count > 1 ? (
                          <Badge variant="danger" size="sm">
                            {report.reported_user.total_reports_count} reports total
                          </Badge>
                        ) : (
                          <Badge variant="neutral" size="sm">
                            1st report
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-text-primary">
                          {report.reported_user?.name}
                        </p>
                        {isTargetSuspended && (
                          <Badge variant="danger" size="sm">Suspended</Badge>
                        )}
                      </div>
                      <p className="font-mono text-text-secondary text-[11px] truncate">
                        {report.reported_user?.email}
                      </p>
                    </div>
                  </div>

                  {/* Details Provided by Reporter */}
                  {report.details ? (
                    <div className="p-3 bg-peach-soft/30 rounded-lg border border-peach/40 text-xs text-text-primary">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary block mb-1">
                        Report Details & Incident Description:
                      </span>
                      <p className="whitespace-pre-wrap leading-relaxed text-text-primary">
                        {report.details}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-text-secondary/70 italic">
                      No additional incident details submitted.
                    </p>
                  )}

                  {/* Existing Admin Note (if any) */}
                  {report.admin_note && (
                    <div className="p-2.5 bg-beige-50/70 rounded-lg border border-surface-border text-xs text-text-primary space-y-0.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary block">
                        Admin Note:
                      </span>
                      <p className="text-text-primary italic">
                        &quot;{report.admin_note}&quot;
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onAction(report, 'dismiss')}
                      disabled={report.status === 'dismissed'}
                      className="text-text-secondary hover:text-text-primary"
                    >
                      Dismiss
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onAction(report, 'warn')}
                      disabled={isTargetSuspended || report.status === 'reviewed'}
                      className="border-[#D9A441] text-[#6B4B10] hover:bg-[#D9A441]/10"
                    >
                      Warn
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => onAction(report, 'suspend')}
                      disabled={isTargetSuspended}
                    >
                      {isTargetSuspended ? 'Account Suspended' : 'Suspend'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}
