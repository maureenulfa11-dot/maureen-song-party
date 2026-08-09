// musicLibrary.js — minimal demo library used by composer and host
var musicLibrary = (function(){
  var artists = ['The Mockups','Party Band','DJ Example']
  var titles = ['Feel the Beat','Round One','Sing Along']
  function random(arr){return arr[Math.floor(Math.random()*arr.length)]}

  function quickCreate(){
    var song = {
      id: 's_' + Date.now(),
      title: random(titles) + ' ' + Math.floor(Math.random()*100),
      artist: random(artists),
      youtubeId: sampleYouTubeId()
    }
    return song
  }

  function sampleYouTubeId(){
    // a small set of harmless public YouTube video IDs for demo
    var ids = ['3JZ4pnNtyxQ','2Vv-BfVoq4g','fJ9rUzIMcZQ']
    return ids[Math.floor(Math.random()*ids.length)]
  }

  return {quickCreate:quickCreate,sampleYouTubeId:sampleYouTubeId}
})();
