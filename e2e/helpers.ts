import { expect, type Page } from '@playwright/test';

export async function login(page: Page, role: 'Docente' | 'Coordinación' | 'Administración' = 'Docente', name = 'Ana') {
  await page.goto('/ingresar');
  await page.getByLabel('Tu nombre').fill(name);
  await page.getByText(role, { exact: true }).click();
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL('**/');
}

/** Ensures the teacher's active context is Step 2 · Periodo III. */
export async function setContext(page: Page, level = 'Step 2', period = 'Periodo III') {
  await page.goto('/perfil');
  await page.locator('#contexto').getByText(level, { exact: true }).click();
  await page.locator('#contexto').getByText(period, { exact: true }).click();
  await page.locator('#contexto').getByRole('button', { name: 'Guardar' }).click();
  await page.waitForURL('**/');
  await expect(page.getByText('Experiencia actual')).toBeVisible();
}
