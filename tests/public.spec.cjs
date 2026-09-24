const { test, expect } = require('@playwright/test');

async function expectViewportFit(page, widths) {
  for (const width of widths) {
    await page.setViewportSize({width, height:900});
    expect(await page.evaluate(() => document.documentElement.scrollWidth), `${width}px viewport`).toBeLessThanOrEqual(width);
  }
}

test('public landing stays usable when external services are unavailable', async ({ page }) => {
  const errors = [];
  const failures = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('requestfailed', request => failures.push(request.url()));
  await page.route(/^https:\/\//, route => route.abort());
  await page.goto('/');
  await expect(page.locator('#landingView')).toBeVisible();
  await expect(page.locator('#appLoading')).toBeHidden();
  await expect(page.locator('#landingHeroTitle')).toContainText('Build a portfolio');
  expect(errors).toEqual([]);
  expect(failures).toEqual([]);
});

for (const width of [1920, 1440, 1024, 768, 430, 375]) {
  for (const language of ['en', 'ar']) {
    test(`landing navigation fits ${width}px in ${language}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/');
      await expect(page.locator('#landingView')).toBeVisible();
      if (language === 'ar') await page.evaluate(() => setLanguage('ar', false));
      await expect(page.locator('html')).toHaveAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
      const measure = () => page.evaluate(() => ({scrollWidth:document.documentElement.scrollWidth, viewport:innerWidth}));
      let size = await measure();
      expect(size.scrollWidth).toBeLessThanOrEqual(size.viewport);
      if (width <= 980) {
        const menu = page.locator('#mobileSiteNav');
        await menu.locator('summary').click();
        await expect(menu).toHaveAttribute('open', '');
        size = await measure();
        expect(size.scrollWidth).toBeLessThanOrEqual(size.viewport);
        const bounds = await menu.locator('nav').boundingBox();
        expect(bounds.x).toBeGreaterThanOrEqual(-1);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(width + 1);
      }
    });
  }
}

test('mobile navigation and account entry work with keyboard', async ({ page }) => {
  await page.setViewportSize({width:375,height:812});
  await page.goto('/');
  const menu = page.locator('#mobileSiteNav');
  await menu.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(menu).toHaveAttribute('open', '');
  await menu.getByRole('button', {name:'Login'}).click();
  await expect(menu).not.toHaveAttribute('open', '');
  await expect(page.locator('#authView')).toBeVisible();
});

test('account entry exposes labelled login, signup, and recovery forms', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({width:375,height:812});
  await page.goto('/?view=login');
  await expect(page.locator('#authView')).toBeVisible();
  await expect(page.locator('#loginForm').getByLabel('Email', {exact:true})).toBeVisible();
  await expect(page.locator('#loginForm').getByLabel('Password', {exact:true})).toBeVisible();
  await page.locator('#signupTab').click();
  await expect(page.locator('#signupForm')).toBeVisible();
  await page.locator('#loginTab').click();
  await page.getByRole('button',{name:'Forgot password?'}).click();
  await expect(page.locator('#forgotPasswordForm')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  expect(errors).toEqual([]);
});

test('community search and empty states remain usable on mobile', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({width:375,height:812});
  await page.route('**/rest/v1/**', route => route.fulfill({json: []}));
  await page.goto('/?view=community');
  await expect(page.locator('#communityView')).toBeVisible();
  await expect(page.locator('#featuredPortfolioMessage')).toContainText('No public portfolios');
  await page.locator('#userSearchInput').fill('sample');
  await expect(page.locator('#userSearchMessage')).not.toContainText('Searching');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await page.evaluate(() => setLanguage('ar', false));
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await expectViewportFit(page, [430, 768, 1024, 1440, 1920]);
  expect(errors).toEqual([]);
});

test('public portfolio renders with sample data at mobile width', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({width:375,height:812});
  await page.route('**/rest/v1/**', route => {
    const url = new URL(route.request().url());
    const data = url.pathname.endsWith('/profiles')
      ? [{user_id:'00000000-0000-4000-8000-000000000001',username:'sample',display_name:'Sample Developer',bio:'Building useful things.',is_public:true,tech_stack:[]}]
      : [];
    return route.fulfill({json:data});
  });
  await page.route('**/rpc/**', route => route.fulfill({json:null}));
  await page.goto('/?u=sample');
  await expect(page.locator('#portfolioView')).toBeVisible();
  await expect(page.locator('#portfolioLogo')).toContainText('SAMPLE');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await page.evaluate(() => setLanguage('ar', false));
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await expectViewportFit(page, [430, 768, 1024, 1440, 1920]);
  expect(errors).toEqual([]);
});

test('owner dashboard mobile sections open without overflow', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({width:375,height:812});
  await page.addInitScript(() => {
    const user = {id:'00000000-0000-4000-8000-000000000001',email:'sample@example.test',aud:'authenticated',role:'authenticated'};
    localStorage.setItem('sb-mjwtiliulpolrypywkei-auth-token', JSON.stringify({
      access_token:'test-token',refresh_token:'test-refresh',token_type:'bearer',
      expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,user
    }));
  });
  await page.route('**/rest/v1/**', route => {
    const url = new URL(route.request().url());
    if (url.pathname.includes('/rpc/')) return route.fulfill({json:null});
    const data = url.pathname.endsWith('/profiles')
      ? [{user_id:'00000000-0000-4000-8000-000000000001',username:'sample',display_name:'Sample Developer',bio:'Building useful things.',is_public:true,tech_stack:[]}]
      : [];
    return route.fulfill({json:data});
  });
  await page.route('**/auth/v1/**', route => route.fulfill({json:{id:'00000000-0000-4000-8000-000000000001',email:'sample@example.test'}}));
  await page.goto('/?view=dashboard');
  await expect(page.locator('#portfolioView')).toBeVisible();
  const menu = page.locator('#portfolioMenuButton');
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded','true');
  await expect(page.locator('#portfolioSectionNav')).toBeVisible();
  const lastLink = page.locator('#portfolioSectionNav a:visible').last();
  await lastLink.scrollIntoViewIfNeeded();
  const linkBounds = await lastLink.boundingBox();
  expect(linkBounds.y + linkBounds.height).toBeLessThanOrEqual(812);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await page.evaluate(() => setLanguage('ar', false));
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await expectViewportFit(page, [430, 768, 1024, 1440, 1920]);
  expect(errors).toEqual([]);
});
