"use client";

import { useState, useEffect } from "react";
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
import { clientsService, type Client, type ClientStats } from "@/lib/api/clients";
import ClientEditModal from "@/components/modals/ClientEditModal";
import ClientHistoryModal from "@/components/modals/ClientHistoryModal";

export default function ClientsPage() {
  const { theme, getThemeColors } = useTheme();
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
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomerType, setSelectedCustomerType] = useState<string>("all");
  const [selectedSort, setSelectedSort] = useState<string>("last_visit");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  useEffect(() => {
    fetchClients();
    fetchClientStats();
  }, []);

  useEffect(() => {
    fetchClients();
  }, [searchTerm, selectedCustomerType, selectedSort]);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const response = await clientsService.getClients({
        limit: 20,
        search: searchTerm,
        customer_type: selectedCustomerType !== "all" ? selectedCustomerType : undefined,
        sort_by: selectedSort,
        order: "desc"
      });
      setClients(response.data || []);
    } catch (error) {
      console.error("Failed to fetch clients:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientStats = async () => {
    try {
      const response = await clientsService.getClientStats();
      setClientStats(response.data);
    } catch (error) {
      console.error("Failed to fetch client stats:", error);
    }
  };

  const handleEditClient = (client: Client) => {
    setSelectedClient(client);
    setShowEditModal(true);
  };

  const handleViewHistory = (client: Client) => {
    setSelectedClient(client);
    setShowHistoryModal(true);
  };

  const handleDeleteClient = async (clientId: number) => {
    if (confirm("Are you sure you want to delete this client?")) {
      try {
        await clientsService.deleteClient(clientId);
        fetchClients();
        fetchClientStats();
      } catch (error) {
        console.error("Failed to delete client:", error);
      }
    }
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
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{
                color: colors.textSecondary
              }} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search clients..."
                className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                style={{
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.border,
                  color: colors.textPrimary
                }}
              />
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="flex items-center space-x-2">
                <TagIcon className="h-4 w-4" style={{ color: colors.textSecondary }} />
                <select
                  value={selectedCustomerType}
                  onChange={(e) => setSelectedCustomerType(e.target.value)}
                  className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
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
                  className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
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
            </div>
          </div>

          {/* Clients Content */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
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
                {searchTerm ? "Try adjusting your search." : "Get started by adding your first client."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clients.map((client) => {
                const customerBadge = getCustomerTypeBadge(client.customer_type);
                const clientValue = clientsService.getClientValueScore(client);
                const lastVisit = clientsService.formatLastVisit(client);

                return (
                  <div
                    key={client.id}
                    className="rounded-lg border p-6 hover:shadow-lg transition-shadow relative group"
                    style={{
                      backgroundColor: colors.cardBackground,
                      borderColor: colors.border
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
                              <StarIcon className="h-4 w-4 text-yellow-500" />
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
                          onClick={() => handleViewHistory(client)}
                          className="p-2 rounded-lg transition-colors hover:bg-purple-50 dark:hover:bg-purple-900/20"
                          title="Send Message"
                        >
                          <ChatBubbleLeftRightIcon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        </button>
                      </div>

                      <button
                        onClick={() => handleDeleteClient(client.id)}
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
          )}

          {/* Statistics Cards */}
          {!loading && clients.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-bold mb-4" style={{
                color: colors.textPrimary
              }}>
                Client Analytics
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-lg border p-6" style={{
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.border
                }}>
                  <div className="flex items-center space-x-3">
                    <UserGroupIcon className="h-8 w-8 text-blue-600" />
                    <div>
                      <p className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
                        {clientStats.total_clients}
                      </p>
                      <p className="text-sm" style={{ color: colors.textSecondary }}>
                        Total Clients
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border p-6" style={{
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.border
                }}>
                  <div className="flex items-center space-x-3">
                    <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
                    <div>
                      <p className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
                        ${clientStats.total_revenue}
                      </p>
                      <p className="text-sm" style={{ color: colors.textSecondary }}>
                        Total Revenue
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border p-6" style={{
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

                <div className="rounded-lg border p-6" style={{
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
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <ClientEditModal
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
      />
    </div>
  );
}
