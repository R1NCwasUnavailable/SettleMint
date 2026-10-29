import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Platform } from 'react-native';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { DietTag, ExpenseRecord, MemberProfile } from '../types/ledger';

const storageAdapter = Platform.OS === 'web'
  ? {
      getItem: (name: string) => Promise.resolve(localStorage.getItem(name)),
      setItem: (name: string, value: string) => { localStorage.setItem(name, value); return Promise.resolve(); },
      removeItem: (name: string) => { localStorage.removeItem(name); return Promise.resolve(); },
    }
  : (() => {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      return AsyncStorage;
    })();

export interface TripSummary {
  id: string;
  name: string;
  created_at: string;
}

export interface StoredTripData {
  tripId: string;
  tripName: string;
  members: MemberProfile[];
  expenses: ExpenseRecord[];
}

export const SAMPLE_MEMBERS: MemberProfile[] = [
  {
    id: '11111111-1111-1111-1111-111111111101',
    trip_id: '00000000-0000-0000-0000-000000000001',
    name: 'Prince',
    upi_id: 'prince@okaxis',
    diet_tag: 'veg',
    drinks_alcohol: false,
  },
  {
    id: '11111111-1111-1111-1111-111111111102',
    trip_id: '00000000-0000-0000-0000-000000000001',
    name: 'Priyam',
    upi_id: 'priyam@okicici',
    diet_tag: 'non_veg',
    drinks_alcohol: true,
  },
  {
    id: '11111111-1111-1111-1111-111111111103',
    trip_id: '00000000-0000-0000-0000-000000000001',
    name: 'Prabhanjan',
    upi_id: 'prabhanjan@oksbi',
    diet_tag: 'non_veg',
    drinks_alcohol: true,
  },
  {
    id: '11111111-1111-1111-1111-111111111104',
    trip_id: '00000000-0000-0000-0000-000000000001',
    name: 'Omkar',
    upi_id: 'omkar@ybl',
    diet_tag: 'egg',
    drinks_alcohol: true,
  },
];

export const SAMPLE_EXPENSES: ExpenseRecord[] = [
  {
    id: 'exp-sample-01',
    title: 'Airport Cabs & Toll',
    paid_by_member_id: '11111111-1111-1111-1111-111111111103',
    total_amount: 1800,
    tax_and_tip: 0,
    created_at: '10:30 AM',
    splits: {
      '11111111-1111-1111-1111-111111111101': 450,
      '11111111-1111-1111-1111-111111111102': 450,
      '11111111-1111-1111-1111-111111111103': 450,
      '11111111-1111-1111-1111-111111111104': 450,
    },
  },
];

interface TripStoreState {
  tripId: string;
  tripName: string;
  members: MemberProfile[];
  expenses: ExpenseRecord[];
  allTrips: TripSummary[];
  pendingSyncIds: string[];
  syncStatus: 'local' | 'syncing' | 'Realtime Live' | 'offline-queued';
  hasStartedTrip: boolean;

  // Actions
  startNewTrip: (name: string, initialMembers?: { name: string; upiId?: string; dietTag?: DietTag; drinks?: boolean }[]) => void;
  setTripName: (name: string) => void;
  initializeRealtimeSync: () => Promise<() => void>;
  fetchCloudLedger: () => Promise<void>;
  addExpense: (expense: Omit<ExpenseRecord, 'id' | 'created_at'>) => Promise<void>;
  updateExpense: (id: string, updated: Omit<ExpenseRecord, 'id' | 'created_at'>) => Promise<void>;
  deleteExpense: (expenseId: string) => Promise<void>;
  recordPayment: (fromMemberId: string, toMemberId: string, amount: number) => Promise<void>;
  updateMemberRule: (
    memberId: string,
    patch: Partial<Pick<MemberProfile, 'diet_tag' | 'drinks_alcohol' | 'upi_id' | 'name'>>
  ) => Promise<void>;
  addMember: (name: string, upi_id: string, diet_tag?: DietTag, drinks_alcohol?: boolean) => Promise<void>;
  deleteMember: (memberId: string) => Promise<void>;
  flushOfflineQueue: () => Promise<void>;
  clearAllData: () => void;
  loadSampleTrip: () => void;
}

function generateUUID(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const useTripStore = create<TripStoreState>()(
  persist(
    (set, get) => ({
      tripId: '00000000-0000-0000-0000-000000000001',
      tripName: '',
      members: [],
      expenses: [],
      allTrips: [],
      pendingSyncIds: [],
      syncStatus: isSupabaseConfigured ? 'syncing' : 'local',
      hasStartedTrip: false,

      startNewTrip: (name: string, initialMembers = []) => {
        const newTripId = generateUUID();
        const tripTitle = name.trim() || 'My Group Trip';
        const createdMembers: MemberProfile[] = initialMembers.map((m) => ({
          id: generateUUID(),
          trip_id: newTripId,
          name: m.name.trim(),
          upi_id: m.upiId?.trim() || `${m.name.toLowerCase().replace(/\s+/g, '')}@okaxis`,
          diet_tag: m.dietTag || 'veg',
          drinks_alcohol: m.drinks ?? false,
        }));

        const newTripSummary: TripSummary = {
          id: newTripId,
          name: tripTitle,
          created_at: new Date().toLocaleDateString(),
        };

        set((state) => ({
          tripId: newTripId,
          tripName: tripTitle,
          members: createdMembers,
          expenses: [],
          allTrips: [newTripSummary, ...state.allTrips.filter((t) => t.id !== newTripId)],
          pendingSyncIds: [],
          hasStartedTrip: true,
        }));
      },

      setTripName: (name: string) => {
        const { tripId } = get();
        set((state) => ({
          tripName: name,
          allTrips: state.allTrips.map((t) => (t.id === tripId ? { ...t, name } : t)),
        }));
      },

      fetchCloudLedger: async () => {
        if (!isSupabaseConfigured || !supabase) {
          set({ syncStatus: 'local' });
          return;
        }

        try {
          set({ syncStatus: 'syncing' });
          const { tripId, tripName } = get();

          await supabase
            .from('trips')
            .upsert({ id: tripId, name: tripName || 'Group Trip', currency: 'INR' }, { onConflict: 'id' });

          const { data: dbMembers } = await supabase
            .from('group_members')
            .select('*')
            .eq('trip_id', tripId)
            .order('created_at', { ascending: true });

          if (dbMembers && dbMembers.length > 0) {
            set({ members: dbMembers as MemberProfile[], hasStartedTrip: true });
          }

          const { data: dbExpenses } = await supabase
            .from('expenses')
            .select('*, expense_splits(member_id, owed_amount)')
            .eq('trip_id', tripId)
            .order('created_at', { ascending: false });

          if (dbExpenses && dbExpenses.length > 0) {
            const hydrated: ExpenseRecord[] = dbExpenses.map((row: any) => {
              const splitMap: Record<string, number> = {};
              (row.expense_splits || []).forEach((s: any) => {
                splitMap[s.member_id] = Number(s.owed_amount);
              });

              return {
                id: row.id,
                title: row.title,
                paid_by_member_id: row.paid_by_member_id,
                total_amount: Number(row.total_amount),
                tax_and_tip: Number(row.tax_and_tip || 0),
                created_at: new Date(row.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
                splits: splitMap,
              };
            });

            set({ expenses: hydrated });
          }

          set({ syncStatus: 'Realtime Live' });
        } catch (err) {
          console.warn('Supabase fetch fallback to offline cache:', err);
          set({ syncStatus: 'offline-queued' });
        }
      },

      initializeRealtimeSync: async () => {
        await get().fetchCloudLedger();
        await get().flushOfflineQueue();

        if (!isSupabaseConfigured || !supabase) {
          return () => {};
        }

        const channel = supabase
          .channel('settlemint-ledger-sync')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'group_members' },
            () => get().fetchCloudLedger()
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'expenses' },
            () => get().fetchCloudLedger()
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'expense_splits' },
            () => get().fetchCloudLedger()
          )
          .subscribe();

        return () => {
          supabase!.removeChannel(channel);
        };
      },

      addExpense: async (payload) => {
        const newId = generateUUID();
        const timestamp = new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });

        const newRecord: ExpenseRecord = {
          id: newId,
          created_at: timestamp,
          ...payload,
        };

        set((state) => ({
          expenses: [newRecord, ...state.expenses],
        }));

        if (!isSupabaseConfigured || !supabase) return;

        try {
          const { tripId } = get();
          const { error: expErr } = await supabase.from('expenses').insert({
            id: newId,
            trip_id: tripId,
            title: payload.title,
            paid_by_member_id: payload.paid_by_member_id,
            total_amount: payload.total_amount,
            tax_and_tip: payload.tax_and_tip,
            input_source: 'text',
          });

          if (expErr) throw expErr;

          const splitRows = Object.entries(payload.splits).map(([member_id, owed_amount]) => ({
            expense_id: newId,
            member_id,
            owed_amount,
          }));

          const { error: splitErr } = await supabase.from('expense_splits').insert(splitRows);
          if (splitErr) throw splitErr;

          set({ syncStatus: 'Realtime Live' });
        } catch (err) {
          set((state) => ({
            pendingSyncIds: [...state.pendingSyncIds, newId],
            syncStatus: 'offline-queued',
          }));
        }
      },

      updateExpense: async (id, updated) => {
        set((state) => ({
          expenses: state.expenses.map((e) =>
            e.id === id ? { ...e, ...updated } : e
          ),
        }));

        if (!isSupabaseConfigured || !supabase) return;

        try {
          await supabase.from('expenses').update({
            title: updated.title,
            paid_by_member_id: updated.paid_by_member_id,
            total_amount: updated.total_amount,
            tax_and_tip: updated.tax_and_tip,
          }).eq('id', id);

          // Delete existing splits and re-insert
          await supabase.from('expense_splits').delete().eq('expense_id', id);
          const splitRows = Object.entries(updated.splits).map(([member_id, owed_amount]) => ({
            expense_id: id,
            member_id,
            owed_amount,
          }));
          await supabase.from('expense_splits').insert(splitRows);
        } catch (err) {
          console.warn('Failed to update expense in Supabase:', err);
        }
      },

      deleteExpense: async (expenseId: string) => {
        set((state) => ({
          expenses: state.expenses.filter((e) => e.id !== expenseId),
          pendingSyncIds: state.pendingSyncIds.filter((id) => id !== expenseId),
        }));

        if (!isSupabaseConfigured || !supabase) return;

        try {
          await supabase.from('expenses').delete().eq('id', expenseId);
        } catch (err) {
          console.warn('Failed to delete expense from Supabase:', err);
        }
      },

      recordPayment: async (fromMemberId: string, toMemberId: string, amount: number) => {
        const { members, addExpense } = get();
        const fromMember = members.find((m) => m.id === fromMemberId);
        const toMember = members.find((m) => m.id === toMemberId);
        const fromName = fromMember ? fromMember.name : 'Member';
        const toName = toMember ? toMember.name : 'Member';

        // An expense where `fromMember` pays `amount` specifically for `toMember`
        // perfectly extinguishes the debt in the greedy minimum cash flow graph!
        await addExpense({
          title: `Payment: ${fromName} → ${toName}`,
          paid_by_member_id: fromMemberId,
          total_amount: amount,
          tax_and_tip: 0,
          splits: {
            [toMemberId]: amount,
          },
        });
      },

      updateMemberRule: async (memberId, patch) => {
        set((state) => ({
          members: state.members.map((m) => (m.id === memberId ? { ...m, ...patch } : m)),
        }));

        if (!isSupabaseConfigured || !supabase) return;

        try {
          await supabase.from('group_members').update(patch).eq('id', memberId);
        } catch (err) {
          set({ syncStatus: 'offline-queued' });
        }
      },

      addMember: async (name, upi_id, diet_tag = 'veg', drinks_alcohol = false) => {
        const { tripId } = get();
        const newMember: MemberProfile = {
          id: generateUUID(),
          trip_id: tripId,
          name: name.trim(),
          upi_id: upi_id.trim() || `${name.toLowerCase().replace(/\s+/g, '')}@okaxis`,
          diet_tag,
          drinks_alcohol,
        };

        set((state) => ({
          members: [...state.members, newMember],
          hasStartedTrip: true,
        }));

        if (!isSupabaseConfigured || !supabase) return;

        try {
          await supabase.from('group_members').insert(newMember);
        } catch (err) {
          set({ syncStatus: 'offline-queued' });
        }
      },

      deleteMember: async (memberId: string) => {
        set((state) => ({
          members: state.members.filter((m) => m.id !== memberId),
        }));

        if (!isSupabaseConfigured || !supabase) return;

        try {
          await supabase.from('group_members').delete().eq('id', memberId);
        } catch (err) {
          console.warn('Failed to delete member from Supabase:', err);
        }
      },

      flushOfflineQueue: async () => {
        if (!isSupabaseConfigured || !supabase) return;
        const { pendingSyncIds, expenses, tripId } = get();
        if (pendingSyncIds.length === 0) return;

        const remaining: string[] = [];

        for (const id of pendingSyncIds) {
          const exp = expenses.find((e) => e.id === id);
          if (!exp) continue;

          try {
            const { error: e1 } = await supabase.from('expenses').upsert({
              id: exp.id,
              trip_id: tripId,
              title: exp.title,
              paid_by_member_id: exp.paid_by_member_id,
              total_amount: exp.total_amount,
              tax_and_tip: exp.tax_and_tip,
            });
            if (e1) throw e1;

            const splitRows = Object.entries(exp.splits).map(([member_id, owed_amount]) => ({
              expense_id: exp.id,
              member_id,
              owed_amount,
            }));
            await supabase.from('expense_splits').upsert(splitRows, {
              onConflict: 'expense_id,member_id',
            });
          } catch {
            remaining.push(id);
          }
        }

        set({
          pendingSyncIds: remaining,
          syncStatus: remaining.length === 0 ? 'Realtime Live' : 'offline-queued',
        });
      },

      clearAllData: () => {
        set({
          tripName: '',
          members: [],
          expenses: [],
          pendingSyncIds: [],
          hasStartedTrip: false,
        });
      },

      loadSampleTrip: () => {
        set({
          tripName: 'Goa Trip ’26',
          members: SAMPLE_MEMBERS,
          expenses: SAMPLE_EXPENSES,
          pendingSyncIds: [],
          hasStartedTrip: true,
        });
      },
    }),
    {
      name: 'settlemint-v5-complete',
      storage: createJSONStorage(() => storageAdapter),
    }
  )
);
