"use client";

import { useState, useEffect } from "react";
import {
  XMarkIcon,
  ScissorsIcon,
  CurrencyDollarIcon,
  ClockIcon,
  TagIcon,
} from "@heroicons/react/24/outline";
import {
  servicesService,
  type Service,
  type ServiceCategory,
} from "@/lib/api/services";
import { useTheme } from "@/contexts/ThemeContext";

interface ServiceEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  service?: Service | null;
  categories: ServiceCategory[];
}

export default function ServiceEditModal({
  isOpen,
  onClose,
  onSuccess,
  service,
  categories,
}: ServiceEditModalProps) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category_id: 0,
    base_price: 0,
    min_price: 0,
    max_price: 0,
    duration_minutes: 60,
    buffer_minutes: 0,
    requires_deposit: false,
    deposit_type: "fixed" as "fixed" | "percentage",
    deposit_amount: 0,
    is_addon: false,
    is_active: true,
    display_order: 0,
    tags: [] as string[],
    barber_id: null as number | null,
    location_id: null as number | null,
  });
  const [tagInput, setTagInput] = useState("");

  // Theme helper functions
  const getThemeClasses = () => ({
    modalBg: theme === 'dark' ? 'bg-gray-800' : 'bg-white',
    modalBorder: theme === 'dark' ? 'border-gray-700' : 'border-gray-200',
    headerBg: theme === 'dark' ? 'bg-gray-800' : 'bg-white',
    textPrimary: theme === 'dark' ? 'text-gray-100' : 'text-gray-900',
    textSecondary: theme === 'dark' ? 'text-gray-300' : 'text-gray-700',
    textMuted: theme === 'dark' ? 'text-gray-400' : 'text-gray-500',
    inputBg: theme === 'dark' ? 'bg-gray-700' : 'bg-white',
    inputBorder: theme === 'dark' ? 'border-gray-600' : 'border-gray-300',
    inputText: theme === 'dark' ? 'text-gray-100' : 'text-gray-900',
    focusRing: theme === 'dark' ? 'focus:ring-slate-400' : 'focus:ring-slate-500',
    focusBorder: theme === 'dark' ? 'focus:border-slate-400' : 'focus:border-slate-500',
    buttonHover: theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100',
    tagBg: theme === 'dark' ? 'bg-gray-700' : 'bg-slate-100',
    tagText: theme === 'dark' ? 'text-gray-200' : 'text-slate-700',
    iconColor: theme === 'dark' ? 'text-gray-400' : 'text-gray-400',
    sectionBg: theme === 'dark' ? 'bg-gray-750' : 'bg-gray-50',
    checkboxBg: theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300',
  });

  const themeClasses = getThemeClasses();

  useEffect(() => {
    if (service) {
      setFormData({
        name: service.name,
        description: service.description || "",
        category_id: service.category_id,
        base_price: service.base_price,
        min_price: service.min_price || 0,
        max_price: service.max_price || 0,
        duration_minutes: service.duration_minutes,
        buffer_minutes: service.buffer_minutes || 0,
        requires_deposit: service.requires_deposit || false,
        deposit_type: service.deposit_type || "fixed",
        deposit_amount: service.deposit_amount || 0,
        is_addon: service.is_addon || false,
        is_active: service.is_active !== false,
        display_order: service.display_order || 0,
        tags: service.tags || [],
        barber_id: service.barber_id,
        location_id: service.location_id,
      });
    } else {
      // Reset form for new service
      setFormData({
        name: "",
        description: "",
        category_id: categories[0]?.id || 0,
        base_price: 0,
        min_price: 0,
        max_price: 0,
        duration_minutes: 60,
        buffer_minutes: 0,
        requires_deposit: false,
        deposit_type: "fixed",
        deposit_amount: 0,
        is_addon: false,
        is_active: true,
        display_order: 0,
        tags: [],
        barber_id: null,
        location_id: null,
      });
    }
  }, [service, categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (service) {
        await servicesService.updateService(service.id, formData);
      } else {
        await servicesService.createService(formData);
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to save service:", error);
      alert("Failed to save service. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()],
      });
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((t) => t !== tag),
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`${themeClasses.modalBg} rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b ${themeClasses.modalBorder} flex items-center justify-between`}>
          <div className="flex items-center space-x-3">
            <ScissorsIcon className={`h-6 w-6 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`} />
            <h2 className={`text-xl font-semibold ${themeClasses.textPrimary}`}>
              {service ? "Edit Service" : "Create New Service"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className={`p-1 ${themeClasses.buttonHover} rounded-lg transition-colors`}
          >
            <XMarkIcon className={`h-5 w-5 ${themeClasses.textMuted}`} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div
            className="p-6 overflow-y-auto"
            style={{ maxHeight: "calc(90vh - 200px)" }}
          >
            {/* Basic Information */}
            <div className="mb-6">
              <h3 className={`text-lg font-medium ${themeClasses.textPrimary} mb-4`}>
                Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${themeClasses.textSecondary} mb-1`}>
                    Service Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className={`w-full px-3 py-2 border ${themeClasses.inputBorder} ${themeClasses.inputBg} ${themeClasses.inputText} rounded-lg focus:ring-2 ${themeClasses.focusRing} ${themeClasses.focusBorder}`}
                    placeholder="e.g., Classic Haircut"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${themeClasses.textSecondary} mb-1`}>
                    Category *
                  </label>
                  <select
                    required
                    value={formData.category_id}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        category_id: parseInt(e.target.value),
                      })
                    }
                    className={`w-full px-3 py-2 border ${themeClasses.inputBorder} ${themeClasses.inputBg} ${themeClasses.inputText} rounded-lg focus:ring-2 ${themeClasses.focusRing} ${themeClasses.focusBorder}`}
                  >
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className={`block text-sm font-medium ${themeClasses.textSecondary} mb-1`}>
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={3}
                    className={`w-full px-3 py-2 border ${themeClasses.inputBorder} ${themeClasses.inputBg} ${themeClasses.inputText} rounded-lg focus:ring-2 ${themeClasses.focusRing} ${themeClasses.focusBorder}`}
                    placeholder="Describe the service..."
                  />
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="mb-6">
              <h3 className={`text-lg font-medium ${themeClasses.textPrimary} mb-4`}>
                Pricing
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${themeClasses.textSecondary} mb-1`}>
                    Base Price *
                  </label>
                  <div className="relative">
                    <CurrencyDollarIcon className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${themeClasses.iconColor}`} />
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.base_price}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          base_price: parseFloat(e.target.value) || 0,
                        })
                      }
                      className={`w-full pl-10 pr-3 py-2 border ${themeClasses.inputBorder} ${themeClasses.inputBg} ${themeClasses.inputText} rounded-lg focus:ring-2 ${themeClasses.focusRing} ${themeClasses.focusBorder}`}
                    />
                  </div>
                </div>
                <div>
                  <label className={`block text-sm font-medium ${themeClasses.textSecondary} mb-1`}>
                    Min Price (Variable)
                  </label>
                  <div className="relative">
                    <CurrencyDollarIcon className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${themeClasses.iconColor}`} />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.min_price}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          min_price: parseFloat(e.target.value) || 0,
                        })
                      }
                      className={`w-full pl-10 pr-3 py-2 border ${themeClasses.inputBorder} ${themeClasses.inputBg} ${themeClasses.inputText} rounded-lg focus:ring-2 ${themeClasses.focusRing} ${themeClasses.focusBorder}`}
                    />
                  </div>
                </div>
                <div>
                  <label className={`block text-sm font-medium ${themeClasses.textSecondary} mb-1`}>
                    Max Price (Variable)
                  </label>
                  <div className="relative">
                    <CurrencyDollarIcon className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${themeClasses.iconColor}`} />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.max_price}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          max_price: parseFloat(e.target.value) || 0,
                        })
                      }
                      className={`w-full pl-10 pr-3 py-2 border ${themeClasses.inputBorder} ${themeClasses.inputBg} ${themeClasses.inputText} rounded-lg focus:ring-2 ${themeClasses.focusRing} ${themeClasses.focusBorder}`}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Duration */}
            <div className="mb-6">
              <h3 className={`text-lg font-medium ${themeClasses.textPrimary} mb-4`}>
                Duration
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${themeClasses.textSecondary} mb-1`}>
                    Service Duration (minutes) *
                  </label>
                  <div className="relative">
                    <ClockIcon className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${themeClasses.iconColor}`} />
                    <input
                      type="number"
                      required
                      min="5"
                      step="5"
                      value={formData.duration_minutes}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          duration_minutes: parseInt(e.target.value) || 60,
                        })
                      }
                      className={`w-full pl-10 pr-3 py-2 border ${themeClasses.inputBorder} ${themeClasses.inputBg} ${themeClasses.inputText} rounded-lg focus:ring-2 ${themeClasses.focusRing} ${themeClasses.focusBorder}`}
                    />
                  </div>
                </div>
                <div>
                  <label className={`block text-sm font-medium ${themeClasses.textSecondary} mb-1`}>
                    Buffer Time (minutes)
                  </label>
                  <div className="relative">
                    <ClockIcon className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${themeClasses.iconColor}`} />
                    <input
                      type="number"
                      min="0"
                      step="5"
                      value={formData.buffer_minutes}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          buffer_minutes: parseInt(e.target.value) || 0,
                        })
                      }
                      className={`w-full pl-10 pr-3 py-2 border ${themeClasses.inputBorder} ${themeClasses.inputBg} ${themeClasses.inputText} rounded-lg focus:ring-2 ${themeClasses.focusRing} ${themeClasses.focusBorder}`}
                    />
                  </div>
                  <p className={`text-xs ${themeClasses.textMuted} mt-1`}>
                    Time between appointments
                  </p>
                </div>
              </div>
            </div>

            {/* Deposit Settings */}
            <div className="mb-6">
              <h3 className={`text-lg font-medium ${themeClasses.textPrimary} mb-4`}>
                Deposit Settings
              </h3>
              <div className="space-y-4">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.requires_deposit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        requires_deposit: e.target.checked,
                      })
                    }
                    className={`h-4 w-4 text-slate-600 focus:ring-slate-500 ${themeClasses.checkboxBg} rounded`}
                  />
                  <span className={`text-sm font-medium ${themeClasses.textSecondary}`}>
                    Require deposit for booking
                  </span>
                </label>

                {formData.requires_deposit && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-7">
                    <div>
                      <label className={`block text-sm font-medium ${themeClasses.textSecondary} mb-1`}>
                        Deposit Type
                      </label>
                      <select
                        value={formData.deposit_type}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            deposit_type: e.target.value as
                              | "fixed"
                              | "percentage",
                          })
                        }
                        className={`w-full px-3 py-2 border ${themeClasses.inputBorder} ${themeClasses.inputBg} ${themeClasses.inputText} rounded-lg focus:ring-2 ${themeClasses.focusRing} ${themeClasses.focusBorder}`}
                      >
                        <option value="fixed">Fixed Amount</option>
                        <option value="percentage">Percentage</option>
                      </select>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium ${themeClasses.textSecondary} mb-1`}>
                        Deposit Amount
                      </label>
                      <div className="relative">
                        {formData.deposit_type === "fixed" ? (
                          <CurrencyDollarIcon className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${themeClasses.iconColor}`} />
                        ) : (
                          <span className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${themeClasses.iconColor}`}>
                            %
                          </span>
                        )}
                        <input
                          type="number"
                          min="0"
                          step={
                            formData.deposit_type === "fixed" ? "0.01" : "1"
                          }
                          max={
                            formData.deposit_type === "percentage"
                              ? "100"
                              : undefined
                          }
                          value={formData.deposit_amount}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              deposit_amount: parseFloat(e.target.value) || 0,
                            })
                          }
                          className={`w-full pl-10 pr-3 py-2 border ${themeClasses.inputBorder} ${themeClasses.inputBg} ${themeClasses.inputText} rounded-lg focus:ring-2 ${themeClasses.focusRing} ${themeClasses.focusBorder}`}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Tags */}
            <div className="mb-6">
              <h3 className={`text-lg font-medium ${themeClasses.textPrimary} mb-4`}>Tags</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <div className="relative flex-1">
                    <TagIcon className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${themeClasses.iconColor}`} />
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      className={`w-full pl-10 pr-3 py-2 border ${themeClasses.inputBorder} ${themeClasses.inputBg} ${themeClasses.inputText} rounded-lg focus:ring-2 ${themeClasses.focusRing} ${themeClasses.focusBorder}`}
                      placeholder="Add a tag..."
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className={`px-4 py-2 ${theme === 'dark' ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} rounded-lg transition-colors`}
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag, index) => (
                    <span
                      key={index}
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${themeClasses.tagBg} ${themeClasses.tagText}`}
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className={`ml-2 ${theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        <XMarkIcon className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Additional Settings */}
            <div className="mb-6">
              <h3 className={`text-lg font-medium ${themeClasses.textPrimary} mb-4`}>
                Additional Settings
              </h3>
              <div className="space-y-3">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.is_addon}
                    onChange={(e) =>
                      setFormData({ ...formData, is_addon: e.target.checked })
                    }
                    className={`h-4 w-4 text-slate-600 focus:ring-slate-500 ${themeClasses.checkboxBg} rounded`}
                  />
                  <span className={`text-sm font-medium ${themeClasses.textSecondary}`}>
                    This is an add-on service
                  </span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) =>
                      setFormData({ ...formData, is_active: e.target.checked })
                    }
                    className={`h-4 w-4 text-slate-600 focus:ring-slate-500 ${themeClasses.checkboxBg} rounded`}
                  />
                  <span className={`text-sm font-medium ${themeClasses.textSecondary}`}>
                    Service is active
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className={`px-6 py-4 border-t ${themeClasses.modalBorder} flex items-center justify-between`}>
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 ${theme === 'dark' ? 'text-gray-300 hover:text-gray-100' : 'text-gray-700 hover:text-gray-900'}`}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-6 py-2 ${theme === 'dark' ? 'bg-slate-500 hover:bg-slate-600' : 'bg-slate-600 hover:bg-slate-700'} text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Saving...</span>
                </>
              ) : (
                <span>{service ? "Update" : "Create"} Service</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
