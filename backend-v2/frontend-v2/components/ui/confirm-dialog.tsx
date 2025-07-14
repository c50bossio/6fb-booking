// Re-export the ConfirmationDialog with lowercase naming
export { ConfirmationDialog as default } from './ConfirmationDialog';
export { ConfirmationDialog } from './ConfirmationDialog';
export { ConfirmationDialog as ConfirmDialog } from './ConfirmationDialog';

// Export useConfirmDialog hook for compatibility
export const useConfirmDialog = () => {
  return {
    confirm: (message: string) => window.confirm(message),
    confirmAsync: (message: string) => Promise.resolve(window.confirm(message))
  }
};