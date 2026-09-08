/* Account settings never derive private identity from the viewed portfolio. */
let settingsRequest = 0;
let portfolioPrivacyReady = false;
async function openAccountSettings() {
  if (!requireAccount()) return;
  const request = ++settingsRequest;
  const owner = currentUser.id;
  document.getElementById('accountSettingsForm').reset();
  document.getElementById('accountPasswordForm').reset();
  productStatus('settingsStatus', 'Checking your account…');
  productStatus('accountEmailStatus', '');
  productStatus('accountPasswordStatus', '');
  document.getElementById('settingsUsername').textContent = '@' + signedInProfile.username;
  document.getElementById('settingsEmail').textContent = currentUser.email || 'Unavailable';
  document.getElementById('settingsSave').disabled = true;
  openProductDialog('accountSettingsDialog');
  selectSettingsSection('account');
  try {
    const [authResult, profileResult, privacyResult] = await Promise.all([
      supabaseClient.auth.getUser(),
      supabaseClient.from('profiles').select('*').eq('user_id', owner).single(),
      supabaseClient.rpc('v220_portfolio_privacy_ready')
    ]);
    if (request !== settingsRequest || currentUser?.id !== owner) return;
    if (authResult.error || authResult.data?.user?.id !== owner || profileResult.error) throw new Error('Could not verify your account. Please sign in again.');
    currentUser = authResult.data.user;
    signedInProfile = profileResult.data;
    document.getElementById('settingsEmail').textContent = currentUser.email || 'Unavailable';
    document.getElementById('settingsTheme').replaceChildren(...Object.entries(PORTFOLIO_THEMES).map(([value, label]) => new Option(label, value)));
    document.getElementById('settingsTheme').value = normalizePortfolioTheme(signedInProfile.portfolio_theme);
    document.getElementById('settingsTheme').disabled = !('portfolio_theme' in signedInProfile);
    portfolioPrivacyReady = !privacyResult.error && privacyResult.data === true;
    document.getElementById('settingsPublicPortfolio').checked = signedInProfile.is_public === true;
    document.getElementById('settingsPublicPortfolio').disabled = !portfolioPrivacyReady;
    document.getElementById('settingsPrivacyNote').hidden = portfolioPrivacyReady;
    document.getElementById('settingsPublicResume').checked = normalizeResumeSettings(signedInProfile.resume_settings).public;
    document.getElementById('settingsPublicResume').disabled = !('resume_settings' in signedInProfile);
    document.getElementById('settingsResumeNote').hidden = 'resume_settings' in signedInProfile;
    document.getElementById('settingsPublicEmail').textContent = getProfileSocialLinks(signedInProfile).email || 'No public email. Add one in Edit Profile.';
    document.getElementById('settingsDelete').disabled = isPlatformAdmin;
    document.getElementById('settingsDeleteNote').textContent = isPlatformAdmin ? 'Platform Admin accounts are protected from self-deletion.' : 'Deletion requires your current password and the exact confirmation phrase.';
    document.getElementById('settingsSave').disabled = false;
    productStatus('settingsStatus', '');
  } catch (error) { productStatus('settingsStatus', error.message || 'Could not load settings. Try again.'); }
}
function selectSettingsSection(name) {
  document.querySelectorAll('[data-settings-section]').forEach(section => section.hidden = section.dataset.settingsSection !== name);
  document.querySelectorAll('[data-settings-tab]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.settingsTab === name)));
}
async function changeAccountEmail(event) {
  event.preventDefault();
  if (!requireAccount()) return;
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const button = form.querySelector('button[type=submit]');
  button.disabled = true;
  const owner = currentUser.id;
  productStatus('accountEmailStatus', 'Requesting email change…');
  try {
    const email = document.getElementById('settingsNewEmail').value.trim();
    const redirect = new URL(PUBLIC_SITE_URL);
    redirect.searchParams.set('view', 'dashboard');
    const { error } = await supabaseClient.auth.updateUser({ email }, { emailRedirectTo: redirect.href });
    if (error) throw error;
    if (currentUser?.id !== owner) return;
    form.reset();
    productStatus('accountEmailStatus', 'Email change requested. Follow the confirmation links sent by Supabase; your current and new inboxes may both need confirmation. Your public contact email is unchanged.', true);
  } catch (error) { productStatus('accountEmailStatus', getFriendlyAuthError(error)); }
  finally { button.disabled = false; }
}
async function sendPasswordReauthentication() {
  if (!requireAccount()) return;
  const button = document.getElementById('settingsReauthenticate');
  button.disabled = true;
  try {
    const { error } = await supabaseClient.auth.reauthenticate();
    if (error) throw error;
    productStatus('accountPasswordStatus', 'Verification code requested. Check the email or phone registered with Supabase.', true);
  } catch (error) { productStatus('accountPasswordStatus', getFriendlyAuthError(error)); }
  finally { button.disabled = false; }
}
async function changeAccountPassword(event) {
  event.preventDefault();
  if (!requireAccount()) return;
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const password = document.getElementById('settingsNewPassword').value;
  if (password !== document.getElementById('settingsConfirmPassword').value) {
    productStatus('accountPasswordStatus', 'The new passwords do not match.'); return;
  }
  const button = form.querySelector('button[type=submit]');
  button.disabled = true;
  const owner = currentUser.id;
  productStatus('accountPasswordStatus', 'Updating password…');
  try {
    const { data, error: verifyError } = await supabaseClient.auth.getUser();
    if (verifyError || data?.user?.id !== owner) throw new Error('Sign in again before changing your password.');
    const nonce = document.getElementById('settingsPasswordNonce').value.trim();
    const { error } = await supabaseClient.auth.updateUser({ password, ...(nonce ? { nonce } : {}) });
    if (error) throw error;
    if (currentUser?.id !== owner) return;
    form.reset();
    productStatus('accountPasswordStatus', 'Password updated successfully.', true);
  } catch (error) { productStatus('accountPasswordStatus', getFriendlyAuthError(error)); }
  finally { button.disabled = false; }
}
async function saveAccountPortfolioSettings(event) {
  event.preventDefault();
  if (!requireAccount()) return;
  const owner = currentUser.id;
  const button = document.getElementById('settingsSave');
  button.disabled = true;
  productStatus('settingsStatus', 'Saving portfolio preferences…');
  try {
    // Fetch the latest resume options so changing visibility never overwrites a studio save.
    const { data: latest, error: readError } = await supabaseClient.from('profiles').select('*').eq('user_id', owner).single();
    if (readError) throw readError;
    const updates = {};
    if ('portfolio_theme' in latest) updates.portfolio_theme = normalizePortfolioTheme(document.getElementById('settingsTheme').value);
    if (portfolioPrivacyReady) updates.is_public = document.getElementById('settingsPublicPortfolio').checked;
    if ('resume_settings' in latest) updates.resume_settings = { ...normalizeResumeSettings(latest.resume_settings), public: document.getElementById('settingsPublicResume').checked };
    if (!Object.keys(updates).length) throw new Error('Install the settings migrations before saving.');
    const { data, error } = await supabaseClient.from('profiles').update(updates).eq('user_id', owner).select('*').single();
    if (error) throw error;
    if (currentUser?.id !== owner) return;
    signedInProfile = data;
    if (activePortfolioUserId === owner) configurePortfolioIdentity(data);
    syncAccountControls();
    productStatus('settingsStatus', 'Portfolio preferences saved.', true);
  } catch (error) { productStatus('settingsStatus', 'Could not save preferences. ' + (error.message || 'Try again.')); }
  finally { button.disabled = false; }
}
