import { expect, test } from '@playwright/test';
import { login, setContext } from './helpers';

test.describe('teacher journeys', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await setContext(page);
  });

  test('A · Inicio → current experience → quick view → full view', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Hola, Ana' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Mis palabras cuentan lo que vivo' })).toBeVisible();
    await expect(page.getByText('Qué buscamos')).toBeVisible();
    await page.getByRole('link', { name: /Ver experiencia/ }).click();
    await expect(page).toHaveURL(/\/malla\/step-2\/3$/);
    for (const title of ['Qué buscamos', 'Cómo podemos vivirlo', 'Qué podemos observar', 'Otras formas de participación', 'Cómo conectar con las familias']) {
      await expect(page.getByRole('heading', { name: title })).toBeVisible();
    }
    await page.getByRole('link', { name: 'Ver ficha curricular completa' }).click();
    await expect(page).toHaveURL(/vista=completa/);
    await page.getByText('Actividades rectoras', { exact: true }).click();
    await expect(page.getByText('Fuente: Malla ajustada!R8')).toBeVisible();
  });

  test('B · Malla → search "actividades literarias" → relevant result → source', async ({ page }) => {
    await page.goto('/malla');
    await page.getByLabel('¿Qué estás buscando en nuestra malla?').fill('actividades literarias');
    await page.getByRole('button', { name: 'Buscar' }).click();
    await expect(page.getByText(/resultados para “actividades literarias”/)).toBeVisible();
    const first = page.locator('li.card').first();
    await expect(first.getByText('Desde nuestra malla')).toBeVisible();
    await expect(first.getByText('Actividad rectora · Literatura')).toBeVisible();
    await expect(first.getByText('HT-S2-P3-AR-LIT')).toBeVisible(); // teacher's own context ranks first
    await first.getByRole('link', { name: /Abrir experiencia/ }).click();
    await expect(page).toHaveURL(/\/malla\/step-2\/3\?vista=completa#literatura/);
    await expect(page.locator('#literatura')).toBeVisible();
    await expect(page.locator('#literatura')).toContainText('Tema:');
  });

  test('C · Happy → "Tengo una idea" → contextual grounded interaction', async ({ page }) => {
    await page.goto('/happy');
    await page.getByRole('radio', { name: /Aterrizar/ }).click();
    await page.getByLabel('Mensaje para Happy').fill('Quiero hacer algo con agua mañana, tengo 20 minutos.');
    await page.getByRole('button', { name: 'Enviar a Happy' }).click();
    const answer = page.getByRole('article', { name: 'Respuesta de Happy' }).last();
    await expect(answer.getByText('Lo que entiendo')).toBeVisible();
    await expect(answer.getByText('Caminos posibles')).toBeVisible();
    await expect(answer.getByText('Desde nuestra malla').first()).toBeVisible();
    await expect(answer.getByText('Idea complementaria de Happy').first()).toBeVisible();
    await expect(answer.getByText('Conexión con nuestra malla')).toBeVisible();
    await expect(answer.getByText('Siguiente paso')).toBeVisible();
    await expect(answer.getByText('RESPUESTA SIMULADA (PRUEBA)')).toBeVisible();
    await answer.getByRole('button', { name: 'Desarrollar este camino' }).first().click();
    await expect(page.getByRole('article', { name: 'Respuesta de Happy' }).last().getByText('Desarrollo', { exact: true })).toBeVisible();
  });

  test('D · Experience → Trabajar con Happy → Happy already knows the context', async ({ page }) => {
    await page.goto('/malla/kinder/2');
    await page.getByRole('link', { name: 'Trabajar con Happy' }).click();
    const contextChip = page.locator('p', { hasText: 'Trabajando en:' });
    await expect(contextChip).toContainText('Kínder · Periodo II');
    await expect(contextChip).toContainText('Las historias, los sonidos y las palabras nos conectan');
    const request = page.waitForRequest((r) => r.url().endsWith('/api/happy') && r.method() === 'POST');
    await page.getByLabel('Mensaje para Happy').fill('Necesito ideas para esta semana');
    await page.getByRole('button', { name: 'Enviar a Happy' }).click();
    const body = (await request).postDataJSON();
    expect(body.context).toEqual({ levelId: 'kinder', period: 2, experienceId: 'HT-K-P2' });
    const answer = page.getByRole('article', { name: 'Respuesta de Happy' }).last();
    await expect(answer.getByText(/Kínder · Periodo II/).filter({ visible: true }).first()).toBeVisible();
  });

  test('E · Happy result → save → Guardados → reopen → planning draft persists', async ({ page }) => {
    await page.goto('/happy');
    await page.getByLabel('Mensaje para Happy').fill('Quiero trabajar animales pero ya hicimos sonidos y clasificación.');
    await page.getByRole('button', { name: 'Enviar a Happy' }).click();
    const answer = page.getByRole('article', { name: 'Respuesta de Happy' }).last();
    await answer.getByRole('button', { name: 'Guardar idea' }).click();
    await expect(answer.getByText('Guardada')).toBeVisible();

    await page.getByRole('link', { name: 'Guardados' }).last().click();
    await page.getByRole('link', { name: /Ideas de Happy/ }).click();
    await page.getByRole('link', { name: /Camino desde la malla/ }).first().click();
    await expect(page.getByText('Quiero trabajar animales pero ya hicimos sonidos y clasificación.', { exact: true })).toBeVisible();
    await expect(page.getByText('Desde nuestra malla').first()).toBeVisible();

    await page.getByRole('button', { name: 'Convertir en planeación' }).click();
    await expect(page).toHaveURL(/\/guardados\/planeaciones\//);
    await expect(page.getByLabel('Intención pedagógica')).toHaveValue(/animales/);
    await page.getByLabel('Preguntas posibles').fill('¿Qué huellas encontramos en el patio?');
    await page.getByRole('button', { name: 'Guardar', exact: true }).click();
    await expect(page.getByText(/Guardado \d/)).toBeVisible();
    await page.reload();
    await expect(page.getByLabel('Preguntas posibles')).toHaveValue('¿Qué huellas encontramos en el patio?');
  });

  test('favorite an experience from the malla', async ({ page }) => {
    await page.goto('/malla/step-3/1');
    const btn = page.getByRole('button', { name: /Guardar|En favoritos/ }).first();
    if ((await btn.getAttribute('aria-pressed')) === 'true') await btn.click();
    await page.getByRole('button', { name: 'Guardar' }).first().click();
    await expect(page.getByRole('button', { name: 'En favoritos' })).toBeVisible();
    await page.goto('/guardados?tab=favoritos');
    await expect(page.getByText('Mis manos crean, mi cuerpo se prepara')).toBeVisible();
  });
});

test('F · primary navigation: Inicio / Malla / Happy / Guardados', async ({ page, isMobile }) => {
  await login(page);
  const nav = page.getByRole('navigation', { name: 'Navegación principal' }).locator('visible=true');
  await expect(nav.getByRole('link')).toHaveText(['Inicio', 'Malla', 'Happy', 'Guardados']);
  if (isMobile) {
    const box = await nav.boundingBox();
    const viewport = page.viewportSize()!;
    expect(box!.y + box!.height).toBeGreaterThan(viewport.height - 2); // anchored to the bottom
  }
  for (const [label, url, heading] of [
    ['Malla', /\/malla$/, 'Malla curricular'],
    ['Happy', /\/happy$/, 'Happy'],
    ['Guardados', /\/guardados$/, 'Guardados'],
    ['Inicio', /\/$/, 'Hola, Ana'],
  ] as const) {
    await nav.getByRole('link', { name: label }).click();
    await expect(page).toHaveURL(url);
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    await expect(nav.getByRole('link', { name: label })).toHaveAttribute('aria-current', 'page');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0); // no horizontal scrolling
  }
});

test.describe('access control', () => {
  test('unauthenticated users are sent to login; institutional view is public', async ({ page }) => {
    await page.goto('/guardados');
    await expect(page).toHaveURL(/\/ingresar$/);
    await page.goto('/institucional');
    await expect(page.getByRole('heading', { name: 'Nuestro modelo curricular' })).toBeVisible();
    await expect(page.getByText('Las alertas no son diagnósticos.')).toBeVisible();
    const res = await page.request.post('/api/happy', { data: { mode: 'explorar', message: 'hola' } });
    expect(res.status()).toBe(401);
  });

  test('teachers cannot open coordination or admin areas', async ({ page }) => {
    await login(page);
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/$/);
    await page.goto('/coordinacion');
    await expect(page).toHaveURL(/\/$/);
    await page.goto('/perfil');
    await expect(page.getByText('Administración')).toHaveCount(0);
  });

  test('admins see curriculum status, Happy observability and roles', async ({ page }) => {
    await login(page, 'Administración', 'Admin');
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Administración' })).toBeVisible();
    await expect(page.getByText('ht-malla-2026-06')).toBeVisible();
    await expect(page.getByText(/587 fragmentos/)).toBeVisible();
    await expect(page.getByText('Solo metadatos')).toBeVisible();
    await page.goto('/coordinacion');
    await expect(page.getByRole('heading', { name: 'Coordinación' })).toBeVisible();
  });
});
