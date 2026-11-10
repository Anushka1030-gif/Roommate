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
      <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 tracking-tight">
            Incident Reports & Moderation
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Review complaints submitted by verified students regarding misconduct, safety, or spam.
          </p>
        </div>

        {/* Filter Pills */}
        <div
          role="tablist"
          aria-label="Filter reports by status"
          className="flex items-center gap-1 overflow-x-auto p-1 bg-slate-100/80 rounded-xl shrink-0"
        >
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={statusFilter === tab.id}
              onClick={() => onFilterChange(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
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
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-3">
            <Spinner size="lg" className="text-teal-600" />
            <p className="text-xs font-medium">Loading reports...</p>
          </div>
        ) : reports.length === 0 ? (
          <div
            data-testid="reports-empty-state"
            className="flex flex-col items-center justify-center py-12 text-center space-y-3"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h4 className="text-base font-semibold text-slate-800">
                {statusFilter === 'open' ? 'No open reports' : 'No reports found'}
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
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
                  className="rounded-xl border border-slate-200/90 hover:border-slate-300 p-4 sm:p-5 transition-all bg-white space-y-3"
                >
                  {/* Top Bar: IDs, Status, and Timestamp */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-500">
                        #{report.id}
                      </span>
                      {getStatusBadge(report.status)}
                      <Badge variant="neutral" size="sm">
                        {REASON_LABELS[report.reason] || report.reason}
                      </Badge>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Reported {new Date(report.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </div>

                  {/* Users Grid: Reporter vs Reported */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50/70 p-3 rounded-lg border border-slate-100">
                    {/* Reporter */}
                    <div>
                      <span className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold block mb-0.5">
                        Reporter
                      </span>
                      <p className="font-semibold text-slate-900">
                        {report.reporter?.name}
                      </p>
                      <p className="font-mono text-slate-500 text-[11px] truncate">
                        {report.reporter?.email}
                      </p>
                    </div>

                    {/* Reported User */}
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold block mb-0.5">
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
                        <p className="font-semibold text-slate-900">
                          {report.reported_user?.name}
                        </p>
                        {isTargetSuspended && (
                          <Badge variant="danger" size="sm">Suspended</Badge>
                        )}
                      </div>
                      <p className="font-mono text-slate-500 text-[11px] truncate">
                        {report.reported_user?.email}
                      </p>
                    </div>
                  </div>

                  {/* Details Provided by Reporter */}
                  {report.details ? (
                    <div className="p-3 bg-amber-50/40 rounded-lg border border-amber-100/70 text-xs text-slate-700">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-800 block mb-1">
                        Report Details & Incident Description:
                      </span>
                      <p className="whitespace-pre-wrap leading-relaxed text-slate-800">
                        {report.details}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      No additional incident details submitted.
                    </p>
                  )}

                  {/* Existing Admin Note (if any) */}
                  {report.admin_note && (
                    <div className="p-2.5 bg-slate-100/80 rounded-lg border border-slate-200 text-xs text-slate-700 space-y-0.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
                        Admin Note:
                      </span>
                      <p className="text-slate-800 italic">
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
                      className="text-slate-600 hover:text-slate-800"
                    >
                      Dismiss
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onAction(report, 'warn')}
                      disabled={isTargetSuspended || report.status === 'reviewed'}
                      className="border-amber-300 text-amber-800 hover:bg-amber-50"
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
