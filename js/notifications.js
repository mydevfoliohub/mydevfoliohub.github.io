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
  document.querySelectorAll('[data-notification-bell]').forEach(button => button.setAttribute('aria-label', count
    ? uiText(`Notifications, ${count} unread`, `الإشعارات، ${count} غير مقروءة`)
    : uiText('Notifications', 'الإشعارات')));
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
  productStatus('notificationStatus', uiText('Loading notifications…', 'جارٍ تحميل الإشعارات…'));
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
    if (list.error || unread.error) throw new Error(uiText('Notifications are unavailable right now. Please try again later.','الإشعارات غير متاحة الآن. حاول مجددًا لاحقًا.'));
    notificationsAvailable = true;
    renderNotificationBadge(unread.count || 0);
    const items = list.data || [];
    document.getElementById('notificationMore').hidden = items.length <= notificationLimit;
    document.getElementById('notificationMarkAll').disabled = !unread.count;
    const container = document.getElementById('notificationItems'); container.replaceChildren();
    for (const item of items.slice(0,notificationLimit)) {
      const row = document.createElement('article'); row.className = 'notification-item' + (item.is_read ? '' : ' unread');
      const typeLabels = { system: 'النظام', achievement: 'إنجاز', analytics: 'تحليلات', account: 'الحساب' };
      const label = document.createElement('small'); label.textContent = `${uiText(item.type, typeLabels[item.type] || item.type)} · ${item.is_read ? uiText('Read', 'مقروء') : uiText('Unread', 'غير مقروء')}`;
      const knownArabic = {
        'release:2.2.0': ['MyDevFolioHub v2.2.0','إعدادات الحساب واستوديو السيرة الذاتية ومركز الإشعارات متاحة الآن.'],
        'portfolio:100': ['100 مشاهدة للملف الشخصي','وصل ملفك الشخصي إلى 100 مشاهدة مسجلة.'],
        'completion:100': ['اكتمل الملف الشخصي','أكملت جميع عناصر قائمة تجهيز ملفك الشخصي.']
      };
      const projectMilestone = item.source_key?.startsWith('project:50:');
      const title = document.createElement('h3'); title.textContent = document.documentElement.lang === 'ar'
        ? (projectMilestone ? 'وصل مشروع إلى 50 مشاهدة' : knownArabic[item.source_key]?.[0] || item.title) : item.title;
      const message = document.createElement('p'); message.textContent = document.documentElement.lang === 'ar'
        ? (projectMilestone && item.message?.endsWith(' has reached 50 recorded views.')
            ? `${item.message.slice(0,-' has reached 50 recorded views.'.length)} وصل إلى 50 مشاهدة مسجلة.`
            : knownArabic[item.source_key]?.[1] || item.message)
        : item.message;
      const date = document.createElement('time'); date.dateTime = item.created_at; date.textContent = new Date(item.created_at).toLocaleString(document.documentElement.lang === 'ar' ? 'ar-SA' : 'en-US');
      row.append(label,title,message,date);
      if (item.action_url) {
        // Only same-page destinations are allowed. Never navigate to arbitrary notification URLs.
        const action = notificationDestination(item.action_url);
        if (action) {
          const link = document.createElement('a'); link.href = action; link.textContent = uiText('View details', 'عرض التفاصيل'); row.append(link);
          link.addEventListener('click', () => { closeProductDialog('notificationsDialog'); markNotificationsRead(item.id); });
        }
      }
      if (!item.is_read) {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'platform-button'; button.textContent = uiText('Mark as read', 'تحديد كمقروء');
        button.addEventListener('click', async () => { button.disabled = true; await markNotificationsRead(item.id); }); row.append(button);
      }
      container.append(row);
    }
    productStatus('notificationStatus', !items.length ? uiText('You’re all caught up.', 'لا توجد إشعارات جديدة.') : milestoneError ? uiText('Your saved notifications are shown. Milestone checking is temporarily unavailable.', 'تظهر إشعاراتك المحفوظة. التحقق من الإنجازات غير متاح مؤقتاً.') : unread.count ? uiText(`${unread.count} unread notification${unread.count === 1 ? '' : 's'}.`, `${unread.count} إشعار غير مقروء.`) : uiText('You’re all caught up.', 'لا توجد إشعارات جديدة.'));
  } catch (error) {
    if (request !== notificationRequest || currentUser?.id !== owner) return;
    notificationsAvailable = false;
    document.getElementById('notificationItems').replaceChildren();
    document.getElementById('notificationMore').hidden = true;
    renderNotificationBadge(0);
    productStatus('notificationStatus', uiText(error.message || 'Could not load notifications. Try again.', 'تعذر تحميل الإشعارات. حاول مجدداً.'));
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
    productStatus('notificationStatus', uiText('Could not mark notifications as read. Please retry.', 'تعذر تحديد الإشعارات كمقروءة. حاول مجدداً.'));
  }
}
function loadMoreNotifications() { notificationLimit += 30; loadNotifications(); }
