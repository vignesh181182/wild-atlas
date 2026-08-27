import {
  addGroup, deleteGroup, ensureProfile, forget, listGroups, listSaved,
  listSearches, readSurprise, recordSearch, removeFromGroup, renameGroup,
  toggleSave, writeSurprise,
} from '@/server/profile';
import type { CreatureSummary } from '@/lib/types';

const USER = 'smoke_test_user';
const otter: CreatureSummary = {
  id: 41860, name: 'Sea Otter', scientificName: 'Enhydra lutris', kind: 'Mammal',
  rank: 'species', extinct: false, conservationStatus: 'Endangered',
  thumbUrl: null, observations: 1234,
};

const ok = (label: string, cond: boolean, extra = '') =>
  console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${label}${extra ? ' — ' + extra : ''}`);

async function main() {
  // Start from a clean slate so reruns mean something.
  for (const g of await listGroups(USER)) await deleteGroup(USER, g.id);

  const starter = await ensureProfile(USER);
  ok('ensureProfile seeds starter groups', starter.length === 4, starter.map(g => g.name).join(', '));
  ok('ensureProfile is idempotent', (await ensureProfile(USER)).length === 4);

  const made = await addGroup(USER, 'Rockpools');
  ok('addGroup', made !== null && made.name === 'Rockpools');
  ok('addGroup rejects a case-insensitive duplicate', (await addGroup(USER, 'rockpools')) === null);
  ok('addGroup rejects blank', (await addGroup(USER, '   ')) === null);

  const g = made!;
  ok('toggleSave adds', (await toggleSave(USER, otter, g.id)) === 'added');
  let saved = await listSaved(USER);
  ok('listSaved returns it', saved.length === 1 && saved[0].creature.id === otter.id);

  const fav = starter[0];
  await toggleSave(USER, otter, fav.id);
  saved = await listSaved(USER);
  ok('a creature can sit in two groups', saved[0].groupIds.length === 2);

  ok('toggleSave removes', (await toggleSave(USER, otter, g.id)) === 'removed');
  saved = await listSaved(USER);
  ok('still kept via the other group', saved.length === 1 && saved[0].groupIds.length === 1);

  await renameGroup(USER, g.id, 'Tide pools');
  ok('renameGroup does not disturb saves',
     (await listGroups(USER)).some(x => x.name === 'Tide pools') && (await listSaved(USER)).length === 1);

  await removeFromGroup(USER, otter.id, fav.id);
  ok('leaving its last group forgets the creature', (await listSaved(USER)).length === 0);

  await toggleSave(USER, otter, fav.id);
  await deleteGroup(USER, fav.id);
  ok('deleting a group drops creatures kept only there', (await listSaved(USER)).length === 0);

  await toggleSave(USER, otter, g.id);
  await forget(USER, otter.id);
  ok('forget removes outright', (await listSaved(USER)).length === 0);

  await recordSearch(USER, 'otter', 7);
  await recordSearch(USER, 'otter', 9);
  await recordSearch(USER, 'elephant', 3);
  const hist = await listSearches(USER);
  ok('search history records', hist.length === 2, hist.map(h => h.query).join(', '));
  ok('a repeated query folds into one row', hist.filter(h => h.query === 'otter').length === 1);
  ok('newest first', hist[0].query === 'elephant');
  ok('blank searches are not recorded',
     (await recordSearch(USER, '  ', null), (await listSearches(USER)).length === 2));

  ok('surprise starts empty', (await readSurprise(USER)) === null);
  await writeSurprise(USER, { cursor: 3, servedOn: '2026-08-27', settledOn: null });
  const s = await readSurprise(USER);
  ok('surprise round-trips', s?.cursor === 3 && s?.settledOn === null);

  for (const grp of await listGroups(USER)) await deleteGroup(USER, grp.id);
  console.log('\n  (test profile cleaned up)');
}
main().catch((e) => { console.error('\nERROR:', e.message); process.exit(1); });
