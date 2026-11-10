export async function confirmAction(message, actionLabel) {
  const dialog = document.getElementById('confirmDialog');
  if (dialog.open) return false;
  document.getElementById('confirmMessage').textContent = message;
  document.getElementById('confirmAction').textContent = actionLabel;
  dialog.returnValue = '';
  const closed = new Promise(resolve => {
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'yes'), { once: true });
  });
  dialog.showModal();
  return closed;
}
