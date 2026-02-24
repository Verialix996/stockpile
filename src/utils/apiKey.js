import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'stockpile_apikey';

// ── Save ──────────────────────────────────────────────────────────────────────
export async function saveApiKey(key) {
  if (Platform.OS === 'web') {
    localStorage.setItem(KEY, key);
  } else {
    await AsyncStorage.setItem(KEY, key);
  }
}

// ── Load ──────────────────────────────────────────────────────────────────────
export async function loadApiKey() {
  if (Platform.OS === 'web') {
    return localStorage.getItem(KEY) || '';
  } else {
    return (await AsyncStorage.getItem(KEY)) || '';
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────
export async function clearApiKey() {
  if (Platform.OS === 'web') {
    localStorage.removeItem(KEY);
  } else {
    await AsyncStorage.removeItem(KEY);
  }
}

// ── Identify item from base64 image using Claude ──────────────────────────────
export async function identifyItemWithClaude(base64Image, apiKey) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-6',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: `You are a home storage assistant. Look at this image and identify the item.
Respond with ONLY a valid JSON object in this exact format, nothing else:
{
  "name": "item name (short, specific)",
  "category": "one of: Food, Beverages, Cleaning, Tools, Electronics, Clothing, Documents, Other",
  "notes": "one short sentence describing the item (optional, can be empty string)"
}`,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    if (response.status === 401) throw new Error('Invalid API key. Please check your key in Settings.');
    if (response.status === 429) throw new Error('Rate limit reached. Please wait a moment and try again.');
    throw new Error(err?.error?.message || 'Claude API error. Please try again.');
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || '';

  // Strip markdown fences if present
  const clean = text.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(clean);

  return {
    name:     parsed.name     || '',
    category: parsed.category || 'Other',
    notes:    parsed.notes    || '',
  };
}
