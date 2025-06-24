"use client";

import { useState, useEffect } from "react";
import {
  ScissorsIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  ClockIcon,
  CurrencyDollarIcon,
  TagIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";
import {
  servicesService,
  type Service,
  type ServiceCategory,
} from "@/lib/api/services";
import ServiceCategoryModal from "@/components/modals/ServiceCategoryModal";
import ServiceEditModal from "@/components/modals/ServiceEditModal";
import { useTheme } from "@/contexts/ThemeContext";

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [serviceStats, setServiceStats] = useState({
    total_services: 0,
    active_services: 0,
    categories_count: 0,
    average_duration: 0,
    average_price: 0,
    price_range: { min: 0, max: 0 }
  });
  const { theme, getThemeColors } = useTheme();
  const colors = getThemeColors();

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    setLoading(true);
    try {
      // Fetch categories first
      const categoriesResponse = await servicesService.getCategories(true);
      setCategories(categoriesResponse.data || []);

      // Fetch services (get all services, not just active ones)
      const servicesResponse = await servicesService.getServices({
        limit: 100,
      });
      setServices(servicesResponse.data || []);

      // Fetch service statistics
      const statsResponse = await servicesService.getStats();
      setServiceStats(statsResponse.data || {
        total_services: 0,
        active_services: 0,
        categories_count: 0,
        average_duration: 0,
        average_price: 0,
        price_range: { min: 0, max: 0 }
      });
    } catch (error) {
      console.error("Failed to fetch services:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredServices = services.filter((service) => {
    const matchesSearch =
      service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (service.description || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || service.category_name === selectedCategory;
    const matchesStatus =
      selectedStatus === "all" ||
      (selectedStatus === "active" && service.is_active) ||
      (selectedStatus === "inactive" && !service.is_active);
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleDelete = async (serviceId: number) => {
    if (confirm("Are you sure you want to delete this service?")) {
      try {
        await servicesService.deleteService(serviceId);
        await fetchServices(); // Refresh the list
      } catch (error) {
        console.error("Failed to delete service:", error);
        alert("Failed to delete service");
      }
    }
  };

  const handleToggleActive = async (serviceId: number) => {
    try {
      await servicesService.toggleServiceStatus(serviceId);
      await fetchServices(); // Refresh the list
    } catch (error) {
      console.error("Failed to toggle service status:", error);
    }
  };

  const getCategoryColor = (categoryName?: string) => {
    if (!categoryName) return "#6b7280";
    const category = categories.find((c) => c.name === categoryName);
    return category?.color || "#6b7280";
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
              }}>Services</h1>
              <p style={{
                color: colors.textSecondary
              }}>
                Manage your service catalog and pricing
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowCategoryModal(true)}
                className="px-4 py-2 border rounded-lg transition-colors flex items-center space-x-2"
                style={{
                  borderColor: colors.border,
                  color: colors.textPrimary,
                  backgroundColor: "transparent"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme === "dark" ? "#374151" : theme === "charcoal" ? "#2a2a2a" : theme === "soft-light" ? "#f0f0f0" : "#f9fafb"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent"
                }}
              >
                <Squares2X2Icon className="h-4 w-4" />
                <span>Manage Categories</span>
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors flex items-center space-x-2"
              >
                <PlusIcon className="h-4 w-4" />
                <span>Add Service</span>
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="rounded-lg border p-4" style={{
            backgroundColor: colors.cardBackground,
            borderColor: colors.border
          }}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{
                  color: colors.textSecondary
                }} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search services..."
                  className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                  style={{
                    backgroundColor: colors.cardBackground,
                    borderColor: colors.border,
                    color: colors.textPrimary
                  }}
                />
              </div>

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                style={{
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.border,
                  color: colors.textPrimary
                }}
              >
                <option value="all">All Categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                style={{
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.border,
                  color: colors.textPrimary
                }}
              >
                <option value="all">All Services</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>
          </div>

          {/* Services Grid View */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredServices.map((service) => (
                <div
                  key={service.id}
                  className="rounded-lg border p-6 hover:shadow-lg transition-shadow"
                  style={{
                    backgroundColor: colors.cardBackground,
                    borderColor: colors.border,
                    opacity: service.is_active ? 1 : 0.6
                  }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{
                          backgroundColor: `${getCategoryColor(service.category_name)}20`,
                        }}
                      >
                        <ScissorsIcon
                          className="h-6 w-6"
                          style={{
                            color: getCategoryColor(service.category_name),
                          }}
                        />
                      </div>
                      <div>
                        <h3 className="font-semibold" style={{
                          color: colors.textPrimary
                        }}>
                          {service.name}
                        </h3>
                        <span
                          className="text-xs font-medium px-2 py-1 rounded-full inline-block mt-1"
                          style={{
                            backgroundColor: `${getCategoryColor(service.category_name)}20`,
                            color: getCategoryColor(service.category_name),
                          }}
                        >
                          {service.category_name}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => {
                          setSelectedService(service);
                          setShowEditModal(true);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        title="Edit service"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(service.id)}
                        className="p-1 text-gray-400 hover:text-red-600"
                        title="Delete service"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-sm mb-4" style={{
                    color: colors.textSecondary
                  }}>
                    {service.description}
                  </p>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2" style={{
                        color: colors.textSecondary
                      }}>
                        <ClockIcon className="h-4 w-4" />
                        <span>{service.duration_minutes} minutes</span>
                      </div>
                      <div className="flex items-center space-x-2 font-semibold" style={{
                        color: colors.textPrimary
                      }}>
                        <CurrencyDollarIcon className="h-4 w-4" />
                        <span>${service.base_price}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t" style={{
                    borderColor: colors.border
                  }}>
                    <button
                      onClick={() => handleToggleActive(service.id)}
                      className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                        service.is_active
                          ? "bg-green-50 text-green-700 hover:bg-green-100"
                          : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {service.is_active ? "Active" : "Inactive"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {filteredServices.length === 0 && !loading && (
            <div className="rounded-lg border p-8 text-center" style={{
              backgroundColor: colors.cardBackground,
              borderColor: colors.border
            }}>
              <ScissorsIcon className="h-12 w-12 mx-auto mb-4" style={{
                color: colors.textSecondary
              }} />
              <h3 className="text-lg font-medium mb-2" style={{
                color: colors.textPrimary
              }}>
                No services found
              </h3>
              <p className="mb-4" style={{
                color: colors.textSecondary
              }}>
                {searchTerm || selectedCategory !== "all" || selectedStatus !== "all"
                  ? "Try adjusting your filters to see more services."
                  : "Get started by adding your first service."}
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
              >
                Add Service
              </button>
            </div>
          )}

          {/* Summary Stats */}
          {filteredServices.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="rounded-lg border p-4" style={{
                backgroundColor: colors.cardBackground,
                borderColor: colors.border
              }}>
                <div className="flex items-center">
                  <ScissorsIcon className="h-8 w-8" style={{
                    color: theme === "soft-light" ? "#7c9885" : theme === "charcoal" ? "#6b7280" : "#64748b"
                  }} />
                  <div className="ml-3">
                    <p className="text-sm font-medium" style={{
                      color: colors.textSecondary
                    }}>
                      Total Services
                    </p>
                    <p className="text-lg font-semibold" style={{
                      color: colors.textPrimary
                    }}>
                      {serviceStats.total_services}
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border p-4" style={{
                backgroundColor: colors.cardBackground,
                borderColor: colors.border
              }}>
                <div className="flex items-center">
                  <TagIcon className="h-8 w-8" style={{
                    color: "#8b5cf6"
                  }} />
                  <div className="ml-3">
                    <p className="text-sm font-medium" style={{
                      color: colors.textSecondary
                    }}>
                      Categories
                    </p>
                    <p className="text-lg font-semibold" style={{
                      color: colors.textPrimary
                    }}>
                      {serviceStats.categories_count}
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border p-4" style={{
                backgroundColor: colors.cardBackground,
                borderColor: colors.border
              }}>
                <div className="flex items-center">
                  <ClockIcon className="h-8 w-8" style={{
                    color: "#d97706"
                  }} />
                  <div className="ml-3">
                    <p className="text-sm font-medium" style={{
                      color: colors.textSecondary
                    }}>
                      Avg Duration
                    </p>
                    <p className="text-lg font-semibold" style={{
                      color: colors.textPrimary
                    }}>
                      {Math.round(serviceStats.average_duration)} min
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border p-4" style={{
                backgroundColor: colors.cardBackground,
                borderColor: colors.border
              }}>
                <div className="flex items-center">
                  <CurrencyDollarIcon className="h-8 w-8" style={{
                    color: "#059669"
                  }} />
                  <div className="ml-3">
                    <p className="text-sm font-medium" style={{
                      color: colors.textSecondary
                    }}>
                      Avg Price
                    </p>
                    <p className="text-lg font-semibold" style={{
                      color: colors.textPrimary
                    }}>
                      ${Math.round(serviceStats.average_price)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <ServiceCategoryModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onUpdate={fetchServices}
      />

      <ServiceEditModal
        isOpen={showAddModal || showEditModal}
        onClose={() => {
          setShowAddModal(false);
          setShowEditModal(false);
          setSelectedService(null);
        }}
        onSuccess={fetchServices}
        service={showEditModal ? selectedService : null}
        categories={categories}
      />
    </div>
  );
}
