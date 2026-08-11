import { redirectRecoveryToResetPage } from './authRecovery'

// Run before React / Supabase — prevents detectSessionInUrl from consuming PKCE code on /
redirectRecoveryToResetPage()
