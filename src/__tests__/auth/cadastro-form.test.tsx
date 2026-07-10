import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockPush = jest.fn()
const mockRefresh = jest.fn()
const mockSignUp = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
  useSearchParams: () => new URLSearchParams(''),
}))

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { signUp: mockSignUp },
  }),
}))

import CadastroForm from '@/app/(auth)/cadastro/cadastro-form'

async function fillAndSubmit(name = 'João', email = 'joao@test.com', password = '123456') {
  const user = userEvent.setup()
  await user.type(screen.getByPlaceholderText(/seu nome/i), name)
  await user.type(screen.getByPlaceholderText(/email/i), email)
  await user.type(screen.getByPlaceholderText(/senha/i), password)
  await user.click(screen.getByRole('button', { name: /criar conta/i }))
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('CadastroForm', () => {
  it('deve renderizar campos de nome, email e senha', () => {
    render(<CadastroForm />)

    expect(screen.getByPlaceholderText(/seu nome/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/senha/i)).toBeInTheDocument()
  })

  it('deve mostrar "Verifique seu email" quando signup retorna sem session', async () => {
    // Arrange
    mockSignUp.mockResolvedValue({ data: { user: { id: '1' }, session: null }, error: null })
    render(<CadastroForm />)

    // Act
    await fillAndSubmit()

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/verifique seu email/i)).toBeInTheDocument()
    })
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('deve redirecionar para /torneios após signup com session ativa', async () => {
    // Arrange
    mockSignUp.mockResolvedValue({
      data: { user: { id: '1' }, session: { access_token: 'tok' } },
      error: null,
    })
    render(<CadastroForm />)

    // Act
    await fillAndSubmit()

    // Assert
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/torneios')
    })
  })

  it('deve mostrar mensagem de erro quando signup falha', async () => {
    // Arrange
    mockSignUp.mockResolvedValue({ data: null, error: { message: 'Email já cadastrado' } })
    render(<CadastroForm />)

    // Act
    await fillAndSubmit()

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/email já cadastrado/i)).toBeInTheDocument()
    })
  })

  it('deve desabilitar botão enquanto processa', async () => {
    // Arrange
    mockSignUp.mockImplementation(() => new Promise(() => {}))
    render(<CadastroForm />)

    // Act
    await fillAndSubmit()

    // Assert
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
