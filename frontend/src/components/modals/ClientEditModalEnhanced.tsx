"use client";

import { useState, useEffect, useCallback } from "react";
import {
  XMarkIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarDaysIcon,
  TagIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";
import {
  clientsService,
  type Client,
  type CreateClientRequest,
  type UpdateClientRequest,
} from "@/lib/api/clients";
import { useTheme } from "@/contexts/ThemeContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { useDebounce } from "@/hooks/useDebounce";

interface ClientEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  client?: Client | null;
}

export default function ClientEditModalEnhanced({
  isOpen,
  onClose,
  onSuccess,
  client,
}: ClientEditModalProps) {
  const { theme, getThemeColors } = useTheme();
  const { showSuccess, showError } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isValidating, setIsValidating] = useState(false);
  const [formData, setFormData] = useState<CreateClientRequest>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    date_of_birth: "",
    notes: "",
    tags: [],
    sms_enabled: true,
    email_enabled: true,
    marketing_enabled: false,
  });
  const [tagInput, setTagInput] = useState("");

  // Debounced validation
  const debouncedFormData = useDebounce(formData, 500);

  // Real-time validation
  const validateField = useCallback((field: string, value: any) => {
    const newFieldErrors = { ...fieldErrors };

    switch (field) {
      case 'first_name':
        if (!value?.trim()) {
          newFieldErrors.first_name = 'First name is required';
        } else if (value.length < 2) {
          newFieldErrors.first_name = 'First name must be at least 2 characters';
        } else {
          delete newFieldErrors.first_name;
        }
        break;

      case 'last_name':
        if (!value?.trim()) {
          newFieldErrors.last_name = 'Last name is required';
        } else if (value.length < 2) {
          newFieldErrors.last_name = 'Last name must be at least 2 characters';
        } else {
          delete newFieldErrors.last_name;
        }
        break;

      case 'email':
        if (!value?.trim()) {
          newFieldErrors.email = 'Email is required';
        } else {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            newFieldErrors.email = 'Please enter a valid email address';
          } else {
            delete newFieldErrors.email;
          }
        }
        break;

      case 'phone':
        if (!value?.trim()) {
          newFieldErrors.phone = 'Phone number is required';
        } else {
          const phoneRegex = /^[\+]?[\d\s\-\(\)]{10,}$/;
          if (!phoneRegex.test(value)) {
            newFieldErrors.phone = 'Please enter a valid phone number';
          } else {
            delete newFieldErrors.phone;
          }
        }
        break;
    }

    setFieldErrors(newFieldErrors);
    return Object.keys(newFieldErrors).length === 0;
  }, [fieldErrors]);

  // Validate form on debounced changes
  useEffect(() => {
    if (isOpen && Object.keys(debouncedFormData).length > 0) {
      setIsValidating(true);

      // Validate all fields
      validateField('first_name', debouncedFormData.first_name);
      validateField('last_name', debouncedFormData.last_name);
      validateField('email', debouncedFormData.email);
      validateField('phone', debouncedFormData.phone);

      setIsValidating(false);
    }
  }, [debouncedFormData, isOpen, validateField]);

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
    errorText: theme === 'dark' ? 'text-red-400' : 'text-red-600',
    errorBg: theme === 'dark' ? 'bg-red-900/20' : 'bg-red-50',
    errorBorder: theme === 'dark' ? 'border-red-700' : 'border-red-200',
  });

  const themeClasses = getThemeClasses();

  useEffect(() => {
    if (client) {
      setFormData({
        first_name: client.first_name,
        last_name: client.last_name,
        email: client.email,
        phone: client.phone,
        date_of_birth: "",
        notes: client.notes || "",
        tags: client.tags || [],
        sms_enabled: client.sms_enabled,
        email_enabled: client.email_enabled,
        marketing_enabled: client.marketing_enabled,
      });
    } else {
      setFormData({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        date_of_birth: "",
        notes: "",
        tags: [],
        sms_enabled: true,
        email_enabled: true,
        marketing_enabled: false,
      });
    }
    setErrors([]);
    setFieldErrors({});
  }, [client]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors([]);

    // Validate form data
    const validation = clientsService.validateClientData(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      setLoading(false);
      return;
    }

    try {
      if (client) {
        await clientsService.updateClient(client.id, formData as UpdateClientRequest);
        showSuccess(
          'Client Updated',
          `${formData.first_name} ${formData.last_name} has been updated successfully.`
        );
      } else {
        await clientsService.createClient(formData);
        showSuccess(
          'Client Created',
          `${formData.first_name} ${formData.last_name} has been added to your client list.`
        );
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Failed to save client:", error);
      const errorMessage = error?.response?.data?.detail || error?.message || "Failed to save client. Please try again.";
      setErrors([errorMessage]);
      showError(
        'Save Failed',
        errorMessage
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !formData.tags?.includes(trimmedTag)) {
      setFormData({
        ...formData,
        tags: [...(formData.tags || []), trimmedTag],
      });
      setTagInput("");
      showSuccess('Tag Added', `"${trimmedTag}" has been added to the client tags.`);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      const newFieldErrors = { ...fieldErrors };
      delete newFieldErrors[field];
      setFieldErrors(newFieldErrors);
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter((t) => t !== tag) || [],
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const getFieldError = (field: string) => {
    return fieldErrors[field];
  };

  const hasFieldError = (field: string) => {
    return !!fieldErrors[field];
  };

  const isFormValid = () => {
    return Object.keys(fieldErrors).length === 0 &&
           formData.first_name?.trim() &&
           formData.last_name?.trim() &&
           formData.email?.trim() &&
           formData.phone?.trim();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`${themeClasses.modalBg} rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b ${themeClasses.modalBorder} flex items-center justify-between`}>
          <div className="flex items-center space-x-3">
            <UserIcon className={`h-6 w-6 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`} />
            <h2 className={`text-xl font-semibold ${themeClasses.textPrimary}`}>
              {client ? "Edit Client" : "Create New Client"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className={`p-1 ${themeClasses.buttonHover} rounded-lg transition-colors`}
          >
            <XMarkIcon className={`h-5 w-5 ${themeClasses.textMuted}`} />
          </button>
        </div>

        {/* Error Messages */}
        {errors.length > 0 && (
          <div className={`mx-6 mt-4 p-4 rounded-lg ${themeClasses.errorBg} ${themeClasses.errorBorder} border`}>
            <div className="flex">
              <div className="ml-3">
                <h3 className={`text-sm font-medium ${themeClasses.errorText}`}>
                  Please fix the following errors:
                </h3>
                <div className="mt-2">
                  <ul className={`list-disc list-inside text-sm ${themeClasses.errorText}`}>
                    {errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

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
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => handleInputChange('first_name', e.target.value)}
                    className={`w-full px-3 py-2 border ${hasFieldError('first_name') ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : `${themeClasses.inputBorder} ${themeClasses.focusBorder} ${themeClasses.focusRing}`} ${themeClasses.inputBg} ${themeClasses.inputText} rounded-lg focus:ring-2`}
                    placeholder="e.g., John"
                  />
                  {hasFieldError('first_name') && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {getFieldError('first_name')}
                    </p>
                  )}
                </div>
                <div>
                  <label className={`block text-sm font-medium ${themeClasses.textSecondary} mb-1`}>
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={(e) => handleInputChange('last_name', e.target.value)}
                    className={`w-full px-3 py-2 border ${hasFieldError('last_name') ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : `${themeClasses.inputBorder} ${themeClasses.focusBorder} ${themeClasses.focusRing}`} ${themeClasses.inputBg} ${themeClasses.inputText} rounded-lg focus:ring-2`}
                    placeholder="e.g., Smith"
                  />
                  {hasFieldError('last_name') && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {getFieldError('last_name')}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="mb-6">
              <h3 className={`text-lg font-medium ${themeClasses.textPrimary} mb-4`}>
                Contact Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${themeClasses.textSecondary} mb-1`}>
                    Email *
                  </label>
                  <div className="relative">
                    <EnvelopeIcon className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${themeClasses.iconColor}`} />
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className={`w-full pl-10 pr-3 py-2 border ${hasFieldError('email') ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : `${themeClasses.inputBorder} ${themeClasses.focusBorder} ${themeClasses.focusRing}`} ${themeClasses.inputBg} ${themeClasses.inputText} rounded-lg focus:ring-2`}
                      placeholder="john.smith@example.com"
                    />
                  </div>
                  {hasFieldError('email') && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {getFieldError('email')}
                    </p>
                  )}
                </div>
                <div>
                  <label className={`block text-sm font-medium ${themeClasses.textSecondary} mb-1`}>
                    Phone *
                  </label>
                  <div className="relative">
                    <PhoneIcon className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${themeClasses.iconColor}`} />
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className={`w-full pl-10 pr-3 py-2 border ${hasFieldError('phone') ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : `${themeClasses.inputBorder} ${themeClasses.focusBorder} ${themeClasses.focusRing}`} ${themeClasses.inputBg} ${themeClasses.inputText} rounded-lg focus:ring-2`}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  {hasFieldError('phone') && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {getFieldError('phone')}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Communication Preferences */}
            <div className="mb-6">
              <h3 className={`text-lg font-medium ${themeClasses.textPrimary} mb-4`}>
                Communication Preferences
              </h3>
              <div className="space-y-3">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.email_enabled}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        email_enabled: e.target.checked,
                      })
                    }
                    className={`h-4 w-4 text-slate-600 focus:ring-slate-500 ${themeClasses.checkboxBg} rounded`}
                  />
                  <div className="flex items-center space-x-2">
                    <EnvelopeIcon className={`h-4 w-4 ${themeClasses.iconColor}`} />
                    <span className={`text-sm font-medium ${themeClasses.textSecondary}`}>
                      Enable Email Notifications
                    </span>
                  </div>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.sms_enabled}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sms_enabled: e.target.checked,
                      })
                    }
                    className={`h-4 w-4 text-slate-600 focus:ring-slate-500 ${themeClasses.checkboxBg} rounded`}
                  />
                  <div className="flex items-center space-x-2">
                    <ChatBubbleLeftRightIcon className={`h-4 w-4 ${themeClasses.iconColor}`} />
                    <span className={`text-sm font-medium ${themeClasses.textSecondary}`}>
                      Enable SMS Notifications
                    </span>
                  </div>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.marketing_enabled}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        marketing_enabled: e.target.checked,
                      })
                    }
                    className={`h-4 w-4 text-slate-600 focus:ring-slate-500 ${themeClasses.checkboxBg} rounded`}
                  />
                  <span className={`text-sm font-medium ${themeClasses.textSecondary}`}>
                    Enable Marketing Communications
                  </span>
                </label>
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
                      onKeyPress={handleKeyPress}
                      className={`w-full pl-10 pr-3 py-2 border ${themeClasses.inputBorder} ${themeClasses.inputBg} ${themeClasses.inputText} rounded-lg focus:ring-2 ${themeClasses.focusRing} ${themeClasses.focusBorder}`}
                      placeholder="Add a tag (e.g., VIP, Regular, First-time)..."
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
                  {formData.tags?.map((tag, index) => (
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

            {/* Notes */}
            <div className="mb-6">
              <h3 className={`text-lg font-medium ${themeClasses.textPrimary} mb-4`}>
                Notes
              </h3>
              <div>
                <label className={`block text-sm font-medium ${themeClasses.textSecondary} mb-1`}>
                  Client Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={4}
                  className={`w-full px-3 py-2 border ${themeClasses.inputBorder} ${themeClasses.inputBg} ${themeClasses.inputText} rounded-lg focus:ring-2 ${themeClasses.focusRing} ${themeClasses.focusBorder}`}
                  placeholder="Add any notes about the client, preferences, special instructions, etc..."
                />
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
              disabled={loading || !isFormValid()}
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
                <span>{client ? "Update" : "Create"} Client</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
