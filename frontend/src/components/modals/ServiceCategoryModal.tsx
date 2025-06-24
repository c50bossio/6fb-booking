"use client";

import { useState, useEffect } from "react";
import {
  XMarkIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";
import { servicesService, type ServiceCategory } from "@/lib/api/services";
import { useTheme } from "@/contexts/ThemeContext";

interface ServiceCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export default function ServiceCategoryModal({
  isOpen,
  onClose,
  onUpdate,
}: ServiceCategoryModalProps) {
  const { theme } = useTheme();
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [editingCategory, setEditingCategory] =
    useState<ServiceCategory | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#6b7280",
    icon: "",
    display_order: 0,
  });

  // Theme helper functions
  const getThemeClasses = (base: string, dark: string) => {
    return theme === 'dark' ? dark : base;
  };

  const getBgColor = (light: string, dark: string) =>
    getThemeClasses(light, dark);

  const getTextColor = (light: string, dark: string) =>
    getThemeClasses(light, dark);

  const getBorderColor = (light: string, dark: string) =>
    getThemeClasses(light, dark);

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    try {
      const response = await servicesService.getCategories();
      setCategories(response.data || []);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await servicesService.updateCategory(editingCategory.id, formData);
      } else {
        await servicesService.createCategory(formData);
      }
      await fetchCategories();
      resetForm();
      onUpdate();
    } catch (error) {
      console.error("Failed to save category:", error);
      alert("Failed to save category");
    }
  };

  const handleDelete = async (categoryId: number) => {
    if (
      confirm(
        "Are you sure you want to delete this category? Services in this category will need to be reassigned.",
      )
    ) {
      try {
        await servicesService.deleteCategory(categoryId);
        await fetchCategories();
        onUpdate();
      } catch (error) {
        console.error("Failed to delete category:", error);
        alert("Failed to delete category");
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      color: "#6b7280",
      icon: "",
      display_order: 0,
    });
    setEditingCategory(null);
    setShowAddForm(false);
  };

  const startEdit = (category: ServiceCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || "",
      color: category.color || "#6b7280",
      icon: category.icon || "",
      display_order: category.display_order,
    });
    setShowAddForm(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`${getBgColor('bg-white', 'bg-gray-800')} rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b ${getBorderColor('border-gray-200', 'border-gray-700')} flex items-center justify-between`}>
          <div className="flex items-center space-x-3">
            <Squares2X2Icon className={`h-6 w-6 ${getTextColor('text-slate-600', 'text-slate-400')}`} />
            <h2 className={`text-xl font-semibold ${getTextColor('text-gray-900', 'text-gray-100')}`}>
              Manage Service Categories
            </h2>
          </div>
          <button
            onClick={onClose}
            className={`p-1 ${getThemeClasses('hover:bg-gray-100', 'hover:bg-gray-700')} rounded-lg transition-colors`}
          >
            <XMarkIcon className={`h-5 w-5 ${getTextColor('text-gray-500', 'text-gray-400')}`} />
          </button>
        </div>

        {/* Content */}
        <div
          className="p-6 overflow-y-auto"
          style={{ maxHeight: "calc(90vh - 200px)" }}
        >
          {/* Add/Edit Form */}
          {showAddForm && (
            <form
              onSubmit={handleSubmit}
              className={`mb-6 p-4 ${getBgColor('bg-gray-50', 'bg-gray-700')} rounded-lg`}
            >
              <h3 className={`font-medium ${getTextColor('text-gray-900', 'text-gray-100')} mb-4`}>
                {editingCategory ? "Edit Category" : "Add New Category"}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${getTextColor('text-gray-700', 'text-gray-300')} mb-1`}>
                    Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className={`w-full px-3 py-2 border ${getBorderColor('border-gray-300', 'border-gray-600')} ${getBgColor('bg-white', 'bg-gray-800')} ${getTextColor('text-gray-900', 'text-gray-100')} rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${getTextColor('text-gray-700', 'text-gray-300')} mb-1`}>
                    Color
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) =>
                        setFormData({ ...formData, color: e.target.value })
                      }
                      className={`h-10 w-20 border ${getBorderColor('border-gray-300', 'border-gray-600')} rounded cursor-pointer`}
                    />
                    <input
                      type="text"
                      value={formData.color}
                      onChange={(e) =>
                        setFormData({ ...formData, color: e.target.value })
                      }
                      className={`flex-1 px-3 py-2 border ${getBorderColor('border-gray-300', 'border-gray-600')} ${getBgColor('bg-white', 'bg-gray-800')} ${getTextColor('text-gray-900', 'text-gray-100')} rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500`}
                      placeholder="#6b7280"
                    />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className={`block text-sm font-medium ${getTextColor('text-gray-700', 'text-gray-300')} mb-1`}>
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={2}
                    className={`w-full px-3 py-2 border ${getBorderColor('border-gray-300', 'border-gray-600')} ${getBgColor('bg-white', 'bg-gray-800')} ${getTextColor('text-gray-900', 'text-gray-100')} rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${getTextColor('text-gray-700', 'text-gray-300')} mb-1`}>
                    Icon (optional)
                  </label>
                  <input
                    type="text"
                    value={formData.icon}
                    onChange={(e) =>
                      setFormData({ ...formData, icon: e.target.value })
                    }
                    placeholder="e.g., scissors, razor"
                    className={`w-full px-3 py-2 border ${getBorderColor('border-gray-300', 'border-gray-600')} ${getBgColor('bg-white', 'bg-gray-800')} ${getTextColor('text-gray-900', 'text-gray-100')} rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${getTextColor('text-gray-700', 'text-gray-300')} mb-1`}>
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        display_order: parseInt(e.target.value) || 0,
                      })
                    }
                    className={`w-full px-3 py-2 border ${getBorderColor('border-gray-300', 'border-gray-600')} ${getBgColor('bg-white', 'bg-gray-800')} ${getTextColor('text-gray-900', 'text-gray-100')} rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500`}
                  />
                </div>
              </div>
              <div className="flex items-center justify-end space-x-3 mt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className={`px-4 py-2 ${getTextColor('text-gray-700 hover:text-gray-900', 'text-gray-300 hover:text-gray-100')}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                >
                  {editingCategory ? "Update" : "Create"} Category
                </button>
              </div>
            </form>
          )}

          {/* Categories List */}
          <div className="space-y-2">
            {!showAddForm && (
              <button
                onClick={() => setShowAddForm(true)}
                className={`w-full p-4 border-2 border-dashed ${getBorderColor('border-gray-300 hover:border-gray-400', 'border-gray-600 hover:border-gray-500')} rounded-lg transition-colors flex items-center justify-center space-x-2 ${getTextColor('text-gray-600 hover:text-gray-700', 'text-gray-400 hover:text-gray-300')}`}
              >
                <PlusIcon className="h-5 w-5" />
                <span>Add New Category</span>
              </button>
            )}

            {categories.map((category) => (
              <div
                key={category.id}
                className={`flex items-center justify-between p-4 ${getBgColor('bg-white', 'bg-gray-800')} border ${getBorderColor('border-gray-200', 'border-gray-700')} rounded-lg hover:shadow-sm transition-shadow`}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${category.color}20` }}
                  >
                    <Squares2X2Icon
                      className="h-6 w-6"
                      style={{ color: category.color }}
                    />
                  </div>
                  <div>
                    <h4 className={`font-medium ${getTextColor('text-gray-900', 'text-gray-100')}`}>
                      {category.name}
                    </h4>
                    {category.description && (
                      <p className={`text-sm ${getTextColor('text-gray-600', 'text-gray-400')}`}>
                        {category.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => startEdit(category)}
                    className={`p-2 ${getTextColor('text-gray-400 hover:text-gray-600', 'text-gray-500 hover:text-gray-300')} ${getThemeClasses('hover:bg-gray-100', 'hover:bg-gray-700')} rounded-lg transition-colors`}
                    title="Edit category"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(category.id)}
                    className={`p-2 ${getTextColor('text-gray-400 hover:text-red-600', 'text-gray-500 hover:text-red-400')} ${getThemeClasses('hover:bg-red-50', 'hover:bg-red-900/20')} rounded-lg transition-colors`}
                    title="Delete category"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {categories.length === 0 && !showAddForm && (
            <div className="text-center py-8">
              <Squares2X2Icon className={`h-12 w-12 ${getTextColor('text-gray-400', 'text-gray-600')} mx-auto mb-4`} />
              <p className={`${getTextColor('text-gray-600', 'text-gray-400')} mb-4`}>No categories yet</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
              >
                Create First Category
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
