/* Studio edits are local. Portfolio data is refreshed once per open, never per control. */
const RESUME_SECTIONS = {summary:'Summary',experience:'Experience',education:'Education',skills:'Skills / Tech Stack',projects:'Projects',certificates:'Certificates',labs:'Labs',achievements:'Achievements',github:'GitHub',learning:'Learning'};
const RESUME_DEFAULT_ORDER = Object.keys(RESUME_SECTIONS);
const RESUME_STEPS = ['content','experience','sections','design','review'];
let resumeSnapshot = null;
let resumeOptions = null;
let resumeOwnerMode = false;
let resumeRequest = 0;
let resumeRevision = 0;
let resumePreviewReady = false;
let resumeCurrentStep = 'content';
let resumeJobDescription = '';
let resumeLastPageCount = 0;
let resumeContentPersistenceAvailable = false;
function cleanResumeText(value,maxLength) {
  return String(value ?? '').replace(/\u0000/g,'').trim().slice(0,maxLength);
}
function normalizeResumeExperience(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0,6).map((item,index) => ({
    id: cleanResumeText(item?.id,80) || `experience-${Date.now()}-${index}`,
    role: cleanResumeText(item?.role,160),
    organization: cleanResumeText(item?.organization,160),
    location: cleanResumeText(item?.location,120),
    start: /^\d{4}-\d{2}$/.test(String(item?.start || '')) ? item.start : '',
    end: /^\d{4}-\d{2}$/.test(String(item?.end || '')) ? item.end : '',
    current: item?.current === true,
    highlights: cleanResumeText(item?.highlights,900)
  })).filter(item => item.role || item.organization || item.highlights);
}
function normalizeResumeSettings(value) {
  const input = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const storedOrder = Array.isArray(input.order) ? [...new Set(input.order.filter(key => RESUME_DEFAULT_ORDER.includes(key)))] : [];
  const order = storedOrder.length ? [...storedOrder] : RESUME_DEFAULT_ORDER.slice();
  if (!order.includes('experience')) order.splice(Math.max(1,order.indexOf('summary') + 1),0,'experience');
  RESUME_DEFAULT_ORDER.forEach(key => { if (!order.includes(key)) order.push(key); });
  const defaultIncluded = ['summary','experience','education','skills','projects','certificates'];
  const included = Array.isArray(input.included) ? [...new Set(input.included.filter(key => RESUME_DEFAULT_ORDER.includes(key)))] : defaultIncluded;
  const prioritySkills = Array.isArray(input.prioritySkills)
    ? [...new Set(input.prioritySkills.map(item => cleanResumeText(item,60)).filter(Boolean))].slice(0,40)
    : cleanResumeText(input.prioritySkillsText,900).split(',').map(item => cleanResumeText(item,60)).filter(Boolean).slice(0,40);
  return {
    public: input.public === true, template: input.template === 'modern' ? 'modern' : 'ats',
    photo: input.photo === true, email: input.email === true, github: input.github !== false, linkedin: input.linkedin !== false,
    maxProjects: Math.max(1,Math.min(30,Math.floor(Number(input.maxProjects) || 5))),
    maxCertificates: Math.max(1,Math.min(30,Math.floor(Number(input.maxCertificates) || 5))),
    accent: ['teal','purple','blue'].includes(input.accent) ? input.accent : 'teal',
    density: input.density === 'compact' ? 'compact' : 'comfortable',
    onePage: input.onePage === true,
    targetRole: cleanResumeText(input.targetRole,120),
    summary: cleanResumeText(input.summary,1200),
    prioritySkills,
    experience: normalizeResumeExperience(input.experience),
    readiness: Math.max(0,Math.min(100,Math.round(Number(input.readiness) || 0))),
    included, order
  };
}
function getResumePreferenceRecord(options) {
  return {
    public:options.public,template:options.template,photo:options.photo,email:options.email,github:options.github,linkedin:options.linkedin,
    maxProjects:options.maxProjects,maxCertificates:options.maxCertificates,accent:options.accent,density:options.density,onePage:options.onePage,
    included:[...options.included],order:[...options.order],readiness:options.readiness
  };
}
function getResumeDocumentRecord(options,userId) {
  return {user_id:userId,target_role:options.targetRole,summary:options.summary,priority_skills:[...options.prioritySkills],experience:normalizeResumeExperience(options.experience),updated_at:new Date().toISOString()};
}
function syncResumeButton() {
  const button = document.getElementById('downloadCvButton');
  if (!button) return;
  const owner = requireAccount() && activePortfolioUserId === currentUser.id;
  button.hidden = !owner && !(currentProfile?.is_public === true && normalizeResumeSettings(currentProfile?.resume_settings).public);
  button.classList.toggle('resume-studio-trigger', owner);
  button.replaceChildren();
  if (owner) {
    const saved = normalizeResumeSettings(currentProfile?.resume_settings);
    const icon = document.createElement('span'); icon.className = 'resume-trigger-icon'; icon.setAttribute('aria-hidden','true'); icon.textContent = '▤';
    const copy = document.createElement('span'); copy.className = 'resume-trigger-copy';
    const title = document.createElement('strong'); title.textContent = 'Resume Studio';
    const detail = document.createElement('small'); detail.textContent = saved.readiness ? `${saved.template === 'ats' ? 'ATS' : 'Modern'} · ${saved.readiness}% ready` : 'Build a tailored resume from your portfolio';
    const progress = document.createElement('span'); progress.className = 'resume-trigger-progress'; progress.setAttribute('aria-hidden','true');
    const progressBar = document.createElement('i'); progressBar.style.width = `${saved.readiness}%`; progress.append(progressBar); copy.append(title,detail,progress);
    const arrow = document.createElement('span'); arrow.className = 'resume-trigger-arrow'; arrow.setAttribute('aria-hidden','true'); arrow.textContent = '→';
    button.append(icon,copy,arrow); button.setAttribute('aria-label',`Open Resume Studio. ${saved.readiness || 0}% ready.`);
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
    const [profileResult,resumeDocumentResult,...results] = await Promise.all([
      supabaseClient.from('profiles').select('*').eq('user_id',owner).single(),
      supabaseClient.from('resume_documents').select('target_role,summary,priority_skills,experience,updated_at').eq('user_id',owner).maybeSingle(),
      ...tables.map(table => supabaseClient.from(table).select('*').eq('user_id',owner).order('created_at',{ascending:false}))
    ]);
    if (request !== resumeRequest || activePortfolioUserId !== owner || (editing && currentUser?.id !== owner)) return;
    if (profileResult.error || results.some(result => result.error)) throw new Error('Could not load all resume data. Please try again.');
    const profile = profileResult.data;
    if (!editing && !(profile.is_public === true && normalizeResumeSettings(profile.resume_settings).public)) throw new Error('This owner has disabled public resume access.');
    const byDate = (items,field) => [...items].sort((a,b) => String(b[field] || '').localeCompare(String(a[field] || '')));
    const resumeDocument = resumeDocumentResult.error ? null : resumeDocumentResult.data;
    resumeContentPersistenceAvailable = !resumeDocumentResult.error;
    resumeSnapshot = {profile:structuredClone(profile),resumeDocument:structuredClone(resumeDocument),sections:{
      projects: results[0].data || [], labs: results[1].data || [], education:byDate(results[2].data || [],'graduation_date'),
      certificates:byDate(results[3].data || [],'certificate_date'), achievements:byDate(results[4].data || [],'badge_date'), learning:byDate(results[5].data || [],'post_date')
    }};
    resumeOptions = normalizeResumeSettings({...profile.resume_settings,
      targetRole:resumeDocument?.target_role,summary:resumeDocument?.summary,prioritySkills:resumeDocument?.priority_skills,experience:resumeDocument?.experience});
    resumeOwnerMode = editing;
    resumeCurrentStep = 'content';
    resumeJobDescription = '';
    resumeLastPageCount = 0;
    document.getElementById('portfolioCvHeading').textContent = editing ? 'Resume Studio' : 'Download Resume';
    document.getElementById('resumeControls').hidden = !editing;
    document.getElementById('resumeSave').hidden = !editing;
    document.getElementById('resumeReset').hidden = !editing;
    document.getElementById('resumeSave').disabled = !('resume_settings' in profile) || !resumeContentPersistenceAvailable;
    document.getElementById('resumeMigrationNote').hidden = !editing || (('resume_settings' in profile) && resumeContentPersistenceAvailable);
    document.getElementById('resumeStudioBody').classList.toggle('public-resume',!editing);
    document.getElementById('resumeJobDescription').value = '';
    document.getElementById('resumeKeywordResults').replaceChildren();
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
  return RESUME_DEFAULT_ORDER.filter(key => key === 'summary'
    ? Boolean(resumeOptions?.summary || profile.bio?.trim() || profile.description?.trim())
    : key === 'experience' ? Boolean(resumeOptions?.experience?.some(item => item.role || item.organization || item.highlights))
    : key === 'skills' ? Boolean(resumeOptions?.prioritySkills?.length || profile.tech_stack?.length)
    : key === 'github' ? Boolean(getGitHubUsernameForProfile(profile))
    : Boolean(sections[key]?.length));
}
function renderResumeControls() {
  if (!resumeOptions) return;
  for (const key of ['template','maxProjects','maxCertificates','accent','density']) document.getElementById('resume-' + key).value = resumeOptions[key];
  for (const key of ['photo','email','github','linkedin','public','onePage']) document.getElementById('resume-' + key).checked = resumeOptions[key];
  document.getElementById('resume-targetRole').value = resumeOptions.targetRole;
  document.getElementById('resume-summary').value = resumeOptions.summary;
  document.getElementById('resume-prioritySkills').value = resumeOptions.prioritySkills.join(', ');
  document.getElementById('resumeSummaryCount').textContent = `${resumeOptions.summary.length}/1200`;
  document.querySelectorAll('[data-resume-template]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.resumeTemplate === resumeOptions.template)));
  document.getElementById('resume-public').disabled = !('resume_settings' in resumeSnapshot.profile);
  document.getElementById('resume-photo').disabled = !resumeSnapshot.profile.image_path;
  document.getElementById('resume-email').disabled = !getProfileSocialLinks(resumeSnapshot.profile).email;
  document.getElementById('resume-accent').disabled = resumeOptions.template !== 'modern';
  renderResumeExperience();
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
  renderResumeAtsChecklist();
  setResumeStep(resumeCurrentStep,false);
}
function setResumeStep(step,focusStep = true) {
  if (!RESUME_STEPS.includes(step)) return;
  resumeCurrentStep = step;
  document.querySelectorAll('[data-resume-step-panel]').forEach(panel => { panel.hidden = panel.dataset.resumeStepPanel !== step; });
  document.querySelectorAll('[data-resume-step-button]').forEach(button => {
    const active = button.dataset.resumeStepButton === step;
    if (active) button.setAttribute('aria-current','step'); else button.removeAttribute('aria-current');
  });
  const index = RESUME_STEPS.indexOf(step);
  const back = document.getElementById('resumeStepBack');
  const next = document.getElementById('resumeStepNext');
  back.hidden = index === 0;
  next.hidden = index === RESUME_STEPS.length - 1;
  if (!next.hidden) next.textContent = `Next: ${RESUME_SECTIONS[RESUME_STEPS[index + 1]] || RESUME_STEPS[index + 1][0].toUpperCase() + RESUME_STEPS[index + 1].slice(1)}`;
  if (focusStep) document.querySelector(`[data-resume-step-button="${step}"]`)?.focus();
}
function moveResumeStep(direction) {
  const next = RESUME_STEPS[RESUME_STEPS.indexOf(resumeCurrentStep) + direction];
  if (next) setResumeStep(next);
}
function renderResumeExperience() {
  const list = document.getElementById('resumeExperienceList');
  if (!list || !resumeOptions) return;
  list.replaceChildren();
  if (!resumeOptions.experience.length) {
    const empty = document.createElement('p'); empty.className = 'resume-empty-note'; empty.textContent = 'No experience added yet. Add only work you have actually completed.'; list.append(empty); return;
  }
  resumeOptions.experience.forEach((item,index) => {
    const card = document.createElement('article'); card.className = 'resume-experience-card';
    const heading = document.createElement('div'); heading.className = 'resume-experience-heading';
    const title = document.createElement('strong'); title.textContent = item.role || item.organization || `Experience ${index + 1}`;
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'resume-remove-experience'; remove.textContent = 'Remove'; remove.setAttribute('aria-label',`Remove ${title.textContent}`); remove.addEventListener('click',() => removeResumeExperience(index));
    heading.append(title,remove); card.append(heading);
    const addField = (labelText,key,type = 'text',maxLength = 160) => {
      const label = document.createElement('label'); label.textContent = labelText;
      const input = document.createElement('input'); input.type = type; input.value = item[key] || ''; if (type === 'text') input.maxLength = maxLength;
      input.addEventListener('input',() => { item[key] = type === 'month' ? input.value : cleanResumeText(input.value,maxLength); title.textContent = item.role || item.organization || `Experience ${index + 1}`; renderResumePreview(); renderResumeAtsChecklist(); });
      input.addEventListener('change',() => renderResumeControls());
      label.append(input); card.append(label); return input;
    };
    addField('Role', 'role'); addField('Organization', 'organization'); addField('Location', 'location', 'text', 120);
    const dates = document.createElement('div'); dates.className = 'resume-experience-dates';
    const startWrap = document.createElement('label'); startWrap.textContent = 'Start'; const start = document.createElement('input'); start.type = 'month'; start.value = item.start; start.addEventListener('input',() => { item.start = start.value; renderResumePreview(); }); startWrap.append(start);
    const endWrap = document.createElement('label'); endWrap.textContent = 'End'; const end = document.createElement('input'); end.type = 'month'; end.value = item.end; end.disabled = item.current; end.addEventListener('input',() => { item.end = end.value; renderResumePreview(); }); endWrap.append(end); dates.append(startWrap,endWrap); card.append(dates);
    const currentLabel = document.createElement('label'); currentLabel.className = 'product-check'; const current = document.createElement('input'); current.type = 'checkbox'; current.checked = item.current; current.addEventListener('change',() => { item.current = current.checked; if (item.current) item.end = ''; renderResumeExperience(); renderResumePreview(); }); currentLabel.append(current,document.createTextNode('I currently work here')); card.append(currentLabel);
    const highlightsLabel = document.createElement('label'); highlightsLabel.textContent = 'Achievements and responsibilities'; const highlights = document.createElement('textarea'); highlights.rows = 5; highlights.maxLength = 900; highlights.placeholder = 'Use one result-focused bullet per line.'; highlights.value = item.highlights; highlights.addEventListener('input',() => { item.highlights = cleanResumeText(highlights.value,900); renderResumePreview(); renderResumeAtsChecklist(); }); highlights.addEventListener('change',() => renderResumeControls()); highlightsLabel.append(highlights); card.append(highlightsLabel);
    list.append(card);
  });
}
function addResumeExperience() {
  if (!resumeOwnerMode || !resumeOptions || resumeOptions.experience.length >= 6) { productStatus('resumeStatus','You can add up to six focused experience entries.'); return; }
  resumeOptions.experience.push({id:`experience-${Date.now()}`,role:'',organization:'',location:'',start:'',end:'',current:false,highlights:''});
  if (!resumeOptions.included.includes('experience')) resumeOptions.included.push('experience');
  renderResumeControls(); renderResumePreview();
  document.querySelector('#resumeExperienceList article:last-child input')?.focus();
}
function removeResumeExperience(index) {
  if (!resumeOwnerMode || !resumeOptions?.experience[index]) return;
  resumeOptions.experience.splice(index,1); renderResumeControls(); renderResumePreview();
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
    [Boolean(profile.display_name?.trim()),10,'Identity','Add your display name'],
    [Boolean(resumeOptions.targetRole),10,'Target role','Add the role you are targeting'],
    [available.includes('summary') && (resumeOptions.summary || profile.bio || '').trim().length >= 40,15,'Summary','Write a focused summary of at least 40 characters'],
    [available.includes('skills') && new Set([...resumeOptions.prioritySkills,...(profile.tech_stack || [])].map(item => String(item).toLocaleLowerCase())).size >= 3,15,'Skills','Add at least three relevant skills'],
    [available.includes('projects'),15,'Projects','Add at least one project'],
    [available.includes('experience') || available.includes('education'),15,'Background','Add education or real experience'],
    [Boolean(links.email || links.github || links.linkedin),10,'Contact','Add a public contact link'],
    [resumeOptions.included.filter(key => available.includes(key)).length >= 3,10,'Structure','Select at least three useful sections']
  ];
  return {score:checks.reduce((sum,[ready,points])=>sum+(ready?points:0),0),missing:checks.filter(([ready])=>!ready).map(([, , ,message])=>message),checks};
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
function renderResumeAtsChecklist() {
  const host = document.getElementById('resumeAtsChecklist');
  if (!host || !resumeSnapshot || !resumeOptions) return;
  const readiness = getResumeReadiness(availableResumeSections());
  host.replaceChildren();
  const heading = document.createElement('div'); heading.className = 'resume-ats-score';
  const score = document.createElement('strong'); score.textContent = `${readiness.score}%`;
  const copy = document.createElement('span'); copy.textContent = readiness.score >= 85 ? 'Strong foundation' : readiness.score >= 65 ? 'Good start — finish the open checks' : 'Complete the essentials before exporting'; heading.append(score,copy); host.append(heading);
  const list = document.createElement('ul');
  readiness.checks.forEach(([ready,,label,message]) => { const item = document.createElement('li'); item.className = ready ? 'is-ready' : 'needs-work'; const mark = document.createElement('span'); mark.textContent = ready ? '✓' : '!'; const text = document.createElement('span'); const strong = document.createElement('strong'); strong.textContent = label; text.append(strong,document.createTextNode(ready ? ' Ready' : ` ${message}`)); item.append(mark,text); list.append(item); });
  host.append(list);
}
function resumeWords(value) {
  return String(value || '').toLocaleLowerCase().match(/[\p{L}\p{N}+#.]{3,}/gu) || [];
}
function getResumeCorpus() {
  if (!resumeSnapshot || !resumeOptions) return '';
  const {profile,sections} = resumeSnapshot;
  return [profile.display_name,resumeOptions.targetRole,resumeOptions.summary || profile.bio,resumeOptions.prioritySkills.join(' '),...(profile.tech_stack || []),
    ...resumeOptions.experience.flatMap(item => [item.role,item.organization,item.highlights]),
    ...sections.projects.flatMap(item => [item.title,item.description,(item.tags || []).join(' ')]),
    ...sections.education.flatMap(item => [item.degree,item.field_of_study,item.institution])].join(' ');
}
function analyzeResumeForJob() {
  if (!resumeOwnerMode || !resumeOptions) return;
  const input = document.getElementById('resumeJobDescription');
  const host = document.getElementById('resumeKeywordResults');
  resumeJobDescription = cleanResumeText(input.value,8000);
  host.replaceChildren();
  if (resumeJobDescription.length < 80) { const note = document.createElement('p'); note.textContent = 'Paste a fuller job description to get a useful comparison.'; host.append(note); return; }
  const stop = new Set(['with','this','that','from','your','will','have','into','using','work','team','role','about','their','they','them','what','when','where','which','also','must','plus','years','year','على','إلى','الى','التي','الذي','هذه','هذا','ضمن','مع','عن','من','في','أو','and','the','for','you','our','are']);
  const counts = new Map(); resumeWords(resumeJobDescription).forEach(word => { if (!stop.has(word)) counts.set(word,(counts.get(word) || 0) + 1); });
  const keywords = [...counts].sort((a,b) => b[1] - a[1] || b[0].length - a[0].length).slice(0,24).map(([word]) => word);
  const corpus = new Set(resumeWords(getResumeCorpus()));
  const matched = keywords.filter(word => corpus.has(word));
  const missing = keywords.filter(word => !corpus.has(word));
  const percent = keywords.length ? Math.round(matched.length / keywords.length * 100) : 0;
  const heading = document.createElement('div'); heading.className = 'resume-keyword-score'; const strong = document.createElement('strong'); strong.textContent = `${percent}%`; const copy = document.createElement('span'); copy.textContent = 'keyword match'; heading.append(strong,copy); host.append(heading);
  const addGroup = (title,words,className) => { const group = document.createElement('div'); group.className = `resume-keyword-group ${className}`; const h4 = document.createElement('h4'); h4.textContent = title; const chips = document.createElement('div'); words.slice(0,12).forEach(word => { const chip = document.createElement('span'); chip.textContent = word; chips.append(chip); }); if (!words.length) { const empty = document.createElement('p'); empty.textContent = 'None'; chips.append(empty); } group.append(h4,chips); host.append(group); };
  addGroup('Matched',matched,'matched'); addGroup('Review for relevance',missing,'missing');
  const note = document.createElement('p'); note.textContent = 'Use missing terms only when they truthfully describe your skills or experience. This local check does not guarantee ATS ranking.'; host.append(note);
}
function resetResumePreferences() {
  if (!resumeOwnerMode || !resumeSnapshot) return;
  const document = resumeSnapshot.resumeDocument;
  resumeOptions = normalizeResumeSettings({...resumeSnapshot.profile.resume_settings,
    targetRole:document?.target_role,summary:document?.summary,prioritySkills:document?.priority_skills,experience:document?.experience});
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
  if (key === 'prioritySkillsText') resumeOptions.prioritySkills = [...new Set(input.value.split(',').map(item => cleanResumeText(item,60)).filter(Boolean))].slice(0,40);
  else resumeOptions[key] = input.type === 'checkbox' ? input.checked : input.value;
  resumeOptions = normalizeResumeSettings(resumeOptions);
  document.getElementById('resume-accent').disabled = resumeOptions.template !== 'modern';
  document.getElementById('resumeSummaryCount').textContent = `${resumeOptions.summary.length}/1200`;
  renderResumeReadiness(availableResumeSections(),resumeOptions.included.filter(key => availableResumeSections().includes(key)).length);
  renderResumeAtsChecklist();
  renderResumePreview();
}
function fitResumeToOnePage() {
  if (!resumeOwnerMode || !resumeOptions) return;
  resumeOptions.onePage = true;
  resumeOptions.density = 'compact';
  resumeOptions.maxProjects = Math.min(3,resumeOptions.maxProjects);
  resumeOptions.maxCertificates = Math.min(3,resumeOptions.maxCertificates);
  renderResumeControls(); renderResumePreview();
  productStatus('resumeStatus','One-page mode applied. The preview will confirm whether the selected content fits.',true);
}
function buildResumeStudioDocument(snapshot, options) {
  // Reuse the original CV data mapping, escaping, dates, public-contact helpers.
  const profile = structuredClone(snapshot.profile);
  profile.social_links = {...profile.social_links};
  const resumeSummary = options.onePage ? cleanResumeText(options.summary || profile.bio || profile.description,600) : options.summary;
  if (resumeSummary) { profile.bio = resumeSummary; profile.description = resumeSummary; }
  const portfolioSkills = Array.isArray(profile.tech_stack) ? profile.tech_stack.filter(item => typeof item === 'string' && item.trim()) : [];
  const priorityLookup = new Set(options.prioritySkills.map(item => item.toLocaleLowerCase()));
  profile.tech_stack = [...options.prioritySkills,...portfolioSkills.filter(item => !priorityLookup.has(item.toLocaleLowerCase()))];
  if (!options.email) { profile.public_email = null; delete profile.social_links.email; }
  if (!options.github) { profile.github_url = null; delete profile.social_links.github; }
  if (!options.linkedin) { profile.linkedin_url = null; delete profile.social_links.linkedin; }
  const onePageLimit = (value,max) => options.onePage ? cleanResumeText(value,max) : value;
  const copyEntry = (item,max) => ({...item,description:onePageLimit(item.description,max)});
  const sections = {...snapshot.sections,
    projects:snapshot.sections.projects.slice(0,options.onePage ? Math.min(3,options.maxProjects) : options.maxProjects).map(item => copyEntry(item,260)),
    certificates:snapshot.sections.certificates.slice(0,options.onePage ? Math.min(3,options.maxCertificates) : options.maxCertificates).map(item => copyEntry(item,180)),
    labs:snapshot.sections.labs.slice(0,options.onePage ? 2 : snapshot.sections.labs.length).map(item => copyEntry(item,220)),
    learning:snapshot.sections.learning.slice(0,options.onePage ? 2 : snapshot.sections.learning.length)
  };
  const doc = new DOMParser().parseFromString(buildPortfolioCvDocument(profile,sections),'text/html');
  doc.title = (profile.display_name || profile.username) + ' — Resume';
  doc.documentElement.lang = /[\u0600-\u06ff]/.test([options.targetRole,options.summary].join(' ')) ? 'ar' : 'en';
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
  const formatMonth = value => {
    if (!/^\d{4}-\d{2}$/.test(value || '')) return '';
    const parsed = new Date(`${value}-01T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? '' : parsed.toLocaleDateString('en',{month:'short',year:'numeric'});
  };
  extraSection('experience','Experience',options.experience.filter(item => item.role || item.organization || item.highlights).slice(0,options.onePage ? 3 : 6).map(item => {
    const article = doc.createElement('article');
    const h3 = doc.createElement('h3'); h3.dir = 'auto'; h3.textContent = [item.role,item.organization].filter(Boolean).join(' — ') || 'Experience'; article.append(h3);
    const period = [formatMonth(item.start),item.current ? 'Present' : formatMonth(item.end)].filter(Boolean).join(' – ');
    const metaText = [item.location,period].filter(Boolean).join(' · ');
    if (metaText) { const meta = doc.createElement('p'); meta.className = 'meta'; meta.dir = 'auto'; meta.textContent = metaText; article.append(meta); }
    const highlights = onePageLimit(item.highlights,520).split(/\r?\n/).map(line => line.replace(/^[•\-*]\s*/, '').trim()).filter(Boolean);
    if (highlights.length) { const ul = doc.createElement('ul'); highlights.forEach(line => { const li = doc.createElement('li'); li.dir = 'auto'; li.textContent = line; ul.append(li); }); article.append(ul); }
    return article;
  }));
  const github = getGitHubUsernameForProfile(snapshot.profile);
  if (github) {
    const p = doc.createElement('p'); const a = doc.createElement('a'); a.href = 'https://github.com/' + encodeURIComponent(github); a.textContent = a.href; p.append(a);
    extraSection('github','GitHub',[p]);
  }
  main.replaceChildren(...options.order.filter(key => options.included.includes(key) && mapped.has(key)).map(key => mapped.get(key)));
  if (options.targetRole) {
    let specialty = doc.querySelector('header .specialty');
    if (!specialty) { specialty = doc.createElement('p'); specialty.className = 'specialty'; doc.querySelector('header h1')?.after(specialty); }
    specialty.textContent = options.targetRole; specialty.dir = 'auto';
  }
  if (options.photo && profile.image_path) {
    const image = doc.createElement('img'); image.src = getProfileImageURL(profile.image_path); image.alt = ''; image.className = 'resume-photo'; doc.querySelector('header').prepend(image);
  }
  const accent = options.template === 'ats' ? '#111111' : {teal:'#185b60',purple:'#68449a',blue:'#225d8a'}[options.accent];
  const style = doc.createElement('style');
  const compact = options.density === 'compact' || options.onePage;
  const baseFont = options.onePage ? '8.6pt/1.28' : compact ? '9.5pt/1.38' : '10.5pt/1.5';
  const pagePadding = options.onePage ? '9mm 12mm' : compact ? '13mm 15mm' : '17mm 18mm';
  style.textContent = `@page{size:A4;margin:0}html{background:#171820}body{padding:0;margin:0;width:210mm;max-width:none;font:${baseFont} Arial,Tahoma,sans-serif;color:#171717;background:transparent;overflow-wrap:anywhere}header{border-bottom:${options.template === 'modern' ? '3px' : '1px'} solid ${accent};margin:0 0 ${options.onePage ? '2.5mm' : compact ? '4mm' : '6mm'};padding:0 0 ${options.onePage ? '2mm' : compact ? '3.5mm' : '5mm'};min-height:${options.onePage ? '13mm' : '18mm'}}h1,h2,h3,a{color:${accent}}h1{font-size:${options.onePage ? '20pt' : compact ? '23pt' : '26pt'}}h2{letter-spacing:${options.template === 'ats' ? '.2px' : '1px'};margin:${options.onePage ? '2.2mm 0 1.2mm' : compact ? '3.5mm 0 2mm' : '5mm 0 3mm'};font-size:${options.onePage ? '9.5pt' : '11pt'};border-color:#ccc}h3{font-size:${options.onePage ? '9pt' : '10.5pt'}}article{margin-bottom:${options.onePage ? '1.4mm' : compact ? '2.5mm' : '4mm'}}p{white-space:pre-line;orphans:3;widows:3}ul{margin:${options.onePage ? '1mm' : '2mm'} 0;padding-inline-start:5mm}li{margin-bottom:.7mm}.meta,.specialty{color:#444}.resume-page{width:210mm;height:297mm;padding:${pagePadding};background:#fff;margin:0 0 18px;box-sizing:border-box;box-shadow:0 4px 24px #0006;break-after:page;page-break-after:always;overflow:visible}.resume-page:last-child{break-after:auto;page-break-after:auto;margin-bottom:0}.resume-photo{width:${options.onePage ? '17mm' : '22mm'};height:${options.onePage ? '17mm' : '22mm'};object-fit:cover;float:right;margin:0 0 3mm 5mm}.resume-page h2{break-after:avoid}.resume-page article{break-inside:avoid}.contacts{font-size:${options.onePage ? '7.8pt' : '9pt'};gap:1.5mm 3mm}footer{margin-top:${options.onePage ? '1.5mm' : compact ? '3mm' : '5mm'}} @media print{html,body{background:white;width:auto;margin:0;padding:0;max-width:none}.resume-page{box-shadow:none;margin:0;width:210mm;height:297mm;print-color-adjust:exact;-webkit-print-color-adjust:exact}h1{font-size:${options.onePage ? '20pt' : compact ? '23pt' : '26pt'}}body{font:${baseFont} Arial,Tahoma,sans-serif}}`;
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
      resumeLastPageCount = count; resumePreviewReady = true; print.disabled = false;
      const pages = document.getElementById('resumePages');
      pages.classList.toggle('needs-trim',resumeOptions.onePage && count > 1);
      pages.textContent = `${count} A4 page${count === 1 ? '' : 's'} · ${resumeOptions.template === 'ats' ? 'ATS' : 'Modern'} · ${resumeOptions.onePage ? (count === 1 ? 'One-page fit' : 'Trim content') : resumeOptions.density === 'compact' ? 'Compact' : 'Comfortable'}`;
      if (resumeOptions.onePage && count > 1) productStatus('resumeStatus','One-page mode is active, but the selected content still needs more space. Hide a section or shorten long entries.');
    } catch { productStatus('resumeStatus','Could not lay out this resume. Reduce the selected content and retry.'); }
  };
  frame.srcdoc = buildResumeStudioDocument(resumeSnapshot,resumeOptions);
}
async function saveResumePreferences() {
  if (!resumeOwnerMode || !resumeSnapshot || !resumeContentPersistenceAvailable || !requireAccount() || currentUser.id !== resumeSnapshot.profile.user_id) return;
  const owner = currentUser.id; const button = document.getElementById('resumeSave'); button.disabled = true;
  resumeOptions.readiness = getResumeReadiness(availableResumeSections()).score;
  const options = normalizeResumeSettings(resumeOptions);
  const preferences = getResumePreferenceRecord(options);
  const resumeDocument = getResumeDocumentRecord(options,owner);
  try {
    const documentResult = await supabaseClient.from('resume_documents').upsert(resumeDocument,{onConflict:'user_id'}).select('target_role,summary,priority_skills,experience,updated_at').single();
    if (documentResult.error) throw documentResult.error;
    const profileResult = await supabaseClient.from('profiles').update({resume_settings:preferences}).eq('user_id',owner).select('*').single();
    if (profileResult.error) throw profileResult.error;
    if (currentUser?.id !== owner) return;
    signedInProfile = profileResult.data;
    if (activePortfolioUserId === owner) currentProfile.resume_settings = preferences;
    if (resumeSnapshot?.profile.user_id === owner) { resumeSnapshot.profile.resume_settings = preferences; resumeSnapshot.resumeDocument = structuredClone(documentResult.data); }
    syncResumeButton(); productStatus('resumeStatus','Resume preferences saved. Your portfolio section order is unchanged.',true);
  } catch { productStatus('resumeStatus','Could not save. Verify the Resume Studio SQL migrations are installed and try again.'); }
  finally { button.disabled = false; }
}
function printPortfolioCv() {
  if (!resumePreviewReady || !resumeSnapshot) return;
  const frame = document.getElementById('portfolioCvFrame');
  const fileName = [resumeSnapshot.profile.display_name || resumeSnapshot.profile.username,resumeOptions.targetRole || 'Resume'].map(value => cleanResumeText(value,80).replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-|-$/g,'')).filter(Boolean).join('-');
  if (frame.contentDocument) frame.contentDocument.title = fileName || 'Deviloq-Resume';
  productStatus('resumeStatus','In the print dialog, select Save as PDF as the destination. A4 pages are already prepared.');
  frame.contentWindow.focus(); frame.contentWindow.print();
}
function clearResumePreview() {
  ++resumeRequest; ++resumeRevision; resumePreviewReady = false; resumeSnapshot = null; resumeOptions = null; resumeJobDescription = ''; resumeLastPageCount = 0; resumeCurrentStep = 'content'; resumeContentPersistenceAvailable = false;
  const frame = document.getElementById('portfolioCvFrame'); frame.onload = null; frame.srcdoc = '';
}
function closePortfolioCv() { closeProductDialog('portfolioCvDialog'); }
