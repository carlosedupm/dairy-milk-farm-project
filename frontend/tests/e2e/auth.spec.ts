import { test, expect } from '@playwright/test'

test.describe('Autenticação', () => {
  test('deve exibir página de login', async ({ page }) => {
    await page.goto('/login')
    
    await expect(page.getByRole('heading', { name: 'CeialMilk' })).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Senha')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()
  })

  test('deve exibir página de registro', async ({ page }) => {
    await page.goto('/registro')
    
    await expect(page.getByRole('heading', { name: 'Criar conta' })).toBeVisible()
    await expect(page.getByLabel('Nome')).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Senha')).toBeVisible()
    await expect(page.getByLabel('Confirmar senha')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Criar conta' })).toBeVisible()
  })

  test('deve ter link para registro na página de login', async ({ page }) => {
    await page.goto('/login')
    
    const registerLink = page.getByRole('link', { name: 'Registre-se' })
    await expect(registerLink).toBeVisible()
    
    await registerLink.click()
    await expect(page).toHaveURL('/registro')
  })

  test('deve ter link para login na página de registro', async ({ page }) => {
    await page.goto('/registro')
    
    const loginLink = page.getByRole('link', { name: 'Faça login' })
    await expect(loginLink).toBeVisible()
    
    await loginLink.click()
    await expect(page).toHaveURL('/login')
  })

  test('deve mostrar erro com credenciais inválidas', async ({ page }) => {
    await page.goto('/login')
    
    await page.getByLabel('Email').fill('usuario@invalido.com')
    await page.getByLabel('Senha').fill('senhaerrada')
    await page.getByRole('button', { name: 'Entrar' }).click()
    
    // Deve mostrar mensagem de erro (pode ser "Credenciais inválidas" ou similar)
    await expect(page.locator('.text-destructive')).toBeVisible({ timeout: 10000 })
  })

  test('deve validar campos obrigatórios no registro', async ({ page }) => {
    await page.goto('/registro')
    
    // Tentar submeter sem preencher
    await page.getByRole('button', { name: 'Criar conta' }).click()
    
    // O browser deve mostrar validação HTML5
    const nomeInput = page.getByLabel('Nome')
    await expect(nomeInput).toHaveAttribute('required')
  })

  test('deve validar confirmação de senha', async ({ page }) => {
    await page.goto('/registro')
    
    await page.getByLabel('Nome').fill('Usuário Teste')
    await page.getByLabel('Email').fill('teste@teste.com')
    await page.getByLabel('Senha').fill('senha123')
    await page.getByLabel('Confirmar senha').fill('senha456') // Senha diferente
    
    await page.getByRole('button', { name: 'Criar conta' }).click()
    
    // Deve mostrar erro de senhas não coincidem
    await expect(page.getByText('As senhas não coincidem')).toBeVisible()
  })
})
