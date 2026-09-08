/* Studio edits are local. Portfolio data is refreshed once per open, never per control. */
const RESUME_SECTIONS = {summary:'Summary',education:'Education',skills:'Skills / Tech Stack',projects:'Projects',certificates:'Certificates',labs:'Labs',achievements:'Achievements',github:'GitHub',learning:'Learning'};
const RESUME_DEFAULT_ORDER = Object.keys(RESUME_SECTIONS);
let resumeSnapshot = null;
let resumeOptions = null;
let resumeOwnerMode = false;
let resumeRequest = 0;
let resumeRevision = 0;
let resumePreviewReady = false;
function normalizeResumeSettings(value) {
  const input = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const order = Array.isArray(input.order) ? [...new Set(input.order.filter(key => RESUME_DEFAULT_ORDER.includes(key)))] : [];
  const included = Array.isArray(input.included) ? [...new Set(input.included.filter(key => RESUME_DEFAULT_ORDER.includes(key)))] : RESUME_DEFAULT_ORDER.slice(0,5);
  return {
    public: input.public === true, template: input.template === 'modern' ? 'modern' : 'ats',
    photo: input.photo === true, email: input.email === true, github: input.github !== false, linkedin: input.linkedin !== false,
    maxProjects: Math.max(1,Math.min(30,Math.floor(Number(input.maxProjects) || 5))),
    maxCertificates: Math.max(1,Math.min(30,Math.floor(Number(input.maxCertificates) || 5))),
    accent: ['teal','purple','blue'].includes(input.accent) ? input.accent : 'teal',
    density: input.density === 'compact' ? 'compact' : 'comfortable',
    included, order: [...order,...RESUME_DEFAULT_ORDER.filter(key => !order.includes(key))]
  };
}
function syncResumeButton() {
  const button = document.getElementById('downloadCvButton');
  if (!button) return;
  const owner = requireAccount() && activePortfolioUserId === currentUser.id;
  button.hidden = !owner && !(currentProfile?.is_public === true && normalizeResumeSettings(currentProfile?.resume_settings).public);
  button.classList.toggle('resume-studio-trigger', owner);
  button.replaceChildren();
  if (owner) {
    const icon = document.createElement('span'); icon.className = 'resume-trigger-icon'; icon.setAttribute('aria-hidden','true'); icon.textContent = '▤';
    const copy = document.createElement('span'); copy.className = 'resume-trigger-copy';
    const title = document.createElement('strong'); title.textContent = 'Resume Studio';
    const detail = document.createElement('small'); detail.textContent = 'Build a resume from your portfolio';
    const arrow = document.createElement('span'); arrow.className = 'resume-trigger-arrow'; arrow.setAttribute('aria-hidden','true'); arrow.textContent = '→';
    copy.append(title,detail); button.append(icon,copy,arrow); button.setAttribute('aria-label','Open Resume Studio. Build a resume from your portfolio.');
  } else {
    button.textContent = '↓ Download Resume'; button.setAttribute('aria-label','Download Resume');
  }
}
async function openPortfolioCv() { return openResumeStudio(); }
async function openResumeStudio() {
  if (!currentProfile?.username || !activePortfolioUserId) return;
  const owner = activePortfolioUserId;
  const editing = requireAccount() && currentUser.id === owner;
  if (!editing && !(currentProfile.is_public === true && normalizeResumeSettings(currentProfile.resume_settings).public)) return;
  const request = ++resumeRequest;
  productStatus('portfolioCvStatus', 'Loading resume data…');
  document.getElementById('downloadCvButton').disabled = true;
  try {
    const tables = ['projects','labs','education_items','certificates','achievement_badges','learning_posts'];
    const [profileResult,...results] = await Promise.all([
      supabaseClient.from('profiles').select('*').eq('user_id',owner).single(),
      ...tables.map(table => supabaseClient.from(table).select('*').eq('user_id',owner).order('created_at',{ascending:false}))
    ]);
    if (request !== resumeRequest || activePortfolioUserId !== owner || (editing && currentUser?.id !== owner)) return;
    if (profileResult.error || results.some(result => result.error)) throw new Error('Could not load all resume data. Please try again.');
    const profile = profileResult.data;
    if (!editing && !(profile.is_public === true && normalizeResumeSettings(profile.resume_settings).public)) throw new Error('This owner has disabled public resume access.');
    const byDate = (items,field) => [...items].sort((a,b) => String(b[field] || '').localeCompare(String(a[field] || '')));
    resumeSnapshot = {profile:structuredClone(profile),sections:{
      projects: results[0].data || [], labs: results[1].data || [], education:byDate(results[2].data || [],'graduation_date'),
      certificates:byDate(results[3].data || [],'certificate_date'), achievements:byDate(results[4].data || [],'badge_date'), learning:byDate(results[5].data || [],'post_date')
    }};
    resumeOptions = normalizeResumeSettings(profile.resume_settings);
    resumeOwnerMode = editing;
    document.getElementById('portfolioCvHeading').textContent = editing ? 'Resume Studio' : 'Download Resume';
    document.getElementById('resumeControls').hidden = !editing;
    document.getElementById('resumeSave').hidden = !editing;
    document.getElementById('resumeReset').hidden = !editing;
    document.getElementById('resumeSave').disabled = !('resume_settings' in profile);
    document.getElementById('resumeMigrationNote').hidden = !editing || 'resume_settings' in profile;
    document.getElementById('resumeStudioBody').classList.toggle('public-resume',!editing);
    productStatus('resumeStatus','');
    renderResumeControls();
    openProductDialog('portfolioCvDialog');
    renderResumePreview();
    productStatus('portfolioCvStatus','');
  } catch (error) { productStatus('portfolioCvStatus', error.message || 'Could not prepare your resume. Try again.'); }
  finally { if (request === resumeRequest) { document.getElementById('downloadCvButton').disabled = false; syncResumeButton(); } }
}
function availableResumeSections() {
  if (!resumeSnapshot) return [];
  const {profile,sections} = resumeSnapshot;
  return RESUME_DEFAULT_ORDER.filter(key => key === 'summary' ? Boolean(profile.bio?.trim()) : key === 'skills' ? Boolean(profile.tech_stack?.length) : key === 'github' ? Boolean(getGitHubUsernameForProfile(profile)) : Boolean(sections[key]?.length));
}
function renderResumeControls() {
  if (!resumeOptions) return;
  for (const key of ['template','maxProjects','maxCertificates','accent','density']) document.getElementById('resume-' + key).value = resumeOptions[key];
  for (const key of ['photo','email','github','linkedin','public']) document.getElementById('resume-' + key).checked = resumeOptions[key];
  document.querySelectorAll('[data-resume-template]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.resumeTemplate === resumeOptions.template)));
  document.getElementById('resume-public').disabled = !('resume_settings' in resumeSnapshot.profile);
  document.getElementById('resume-photo').disabled = !resumeSnapshot.profile.image_path;
  document.getElementById('resume-email').disabled = !getProfileSocialLinks(resumeSnapshot.profile).email;
  document.getElementById('resume-accent').disabled = resumeOptions.template !== 'modern';
  const list = document.getElementById('resumeSectionList'); list.replaceChildren();
  const available = availableResumeSections();
  const order = resumeOptions.order.filter(key => available.includes(key));
  const selected = order.filter(key => resumeOptions.included.includes(key)).length;
  renderResumeReadiness(available,selected);
  order.forEach((key,index) => {
    const row = document.createElement('div'); row.className = 'resume-section-row';
    const label = document.createElement('label');
    const check = document.createElement('input'); check.type = 'checkbox'; check.checked = resumeOptions.included.includes(key);
    check.addEventListener('change', () => {
      resumeOptions.included = check.checked ? [...new Set([...resumeOptions.included,key])] : resumeOptions.included.filter(item => item !== key);
      renderResumePreview();
    });
    label.append(check,document.createTextNode(RESUME_SECTIONS[key])); row.append(label);
    for (const direction of [-1,1]) {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = direction === -1 ? '↑' : '↓';
      button.setAttribute('aria-label',`Move ${RESUME_SECTIONS[key]} ${direction === -1 ? 'up' : 'down'}`);
      button.dataset.orderKey = key; button.dataset.direction = direction;
      button.disabled = direction === -1 ? index === 0 : index === order.length - 1;
      button.addEventListener('click', () => {
        const next = order[index + direction]; const a = resumeOptions.order.indexOf(key); const b = resumeOptions.order.indexOf(next);
        [resumeOptions.order[a],resumeOptions.order[b]] = [resumeOptions.order[b],resumeOptions.order[a]];
        renderResumeControls(); renderResumePreview();
        const restored = list.querySelector(`[data-order-key="${key}"][data-direction="${direction}"]`);
        (restored?.disabled ? restored.parentElement.querySelector('input') : restored)?.focus();
      }); row.append(button);
    }
    list.append(row);
  });
}
function selectResumeTemplate(template) {
  if (!resumeOwnerMode || !resumeOptions || !['ats','modern'].includes(template)) return;
  resumeOptions.template = template;
  renderResumeControls(); renderResumePreview();
}
function applyResumeSectionPreset(preset) {
  if (!resumeOwnerMode || !resumeOptions) return;
  const available = availableResumeSections();
  const preferred = preset === 'essential' ? ['summary','skills','education','projects'] : ['summary','education','skills','projects','certificates'];
  resumeOptions.included = preferred.filter(key => available.includes(key));
  if (preset === 'compact') {
    resumeOptions.template = 'ats';
    resumeOptions.density = 'compact';
    resumeOptions.maxProjects = Math.min(3,resumeOptions.maxProjects);
    resumeOptions.maxCertificates = Math.min(3,resumeOptions.maxCertificates);
    productStatus('resumeStatus','Compact layout applied. Check the live page count before exporting.',true);
  }
  renderResumeControls(); renderResumePreview();
}
function getResumeReadiness(available) {
  const profile = resumeSnapshot.profile;
  const links = getProfileSocialLinks(profile);
  const checks = [
    [Boolean(profile.display_name?.trim()),20,'Add your display name'],
    [available.includes('summary'),20,'Add a short professional summary'],
    [available.includes('skills'),15,'Add your technical skills'],
    [available.includes('projects'),20,'Add at least one project'],
    [available.includes('education'),15,'Add your education'],
    [Boolean(links.email || links.github || links.linkedin),10,'Add a public contact link']
  ];
  return {score:checks.reduce((sum,[ready,points])=>sum+(ready?points:0),0),missing:checks.filter(([ready])=>!ready).map(([, ,message])=>message)};
}
function renderResumeReadiness(available,selected) {
  const summary = document.getElementById('resumeDataSummary');
  const readiness = getResumeReadiness(available);
  summary.replaceChildren();
  const heading = document.createElement('div'); heading.className = 'resume-readiness-heading';
  const title = document.createElement('strong'); title.textContent = `Resume readiness ${readiness.score}%`;
  const meta = document.createElement('span'); meta.textContent = `${selected}/${available.length} sections selected`;
  heading.append(title,meta);
  const track = document.createElement('div'); track.className = 'resume-readiness-track'; track.setAttribute('role','progressbar'); track.setAttribute('aria-label','Resume readiness'); track.setAttribute('aria-valuenow',String(readiness.score)); track.setAttribute('aria-valuemin','0'); track.setAttribute('aria-valuemax','100');
  const bar = document.createElement('span'); bar.style.width = readiness.score + '%'; track.append(bar);
  const note = document.createElement('p'); note.textContent = readiness.missing[0] || `${resumeOptions.template === 'ats' ? 'ATS optimized' : 'Modern layout'} · ready to export`;
  summary.append(heading,track,note);
}
function resetResumePreferences() {
  if (!resumeOwnerMode || !resumeSnapshot) return;
  resumeOptions = normalizeResumeSettings(resumeSnapshot.profile.resume_settings);
  renderResumeControls(); renderResumePreview();
  productStatus('resumeStatus','Unsaved changes reset to your saved resume preferences.',true);
}
function scrollResumePreviewIntoView() {
  document.querySelector('.resume-workspace')?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',block:'start'});
}
function changeResumeOption(event) {
  if (!resumeOwnerMode || !resumeOptions) return;
  const input = event.target; const key = input.dataset.resumeOption;
  if (!key) return;
  resumeOptions[key] = input.type === 'checkbox' ? input.checked : input.value;
  resumeOptions = normalizeResumeSettings(resumeOptions);
  document.getElementById('resume-accent').disabled = resumeOptions.template !== 'modern';
  renderResumePreview();
}
function buildResumeStudioDocument(snapshot, options) {
  // Reuse the original CV data mapping, escaping, dates, public-contact helpers.
  const profile = structuredClone(snapshot.profile);
  profile.social_links = {...profile.social_links};
  if (!options.email) { profile.public_email = null; delete profile.social_links.email; }
  if (!options.github) { profile.github_url = null; delete profile.social_links.github; }
  if (!options.linkedin) { profile.linkedin_url = null; delete profile.social_links.linkedin; }
  const sections = {...snapshot.sections,projects:snapshot.sections.projects.slice(0,options.maxProjects),certificates:snapshot.sections.certificates.slice(0,options.maxCertificates)};
  const doc = new DOMParser().parseFromString(buildPortfolioCvDocument(profile,sections),'text/html');
  doc.title = (profile.display_name || profile.username) + ' — Resume';
  const main = doc.querySelector('main');
  const headings = {'Profile':'summary','Technical skills':'skills','Education':'education','Projects':'projects','Practical labs':'labs','Certificates':'certificates','Achievements':'achievements'};
  const mapped = new Map([...main.children].map(section => [headings[section.querySelector('h2')?.textContent],section]));
  function extraSection(key,title,rows) {
    if (!rows.length) return;
    const section = doc.createElement('section'); const h2 = doc.createElement('h2'); h2.textContent = title; section.append(h2,...rows); mapped.set(key,section);
  }
  extraSection('learning','Learning',sections.learning.map(item => {
    const article = doc.createElement('article');
    const date = doc.createElement('h3'); date.textContent = formatLearningPostDate(item.post_date);
    const text = doc.createElement('p'); text.textContent = item.content || ''; text.dir = 'auto'; article.append(date,text); return article;
  }));
  const github = getGitHubUsernameForProfile(snapshot.profile);
  if (github) {
    const p = doc.createElement('p'); const a = doc.createElement('a'); a.href = 'https://github.com/' + encodeURIComponent(github); a.textContent = a.href; p.append(a);
    extraSection('github','GitHub',[p]);
  }
  main.replaceChildren(...options.order.filter(key => options.included.includes(key) && mapped.has(key)).map(key => mapped.get(key)));
  if (options.photo && profile.image_path) {
    const image = doc.createElement('img'); image.src = getProfileImageURL(profile.image_path); image.alt = ''; image.className = 'resume-photo'; doc.querySelector('header').prepend(image);
  }
  const accent = options.template === 'ats' ? '#111111' : {teal:'#185b60',purple:'#68449a',blue:'#225d8a'}[options.accent];
  const style = doc.createElement('style');
  const compact = options.density === 'compact';
  style.textContent = `@page{size:A4;margin:0}html{background:#171820}body{padding:0;margin:0;width:210mm;max-width:none;font:${compact ? '9.5pt/1.38' : '10.5pt/1.5'} Arial,Tahoma,sans-serif;color:#171717;background:transparent;overflow-wrap:anywhere}header{border-bottom:${options.template === 'modern' ? '3px' : '1px'} solid ${accent};margin:0 0 ${compact ? '4mm' : '6mm'};padding:0 0 ${compact ? '3.5mm' : '5mm'};min-height:18mm}h1,h2,h3,a{color:${accent}}h1{font-size:${compact ? '23pt' : '26pt'}}h2{letter-spacing:${options.template === 'ats' ? '.2px' : '1px'};margin:${compact ? '3.5mm 0 2mm' : '5mm 0 3mm'};font-size:11pt;border-color:#ccc}h3{font-size:10.5pt}article{margin-bottom:${compact ? '2.5mm' : '4mm'}}p{white-space:pre-line;orphans:3;widows:3}.meta,.specialty{color:#444}.resume-page{width:210mm;height:297mm;padding:${compact ? '13mm 15mm' : '17mm 18mm'};background:#fff;margin:0 0 18px;box-sizing:border-box;box-shadow:0 4px 24px #0006;break-after:page;page-break-after:always;overflow:visible}.resume-page:last-child{break-after:auto;page-break-after:auto;margin-bottom:0}.resume-photo{width:22mm;height:22mm;object-fit:cover;float:right;margin:0 0 3mm 5mm}.resume-page h2{break-after:avoid}.resume-page article{break-inside:avoid}.contacts{font-size:9pt;gap:2mm 4mm}footer{margin-top:${compact ? '3mm' : '5mm'}} @media print{html,body{background:white;width:auto;margin:0;padding:0;max-width:none}.resume-page{box-shadow:none;margin:0;width:210mm;height:297mm;print-color-adjust:exact;-webkit-print-color-adjust:exact}h1{font-size:${compact ? '23pt' : '26pt'}}body{font-size:${compact ? '9.5pt' : '10.5pt'}}}`;
  doc.head.append(style);
  return '<!DOCTYPE html>' + doc.documentElement.outerHTML;
}
function paginateResume(doc) {
  const source = [doc.querySelector('header')];
  doc.querySelectorAll('main>section').forEach(section => source.push(...section.children));
  source.push(doc.querySelector('footer'));
  doc.body.replaceChildren();
  let page;
  const newPage = () => { page = doc.createElement('div'); page.className = 'resume-page'; doc.body.append(page); return page; };
  newPage();
  const capacity = () => page.getBoundingClientRect().bottom - parseFloat(doc.defaultView.getComputedStyle(page).paddingBottom);
  const fits = element => element.getBoundingClientRect().bottom <= capacity() + .5;
  function appendBlock(block) {
    if (!block) return;
    page.append(block);
    if (fits(block)) return;
    const blockHeight = block.getBoundingClientRect().height;
    const pageStyle = doc.defaultView.getComputedStyle(page);
    const fullCapacity = page.clientHeight - parseFloat(pageStyle.paddingTop) - parseFloat(pageStyle.paddingBottom);
    block.remove();
    if (blockHeight <= fullCapacity && page.children.length) {
      const orphanHeading = page.lastElementChild?.tagName === 'H2' ? page.lastElementChild : null;
      orphanHeading?.remove();
      if (page.children.length) newPage();
      if (orphanHeading) page.append(orphanHeading);
      page.append(block);
      if (fits(block)) return;
      block.remove();
    }
    // Oversized entries are allowed to continue across pages, preserving all text.
    if (block.children.length && ['ARTICLE','HEADER'].includes(block.tagName)) {
      [...block.children].forEach(appendBlock); return;
    }
    const words = block.textContent.split(/\s+/).filter(Boolean);
    if (!words.length) return;
    let start = 0;
    while (start < words.length) {
      const fragment = block.cloneNode(false); page.append(fragment);
      let low = 1, high = words.length - start, best = 0;
      while (low <= high) {
        const count = Math.floor((low + high)/2); fragment.textContent = words.slice(start,start+count).join(' ');
        if (fits(fragment)) { best=count; low=count+1; } else high=count-1;
      }
      if (!best) { fragment.remove(); if (!page.children.length) throw new Error('Resume content could not fit the page.'); newPage(); continue; }
      fragment.textContent = words.slice(start,start+best).join(' '); start += best;
      if (start < words.length) newPage();
    }
  }
  source.forEach((block,index) => {
    if (block?.tagName === 'H2') {
      page.append(block);
      const next = source[index+1];
      const probe = next?.cloneNode(true);
      if (probe) page.append(probe);
      const enough = block.getBoundingClientRect().bottom + Math.min(probe?.getBoundingClientRect().height || 50,100) <= capacity();
      probe?.remove(); block.remove();
      if (!enough && page.children.length) newPage();
    }
    appendBlock(block);
  });
  return doc.querySelectorAll('.resume-page').length;
}
function fitResumePreview() {
  const frame = document.getElementById('portfolioCvFrame'); const shell = document.getElementById('resumePaper');
  if (!frame?.contentDocument?.body || !shell) return;
  const width = 210 * 96 / 25.4;
  const scale = Math.min(1,shell.clientWidth / width);
  const height = frame.contentDocument.body.scrollHeight;
  frame.style.width = width + 'px'; frame.style.height = height + 'px'; frame.style.transform = `scale(${scale})`;
  shell.style.height = (height * scale) + 'px';
}
function renderResumePreview() {
  if (!resumeSnapshot) return;
  resumePreviewReady = false;
  const revision = ++resumeRevision;
  const frame = document.getElementById('portfolioCvFrame'); const print = document.getElementById('printPortfolioCvButton'); print.disabled = true;
  frame.onload = async () => {
    if (revision !== resumeRevision || !frame.contentDocument?.body) return;
    try {
      await frame.contentDocument.fonts.ready;
      if (revision !== resumeRevision) return;
      const count = paginateResume(frame.contentDocument);
      fitResumePreview();
      resumePreviewReady = true; print.disabled = false;
      document.getElementById('resumePages').textContent = `${count} A4 page${count === 1 ? '' : 's'} · ${resumeOptions.template === 'ats' ? 'ATS' : 'Modern'} · ${resumeOptions.density === 'compact' ? 'Compact' : 'Comfortable'}`;
    } catch { productStatus('resumeStatus','Could not lay out this resume. Reduce the selected content and retry.'); }
  };
  frame.srcdoc = buildResumeStudioDocument(resumeSnapshot,resumeOptions);
}
async function saveResumePreferences() {
  if (!resumeOwnerMode || !resumeSnapshot || !requireAccount() || currentUser.id !== resumeSnapshot.profile.user_id) return;
  const owner = currentUser.id; const button = document.getElementById('resumeSave'); button.disabled = true;
  const options = normalizeResumeSettings(resumeOptions);
  try {
    const {data,error} = await supabaseClient.from('profiles').update({resume_settings:options}).eq('user_id',owner).select('*').single();
    if (error) throw error;
    if (currentUser?.id !== owner) return;
    signedInProfile = data;
    if (activePortfolioUserId === owner) currentProfile.resume_settings = options;
    if (resumeSnapshot?.profile.user_id === owner) resumeSnapshot.profile.resume_settings = options;
    syncResumeButton(); productStatus('resumeStatus','Resume preferences saved. Your portfolio section order is unchanged.',true);
  } catch { productStatus('resumeStatus','Could not save. Verify sql/resume_settings_migration.sql is installed and try again.'); }
  finally { button.disabled = false; }
}
function printPortfolioCv() {
  if (!resumePreviewReady || !resumeSnapshot) return;
  const frame = document.getElementById('portfolioCvFrame');
  productStatus('resumeStatus','In the print dialog, select Save as PDF as the destination. A4 pages are already prepared.');
  frame.contentWindow.focus(); frame.contentWindow.print();
}
function clearResumePreview() {
  ++resumeRequest; ++resumeRevision; resumePreviewReady = false; resumeSnapshot = null; resumeOptions = null;
  const frame = document.getElementById('portfolioCvFrame'); frame.onload = null; frame.srcdoc = '';
}
function closePortfolioCv() { closeProductDialog('portfolioCvDialog'); }
