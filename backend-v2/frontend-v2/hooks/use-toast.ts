// Toast notifications hook

export const toastError = (message: string) => {
  console.error('Toast Error:', message);
  alert(`Error: ${message}`);
};

export const toastSuccess = (message: string) => {
  console.log('Toast Success:', message);
  alert(`Success: ${message}`);
};