import { test, expect } from '@playwright/test';
test('manager CRUD and complete review / rework cycle across both roles', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Открыть демо постановщика' }).click();
  await expect(page.getByRole('heading', { name: 'Объекты' })).toBeVisible();
  await page.getByRole('button', { name: 'Новый объект' }).click();
  await page.getByLabel('Название объекта').fill('Тестовый объект');
  await page.getByLabel('Адрес', { exact: true }).fill('Москва, Тестовая, 7');
  await page.getByRole('button', { name: 'Создать объект', exact: true }).click();
  await page.getByRole('button', { name: /Тестовый объект Москва/ }).click();
  await page.getByRole('button', { name: 'Новая задача', exact: true }).click();
  await page.getByLabel('Название задачи').fill('Проверить новый объект');
  await page.getByLabel('Описание', { exact: true }).fill('Осмотр конструкций');
  await page.getByLabel('Исполнитель', { exact: true }).selectOption('worker-1');
  await page.getByRole('button', { name: 'Создать задачу', exact: true }).click();
  await page.getByRole('button', { name: /Проверить новый объект/ }).click();
  await expect(page.getByRole('dialog')).toContainText('Создал задачу');
  await expect(page.getByRole('button', { name: 'Взять в работу' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Закрыть', exact: true }).click();
  await page.getByLabel('Демонстрационная роль').selectOption('worker-1');
  await expect(page.getByRole('button', { name: 'Новый объект' })).toHaveCount(0);
  await page.getByRole('button', { name: /Мои задачи/ }).click();
  await page.getByRole('button', { name: /Проверить новый объект/ }).click();
  await page.getByRole('button', { name: 'Взять в работу' }).click();
  await page.getByRole('button', { name: 'Отправить на проверку' }).click();
  await expect(page.getByRole('button', { name: 'Принять задачу' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Закрыть', exact: true }).click();
  await page.getByLabel('Демонстрационная роль').selectOption('manager');
  await page
    .getByRole('button', { name: /На проверке/ })
    .first()
    .click();
  await page.getByRole('button', { name: /Проверить новый объект/ }).click();
  await page.getByRole('button', { name: 'Вернуть на доработку' }).click();
  await expect(page.getByRole('alert')).toContainText('Укажите');
  const comment = page.getByLabel(/Комментарий/);
  await expect(comment).toHaveAttribute('aria-invalid', 'true');
  await expect(comment).toBeFocused();
  await comment.fill('  \n\t ');
  await page.getByRole('button', { name: 'Вернуть на доработку' }).click();
  await expect(page.getByRole('alert')).toContainText('Укажите');
  await page.getByLabel(/Комментарий/).fill('Исправьте крепления');
  await expect(comment).toHaveAttribute('aria-invalid', 'false');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.getByRole('button', { name: 'Вернуть на доработку' }).click();
  await expect(page.getByRole('dialog')).toContainText('Исправьте крепления');
  await page.getByRole('button', { name: 'Закрыть', exact: true }).click();
  await page.getByLabel('Демонстрационная роль').selectOption('worker-1');
  await page.getByRole('button', { name: /Мои задачи/ }).click();
  await page.getByRole('button', { name: /Проверить новый объект/ }).click();
  await page.getByRole('button', { name: 'Взять в работу' }).click();
  await page.getByRole('button', { name: 'Отправить на проверку' }).click();
  await page.getByRole('button', { name: 'Закрыть', exact: true }).click();
  await page.getByLabel('Демонстрационная роль').selectOption('manager');
  await page
    .getByRole('button', { name: /На проверке/ })
    .first()
    .click();
  await page.getByRole('button', { name: /Проверить новый объект/ }).click();
  await page.getByRole('button', { name: 'Принять задачу' }).click();
  await expect(
    page.getByRole('dialog').getByText('Принята', { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByRole('dialog').getByText('Взять в работу', { exact: true })).toHaveCount(
    0,
  );
  await page.getByRole('button', { name: 'Редактировать', exact: true }).click();
  await page.getByLabel('Название задачи').fill('Обновлённая задача');
  await page.getByRole('button', { name: 'Сохранить изменения' }).click();
  await page
    .getByRole('button', { name: /Объекты/ })
    .first()
    .click();
  await page.getByRole('button', { name: /Тестовый объект Москва/ }).click();
  await page.getByRole('button', { name: /Обновлённая задача/ }).click();
  await page.getByRole('button', { name: 'Удалить задачу' }).click();
  await page.getByRole('button', { name: 'Удалить', exact: true }).click();
  await expect(page.getByRole('button', { name: /Обновлённая задача/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Удалить объект', exact: true }).click();
  await page.getByRole('button', { name: 'Удалить', exact: true }).click();
  await expect(page.getByRole('button', { name: /Тестовый объект Москва/ })).toHaveCount(0);
});
test('search, status filter, worker isolation and mobile layout', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Исполнитель: Михаил' }).click();
  await page.getByRole('button', { name: /Мои задачи/ }).click();
  await expect(page.getByRole('button', { name: /Согласовать план электрики/ })).toHaveCount(0);
  await page.getByLabel('Фильтр по статусу').selectOption('new');
  await expect(page.getByRole('button', { name: /Заказать бетон/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Проверить армирование/ })).toHaveCount(0);
  await page.getByLabel('Поиск', { exact: true }).fill('ничего не найдено');
  await expect(page.getByRole('heading', { name: 'Задач пока нет' })).toBeVisible();
  await page.getByRole('button', { name: 'Очистить поиск' }).click();
  await page.getByLabel('Фильтр по статусу').selectOption('all');
  await page.getByRole('button', { name: 'Объекты', exact: false }).first().click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: 'test-results/mobile.png', fullPage: true });
});
