import { supabase } from './supabase'
import type { Listing, ListingUpdateRequest } from '../types'

export interface ListingCategory {
  id: string
  label: string
  emoji: string
}

export const LISTING_CATEGORIES: ListingCategory[] = [
  { id: 'real_estate', label: 'Real Estate', emoji: '🏠' },
  { id: 'construction', label: 'Construction', emoji: '🧱' },
  { id: 'hotels_food', label: 'Hotels & Food', emoji: '🍽️' },
  { id: 'services', label: 'Services', emoji: '🔧' },
  { id: 'shops', label: 'Shops', emoji: '🛍️' },
  { id: 'clubs_events', label: 'Clubs & Events', emoji: '🎉' },
  { id: 'other', label: 'Other', emoji: '📌' },
]

export function categoryLabel(id?: string | null): string {
  return LISTING_CATEGORIES.find(c => c.id === id)?.label || String(id)
}

export function categoryEmoji(id?: string | null): string {
  return LISTING_CATEGORIES.find(c => c.id === id)?.emoji || '📌'
}

export interface FetchListingsParams {
  city?: string
  category?: string
  search?: string
  limit?: number
}

export async function fetchVerifiedListings({ city, category, search, limit = 50 }: FetchListingsParams): Promise<Listing[]> {
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

  let rows = (data || []) as Listing[]
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

export async function fetchListingById(id: string): Promise<Listing> {
  const { data, error } = await supabase
    .from('local_listings')
    .select('*, owner:profiles!owner_id(id, full_name, username, avatar_url)')
    .eq('id', id)
    .eq('status', 'verified')
    .single()
  if (error) throw error
  return data as unknown as Listing
}

export async function fetchAdminListings(): Promise<Listing[]> {
  const { data, error } = await supabase
    .from('local_listings')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as Listing[]
}

export async function fetchPendingUpdateRequests(): Promise<ListingUpdateRequest[]> {
  const { data, error } = await supabase
    .from('listing_update_requests')
    .select('*, local_listings(title, city), submitter:profiles!submitted_by(full_name, username)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as unknown as ListingUpdateRequest[]
}

export async function createListing(payload: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('local_listings')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateListing(id: string, payload: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('local_listings')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function verifyListing(id: string, adminId: string) {
  return updateListing(id, {
    status: 'verified',
    verified_by: adminId,
    verified_at: new Date().toISOString(),
  })
}

export async function archiveListing(id: string) {
  return updateListing(id, { status: 'archived' })
}

export interface UpdateRequestLike {
  id: string
  listing_id: string
  changes?: Record<string, unknown>
}

const ALLOWED_UPDATE_KEYS = ['title', 'description', 'price_text', 'phone', 'whatsapp', 'images', 'category', 'city']

export async function approveUpdateRequest(request: UpdateRequestLike, adminId: string): Promise<void> {
  const changes = request.changes || {}
  const patch: Record<string, unknown> = {}
  for (const key of ALLOWED_UPDATE_KEYS) {
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

export async function rejectUpdateRequest(id: string, adminId: string): Promise<void> {
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

export interface SubmitUpdateRequestInput {
  listingId: string
  userId: string
  changes: Record<string, unknown>
  note?: string
}

export async function submitListingUpdateRequest({ listingId, userId, changes, note }: SubmitUpdateRequestInput) {
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

export async function uploadListingImage(file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage
    .from('listing-images')
    .upload(path, file, { upsert: false, contentType: file.type })
  if (error) throw error
  const { data } = supabase.storage.from('listing-images').getPublicUrl(path)
  return data.publicUrl
}
