// Re-export from EmptyState.tsx for lowercase compatibility
export * from './EmptyState'

// Export EmptyClients component for specific use case
export const EmptyClients = ({ onAddClient }: { onAddClient?: () => void }) => {
  return (
    <div className="text-center py-12">
      <h3 className="text-lg font-medium text-gray-900 mb-2">No clients yet</h3>
      <p className="text-gray-500 mb-6">Start building your client base by adding your first client.</p>
      {onAddClient && (
        <button
          onClick={onAddClient}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          Add Client
        </button>
      )}
    </div>
  )
}