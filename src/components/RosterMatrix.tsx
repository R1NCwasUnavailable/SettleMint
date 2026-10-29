import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import {
  UserPlus,
  Trash2,
  Wine,
  Leaf,
  Egg,
  Drumstick,
  Sparkles,
  Users,
} from 'lucide-react-native';
import { DietTag, MemberProfile } from '../types/ledger';
import { CATEGORY_COLORS, COLORS, MONO_FONT, getAvatarColor, shared } from '../theme';

interface RosterMatrixProps {
  members: MemberProfile[];
  onUpdateRule: (
    memberId: string,
    patch: Partial<Pick<MemberProfile, 'diet_tag' | 'drinks_alcohol' | 'upi_id' | 'name'>>
  ) => void;
  onAddMember: (
    name: string,
    upiId: string,
    dietTag?: DietTag,
    drinksAlcohol?: boolean
  ) => void;
  onDeleteMember?: (memberId: string) => void;
  onLoadSample?: () => void;
}

export default function RosterMatrix({
  members,
  onUpdateRule,
  onAddMember,
  onDeleteMember,
  onLoadSample,
}: RosterMatrixProps) {
  const [newName, setNewName] = useState('');
  const [newUpi, setNewUpi] = useState('');
  const [newDiet, setNewDiet] = useState<DietTag>('veg');
  const [newDrinks, setNewDrinks] = useState(false);

  function handleAdd() {
    if (!newName.trim()) return;
    onAddMember(newName.trim(), newUpi.trim(), newDiet, newDrinks);
    setNewName('');
    setNewUpi('');
    setNewDiet('veg');
    setNewDrinks(false);
  }

  function confirmDeleteMember(memberId: string, name: string) {
    if (!onDeleteMember) return;
    if (Platform.OS === 'web') {
      if (window.confirm(`Remove "${name}" from this trip?`)) {
        onDeleteMember(memberId);
      }
    } else {
      Alert.alert(
        'Remove Member',
        `Are you sure you want to remove ${name} from this trip?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: () => onDeleteMember(memberId) },
        ]
      );
    }
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={shared.sectionHeader}>TRIP MEMBERS & DIETARY RULES ({members.length})</Text>
        {onLoadSample && members.length === 0 && (
          <TouchableOpacity style={styles.sampleBtn} onPress={onLoadSample}>
            <Sparkles size={12} color={COLORS.primary} />
            <Text style={styles.sampleBtnText}>Load Sample Friends</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Add Member Card */}
      <View style={styles.addCard}>
        <Text style={styles.addCardTitle}>ADD NEW MEMBER</Text>
        <View style={styles.inputsRow}>
          <TextInput
            style={[styles.input, { flex: 1.2 }]}
            placeholder="Friend's Name (e.g. Priyam)"
            placeholderTextColor={COLORS.textDim}
            value={newName}
            onChangeText={(t) => {
              setNewName(t);
              if (!newUpi) {
                // Auto-suggest upi
                const clean = t.toLowerCase().replace(/[^a-z0-9]/g, '');
                // don't overwrite if user typed upi
              }
            }}
          />
          <TextInput
            style={[styles.input, { flex: 1.5 }]}
            placeholder="UPI ID (e.g. name@oksbi)"
            placeholderTextColor={COLORS.textDim}
            value={newUpi}
            onChangeText={setNewUpi}
          />
        </View>

        {/* Quick Rules for New Member */}
        <View style={styles.newRulesRow}>
          <View style={styles.dietSelector}>
            {(['veg', 'egg', 'non_veg'] as const).map((tag) => {
              const active = newDiet === tag;
              const cat = CATEGORY_COLORS[tag];
              return (
                <TouchableOpacity
                  key={tag}
                  style={[
                    styles.dietChip,
                    active && { backgroundColor: cat.bg, borderColor: cat.border },
                  ]}
                  onPress={() => setNewDiet(tag)}
                >
                  <Text
                    style={[
                      styles.dietChipText,
                      active && { color: cat.text, fontWeight: '700' },
                    ]}
                  >
                    {tag === 'veg' ? '🌱 Veg' : tag === 'egg' ? '🥚 Egg' : '🍗 Non-Veg'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[
              styles.alcoholToggle,
              newDrinks && styles.alcoholToggleOn,
            ]}
            onPress={() => setNewDrinks(!newDrinks)}
          >
            <Wine size={12} color={newDrinks ? COLORS.purple : COLORS.textDim} />
            <Text
              style={[
                styles.alcoholToggleText,
                newDrinks && { color: COLORS.purple, fontWeight: '700' },
              ]}
            >
              {newDrinks ? 'Drinks Alcohol' : 'No Alcohol'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.addBtn, !newName.trim() && styles.addBtnDisabled]}
            onPress={handleAdd}
            disabled={!newName.trim()}
          >
            <UserPlus size={15} color={COLORS.bg} strokeWidth={2.5} />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Member Roster List */}
      {members.length === 0 ? (
        <View style={styles.emptyCard}>
          <Users size={32} color={COLORS.textDim} />
          <Text style={styles.emptyTitle}>No group members yet</Text>
          <Text style={styles.emptySub}>
            Add friends above to configure their dietary and alcohol rules. SettleMint uses these to automatically route food and drink pools during bill splits!
          </Text>
        </View>
      ) : (
        <View style={styles.membersList}>
          {members.map((member, idx) => {
            const avatar = getAvatarColor(idx);
            const dietConfig = CATEGORY_COLORS[member.diet_tag] || CATEGORY_COLORS.veg;

            return (
              <View key={member.id} style={styles.memberRow}>
                <View style={styles.memberLeft}>
                  <View
                    style={[
                      styles.avatar,
                      { backgroundColor: avatar.bg, borderColor: avatar.border },
                    ]}
                  >
                    <Text style={[styles.avatarText, { color: avatar.text }]}>
                      {member.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.nameBlock}>
                    <Text style={styles.memberName}>{member.name}</Text>
                    <Text style={styles.memberUpi}>{member.upi_id}</Text>
                  </View>
                </View>

                {/* Rules Toggles */}
                <View style={styles.rulesBlock}>
                  {/* Diet Selector */}
                  <View style={styles.dietPillGroup}>
                    {(['veg', 'egg', 'non_veg'] as const).map((tag) => {
                      const active = member.diet_tag === tag;
                      const c = CATEGORY_COLORS[tag];
                      return (
                        <TouchableOpacity
                          key={tag}
                          style={[
                            styles.dietMiniPill,
                            active && { backgroundColor: c.bg, borderColor: c.border },
                          ]}
                          onPress={() => onUpdateRule(member.id, { diet_tag: tag })}
                        >
                          <Text
                            style={[
                              styles.dietMiniText,
                              active && { color: c.text, fontWeight: '700' },
                            ]}
                          >
                            {tag === 'veg' ? 'VEG' : tag === 'egg' ? 'EGG' : 'NON-VEG'}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Alcohol Toggle */}
                  <TouchableOpacity
                    style={[
                      styles.alcoholMiniPill,
                      member.drinks_alcohol && styles.alcoholMiniPillOn,
                    ]}
                    onPress={() =>
                      onUpdateRule(member.id, {
                        drinks_alcohol: !member.drinks_alcohol,
                      })
                    }
                  >
                    <Wine
                      size={11}
                      color={member.drinks_alcohol ? COLORS.purple : COLORS.textDim}
                    />
                    <Text
                      style={[
                        styles.alcoholMiniText,
                        member.drinks_alcohol && styles.alcoholMiniTextOn,
                      ]}
                    >
                      {member.drinks_alcohol ? 'ALCOHOL' : 'NO DRINKS'}
                    </Text>
                  </TouchableOpacity>

                  {/* Delete Member */}
                  {onDeleteMember && (
                    <TouchableOpacity
                      style={styles.deleteMemberBtn}
                      onPress={() => confirmDeleteMember(member.id, member.name)}
                    >
                      <Trash2 size={13} color={COLORS.textDim} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sampleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#18181C',
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sampleBtnText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '600',
  },
  addCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  addCardTitle: {
    color: COLORS.textDim,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    fontFamily: MONO_FONT,
    marginBottom: 10,
  },
  inputsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  input: {
    height: 40,
    backgroundColor: '#09090B',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    color: COLORS.text,
    fontSize: 13,
  },
  newRulesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  dietSelector: {
    flexDirection: 'row',
    gap: 4,
  },
  dietChip: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    backgroundColor: '#09090B',
  },
  dietChipText: {
    color: COLORS.textDim,
    fontSize: 11,
    fontWeight: '500',
  },
  alcoholToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    backgroundColor: '#09090B',
  },
  alcoholToggleOn: {
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderColor: COLORS.purple,
  },
  alcoholToggleText: {
    color: COLORS.textDim,
    fontSize: 11,
    fontWeight: '500',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    height: 32,
    borderRadius: 6,
    marginLeft: 'auto',
  },
  addBtnDisabled: {
    opacity: 0.4,
  },
  addBtnText: {
    color: COLORS.bg,
    fontSize: 12,
    fontWeight: '700',
  },
  membersList: {
    gap: 8,
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 10,
    padding: 12,
  },
  memberLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 160,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '700',
  },
  nameBlock: {},
  memberName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  memberUpi: {
    color: COLORS.textDim,
    fontSize: 11,
    fontFamily: MONO_FONT,
    marginTop: 1,
  },
  rulesBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dietPillGroup: {
    flexDirection: 'row',
    backgroundColor: '#09090B',
    borderRadius: 6,
    padding: 2,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  dietMiniPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dietMiniText: {
    color: COLORS.textDim,
    fontSize: 9,
    fontWeight: '600',
    fontFamily: MONO_FONT,
  },
  alcoholMiniPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    backgroundColor: '#09090B',
  },
  alcoholMiniPillOn: {
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderColor: COLORS.purple,
  },
  alcoholMiniText: {
    color: COLORS.textDim,
    fontSize: 10,
    fontWeight: '600',
    fontFamily: MONO_FONT,
  },
  alcoholMiniTextOn: {
    color: COLORS.purple,
  },
  deleteMemberBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#18181C',
  },
  emptyCard: {
    padding: 28,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    gap: 10,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
  },
  emptySub: {
    color: COLORS.textDim,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 380,
  },
});
