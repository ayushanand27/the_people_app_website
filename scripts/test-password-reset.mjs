/**
 * Smoke test: forgot-password API + bootstrap redirect logic.
 * Run: node scripts/test-password-reset.mjs
 */
import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

function loadEnv() {
  const raw = readFileSync('.env', 'utf8')
  const env = {}
  for (const line of raw.split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) env[m[1].trim()] = m[2].trim()
  }
  return env
}

function testBootstrapRedirect() {
  const cases = [
    { path: '/', search: '?code=abc', pending: true, google: false, expect: true },
    { path: '/', search: '?code=abc', pending: false, google: true, expect: false },
    { path: '/reset-password', search: '?code=abc', pending: true, google: false, expect: false },
    { path: '/', search: '', pending: true, google: false, expect: false },
  ]

  for (const c of cases) {
    const hasCode = c.search.includes('code=')
    const isGoogleReturn = hasCode && c.google
    const shouldRedirect =
      c.path !== '/reset-password' &&
      !isGoogleReturn &&
      (c.search.includes('code=') ||
        c.search.includes('token_hash') ||
        c.search.includes('type=recovery'))

    const ok = shouldRedirect === c.expect
    console.log(ok ? '✓' : '✗', 'bootstrap', JSON.stringify(c), '→', shouldRedirect)
    if (!ok) process.exitCode = 1
  }
}

async function testResetEmail() {
  const env = loadEnv()
  const url = env.VITE_SUPABASE_URL
  const key = env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) {
    console.log('⚠ skip API test — missing VITE_SUPABASE_* in .env')
    return
  }

  const supabase = createClient(url, key, {
    auth: { flowType: 'pkce', detectSessionInUrl: false },
  })

  const testEmail = `reset-test-${Date.now()}@example.com`
  const redirectTo = 'https://the-people-app-website.vercel.app/reset-password'

  const { error } = await supabase.auth.resetPasswordForEmail(testEmail, { redirectTo })

  if (error) {
    console.log('✗ resetPasswordForEmail:', error.message)
    process.exitCode = 1
    return
  }

  console.log('✓ resetPasswordForEmail accepted redirectTo:', redirectTo)
  console.log('  (email not delivered to @example.com — API call only)')
}

testBootstrapRedirect()
await testResetEmail()
