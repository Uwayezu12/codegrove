import {test, expect, type Page} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {mkdir} from 'node:fs/promises';

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
}

test('auth modal switching, disabled providers, keyboard, errors and themes', async ({page}, testInfo) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/signin?return_to=%2Fprofile');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', {name: /coming soon/})).toHaveCount(3);
  for (const button of await dialog.getByRole('button', {name: /coming soon/}).all()) await expect(button).toBeDisabled();
  await page.getByLabel('Password', {exact: true}).fill('a-test-password');
  await page.getByRole('button', {name: 'Show password'}).click();
  await expect(page.getByLabel('Password', {exact: true})).toHaveAttribute('type', 'text');
  await page.getByRole('button', {name: 'Hide password'}).click();
  await page.getByRole('button', {name: 'Forgot password?'}).click();
  await expect(page.getByRole('status')).toContainText('Password reset is not available');
  await page.getByRole('button', {name: 'Forgot password?'}).click();
  await page.evaluate(() => { (window as unknown as {switchMarker: boolean}).switchMarker = true; });
  await page.getByRole('link', {name: 'Register Now'}).click();
  await expect(page).toHaveURL(/\/register\?return_to=%2Fprofile$/);
  expect(await page.evaluate(() => (window as unknown as {switchMarker: boolean}).switchMarker)).toBe(true);
  await expect(page.getByLabel('Your name')).toBeVisible();
  await page.goBack(); await expect(page.getByRole('heading', {name: 'Log in'})).toBeVisible();
  await dialog.focus(); await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('link', {name: 'CodeGrove home'})).toBeFocused();
  await page.keyboard.press('Tab'); await expect(page.getByRole('link', {name: 'Back to learning'})).toBeFocused();
  await mkdir('outputs/account-ux', {recursive: true});
  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => localStorage.setItem('codegrove-theme', theme), theme);
    for (const mode of ['signin', 'register']) {
      await page.goto('/' + mode); await expect(dialog).toBeVisible(); await noOverflow(page);
      await page.screenshot({path: `outputs/account-ux/${testInfo.project.name}-${mode}-${theme}.png`, fullPage: true});
    }
  }
  await page.route('**/api/auth/google?*', async route => {
    const url = new URL(route.request().url());
    expect(url.searchParams.get('mode')).toBe('register');
    expect(url.searchParams.get('return_to')).toBe('/dashboard');
    await route.fulfill({status: 302, headers: {location: '/register?google_error=cancelled'}});
  });
  await page.getByRole('button', {name: 'Continue with Google'}).click();
  await expect(page.getByRole('alert')).toContainText('Google sign-in was cancelled');
  await page.keyboard.press('Escape'); await expect(page).toHaveURL(/\/$/);
  expect(errors).toEqual([]);
});

test('real profile persistence, courses, dropdown keyboard and revoked session', async ({page}, testInfo) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const email = `profile-${randomUUID()}@example.test`;
  await page.goto('/register');
  await page.getByLabel('Your name').fill('Account Learner');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', {exact: true}).fill('Profile-test-' + randomUUID());
  await page.getByRole('button', {name: 'Sign Up', exact: true}).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  const account = page.getByRole('button', {name: /Account menu for/});
  await expect(account).toBeVisible();
  await expect(page.getByRole('link', {name: 'Sign out', exact: true})).toHaveCount(0);
  await account.focus(); await page.keyboard.press('ArrowDown');
  const menu = page.getByRole('menu');
  await expect(menu.getByRole('menuitem')).toHaveText(['My Profile', 'My Courses', 'Edit Profile', 'Logout']);
  await expect(menu).toContainText(email);
  const box = await menu.boundingBox(); const viewport = page.viewportSize()!;
  expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
  await page.keyboard.press('Escape'); await expect(account).toBeFocused();
  await account.click(); await page.getByRole('menuitem', {name: 'My Profile', exact: true}).click();
  await expect(page.locator('.profile-details')).toContainText('Email and password');
  await page.getByRole('link', {name: 'Edit Profile', exact: true}).click();
  await page.getByLabel('Your name').fill('Updated Account Learner');
  await expect(page.getByLabel('Email address')).toHaveAttribute('readonly', '');
  await page.getByRole('button', {name: 'Save changes'}).click();
  await expect(page.getByRole('status')).toHaveText('Your profile has been updated.');
  await expect(account).toHaveAccessibleName('Account menu for Updated Account Learner');
  await page.reload(); await expect(page.getByLabel('Your name')).toHaveValue('Updated Account Learner');
  await page.goto('/courses/dsa-foundations');
  await page.getByRole('button', {name: 'Enroll for free'}).click();
  await expect(page.getByRole('button', {name: 'Enrolled', exact: true})).toBeDisabled();
  await page.goto('/tutorial/arrays'); await page.getByRole('button', {name: 'Mark as completed'}).click();
  await expect(page.getByRole('button', {name: 'Completed — mark unread'})).toBeVisible();
  await account.click(); await page.getByRole('menuitem', {name: 'My Courses', exact: true}).click();
  await expect(page.getByRole('heading', {name: 'My Courses', exact: true})).toBeVisible();
  await expect(page.locator('.enrolled-list')).toContainText('In progress');
  await expect(page.locator('.enrolled-list')).toContainText('1 of');
  await noOverflow(page);
  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => localStorage.setItem('codegrove-theme', theme), theme);
    for (const route of ['/profile', '/profile/edit', '/my-courses']) {
      await page.goto(route);
      await expect(page.getByRole('heading', {level: 1})).toBeVisible();
      if (route.startsWith('/profile')) await expect(page.locator('.profile-card')).toBeVisible();
      else await expect(page.locator('.enrolled-list')).toBeVisible();
      await noOverflow(page); await account.click(); await expect(menu).toBeVisible();
      await mkdir('outputs/account-ux', {recursive: true});
      await page.screenshot({path: `outputs/account-ux/${testInfo.project.name}-${route.replaceAll('/', '-')}-${theme}.png`, fullPage: true});
      await page.keyboard.press('Escape');
    }
  }
  const session = (await page.context().cookies()).find(cookie => cookie.name === 'codegrove_session')!;
  await account.click(); await page.getByRole('menuitem', {name: 'Logout', exact: true}).click();
  await expect(page).toHaveURL(/\/$/);
  const revoked = await page.request.get('/api/profile', {headers: {cookie: session.name + '=' + session.value}});
  expect(revoked.status()).toBe(401);
  for (const route of ['/profile', '/profile/edit', '/my-courses']) {
    await page.goto(route); await expect(page).toHaveURL(/\/signin\?return_to=/); await expect(page.getByRole('dialog')).toBeVisible();
  }
  expect(errors).toEqual([]);
});
