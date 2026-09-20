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
  initializeLegacyDialogs();
}

/* Older editor overlays keep their styling while sharing dialog focus behavior. */
function initializeLegacyDialogs() {
  const dialogs = [...document.querySelectorAll('[data-legacy-dialog]')];
  const openDialogs = [];
  let activationSource = null;
  let activationTime = 0;
  const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  const visibleFocusables = dialog => [...dialog.querySelectorAll(focusableSelector)]
    .filter(element => element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden');
  const topDialog = () => openDialogs[openDialogs.length - 1];
  const isVisible = dialog => getComputedStyle(dialog).display !== 'none';

  document.querySelectorAll('.close-modal').forEach(button => {
    if (button.hasAttribute('aria-label')) return;
    button.setAttribute('data-en-al', 'Close dialog');
    button.setAttribute('data-ar-al', 'إغلاق النافذة');
    button.setAttribute('aria-label', document.documentElement.lang === 'ar' ? 'إغلاق النافذة' : 'Close dialog');
  });

  document.addEventListener('click', event => {
    const trigger = event.target.closest('button, a, summary');
    if (trigger && !trigger.closest('[data-legacy-dialog]')) {
      activationSource = trigger;
      activationTime = Date.now();
    }
  }, true);
  document.addEventListener('keydown', event => {
    if ((event.key === 'Enter' || event.key === ' ') && !event.target.closest('[data-legacy-dialog]')) {
      activationSource = event.target;
      activationTime = Date.now();
    }
  }, true);

  dialogs.forEach(dialog => {
    dialog.tabIndex = -1;
    let wasVisible = isVisible(dialog);
    const observer = new MutationObserver(() => {
      const visible = isVisible(dialog);
      if (visible === wasVisible) return;
      wasVisible = visible;
      if (visible) {
        const focused = document.activeElement;
        const recentTrigger = Date.now() - activationTime < 1500 && activationSource?.isConnected
          ? activationSource : null;
        const opener = recentTrigger || (dialog.contains(focused) ? null : focused);
        dialog._returnFocusTo = opener?.isConnected ? opener : activationSource;
        openDialogs.push(dialog);
        document.body.classList.add('legacy-dialog-open');
        if (!dialog.contains(focused)) {
          const firstField = dialog.querySelector('input:not([type="hidden"]):not([readonly]):not([disabled]), textarea:not([disabled]), select:not([disabled])');
          const target = firstField && firstField.getClientRects().length ? firstField : visibleFocusables(dialog)[0];
          (target || dialog).focus({ preventScroll: true });
        }
      } else {
        const index = openDialogs.indexOf(dialog);
        if (index !== -1) openDialogs.splice(index, 1);
        if (!openDialogs.length) document.body.classList.remove('legacy-dialog-open');
        const target = dialog._returnFocusTo;
        if (target?.isConnected && !target.closest('[hidden]')) target.focus({ preventScroll: true });
      }
    });
    observer.observe(dialog, { attributes: true, attributeFilter: ['style', 'class', 'hidden'] });
  });

  document.addEventListener('focusin', event => {
    const dialog = topDialog();
    if (!dialog || document.querySelector('dialog[open]') || dialog.contains(event.target)) return;
    (visibleFocusables(dialog)[0] || dialog).focus({ preventScroll: true });
  }, true);
  document.addEventListener('keydown', event => {
    const dialog = topDialog();
    if (!dialog || document.querySelector('dialog[open]')) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      dialog.querySelector('.close-modal')?.click();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusables = visibleFocusables(dialog);
    if (!focusables.length) {
      event.preventDefault();
      dialog.focus();
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
      event.preventDefault();
      first.focus();
    }
  }, true);
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
