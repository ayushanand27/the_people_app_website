import { supabase } from './supabase'

/** Permanently delete the current user's account via edge function */
export async function deleteAccount(): Promise<{ error: Error | null }> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: new Error('Not signed in') }

  const { data, error } = await supabase.functions.invoke('delete-account', {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}` },
  })

  if (error) return { error }
  if (data?.error) return { error: new Error(data.error) }
  return { error: null }
}
