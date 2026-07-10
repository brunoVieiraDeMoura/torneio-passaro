export const mockSignUp = jest.fn()
export const mockSignIn = jest.fn()
export const mockGetUser = jest.fn()
export const mockResetPassword = jest.fn()

export const mockSupabase = {
  auth: {
    signUp: mockSignUp,
    signInWithPassword: mockSignIn,
    getUser: mockGetUser,
    resetPasswordForEmail: mockResetPassword,
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
  })),
}

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase,
}))
