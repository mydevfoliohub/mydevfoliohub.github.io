let notificationRequest = 0;
let notificationOwner = null;
let notificationLimit = 30;
let notificationsAvailable = false;
function clearNotifications() {
  ++notificationRequest;
  notificationOwner = null;
  notificationsAvailable = false;
  document.getElementById('notificationItems')?.replaceChildren();
  renderNotificationBadge(0);
}
function renderNotificationBadge(count) {
  document.querySelectorAll('[data-notification-count]').forEach(badge => {
    badge.textContent = count > 99 ? '99+' : String(count);
    badge.hidden = count === 0;
  });
  document.querySelectorAll('[data-notification-bell]').forEach(button => button.setAttribute('aria-label', `Notifications${count ? ', ' + count + ' unread' : ''}`));
}
async function openNotifications() {
  if (!requireAccount()) return;
  notificationLimit = 30;
  openProductDialog('notificationsDialog');
  document.querySelectorAll('[data-notification-bell]').forEach(button => button.setAttribute('aria-expanded','true'));
  await loadNotifications(true);
}
async function loadNotifications(generate = false) {
  if (!requireAccount()) { clearNotifications(); return; }
  const owner = currentUser.id;
  const request = ++notificationRequest;
  if (notificationOwner !== owner) document.getElementById('notificationItems').replaceChildren();
  notificationOwner = owner;
  document.getElementById('notificationMarkAll').disabled = true;
  productStatus('notificationStatus', 'Loading notifications…');
  try {
    let milestoneError = false;
    if (generate) {
      // No user id, text or milestone value is accepted: the database derives all three.
      const generated = await supabaseClient.rpc('refresh_my_notifications');
      milestoneError = Boolean(generated.error);
    }
    const [list, unread] = await Promise.all([
      supabaseClient.from('notifications').select('id,type,title,message,action_url,is_read,created_at').eq('user_id', owner).order('created_at',{ascending:false}).order('id',{ascending:false}).limit(notificationLimit + 1),
      supabaseClient.from('notifications').select('id',{count:'exact',head:true}).eq('user_id', owner).eq('is_read',false)
    ]);
    if (request !== notificationRequest || currentUser?.id !== owner) return;
    if (list.error || unread.error) throw new Error('Notifications are unavailable. The platform needs sql/notifications_migration.sql, or the connection needs to be restored.');
    notificationsAvailable = true;
    renderNotificationBadge(unread.count || 0);
    const items = list.data || [];
    document.getElementById('notificationMore').hidden = items.length <= notificationLimit;
    document.getElementById('notificationMarkAll').disabled = !unread.count;
    const container = document.getElementById('notificationItems'); container.replaceChildren();
    for (const item of items.slice(0,notificationLimit)) {
      const row = document.createElement('article'); row.className = 'notification-item' + (item.is_read ? '' : ' unread');
      const label = document.createElement('small'); label.textContent = `${item.type} · ${item.is_read ? 'Read' : 'Unread'}`;
      const title = document.createElement('h3'); title.textContent = item.title;
      const message = document.createElement('p'); message.textContent = item.message;
      const date = document.createElement('time'); date.dateTime = item.created_at; date.textContent = new Date(item.created_at).toLocaleString();
      row.append(label,title,message,date);
      if (item.action_url) {
        // Only same-page destinations are allowed. Never navigate to arbitrary notification URLs.
        const action = notificationDestination(item.action_url);
        if (action) {
          const link = document.createElement('a'); link.href = action; link.textContent = 'View details'; row.append(link);
          link.addEventListener('click', () => { closeProductDialog('notificationsDialog'); markNotificationsRead(item.id); });
        }
      }
      if (!item.is_read) {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'platform-button'; button.textContent = 'Mark as read';
        button.addEventListener('click', async () => { button.disabled = true; await markNotificationsRead(item.id); }); row.append(button);
      }
      container.append(row);
    }
    productStatus('notificationStatus', !items.length ? 'You’re all caught up.' : milestoneError ? 'Your saved notifications are shown. Milestone checking is temporarily unavailable.' : unread.count ? `${unread.count} unread notification${unread.count === 1 ? '' : 's'}.` : 'You’re all caught up.');
  } catch (error) {
    if (request !== notificationRequest || currentUser?.id !== owner) return;
    notificationsAvailable = false;
    document.getElementById('notificationItems').replaceChildren();
    document.getElementById('notificationMore').hidden = true;
    renderNotificationBadge(0);
    productStatus('notificationStatus', error.message || 'Could not load notifications. Try again.');
  }
}
function notificationDestination(value) {
  if (typeof value !== 'string') return '';
  if (value === '#platformUpdates') return getBasePageURL().href + '#platformUpdates';
  if (/^#[a-zA-Z][\w-]*$/.test(value)) return '?view=dashboard' + value;
  return '';
}
async function markNotificationsRead(id = null) {
  if (!requireAccount() || !notificationsAvailable) return;
  const owner = currentUser.id;
  try {
    let query = supabaseClient.from('notifications').update({is_read:true}).eq('user_id',owner).eq('is_read',false);
    if (id) query = query.eq('id',id);
    const { error } = await query;
    if (error) throw error;
    if (currentUser?.id === owner) {
      await loadNotifications();
      document.getElementById('notificationStatus').focus();
    }
  } catch {
    await loadNotifications();
    productStatus('notificationStatus', 'Could not mark notifications as read. Please retry.');
  }
}
function loadMoreNotifications() { notificationLimit += 30; loadNotifications(); }
