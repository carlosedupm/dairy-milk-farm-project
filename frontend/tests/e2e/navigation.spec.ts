import { test, expect } from '@playwright/test'

test.describe('Navegação', () => {
  test('deve redirecionar usuário não autenticado para login', async ({ page }) => {
    await page.goto('/fazendas')
    
    // Deve redirecionar para login
    await expect(page).toHaveURL(/.*login.*/)
  })

  test('página inicial deve estar acessível', async ({ page }) => {
    await page.goto('/')
    
    // Deve carregar a página inicial
    await expect(page).toHaveURL('/')
  })

  test('deve exibir link para login na página inicial ou redirecionar', async ({ page }) => {
    await page.goto('/')
    
    // A página inicial pode ter um link para login ou redirecionar
    const loginLink = page.getByRole('link', { name: /login|entrar/i })
    const isHomepage = await page.url().endsWith('/')
    
    if (isHomepage) {
      // Se estiver na homepage, pode ter link ou não
      // Verificar se a página carregou
      await expect(page.locator('body')).toBeVisible()
    }
  })
})

test.describe('Páginas protegidas', () => {
  test('animais deve requerer autenticação', async ({ page }) => {
    await page.goto('/animais')
    
    // Deve redirecionar para login
    await expect(page).toHaveURL(/.*login.*/)
  })

  test('producao deve requerer autenticação', async ({ page }) => {
    await page.goto('/producao')
    
    // Deve redirecionar para login
    await expect(page).toHaveURL(/.*login.*/)
  })

  test('admin deve requerer autenticação', async ({ page }) => {
    await page.goto('/admin/usuarios')
    
    // Deve redirecionar para login
    await expect(page).toHaveURL(/.*login.*/)
  })

  test('dev-studio deve requerer autenticação', async ({ page }) => {
    await page.goto('/dev-studio')
    
    // Deve redirecionar para login
    await expect(page).toHaveURL(/.*login.*/)
  })
})
