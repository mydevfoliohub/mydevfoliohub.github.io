/* This UI gate is for navigation only. Both database RPC paths check is_admin(). */
let adminRequest = 0;
let adminOffset = 0;
let adminSearchTimer;
async function openPlatformAdmin() {
  if (!requireAccount()) return;
  const owner = currentUser.id;
  try {
    const check = await supabaseClient.rpc('is_admin');
    if (currentUser?.id !== owner) return;
    if (check.error || check.data !== true) {
      productStatus('ownerActionStatus', 'Access denied. A verified Platform Admin account is required.');
      return;
    }
  } catch {
    productStatus('ownerActionStatus', 'Could not verify platform access. Please retry.');
    return;
  }
  productStatus('adminStatus', 'Verifying platform access…');
  document.getElementById('adminMetrics').replaceChildren();
  document.getElementById('adminUsers').replaceChildren();
  document.getElementById('adminSearch').value = '';
  adminOffset = 0;
  openProductDialog('platformAdminDialog');
  await loadPlatformAdmin();
}
async function loadPlatformAdmin() {
  if (!requireAccount()) return;
  const owner = currentUser.id;
  const request = ++adminRequest;
  document.getElementById('adminUsers').replaceChildren();
  document.getElementById('adminMetrics').replaceChildren();
  document.getElementById('adminPrevious').disabled = true;
  document.getElementById('adminNext').disabled = true;
  productStatus('adminStatus', 'Loading platform overview…');
  try {
    const check = await supabaseClient.rpc('is_admin');
    if (check.error || check.data !== true) throw new Error('Access denied. A verified Platform Admin account is required.');
    const { data, error } = await supabaseClient.rpc('get_admin_dashboard', {
      p_search: document.getElementById('adminSearch').value.trim().slice(0,80), p_offset: adminOffset
    });
    if (request !== adminRequest || currentUser?.id !== owner) return;
    if (error) throw new Error('Admin overview unavailable. Verify sql/admin_dashboard_migration.sql is installed and your admin role is active.');
    if (!data?.metrics || !Array.isArray(data.profiles)) throw new Error('The admin response could not be read.');
    Object.entries({total_profiles:'Total Profiles', public_portfolios:'Public Portfolios', new_this_week:'New Profiles This Week', total_projects:'Total Projects', total_labs:'Total Labs', total_certificates:'Total Certificates', total_learning_posts:'Total Learning Posts'}).forEach(([key,label]) => {
      const card = document.createElement('div'); card.className = 'admin-metric';
      const value = document.createElement('strong'); value.textContent = Number(data.metrics[key] || 0).toLocaleString();
      const title = document.createElement('span'); title.textContent = label;
      card.append(value,title); document.getElementById('adminMetrics').append(card);
    });
    for (const profile of data.profiles) {
      const row = document.createElement('article'); row.className = 'admin-user';
      const avatar = document.createElement('span'); avatar.className = 'admin-avatar'; avatar.textContent = getProfileInitials(profile.display_name || profile.username);
      if (profile.image_path) {
        const image = document.createElement('img'); image.src = getProfileImageURL(profile.image_path); image.alt = ''; image.loading = 'lazy';
        image.addEventListener('error', () => image.remove(), {once:true}); avatar.append(image);
      }
      const identity = document.createElement('div');
      const name = document.createElement('strong'); name.textContent = profile.display_name;
      const username = document.createElement(profile.is_public ? 'a' : 'span'); username.textContent = '@' + profile.username;
      if (profile.is_public) { username.href = buildPortfolioURL(profile.username); username.target = '_blank'; username.rel = 'noopener'; }
      const specialty = document.createElement('small'); specialty.textContent = PROFILE_SPECIALTIES[profile.specialty] || profile.specialty || 'No specialty';
      identity.append(name,username,specialty);
      const meta = document.createElement('div'); meta.className = 'admin-user-meta';
      const status = document.createElement('span'); status.textContent = profile.is_public ? 'Public' : 'Private';
      const date = document.createElement('time'); date.dateTime = profile.created_at; date.textContent = new Date(profile.created_at).toLocaleDateString();
      meta.append(status,date); row.append(avatar,identity,meta); document.getElementById('adminUsers').append(row);
    }
    const count = Number(data.total_matches || 0);
    document.getElementById('adminPrevious').disabled = adminOffset === 0;
    document.getElementById('adminNext').disabled = adminOffset + 25 >= count;
    productStatus('adminStatus', count ? `${adminOffset + 1}–${Math.min(adminOffset + 25,count)} of ${count} profiles. Week starts Monday (UTC).` : 'No portfolios match your search.');
  } catch (error) {
    if (request === adminRequest && currentUser?.id === owner) productStatus('adminStatus', error.message || 'Could not load platform data.');
  }
}
function searchPlatformAdmin() { clearTimeout(adminSearchTimer); adminSearchTimer = setTimeout(() => { adminOffset = 0; loadPlatformAdmin(); }, 300); }
function pagePlatformAdmin(direction) { adminOffset = Math.max(0,adminOffset + direction * 25); loadPlatformAdmin(); }
