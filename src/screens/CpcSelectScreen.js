import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../components/Button';
import { COLORS } from '../config';
import { call, dcsOf, cpcsOf } from '../api';

// City → DC (auto when only one, e.g. Delhi → Bamnoli DC) → CPC of that DC
export default function CpcSelectScreen({ token, profile, onDone, onCancel }) {
  const net = profile.network || [];
  const scope = profile.scope || {};
  const lockedCity = scope.city || '';
  const lockedDc = scope.dc || '';
  const startCity = lockedCity || profile.city || '';
  const startDcs = startCity ? dcsOf(net, startCity) : [];
  const startDc = lockedDc || (startDcs.length === 1 ? startDcs[0] : profile.dc || '');

  const [city, setCity] = useState(startCity);
  const [dc, setDc] = useState(startDc);
  const [cpc, setCpc] = useState(cpcsOf(net, startCity, startDc).includes(profile.cpc) ? profile.cpc : '');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const step = !city ? 'city' : !dc ? 'dc' : 'cpc';

  const items = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list;
    if (step === 'city') list = net.map((c) => ({ key: c.city, sub: `${c.dcs.reduce((s, d) => s + d.cpcs.length, 0)} CPCs` }));
    else if (step === 'dc') list = dcsOf(net, city).map((d) => ({ key: d, sub: `${cpcsOf(net, city, d).length} CPCs` }));
    else list = cpcsOf(net, city, dc).map((c) => ({ key: c }));
    return q ? list.filter((i) => i.key.toLowerCase().includes(q)) : list;
  }, [step, city, dc, search, net]);

  const pick = (k) => {
    if (step === 'city') {
      const d = dcsOf(net, k);
      setCity(k);
      setDc(d.length === 1 ? d[0] : '');
      setCpc('');
    } else if (step === 'dc') {
      setDc(k);
      setCpc('');
    } else setCpc(k);
    setSearch('');
  };

  const back = () => {
    if (step === 'cpc' && !lockedDc && dcsOf(net, city).length > 1) { setDc(''); setCpc(''); return; }
    if (step !== 'city' && !lockedCity && !lockedDc) { setCity(''); setDc(''); setCpc(''); return; }
    onCancel?.();
  };
  const canBack =
    !!onCancel || (step === 'cpc' && !lockedDc && dcsOf(net, city).length > 1) || (step !== 'city' && !lockedCity && !lockedDc);

  const confirm = async () => {
    setBusy(true);
    setError('');
    const res = await call('setCpc', token, cpc);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    onDone(res.profile);
  };

  const title = step === 'city' ? 'Select your city' : step === 'dc' ? 'Select your DC' : 'Select your CPC';

  return (
    <SafeAreaView style={styles.wrap} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>SHADOWFAX · RIDER</Text>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.uline} />
        <View style={styles.crumbs}>
          <Crumb label="CITY" value={city} />
          <Text style={styles.sep}>›</Text>
          <Crumb label="DC" value={dc} />
          <Text style={styles.sep}>›</Text>
          <Crumb label="CPC" value={cpc} />
        </View>
        {lockedDc ? <Text style={styles.locked}>Assigned by your hub: {lockedDc}</Text> : null}
      </View>
      <View style={styles.body}>
        {step === 'cpc' && cpcsOf(net, city, dc).length > 6 ? (
          <TextInput style={styles.search} value={search} onChangeText={setSearch} placeholder="Search CPC" placeholderTextColor={COLORS.grey} autoCapitalize="none" />
        ) : null}
        <FlatList
          data={items}
          keyExtractor={(i) => i.key}
          ListEmptyComponent={<Text style={styles.empty}>No match.</Text>}
          renderItem={({ item }) => {
            const on = step === 'cpc' && item.key === cpc;
            return (
              <Pressable onPress={() => pick(item.key)} style={[styles.item, on && styles.itemOn]}>
                <View style={[styles.radio, on && styles.radioOn]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemText, on && { color: COLORS.darkGreen }]}>{item.key}</Text>
                  {item.sub ? <Text style={styles.itemSub}>{item.sub}</Text> : null}
                </View>
                {step !== 'cpc' ? <Text style={styles.chev}>›</Text> : null}
              </Pressable>
            );
          }}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {step === 'cpc' ? <Button label="Confirm CPC" onPress={confirm} disabled={!cpc} busy={busy} /> : null}
        {canBack ? <Button label="Back" variant="ghost" onPress={back} style={{ marginTop: 8 }} /> : null}
      </View>
    </SafeAreaView>
  );
}

function Crumb({ label, value }) {
  return (
    <View style={{ flexShrink: 1 }}>
      <Text style={styles.crumbLabel}>{label}</Text>
      <Text style={[styles.crumbValue, !value && { color: '#7d8389' }]} numberOfLines={1}>{value || '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: COLORS.ink },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 18 },
  eyebrow: { color: COLORS.lime, fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  title: { color: COLORS.white, fontSize: 24, fontWeight: '800', marginTop: 6 },
  uline: { width: 40, height: 4, backgroundColor: COLORS.lime, borderRadius: 2, marginTop: 8 },
  crumbs: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 16 },
  crumbLabel: { color: '#9aa0a6', fontSize: 9, fontWeight: '700', letterSpacing: 1.2 },
  crumbValue: { color: COLORS.white, fontSize: 13, fontWeight: '700', marginTop: 2 },
  sep: { color: COLORS.lime, fontSize: 16, fontWeight: '800' },
  locked: { color: COLORS.lime, fontSize: 12, marginTop: 10 },
  body: { flex: 1, backgroundColor: COLORS.bg, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16 },
  search: { height: 46, borderWidth: 1, borderColor: COLORS.rule, borderRadius: 10, paddingHorizontal: 12, fontSize: 15, backgroundColor: COLORS.white, marginBottom: 10, color: COLORS.ink },
  item: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.rule, borderRadius: 12, padding: 14, marginBottom: 8 },
  itemOn: { borderColor: COLORS.green, backgroundColor: COLORS.tint },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: COLORS.rule, marginRight: 12 },
  radioOn: { borderColor: COLORS.green, backgroundColor: COLORS.green },
  itemText: { fontSize: 15, fontWeight: '700', color: COLORS.ink },
  itemSub: { fontSize: 12, color: COLORS.grey, marginTop: 2 },
  chev: { fontSize: 22, color: COLORS.grey },
  empty: { textAlign: 'center', color: COLORS.grey, marginTop: 20 },
  error: { color: COLORS.red, marginBottom: 8, textAlign: 'center' },
});
