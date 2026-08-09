// Music Library - Static song database for the game
const MUSIC_LIBRARY = [
  { id: 1, title: "Sunflower", artist: "Post Malone", year: 2018, decade: "2010s", genre: "pop", difficulty: 2 },
  { id: 2, title: "Blinding Lights", artist: "The Weeknd", year: 2019, decade: "2010s", genre: "pop", difficulty: 2 },
  { id: 3, title: "Levitating", artist: "Dua Lipa", year: 2020, decade: "2020s", genre: "pop", difficulty: 2 },
  { id: 4, title: "Uptown Funk", artist: "Mark Ronson", year: 2014, decade: "2010s", genre: "pop", difficulty: 1 },
  { id: 5, title: "Shape of You", artist: "Ed Sheeran", year: 2016, decade: "2010s", genre: "pop", difficulty: 1 },
  { id: 6, title: "Someone Like You", artist: "Adele", year: 2011, decade: "2010s", genre: "ballad", difficulty: 2 },
  { id: 7, title: "Bohemian Rhapsody", artist: "Queen", year: 1975, decade: "1970s", genre: "rock", difficulty: 3 },
  { id: 8, title: "Imagine", artist: "John Lennon", year: 1971, decade: "1970s", genre: "rock", difficulty: 2 },
  { id: 9, title: "Sweet Dreams", artist: "Eurythmics", year: 1983, decade: "1980s", genre: "pop", difficulty: 2 },
  { id: 10, title: "Take On Me", artist: "a-ha", year: 1985, decade: "1980s", genre: "pop", difficulty: 1 },
  { id: 11, title: "Smells Like Teen Spirit", artist: "Nirvana", year: 1991, decade: "1990s", genre: "rock", difficulty: 2 },
  { id: 12, title: "Wonderwall", artist: "Oasis", year: 1996, decade: "1990s", genre: "rock", difficulty: 2 },
];

function getMusicByGenre(genre, limit = 5) {
  return MUSIC_LIBRARY.filter(song => song.genre === genre).slice(0, limit);
}

function getMusicByEra(era, limit = 5) {
  return MUSIC_LIBRARY.filter(song => song.decade === era).slice(0, limit);
}

function getRandomSongs(count = 5) {
  return MUSIC_LIBRARY.sort(() => Math.random() - 0.5).slice(0, count);
}
