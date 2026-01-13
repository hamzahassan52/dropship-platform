'use server';

import { revalidatePath } from 'next/cache';

const API_BASE = process.env.API_URL || 'http://localhost:4000';

// Store Actions
export async function addStore(formData: FormData) {
  const platform = formData.get('platform') as string;
  const name = formData.get('name') as string;
  const storeUrl = formData.get('storeUrl') as string;

  const credentials = platform === 'WOOCOMMERCE'
    ? {
        woocommerce: {
          consumerKey: formData.get('consumerKey'),
          consumerSecret: formData.get('consumerSecret'),
        },
      }
    : {
        shopify: {
          accessToken: formData.get('accessToken'),
        },
      };

  const res = await fetch(`${API_BASE}/stores`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, platform, storeUrl, credentials }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to add store');
  }

  revalidatePath('/stores');
  revalidatePath('/');
  return { success: true };
}

export async function removeStore(storeId: string) {
  const res = await fetch(`${API_BASE}/stores/${storeId}`, {
    method: 'DELETE',
  });

  if (!res.ok) throw new Error('Failed to remove store');

  revalidatePath('/stores');
  revalidatePath('/');
  return { success: true };
}

export async function toggleStore(storeId: string) {
  const res = await fetch(`${API_BASE}/stores/${storeId}/toggle`, {
    method: 'POST',
  });

  if (!res.ok) throw new Error('Failed to toggle store');

  revalidatePath('/stores');
  revalidatePath(`/stores/${storeId}`);
  return { success: true };
}

// Order Actions
export async function fulfillOrder(orderId: string) {
  const res = await fetch(`${API_BASE}/orders/fulfill/${orderId}`, {
    method: 'POST',
  });

  if (!res.ok) throw new Error('Failed to fulfill order');

  revalidatePath('/orders');
  revalidatePath('/');
  return { success: true };
}

export async function fulfillAllOrders() {
  const res = await fetch(`${API_BASE}/orders/fulfill-all`, {
    method: 'POST',
  });

  if (!res.ok) throw new Error('Failed to fulfill orders');

  revalidatePath('/orders');
  revalidatePath('/');
  return { success: true };
}

// Inventory Actions
export async function syncInventory() {
  const res = await fetch(`${API_BASE}/inventory/sync`, {
    method: 'POST',
  });

  if (!res.ok) throw new Error('Failed to sync inventory');

  revalidatePath('/');
  return { success: true };
}

// Tracking Actions
export async function syncTracking() {
  const res = await fetch(`${API_BASE}/orders/sync-tracking`, {
    method: 'POST',
  });

  if (!res.ok) throw new Error('Failed to sync tracking');

  revalidatePath('/orders');
  return { success: true };
}
