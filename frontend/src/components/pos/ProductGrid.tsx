'use client'

import React, { useState, useMemo } from 'react'
import { Search, Package, DollarSign } from 'lucide-react'

export interface Product {
  id: number
  name: string
  description?: string
  sku?: string
  price: number
  category?: string
  subcategory?: string
  brand?: string
  inventory_quantity: number
  is_in_stock: boolean
  is_low_stock: boolean
  commission_rate?: number
}

interface ProductGridProps {
  products: Product[]
  onAddToCart: (product: Product) => void
}

export function ProductGrid({ products, onAddToCart }: ProductGridProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>()
    products.forEach(p => {
      if (p.category) cats.add(p.category)
    })
    return Array.from(cats).sort()
  }, [products])

  // Filter products based on search and category
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = searchQuery === '' ||
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.brand?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesCategory = !selectedCategory || product.category === selectedCategory

      return matchesSearch && matchesCategory && product.is_in_stock
    })
  }, [products, searchQuery, selectedCategory])

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Search and Filters */}
      <div className="p-4 bg-white border-b">
        <div className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-lg"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
              !selectedCategory
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            All Products
          </button>
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                selectedCategory === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.map(product => (
            <button
              key={product.id}
              onClick={() => onAddToCart(product)}
              className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow text-left"
            >
              <div className="flex items-center justify-center w-full h-32 bg-gray-100 rounded-lg mb-3">
                <Package className="w-12 h-12 text-gray-400" />
              </div>

              <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
                {product.name}
              </h3>

              {product.brand && (
                <p className="text-sm text-gray-500 mb-2">{product.brand}</p>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <span className="text-xl font-bold text-green-600">
                    {product.price.toFixed(2)}
                  </span>
                </div>

                {product.is_low_stock && (
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                    Low Stock
                  </span>
                )}
              </div>

              {product.commission_rate && (
                <p className="text-xs text-gray-500 mt-2">
                  Commission: {(product.commission_rate * 100).toFixed(0)}%
                </p>
              )}
            </button>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No products found</p>
          </div>
        )}
      </div>
    </div>
  )
}
