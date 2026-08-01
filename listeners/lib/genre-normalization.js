// Hot Pepper and Google Places use different (and sometimes overlapping) genre vocabularies
// for the same real-world category. This maps known synonyms/near-duplicates onto Hot
// Pepper's own genre names, which we treat as the canonical set. Unmapped genres pass through
// unchanged. Edit this table if the fetched data surfaces new near-duplicates.
const GENRE_ALIASES = {
  和食店: '和食',
  中華料理店: '中華',
  アジア料理店: 'アジア・エスニック料理',
  'カフェ・喫茶': 'カフェ・スイーツ',
  イタリア料理店: 'イタリアン・フレンチ',
  ビストロ: 'イタリアン・フレンチ',
  'ダイニングバー・バル': 'イタリアン・フレンチ',
  パブ: 'バー・カクテル',
  'アイリッシュ パブ': 'バー・カクテル',
  レストラン: '洋食',
};

export const normalizeGenre = (genre) => {
  if (!genre) return genre;
  return GENRE_ALIASES[genre] ?? genre;
};
