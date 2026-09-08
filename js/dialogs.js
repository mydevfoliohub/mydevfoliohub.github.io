/* Shared native dialogs: browser focus trap + explicit opener restoration. */
const dialogOpeners = new WeakMap();
function openProductDialog(id) {
  const dialog = document.getElementById(id);
  if (!dialog || dialog.open) return;
  dialogOpeners.set(dialog, document.activeElement);
  dialog.showModal();
  document.body.classList.add('product-dialog-open');
}
function closeProductDialog(id) {
  document.getElementById(id)?.close();
}
function initializeProductDialogs() {
  document.querySelectorAll('dialog.product-dialog').forEach(dialog => {
    dialog.addEventListener('close', () => {
      if (!document.querySelector('dialog[open]')) document.body.classList.remove('product-dialog-open');
      const opener = dialogOpeners.get(dialog);
      if (opener?.isConnected && !opener.closest('[hidden]')) opener.focus();
      if (dialog.id === 'accountSettingsDialog') {
        ++settingsRequest;
        dialog.querySelectorAll('input[type=password]').forEach(input => input.value = '');
      }
      if (dialog.id === 'deleteAccountModal') {
        document.getElementById('deleteAccountPassword').value = '';
        document.getElementById('deleteAccountConfirmation').value = '';
        setDeleteAccountMessage('');
      }
      if (dialog.id === 'platformAdminDialog') {
        ++adminRequest;
        clearTimeout(adminSearchTimer);
        document.getElementById('adminUsers').replaceChildren();
        document.getElementById('adminMetrics').replaceChildren();
      }
      if (dialog.id === 'notificationsDialog') {
        document.querySelectorAll('[data-notification-bell]').forEach(button => button.setAttribute('aria-expanded', 'false'));
      }
      if (dialog.id === 'portfolioCvDialog') clearResumePreview();
    });
    dialog.querySelectorAll('[data-close-dialog]').forEach(button => {
      button.addEventListener('click', () => closeProductDialog(dialog.id));
    });
  });
}
function productStatus(id, message, success = false) {
  const element = document.getElementById(id);
  if (!element) return;
  element.textContent = message;
  element.classList.toggle('success', success);
}
function requireAccount() {
  return Boolean(currentUser?.id && signedInProfile?.user_id === currentUser.id);
}
function syncAccountControls() {
  const hasAccount = requireAccount();
  document.querySelectorAll('[data-account-control]').forEach(button => button.hidden = !hasAccount);
  document.querySelectorAll('[data-platform-admin]').forEach(button => button.hidden = !hasAccount || !isPlatformAdmin);
  if (!hasAccount) {
    document.querySelectorAll('dialog.product-dialog[open]').forEach(dialog => dialog.close());
    ['settingsUsername', 'settingsEmail', 'settingsPublicEmail'].forEach(id => {
      const element = document.getElementById(id);
      if (element) element.textContent = '';
    });
    clearNotifications();
  }
  syncResumeButton();
}
