import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import {
  Sparkles,
  ArrowRight,
  Receipt,
  Users,
  Wallet,
  Check,
  Plus,
  Wine,
  Leaf,
  Drumstick,
  ShieldCheck,
  Zap,
} from 'lucide-react-native';
import { DietTag } from '../types/ledger';
import { COLORS, MONO_FONT, getAvatarColor, shared } from '../theme';

interface FreshLandingScreenProps {
  onStartTrip: (
    tripName: string,
    initialMembers: { name: string; upiId?: string; dietTag?: DietTag; drinks?: boolean }[]
  ) => void;
  onLoadDemo: () => void;
}

const TRIP_PRESETS = [
  '🏖️ Goa Getaway',
  '🏠 Flatmates 302',
  '⛰️ Manali Road Trip',
  '🍽️ Friday Team Dinner',
];

export default function FreshLandingScreen({
  onStartTrip,
  onLoadDemo,
}: FreshLandingScreenProps) {
  const [tripName, setTripName] = useState('');
  const [memberNameInput, setMemberNameInput] = useState('');
  const [membersList, setMembersList] = useState<
    { name: string; dietTag: DietTag; drinks: boolean }[]
  >([
    { name: 'You', dietTag: 'veg', drinks: false },
  ]);

  function handleAddMember() {
    if (!memberNameInput.trim()) return;
    setMembersList([
      ...membersList,
      { name: memberNameInput.trim(), dietTag: 'non_veg', drinks: true },
    ]);
    setMemberNameInput('');
  }

  function handleRemoveMember(index: number) {
    if (membersList.length <= 1) return;
    setMembersList(membersList.filter((_, idx) => idx !== index));
  }

  function handleToggleDiet(index: number) {
    const current = membersList[index].dietTag;
    const next: DietTag = current === 'veg' ? 'non_veg' : current === 'non_veg' ? 'egg' : 'veg';
    setMembersList(
      membersList.map((m, idx) => (idx === index ? { ...m, dietTag: next } : m))
    );
  }

  function handleToggleDrinks(index: number) {
    setMembersList(
      membersList.map((m, idx) =>
        idx === index ? { ...m, drinks: !m.drinks } : m
      )
    );
  }

  function handleSubmit() {
    const finalTripName = tripName.trim() || 'My Group Trip';
    onStartTrip(
      finalTripName,
      membersList.map((m) => ({
        name: m.name,
        dietTag: m.dietTag,
        drinks: m.drinks,
      }))
    );
  }

  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.contentWrap}>
      {/* ── Top Bar ── */}
      <View style={styles.navBar}>
        <View style={shared.rowCenter}>
          <View style={styles.brandIconWrap}>
            <Sparkles size={16} color={COLORS.primary} />
          </View>
          <Text style={styles.brandTitle}>SettleMint</Text>
          <View style={styles.statusPill}>
            <View style={shared.emeraldDot} />
            <Text style={styles.statusText}>LOCAL & OFFLINE-READY</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.demoPillBtn} onPress={onLoadDemo}>
          <Zap size={13} color={COLORS.primary} />
          <Text style={styles.demoPillText}>Explore Demo Trip</Text>
        </TouchableOpacity>
      </View>

      {/* ── Hero Section ── */}
      <View style={styles.heroSection}>
        <View style={styles.eyebrowBadge}>
          <Text style={styles.eyebrowText}>FAIR GROUP EXPENSES • AI AIDED</Text>
        </View>

        <Text style={styles.heroHeadline}>
          Never argue about trip math again.
        </Text>

        <Text style={styles.heroSubhead}>
          Intelligent itemized bill splitting for trips, dinners, and flatmates. Automatically isolates alcohol and non-veg pools according to dietary rules, then calculates minimum UPI transfers.
        </Text>
      </View>

      {/* ── Interactive Trip Creator Card ── */}
      <View style={styles.creatorCard}>
        <View style={styles.creatorCardHeader}>
          <View>
            <Text style={styles.creatorTitle}>Start a New Trip</Text>
            <Text style={styles.creatorSubtitle}>Set up your group in under 30 seconds</Text>
          </View>
          <View style={styles.freshBadge}>
            <Text style={styles.freshBadgeText}>FRESH WORKSPACE</Text>
          </View>
        </View>

        {/* Trip Name & Preset Chips */}
        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>TRIP OR GROUP NAME</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. Goa Vacation, Flat 402, Manali Trek"
            placeholderTextColor={COLORS.textDim}
            value={tripName}
            onChangeText={setTripName}
          />

          <View style={styles.presetsRow}>
            {TRIP_PRESETS.map((preset) => (
              <TouchableOpacity
                key={preset}
                style={[
                  styles.presetChip,
                  tripName === preset.slice(3) && styles.presetChipActive,
                ]}
                onPress={() => setTripName(preset.slice(3))}
              >
                <Text style={styles.presetText}>{preset}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Member Builder */}
        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>WHO IS ON THIS TRIP? ({membersList.length})</Text>

          <View style={styles.addMemberInputRow}>
            <TextInput
              style={[styles.textInput, { flex: 1 }]}
              placeholder="Friend's Name (e.g. Priyam, Rahul)"
              placeholderTextColor={COLORS.textDim}
              value={memberNameInput}
              onChangeText={setMemberNameInput}
              onSubmitEditing={handleAddMember}
            />
            <TouchableOpacity
              style={[styles.addMemberBtn, !memberNameInput.trim() && { opacity: 0.4 }]}
              onPress={handleAddMember}
              disabled={!memberNameInput.trim()}
            >
              <Plus size={16} color={COLORS.bg} strokeWidth={2.5} />
              <Text style={styles.addMemberBtnText}>Add</Text>
            </TouchableOpacity>
          </View>

          {/* Members List with quick rule toggles */}
          <View style={styles.membersListWrap}>
            {membersList.map((m, idx) => {
              const avatar = getAvatarColor(idx);
              return (
                <View key={idx} style={styles.memberPillRow}>
                  <View style={styles.memberPillLeft}>
                    <View
                      style={[
                        styles.avatarMini,
                        { backgroundColor: avatar.bg, borderColor: avatar.border },
                      ]}
                    >
                      <Text style={[styles.avatarMiniText, { color: avatar.text }]}>
                        {m.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.memberPillName}>{m.name}</Text>
                  </View>

                  <View style={styles.memberPillRight}>
                    {/* Diet Toggle */}
                    <TouchableOpacity
                      style={styles.miniRuleChip}
                      onPress={() => handleToggleDiet(idx)}
                      accessibilityLabel="Click to cycle: Veg, Non-Veg, Egg"
                    >
                      <Text style={styles.miniRuleChipText}>
                        {m.dietTag === 'veg' ? '🌱 Veg' : m.dietTag === 'non_veg' ? '🍗 Non-Veg' : '🥚 Egg'}
                      </Text>
                    </TouchableOpacity>

                    {/* Alcohol Toggle */}
                    <TouchableOpacity
                      style={[styles.miniRuleChip, m.drinks && styles.miniRuleChipActive]}
                      onPress={() => handleToggleDrinks(idx)}
                    >
                      <Wine size={11} color={m.drinks ? COLORS.purple : COLORS.textDim} />
                      <Text
                        style={[
                          styles.miniRuleChipText,
                          m.drinks && { color: COLORS.purple, fontWeight: '700' },
                        ]}
                      >
                        {m.drinks ? 'Drinks' : 'No Drinks'}
                      </Text>
                    </TouchableOpacity>

                    {membersList.length > 1 && (
                      <TouchableOpacity
                        style={styles.removeMemberBtn}
                        onPress={() => handleRemoveMember(idx)}
                      >
                        <Text style={styles.removeMemberText}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Primary Launch Action */}
        <TouchableOpacity style={styles.launchBtn} onPress={handleSubmit}>
          <Text style={styles.launchBtnText}>Launch Trip Workspace</Text>
          <ArrowRight size={18} color={COLORS.bg} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* ── Feature Bento (Why SettleMint) ── */}
      <View style={styles.bentoSection}>
        <View style={styles.bentoCard}>
          <View style={styles.bentoIconBadge}>
            <Receipt size={20} color={COLORS.primary} />
          </View>
          <Text style={styles.bentoCardTitle}>Multimodal AI Parsing</Text>
          <Text style={styles.bentoCardSub}>
            Snap photos of complex restaurant receipts or dictate voice memos. SettleMint extracts individual line items, service taxes, and VAT automatically.
          </Text>
        </View>

        <View style={styles.bentoCard}>
          <View style={styles.bentoIconBadge}>
            <Users size={20} color={COLORS.primary} />
          </View>
          <Text style={styles.bentoCardTitle}>Dietary & Lifestyle Pools</Text>
          <Text style={styles.bentoCardSub}>
            Pre-configure who drinks alcohol and who eats vegetarian. Itemized expenses automatically exclude non-participating members from relevant food and drink pools.
          </Text>
        </View>

        <View style={styles.bentoCard}>
          <View style={styles.bentoIconBadge}>
            <Wallet size={20} color={COLORS.primary} />
          </View>
          <Text style={styles.bentoCardTitle}>Zero-Math UPI Settlements</Text>
          <Text style={styles.bentoCardSub}>
            Our greedy minimum-cashflow algorithm simplifies dozens of tangled debts into the smallest possible number of direct UPI payments.
          </Text>
        </View>
      </View>

      {/* ── Footer ── */}
      <View style={styles.footer}>
        <View style={shared.rowCenter}>
          <ShieldCheck size={14} color={COLORS.textDim} />
          <Text style={styles.footerText}>
            Local offline storage • Zero login required • Private by design
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  contentWrap: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 60,
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    paddingBottom: 24,
  },
  brandIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 6,
  },
  statusText: {
    color: COLORS.textDim,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    fontFamily: MONO_FONT,
  },
  demoPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#141418',
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  demoPillText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  heroSection: {
    marginTop: 16,
    marginBottom: 32,
    alignItems: 'flex-start',
  },
  eyebrowBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 14,
  },
  eyebrowText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
    fontFamily: MONO_FONT,
  },
  heroHeadline: {
    color: COLORS.text,
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 44,
    marginBottom: 12,
  },
  heroSubhead: {
    color: COLORS.textMuted,
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 640,
  },
  creatorCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 24,
    marginBottom: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
  },
  creatorCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  creatorTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
  },
  creatorSubtitle: {
    color: COLORS.textDim,
    fontSize: 13,
    marginTop: 2,
  },
  freshBadge: {
    backgroundColor: '#18181C',
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  freshBadgeText: {
    color: COLORS.primary,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    fontFamily: MONO_FONT,
  },
  fieldBlock: {
    marginBottom: 20,
    gap: 8,
  },
  fieldLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    fontFamily: MONO_FONT,
  },
  textInput: {
    height: 44,
    backgroundColor: '#09090B',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    color: COLORS.text,
    fontSize: 14,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#09090B',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  presetChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  presetText: {
    color: COLORS.textDim,
    fontSize: 12,
  },
  addMemberInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  addMemberBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 8,
  },
  addMemberBtnText: {
    color: COLORS.bg,
    fontSize: 13,
    fontWeight: '700',
  },
  membersListWrap: {
    gap: 8,
    marginTop: 6,
  },
  memberPillRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#09090B',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  memberPillLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarMini: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarMiniText: {
    fontSize: 10,
    fontWeight: '700',
  },
  memberPillName: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  memberPillRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  miniRuleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#141418',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  miniRuleChipActive: {
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderColor: COLORS.purple,
  },
  miniRuleChipText: {
    color: COLORS.textDim,
    fontSize: 11,
    fontWeight: '500',
  },
  removeMemberBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#18181C',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  removeMemberText: {
    color: COLORS.textDim,
    fontSize: 10,
  },
  launchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    height: 48,
    borderRadius: 10,
    marginTop: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  launchBtnText: {
    color: COLORS.bg,
    fontSize: 15,
    fontWeight: '700',
  },
  bentoSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 36,
  },
  bentoCard: {
    flex: 1,
    minWidth: 260,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 12,
    padding: 20,
  },
  bentoIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  bentoCardTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  bentoCardSub: {
    color: COLORS.textDim,
    fontSize: 13,
    lineHeight: 19,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
  },
  footerText: {
    color: COLORS.textDim,
    fontSize: 12,
  },
});
