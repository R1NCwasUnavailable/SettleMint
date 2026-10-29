import { GoogleGenAI, Type, Schema } from '@google/genai';
import { AIExtractionResult, ItemCategory, MemberProfile } from '../types/ledger';

const extractionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    merchantOrTitle: {
      type: Type.STRING,
      description: 'Restaurant name or concise title of the bill',
    },
    paidByMemberName: {
      type: Type.STRING,
      nullable: true,
      description: 'Exact name of the group member who paid, if mentioned',
    },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          amount: { type: Type.NUMBER, description: 'Line total before tax' },
          category: {
            type: Type.STRING,
            enum: ['veg', 'egg', 'non_veg', 'alcohol', 'common'],
          },
          excludedMemberNames: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Names of members explicitly excluded from this item',
          },
        },
        required: ['name', 'amount', 'category', 'excludedMemberNames'],
      },
    },
    taxAndServiceCharge: {
      type: Type.NUMBER,
      description: 'Combined GST, VAT, service charge, or tip amount',
    },
    confidenceNote: {
      type: Type.STRING,
      description: 'Short summary of how pools were split',
    },
  },
  required: [
    'merchantOrTitle',
    'items',
    'taxAndServiceCharge',
    'confidenceNote',
  ],
};

/**
 * Robust heuristic fallback parser when Gemini API key is missing or offline.
 * Extracts amounts, payer name from members, and category pools from natural text.
 */
function heuristicFallbackParse(text: string, members: MemberProfile[]): AIExtractionResult {
  const clean = text.trim();

  // 1. Detect Payer from members roster
  let matchedPayer: string | null = null;
  for (const m of members) {
    const regex = new RegExp(`\\b${m.name}\\b`, 'i');
    if (regex.test(clean)) {
      matchedPayer = m.name;
      break;
    }
  }

  // 2. Extract numbers
  const numberMatches = clean.match(/\b\d+(\.\d{1,2})?\b/g) || [];
  const numbers = numberMatches.map(Number);
  const totalCandidate = numbers.length > 0 ? Math.max(...numbers) : 0;

  // 3. Keyword-based classification
  const items: AIExtractionResult['items'] = [];
  const lower = clean.toLowerCase();

  const isAlcohol = /\b(beer|alcohol|wine|cocktail|vodka|rum|whiskey|drink|kingfisher|pitcher)\b/.test(lower);
  const isNonVeg = /\b(chicken|mutton|fish|prawn|meat|pork|beef|calamari|curry)\b/.test(lower);
  const isEgg = /\b(egg|omelette|bhurji|eggs)\b/.test(lower);

  // Exclude members automatically based on dietary rules
  const nonDrinkers = members.filter((m) => !m.drinks_alcohol).map((m) => m.name);
  const pureVeg = members.filter((m) => m.diet_tag === 'veg').map((m) => m.name);
  const noMeat = members.filter((m) => m.diet_tag === 'veg' || m.diet_tag === 'egg').map((m) => m.name);

  // Check if text has segmented pools (e.g., "1400 beer, 1100 chicken, 900 veg")
  const poolRegex = /(\d+)\s*(?:for\s*)?(beer|alcohol|wine|chicken|meat|prawn|veg|paneer|food|tax|tip|cab|uber)?/gi;
  let match;
  let runningSum = 0;

  while ((match = poolRegex.exec(lower)) !== null) {
    const amt = Number(match[1]);
    const word = match[2] || '';
    if (amt === totalCandidate && numbers.length > 1) continue; // skip overall total if parts exist

    let cat: ItemCategory = 'common';
    let exNames: string[] = [];

    if (/beer|alcohol|wine/.test(word)) {
      cat = 'alcohol';
      exNames = nonDrinkers;
    } else if (/chicken|meat|prawn/.test(word)) {
      cat = 'non_veg';
      exNames = noMeat;
    } else if (/veg|paneer/.test(word)) {
      cat = 'veg';
    }

    if (amt > 0) {
      items.push({
        name: word ? `${word.charAt(0).toUpperCase() + word.slice(1)} Pool` : 'Group Pool',
        amount: amt,
        category: cat,
        excludedMemberNames: exNames,
      });
      runningSum += amt;
    }
  }

  // If no granular pools were matched, create a single item
  if (items.length === 0) {
    let cat: ItemCategory = isAlcohol ? 'alcohol' : isNonVeg ? 'non_veg' : isEgg ? 'egg' : 'common';
    let excluded: string[] = [];
    if (cat === 'alcohol') excluded = nonDrinkers;
    if (cat === 'non_veg') excluded = noMeat;

    items.push({
      name: clean.length > 30 ? clean.slice(0, 30) + '...' : clean || 'Group Expense',
      amount: totalCandidate || 1000,
      category: cat,
      excludedMemberNames: excluded,
    });
  }

  return {
    merchantOrTitle: clean.slice(0, 35) || 'Group Expense',
    paidByMemberName: matchedPayer || members[0]?.name || null,
    items,
    taxAndServiceCharge: 0,
    confidenceNote: 'Parsed with SettleMint local smart heuristic engine.',
  };
}

export async function parseMultimodalExpense(params: {
  members: MemberProfile[];
  textPrompt?: string;
  base64Media?: string;
  mimeType?: 'image/jpeg' | 'image/png' | 'audio/m4a' | 'audio/mp4' | 'audio/webm';
}): Promise<AIExtractionResult> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

  // If no API key configured or running offline heuristic
  if (!apiKey || apiKey === 'your-gemini-api-key' || apiKey.trim() === '') {
    if (params.textPrompt) {
      return heuristicFallbackParse(params.textPrompt, params.members);
    }
    throw new Error(
      'To analyze receipt photos with multimodal vision, add your Google Gemini API key to .env (or type expense in text).'
    );
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const rosterContext = params.members
      .map(
        (m) =>
          `- ${m.name} (Diet: ${m.diet_tag}, Alcohol: ${
            m.drinks_alcohol ? 'Yes' : 'No'
          })`
      )
      .join('\n');

    const systemInstruction = `
You are SettleMint's itemized expense parser for a group trip ledger.
Group Roster:
${rosterContext}

Rules:
1. Extract every line item and classify strictly into: 'alcohol', 'non_veg', 'egg', 'veg', or 'common'.
2. Separate GST, CGST, SGST, VAT, and Service Charge into taxAndServiceCharge.
3. If the voice/text prompt gives pool totals (e.g., "Paid 3400, 1400 beer, 1100 chicken, rest veg"), synthesize items accordingly.
4. Match member names closely to the Group Roster for paidByMemberName and excludedMemberNames.
`;

    const contents: any[] = [];

    if (params.base64Media && params.mimeType) {
      contents.push({
        inlineData: {
          data: params.base64Media,
          mimeType: params.mimeType,
        },
      });
    }

    contents.push({
      text:
        params.textPrompt ||
        'Extract all items, taxes, categories, and payer from this bill.',
    });

    const isMedia = Boolean(params.base64Media && params.mimeType);

    // Selected models: lightweight flash-lite for text, multimodal flash for photos/audio
    const primaryModel = isMedia
      ? (process.env.EXPO_PUBLIC_GEMINI_MULTIMODAL_MODEL || 'gemini-3.5-flash')
      : (process.env.EXPO_PUBLIC_GEMINI_TEXT_MODEL || 'gemini-3.1-flash-lite');

    const backupModel = 'gemini-3.5-flash';

    let response;
    try {
      response = await ai.models.generateContent({
        model: primaryModel,
        contents,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: extractionSchema,
          temperature: 0.1,
        },
      });
    } catch (primaryErr: any) {
      // If primary model hit quota (e.g. 429) or high demand (503) and isn't the backup, retry with backup
      if (primaryModel !== backupModel) {
        console.warn(`Primary model ${primaryModel} failed (${primaryErr?.message}). Retrying with ${backupModel}...`);
        response = await ai.models.generateContent({
          model: backupModel,
          contents,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: extractionSchema,
            temperature: 0.1,
          },
        });
      } else {
        throw primaryErr;
      }
    }

    if (!response || !response.text) {
      throw new Error('Empty response from Gemini API');
    }

    return JSON.parse(response.text) as AIExtractionResult;
  } catch (err: any) {
    // If Gemini fails (network, quota, etc.) and text prompt is present, fall back to heuristic!
    if (params.textPrompt) {
      console.warn('Gemini API call failed, falling back to local heuristic:', err?.message);
      return heuristicFallbackParse(params.textPrompt, params.members);
    }
    throw err;
  }
}
