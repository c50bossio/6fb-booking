"use client";

import { useState, useEffect, useMemo } from "react";
import {
  UserIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  CurrencyDollarIcon,
  ClockIcon,
  TagIcon,
  StarIcon,
  UserGroupIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";
import { useTheme } from "@/contexts/ThemeContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { useDebounce } from "@/hooks/useDebounce";
import { ClientCardSkeleton, StatCardSkeleton } from "@/components/ui/SkeletonLoader";
import ConfirmationDialog from "@/components/ui/ConfirmationDialog";
import ProgressModal from "@/components/ui/ProgressModal";
import ClientErrorBoundary from "@/components/ui/ClientErrorBoundary";
import { clientsService, type Client, type ClientStats } from "@/lib/api/clients";
import ClientEditModalEnhanced from "@/components/modals/ClientEditModalEnhanced";
import ClientHistoryModal from "@/components/modals/ClientHistoryModal";

function ClientsPage() {
  const { theme, getThemeColors } = useTheme();
  const { showSuccess, showError, showWarning } = useNotifications();
  const colors = getThemeColors();
  const [clients, setClients] = useState<Client[]>([]);
  const [clientStats, setClientStats] = useState<ClientStats>({
    total_clients: 0,
    new_clients: 0,
    returning_clients: 0,
    vip_clients: 0,
    at_risk_clients: 0,
    average_ticket: 0,
    total_revenue: 0,
    client_retention_rate: 0,
    average_visits_per_client: 0,
    top_clients: []
  });
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomerType, setSelectedCustomerType] = useState<string>("all");
  const [selectedSort, setSelectedSort] = useState<string>("last_visit");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyModalTab, setHistoryModalTab] = useState<'appointments' | 'statistics' | 'communication'>('appointments');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // Debounced search
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    fetchClients();
    fetchClientStats();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    fetchClients(1);
  }, [debouncedSearchTerm, selectedCustomerType, selectedSort]);

  const fetchClients = async (page: number = currentPage, append: boolean = false) => {
    setLoading(true);
    try {
      const response = await clientsService.getClients({
        limit: 20,
        page,
        search: debouncedSearchTerm,
        customer_type: selectedCustomerType !== "all" ? selectedCustomerType : undefined,
        sort_by: selectedSort,
        order: "desc"
      });

      if (append) {
        setClients(prev => [...prev, ...(response.data || [])]);
      } else {
        setClients(response.data || []);
      }

      setTotalPages(response.totalPages || 1);
      setHasMore(response.hasNext || false);
      setCurrentPage(page);
    } catch (error: any) {
      console.error("Failed to fetch clients:", error);
      const errorMessage = error?.response?.data?.detail || "Failed to load clients. Please try again.";
      showError('Loading Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientStats = async () => {
    setStatsLoading(true);
    try {
      const response = await clientsService.getClientStats();
      setClientStats(response.data);
    } catch (error: any) {
      console.error("Failed to fetch client stats:", error);
      const errorMessage = error?.response?.data?.detail || "Failed to load client statistics.";
      showError('Stats Error', errorMessage);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleEditClient = (client: Client) => {
    setSelectedClient(client);
    setShowEditModal(true);
  };

  const handleViewHistory = (client: Client) => {
    setSelectedClient(client);
    setHistoryModalTab('appointments');
    setShowHistoryModal(true);
  };

  const handleSendMessage = (client: Client) => {
    setSelectedClient(client);
    setHistoryModalTab('communication');
    setShowHistoryModal(true);
  };

  const handleDeleteClient = (client: Client) => {
    setClientToDelete(client);
    setShowDeleteDialog(true);
  };

  const confirmDeleteClient = async () => {
    if (!clientToDelete) return;

    setDeleteLoading(true);
    try {
      await clientsService.deleteClient(clientToDelete.id);
      showSuccess(
        'Client Deleted',
        `${clientToDelete.first_name} ${clientToDelete.last_name} has been removed from your client list.`
      );
      fetchClients();
      fetchClientStats();
      setShowDeleteDialog(false);
      setClientToDelete(null);
    } catch (error: any) {
      console.error("Failed to delete client:", error);
      const errorMessage = error?.response?.data?.detail || "Failed to delete client. Please try again.";
      showError('Delete Failed', errorMessage);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleExportClients = async () => {
    setShowExportModal(true);
    setExportProgress(0);
    setExportStatus('loading');

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setExportProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      const blob = await clientsService.exportClients('csv', selectedCustomerType !== 'all' ? selectedCustomerType : undefined);

      clearInterval(progressInterval);
      setExportProgress(100);
      setExportStatus('success');

      // Download the file
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `clients-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showSuccess('Export Complete', 'Client data has been exported successfully.');
    } catch (error: any) {
      console.error('Export failed:', error);
      setExportStatus('error');
      const errorMessage = error?.response?.data?.detail || 'Failed to export client data.';
      showError('Export Failed', errorMessage);
    }
  };

  const loadMoreClients = async () => {
    if (!hasMore || loading) return;
    await fetchClients(currentPage + 1, true);
  };

  const getCustomerTypeBadge = (type: string) => {
    const typeMap = {
      new: { color: "#3b82f6", bg: "#3b82f620", label: "New" },
      returning: { color: "#10b981", bg: "#10b98120", label: "Returning" },
      vip: { color: "#f59e0b", bg: "#f59e0b20", label: "VIP" },
      at_risk: { color: "#ef4444", bg: "#ef444420", label: "At Risk" }
    };
    return typeMap[type as keyof typeof typeMap] || typeMap.new;
  };

  return (
    <div className="min-h-screen" style={{
      backgroundColor: colors.background
    }}>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold" style={{
                color: colors.textPrimary
              }}>
                Clients
              </h1>
              <p style={{
                color: colors.textSecondary
              }}>
                Manage your client relationships and customer data
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors flex items-center space-x-2"
            >
              <PlusIcon className="h-4 w-4" />
              <span>Add Client</span>
            </button>
          </div>

          {/* Search and Filters */}
          <div className="rounded-lg border p-4 space-y-4" style={{
            backgroundColor: colors.cardBackground,
            borderColor: colors.border
          }}>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{
                  color: colors.textSecondary
                }} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search clients by name, email, or phone..."
                  className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-colors"
                  style={{
                    backgroundColor: colors.cardBackground,
                    borderColor: colors.border,
                    color: colors.textPrimary
                  }}
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                )}
              </div>

              <button
                onClick={handleExportClients}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Export CSV</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="flex items-center space-x-2">
                <TagIcon className="h-4 w-4" style={{ color: colors.textSecondary }} />
                <select
                  value={selectedCustomerType}
                  onChange={(e) => setSelectedCustomerType(e.target.value)}
                  className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-colors"
                  style={{
                    backgroundColor: colors.cardBackground,
                    borderColor: colors.border,
                    color: colors.textPrimary
                  }}
                >
                  <option value="all">All Types</option>
                  <option value="new">New</option>
                  <option value="returning">Returning</option>
                  <option value="vip">VIP</option>
                  <option value="at_risk">At Risk</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <ClockIcon className="h-4 w-4" style={{ color: colors.textSecondary }} />
                <select
                  value={selectedSort}
                  onChange={(e) => setSelectedSort(e.target.value)}
                  className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-colors"
                  style={{
                    backgroundColor: colors.cardBackground,
                    borderColor: colors.border,
                    color: colors.textPrimary
                  }}
                >
                  <option value="last_visit">Last Visit</option>
                  <option value="total_spent">Total Spent</option>
                  <option value="total_visits">Total Visits</option>
                  <option value="created_at">Date Added</option>
                </select>
              </div>

              {(searchTerm || selectedCustomerType !== 'all') && (
                <div className="flex items-center space-x-2 text-sm" style={{ color: colors.textSecondary }}>
                  <span>Showing {clients.length} result{clients.length !== 1 ? 's' : ''}</span>
                  {searchTerm && (
                    <span>for "{searchTerm}"</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Clients Content */}
          {loading && currentPage === 1 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <ClientCardSkeleton key={index} />
              ))}
            </div>
          ) : clients.length === 0 ? (
            <div className="rounded-lg border p-8 text-center" style={{
              backgroundColor: colors.cardBackground,
              borderColor: colors.border
            }}>
              <UserIcon className="h-12 w-12 mx-auto mb-4" style={{
                color: colors.textSecondary
              }} />
              <h3 className="text-lg font-medium mb-2" style={{
                color: colors.textPrimary
              }}>
                No clients found
              </h3>
              <p className="mb-4" style={{
                color: colors.textSecondary
              }}>
                {debouncedSearchTerm ? "Try adjusting your search criteria." : "Get started by adding your first client."}
              </p>
              {!debouncedSearchTerm && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                >
                  Add Your First Client
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {clients.map((client, index) => {
                  const customerBadge = getCustomerTypeBadge(client.customer_type);
                  const clientValue = clientsService.getClientValueScore(client);
                  const lastVisit = clientsService.formatLastVisit(client);

                  return (
                    <div
                      key={client.id}
                      className="rounded-lg border p-6 hover:shadow-lg transition-all duration-200 relative group transform hover:-translate-y-1"
                      style={{
                        backgroundColor: colors.cardBackground,
                        borderColor: colors.border,
                        animationDelay: `${index * 50}ms`
                      }}
                    >
                      {/* Client Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-12 h-12 rounded-lg flex items-center justify-center relative"
                            style={{
                              backgroundColor: `${clientValue.color}20`,
                            }}
                          >
                            <UserIcon
                              className="h-6 w-6"
                              style={{
                                color: clientValue.color,
                              }}
                            />
                            {/* Value Score Indicator */}
                            <div
                              className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                              style={{ backgroundColor: clientValue.color }}
                              title={`Client Value: ${clientValue.level}`}
                            >
                              {clientValue.score}
                            </div>
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold" style={{
                              color: colors.textPrimary
                            }}>
                              {client.first_name} {client.last_name}
                            </h3>
                            <div className="flex items-center space-x-2 mt-1">
                              <span
                                className="text-xs font-medium px-2 py-1 rounded-full"
                                style={{
                                  backgroundColor: customerBadge.bg,
                                  color: customerBadge.color,
                                }}
                              >
                                {customerBadge.label}
                              </span>
                              {client.customer_type === 'vip' && (
                                <StarIcon className="h-4 w-4 text-yellow-500" title="VIP Client" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Client Details */}
                      <div className="space-y-3 mb-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm" style={{ color: colors.textSecondary }}>
                            Total Spent
                          </span>
                          <span className="font-semibold" style={{ color: colors.textPrimary }}>
                            ${client.total_spent}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm" style={{ color: colors.textSecondary }}>
                            Visits
                          </span>
                          <span className="font-semibold" style={{ color: colors.textPrimary }}>
                            {client.total_visits}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm" style={{ color: colors.textSecondary }}>
                            Last Visit
                          </span>
                          <span className="text-sm" style={{ color: colors.textSecondary }}>
                            {lastVisit}
                          </span>
                        </div>

                        {client.favorite_service && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm" style={{ color: colors.textSecondary }}>
                              Favorite Service
                            </span>
                            <span className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                              {client.favorite_service}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: colors.border }}>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditClient(client)}
                            className="p-2 rounded-lg transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            title="Edit Client"
                          >
                            <PencilIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </button>

                          <button
                            onClick={() => handleViewHistory(client)}
                            className="p-2 rounded-lg transition-colors hover:bg-green-50 dark:hover:bg-green-900/20"
                            title="View History"
                          >
                            <CalendarDaysIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                          </button>

                          <button
                            onClick={() => handleSendMessage(client)}
                            className="p-2 rounded-lg transition-colors hover:bg-purple-50 dark:hover:bg-purple-900/20"
                            title="Send Message"
                          >
                            <ChatBubbleLeftRightIcon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                          </button>
                        </div>

                        <button
                          onClick={() => handleDeleteClient(client)}
                          className="p-2 rounded-lg transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="Delete Client"
                        >
                          <TrashIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Load More Button */}
              {hasMore && (
                <div className="flex justify-center">
                  <button
                    onClick={loadMoreClients}
                    disabled={loading}
                    className="px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Loading...</span>
                      </>
                    ) : (
                      <span>Load More Clients</span>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Statistics Cards */}
          {(clients.length > 0 || statsLoading) && (
            <div className="mt-8">
              <h2 className="text-xl font-bold mb-4" style={{
                color: colors.textPrimary
              }}>
                Client Analytics
              </h2>

              {statsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <StatCardSkeleton key={index} />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="rounded-lg border p-6 hover:shadow-md transition-shadow" style={{
                    backgroundColor: colors.cardBackground,
                    borderColor: colors.border
                  }}>
                    <div className="flex items-center space-x-3">
                      <UserGroupIcon className="h-8 w-8 text-blue-600" />
                      <div>
                        <p className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
                          {clientStats.total_clients.toLocaleString()}
                        </p>
                        <p className="text-sm" style={{ color: colors.textSecondary }}>
                          Total Clients
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border p-6 hover:shadow-md transition-shadow" style={{
                    backgroundColor: colors.cardBackground,
                    borderColor: colors.border
                  }}>
                    <div className="flex items-center space-x-3">
                      <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
                      <div>
                        <p className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
                          ${clientStats.total_revenue.toLocaleString()}
                        </p>
                        <p className="text-sm" style={{ color: colors.textSecondary }}>
                          Total Revenue
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border p-6 hover:shadow-md transition-shadow" style={{
                    backgroundColor: colors.cardBackground,
                    borderColor: colors.border
                  }}>
                    <div className="flex items-center space-x-3">
                      <StarIcon className="h-8 w-8 text-yellow-600" />
                      <div>
                        <p className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
                          ${clientStats.average_ticket}
                        </p>
                        <p className="text-sm" style={{ color: colors.textSecondary }}>
                          Avg Ticket
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border p-6 hover:shadow-md transition-shadow" style={{
                    backgroundColor: colors.cardBackground,
                    borderColor: colors.border
                  }}>
                    <div className="flex items-center space-x-3">
                      <ClockIcon className="h-8 w-8 text-purple-600" />
                      <div>
                        <p className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
                          {clientStats.client_retention_rate}%
                        </p>
                        <p className="text-sm" style={{ color: colors.textSecondary }}>
                          Retention Rate
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <ClientEditModalEnhanced
        isOpen={showAddModal || showEditModal}
        onClose={() => {
          setShowAddModal(false);
          setShowEditModal(false);
          setSelectedClient(null);
        }}
        client={selectedClient}
        onSuccess={() => {
          fetchClients();
          fetchClientStats();
          setShowAddModal(false);
          setShowEditModal(false);
          setSelectedClient(null);
        }}
      />

      <ClientHistoryModal
        isOpen={showHistoryModal}
        onClose={() => {
          setShowHistoryModal(false);
          setSelectedClient(null);
        }}
        client={selectedClient}
        initialTab={historyModalTab}
      />

      <ConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setClientToDelete(null);
        }}
        onConfirm={confirmDeleteClient}
        title="Delete Client"
        message={`Are you sure you want to delete ${clientToDelete?.first_name} ${clientToDelete?.last_name}? This action cannot be undone and will remove all client data including appointment history.`}
        confirmText="Delete Client"
        confirmVariant="danger"
        loading={deleteLoading}
      />

      <ProgressModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Exporting Client Data"
        progress={exportProgress}
        status={exportStatus}
        message={
          exportStatus === 'loading' ? 'Preparing your client data for export...' :
          exportStatus === 'success' ? 'Your client data has been exported successfully!' :
          'There was an error exporting your client data. Please try again.'
        }
      />
    </div>
  );
}

// Wrap the component with error boundary
function ClientsPageWithErrorBoundary() {
  return (
    <ClientErrorBoundary>
      <ClientsPage />
    </ClientErrorBoundary>
  );
}

export default ClientsPageWithErrorBoundary;
