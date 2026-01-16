'use server';

import { revalidatePath } from 'next/cache';

// Use the correct env variable and add /api prefix
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/api';

// Test Store Connection
export async function testStoreConnection(data: {
  platform: 'WOOCOMMERCE' | 'SHOPIFY';
  storeUrl: string;
  credentials: {
    woocommerce?: { consumerKey: string; consumerSecret: string };
    shopify?: { accessToken: string };
  };
}) {
  try {
    const res = await fetch(`${API_BASE}/stores/test-connection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await res.json();
    return result;
  } catch (error) {
    return { success: false, error: 'Failed to test connection' };
  }
}

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

export async function updateStoreSettings(
  storeId: string,
  settings: {
    autoFulfill?: boolean;
    autoSyncTracking?: boolean;
    autoSyncInventory?: boolean;
  }
) {
  const res = await fetch(`${API_BASE}/stores/${storeId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ settings }),
  });

  if (!res.ok) throw new Error('Failed to update settings');

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
