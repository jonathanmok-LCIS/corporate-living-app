'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createHouse(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const house = {
    name: formData.get('name') as string,
    address: formData.get('address') as string,
    city: formData.get('city') as string,
    state: formData.get('state') as string,
    postal_code: formData.get('postal_code') as string,
    country: formData.get('country') as string || 'USA',
    total_rooms: parseInt(formData.get('total_rooms') as string) || 0,
    description: formData.get('description') as string,
    created_by: user.id,
  }

  const { error } = await supabase
    .from('houses')
    .insert(house)

  if (error) {
    console.error('Error creating house:', error)
    throw new Error(error.message)
  }

  revalidatePath('/dashboard/houses')
  redirect('/dashboard/houses')
}

export async function updateHouse(id: string, formData: FormData) {
  const supabase = await createClient()

  const house = {
    name: formData.get('name') as string,
    address: formData.get('address') as string,
    city: formData.get('city') as string,
    state: formData.get('state') as string,
    postal_code: formData.get('postal_code') as string,
    country: formData.get('country') as string || 'USA',
    total_rooms: parseInt(formData.get('total_rooms') as string) || 0,
    description: formData.get('description') as string,
  }

  const { error } = await supabase
    .from('houses')
    .update(house)
    .eq('id', id)

  if (error) {
    console.error('Error updating house:', error)
    throw new Error(error.message)
  }

  revalidatePath('/dashboard/houses')
  revalidatePath(`/dashboard/houses/${id}`)
  redirect('/dashboard/houses')
}

export async function deleteHouse(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('houses')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting house:', error)
    throw new Error(error.message)
  }

  revalidatePath('/dashboard/houses')
  redirect('/dashboard/houses')
}
