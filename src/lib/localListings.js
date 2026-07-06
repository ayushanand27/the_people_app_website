import { supabase } from './supabase'

export const LISTING_CATEGORIES = [
  { id: 'real_estate', label: 'Real Estate', emoji: '🏠' },
  { id: 'construction', label: 'Construction', emoji: '🧱' },
  { id: 'hotels_food', label: 'Hotels & Food', emoji: '🍽️' },
  { id: 'services', label: 'Services', emoji: '🔧' },
  { id: 'shops', label: 'Shops', emoji: '🛍️' },
  { id: 'clubs_events', label: 'Clubs & Events', emoji: '🎉' },
  { id: 'other', label: 'Other', emoji: '📌' },
]

export function categoryLabel(id) {
  return LISTING_CATEGORIES.find(c => c.id === id)?.label || id
}

export function categoryEmoji(id) {
  return LISTING_CATEGORIES.find(c => c.id === id)?.emoji || '📌'
}

export async function fetchVerifiedListings({ city, category, search, limit = 50 }) {
  let query = supabase
    .from('local_listings')
    .select('id, city, category, title, description, price_text, phone, whatsapp, images, owner_id, created_at')
    .eq('status', 'verified')
    .eq('city', city)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (category && category !== 'all') {
    query = query.eq('category', category)
  }

  const { data, error } = await query
  if (error) throw error

  let rows = data || []
  if (search?.trim()) {
    const q = search.trim().toLowerCase()
    rows = rows.filter(row =>
      row.title?.toLowerCase().includes(q) ||
      row.description?.toLowerCase().includes(q) ||
      row.price_text?.toLowerCase().includes(q)
    )
  }
  return rows
}

export async function fetchListingById(id) {
  const { data, error } = await supabase
    .from('local_listings')
    .select('*, owner:profiles!owner_id(id, full_name, username, avatar_url)')
    .eq('id', id)
    .eq('status', 'verified')
    .single()
  if (error) throw error
  return data
}

export async function fetchAdminListings() {
  const { data, error } = await supabase
    .from('local_listings')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function fetchPendingUpdateRequests() {
  const { data, error } = await supabase
    .from('listing_update_requests')
    .select('*, local_listings(title, city), submitter:profiles!submitted_by(full_name, username)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createListing(payload) {
  const { data, error } = await supabase
    .from('local_listings')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateListing(id, payload) {
  const { data, error } = await supabase
    .from('local_listings')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function verifyListing(id, adminId) {
  return updateListing(id, {
    status: 'verified',
    verified_by: adminId,
    verified_at: new Date().toISOString(),
  })
}

export async function archiveListing(id) {
  return updateListing(id, { status: 'archived' })
}

export async function approveUpdateRequest(request, adminId) {
  const changes = request.changes || {}
  const allowed = ['title', 'description', 'price_text', 'phone', 'whatsapp', 'images', 'category', 'city']
  const patch = {}
  for (const key of allowed) {
    if (changes[key] !== undefined) patch[key] = changes[key]
  }

  if (Object.keys(patch).length > 0) {
    await updateListing(request.listing_id, patch)
  }

  const { error } = await supabase
    .from('listing_update_requests')
    .update({
      status: 'approved',
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', request.id)
  if (error) throw error
}

export async function rejectUpdateRequest(id, adminId) {
  const { error } = await supabase
    .from('listing_update_requests')
    .update({
      status: 'rejected',
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) throw error
}

export async function submitListingUpdateRequest({ listingId, userId, changes, note }) {
  const { data, error } = await supabase
    .from('listing_update_requests')
    .insert({
      listing_id: listingId,
      submitted_by: userId,
      changes,
      note,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function uploadListingImage(file) {
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage
    .from('listing-images')
    .upload(path, file, { upsert: false, contentType: file.type })
  if (error) throw error
  const { data } = supabase.storage.from('listing-images').getPublicUrl(path)
  return data.publicUrl
}
