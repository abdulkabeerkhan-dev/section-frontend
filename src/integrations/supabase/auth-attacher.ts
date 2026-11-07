import { createMiddleware } from '@tanstack/react-start'

// Safe pass-through middleware: Auth is fully managed by Clerk.
export const attachSupabaseAuth = createMiddleware({ type: 'function' }).client(
  async ({ next }) => {
    return next()
  },
)
