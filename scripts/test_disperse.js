const songs = [
  { id: 1, artist: 'Artist A', title: 'Song 1' },
  { id: 2, artist: 'Artist A', title: 'Song 2' },
  { id: 3, artist: 'Artist A', title: 'Song 3' },
  { id: 4, artist: 'Artist B', title: 'Song 4' },
  { id: 5, artist: 'Artist B', title: 'Song 5' },
  { id: 6, artist: 'Artist C', title: 'Song 6' },
];

const disperse = (items, key) => {
  const result = [];
  const buckets = {};
  
  items.forEach(item => {
    const val = item[key] || 'Unknown';
    if (!buckets[val]) buckets[val] = [];
    buckets[val].push(item);
  });

  const keys = Object.keys(buckets).sort((a, b) => buckets[b].length - buckets[a].length);
  let total = items.length;
  
  while (total > 0) {
    let addedInRound = 0;
    for (const k of keys) {
      if (buckets[k].length > 0) {
        result.push(buckets[k].shift());
        total--;
        addedInRound++;
      }
    }
    if (addedInRound === 0) break;
  }
  return result;
};

const result = disperse(songs, 'artist');
console.log('Original Artists:', songs.map(s => s.artist));
console.log('Dispersed Artists:', result.map(s => s.artist));
if (result[0].artist === result[1].artist) {
  console.error('FAILED: Consecutive artists found');
} else {
  console.log('SUCCESS: Artists dispersed');
}
