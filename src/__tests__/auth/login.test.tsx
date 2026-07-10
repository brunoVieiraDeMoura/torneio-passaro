import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockPush = jest.fn()
const mockRefresh = jest.fn()
const mockSignIn = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}))

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { signInWithPassword: mockSignIn },
  }),
}))

import LoginPage from '@/app/(auth)/login/page'

beforeEach(() => {
  jest.clearAllMocks()
})

describe('LoginPage', () => {
  it('deve renderizar campos de email e senha', () => {
    render(<LoginPage />)

    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/senha/i)).toBeInTheDocument()
  })

  it('deve redirecionar para /torneios após login bem-sucedido', async () => {
    // Arrange
    mockSignIn.mockResolvedValue({ data: { session: {} }, error: null })
    render(<LoginPage />)

    // Act
    await userEvent.type(screen.getByPlaceholderText(/email/i), 'joao@test.com')
    await userEvent.type(screen.getByPlaceholderText(/senha/i), '123456')
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }))

    // Assert
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/torneios')
    })
  })

  it('deve mostrar mensagem de erro quando credenciais inválidas', async () => {
    // Arrange
    mockSignIn.mockResolvedValue({ data: null, error: { message: 'Credenciais inválidas' } })
    render(<LoginPage />)

    // Act
    await userEvent.type(screen.getByPlaceholderText(/email/i), 'joao@test.com')
    await userEvent.type(screen.getByPlaceholderText(/senha/i), 'errado')
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }))

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/credenciais inválidas/i)).toBeInTheDocument()
    })
  })

  it('deve desabilitar botão enquanto processa', async () => {
    // Arrange
    mockSignIn.mockImplementation(() => new Promise(() => {}))
    render(<LoginPage />)

    // Act
    await userEvent.type(screen.getByPlaceholderText(/email/i), 'joao@test.com')
    await userEvent.type(screen.getByPlaceholderText(/senha/i), '123456')
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }))

    // Assert
    expect(screen.getByRole('button', { name: /entrando/i })).toBeDisabled()
  })
})
