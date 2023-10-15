const axios = require('axios');
const { isAxiosError } = require("axios");
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const { fromBuffer  } = require('file-type');

async function igStalk(username) {
    try {
        username = username.replace(/^@/, '');
        const html = await (await fetch(`https://dumpor.com/v/${username}`)).text();
        const $$ = cheerio.load(html);
        const errorTitle = $$('h1.error__title').text().trim();
        if (errorTitle === 'Page not found') {
          return { status: false, message: `El usuario "${username}" no existe.` };
        }
        const name = $$('div.user__title > a > h1').text().trim();
        const Uname = $$('div.user__title > h4').text().trim();
        const description = $$('div.user__info-desc').text().trim();
        const profilePic = $$('div.user__img').attr('style').match(/url\('(.+)'\)/)[1];
        const row = $$('#user-page > div.container > div > div > div:nth-child(1) > div > a');
        const postsH = row.eq(0).text().replace(/Posts/i, '').trim();
        const followersH = row.eq(2).text().replace(/Followers/i, '').trim();
        const followingH = row.eq(3).text().replace(/Following/i, '').trim();
        const list = $$('ul.list > li.list__item');
        const posts = parseInt(list.eq(0).text().replace(/Posts/i, '').replace(/\s+/g, ''));
        const followers = parseInt(list.eq(1).text().replace(/Followers/i, '').replace(/\s+/g, ''));
        const following = parseInt(list.eq(2).text().replace(/Following/i, '').replace(/\s+/g, ''));
        return { status: true, resultado: {name, username: Uname, description, postsH, posts, followersH, followers, followingH, following, profilePic }};
    } catch (error) {
        return { status: false, error: error.message };
    }
}

async function getCookie() {
  try {
    const { data: cookie } = await axios.get("https://pastebin.com/raw/ELJjcbZT");
    return cookie;
  } catch (e) {
    return { status: "error", message: "Failed to fetch cookie." };
  }
}

async function tiktokStalk(username, options) {
  username = username.replace("@", "");
  try {
    const { data } = await axios.get(`https://www.tiktok.com/@${username}`, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.114 Safari/537.36",
        cookie: options?.cookie || (await getCookie()),
      },
    });

    const $ = cheerio.load(data);
      console.log($)
    const result = JSON.parse($("script#__NEXT_DATA__").html());
      
    const user = result.props.pageProps.userData;
    const stats = user.stats;
    const posts = user.items || [];

    const userProfile = {
      username: user.user.uniqueId,
      nickname: user.user.nickname,
      avatarLarger: user.user.avatarLarger,
      avatarThumb: user.user.avatarThumb,
      avatarMedium: user.user.avatarMedium,
      signature: user.user.signature,
      verified: user.user.verified,
      privateAccount: user.user.isSecret,
      region: user.user.region,
      commerceUser: user.user.commerceUserInfo.commerceUser,
      usernameModifyTime: user.user.uniqueIdModifyTime,
      nicknameModifyTime: user.user.nickNameModifyTime,
    };

    const userStats = {
      followerCount: stats.followerCount,
      followingCount: stats.followingCount,
      heartCount: stats.heart,
      videoCount: stats.videoCount,
      likeCount: stats.diggCount,
      friendCount: stats.followingCount,
      postCount: posts.length,
    };

    const userPosts = posts.map((post) => {
      const media = post.video
        ? {
            video: {
              id: post.id,
              duration: post.video.duration,
              ratio: post.video.ratio,
              cover: post.video.cover,
              originCover: post.video.originCover,
              dynamicCover: post.video.dynamicCover,
              playAddr: post.video.playAddr,
              downloadAddr: post.video.downloadAddr,
              format: post.video.format,
              bitrate: post.video.bitrate,
            },
          }
        : {
            images: post.images.map((image) => image.url),
          };

      const music = post.music || {};
      const statistics = post.stats || {};

      return {
        id: post.id,
        desc: post.desc,
        createTime: post.createTime,
        author: post.author,
        locationCreated: post.location,
        hashtags: post.challenges.map((challenge) => challenge.title),
        statistics,
        music,
        ...media,
      };
    });

    return {
      status: "success",
      result: {
        userProfile,
        userStats,
        userPosts,
      },
    };
  } catch (e) {
    return { status: "error", message: e.message };
  }
}

async function googleImage(query) {
  const data = await fetch(`https://www.google.com/search?q=${query}&tbm=isch`, {
    headers: {
      accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
      'accept-encoding': 'gzip, deflate, br',
      'accept-language': 'en-US,en;q=0.9,id;q=0.8',
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.93 Safari/537.36',
    },
  }).then((response) => response.text());
  const $ = cheerio.load(data);
  const pattern =
    /\[1,\[0,"(?<id>[\d\w\-_]+)",\["https?:\/\/(?:[^"]+)",\d+,\d+\]\s?,\["(?<url>https?:\/\/(?:[^"]+))",\d+,\d+\]/gm;
  const matches = [...$.html().matchAll(pattern)];
  const decodeUrl = (url) => decodeURIComponent(JSON.parse(`"${url}"`));
  return matches
    .map(({ groups }) => decodeUrl(groups?.url))
    .filter((v) => /.*\.jpe?g|png$/gi.test(v));
}

async function ssweb(url = '', full = false, type = 'desktop') {
    type = type.toLowerCase();
    if (!['desktop', 'tablet', 'phone'].includes(type)) type = 'desktop';
    try {
        const thumioUrl = `https://image.thum.io/get/fullpage/${url}`;
        const thumioResponse = await axios.get(thumioUrl, { responseType: 'arraybuffer' });
        if (thumioResponse.data) {
            return Buffer.from(thumioResponse.data, 'base64');
        }
    } catch (error) {}
    let form = new URLSearchParams();
    form.append('url', url);
    form.append('device', type);
    if (!!full) form.append('full', 'on');
    form.append('cacheLimit', 0);
    let res = await axios({
        url: 'https://www.screenshotmachine.com/capture.php',
        method: 'post',
        data: form,
    });
    let cookies = res.headers['set-cookie'];
    let buffer = await axios({
        url: 'https://www.screenshotmachine.com/' + res.data.link,
        headers: {
            'cookie': cookies.join(''),
        },
        responseType: 'arraybuffer',
    });
    return Buffer.from(buffer.data, 'base64');
}

async function wallpaper(title, page = '1') {
  return new Promise((resolve, reject) => {
    axios.get(`https://www.besthdwallpaper.com/search?CurrentPage=${page}&q=${title}`).then(({data}) => {
      const $ = cheerio.load(data);
      const hasil = [];
      $('div.grid-item').each(function(a, b) {
        hasil.push({
          title: $(b).find('div.info > a > h3').text(),
          type: $(b).find('div.info > a:nth-child(2)').text(),
          source: 'https://www.besthdwallpaper.com/'+$(b).find('div > a:nth-child(3)').attr('href'),
          image: [$(b).find('picture > img').attr('data-src') || $(b).find('picture > img').attr('src'), $(b).find('picture > source:nth-child(1)').attr('srcset'), $(b).find('picture > source:nth-child(2)').attr('srcset')],
        });
      });
      resolve(hasil);
    });
  });
}

async function lyrics(search) {
  const searchUrl = `https://www.musixmatch.com/search/${search}`;
  const searchResponse = await axios.get(searchUrl);
  const searchHtml = searchResponse.data;
  const $ = cheerio.load(searchHtml);
  const link = $('div.media-card-body > div > h2').find('a').attr('href');
  const lyricsUrl = `https://www.musixmatch.com${link}`;
  const lyricsResponse = await axios.get(lyricsUrl);
  const lyricsHtml = lyricsResponse.data;
  const $$ = cheerio.load(lyricsHtml);
  const thumb = $$('div.col-sm-1.col-md-2.col-ml-3.col-lg-3.static-position > div > div > div').find('img').attr('src');
  const lyrics1 = $$('div.col-sm-10.col-md-8.col-ml-6.col-lg-6 > div.mxm-lyrics > span > p > span').text().trim();
  const lyrics2 = $$('div.col-sm-10.col-md-8.col-ml-6.col-lg-6 > div.mxm-lyrics > span > div > p > span').text().trim();
  const title = $$('#site > div > div > div > main > div > div > div.mxm-track-banner.top > div > div > div').find('div.col-sm-10.col-md-8.col-ml-9.col-lg-9.static-position > div.track-title-header > div.mxm-track-title > h1').text().trim().replace('Lyrics','')
  const artist = $$('#site > div > div > div > main > div > div > div > div > div > div > div> div > div > h2 > span').text().trim();
  const img = `https:${thumb || ''}`
  let lyrics;
  if (lyrics1 && lyrics2) {
  lyrics = `${lyrics1}\n${lyrics2}`;
  } else if (lyrics1) {
  lyrics = lyrics1;
  } else if (lyrics2) {
  lyrics = lyrics2;
  } else {
  lyrics = false;
  }
  if (!thumb || (!lyrics1 || !lyrics2 || !lyrics)) {
    return { status: false, message: 'Algunos de los datos no fueron obtenidos correctamente.', resultado: { titulo: title ? title : 'Titulo no encontrado', artista: artist ? artist : 'Artista no encontrado', imagen: img ? img : 'Imagen no encontrada', letra: lyrics ? lyrics : 'Letra no encontrada'}};
  }
  return { status: true, resultado: { titulo: title, artista: artist, imagen: `https:${thumb}`, letra: lyrics}};
}

function RandomAgresivo(min, max) {
  if (typeof RandomAgresivo.seen === 'undefined') {
    RandomAgresivo.seen = [];
  }
  if (RandomAgresivo.seen.length === 0) {
    RandomAgresivo.seen = Array.from({ length: max - min + 1 }, (_, index) => index + min);
  }
  const randomIndex = Math.floor(Math.random() * RandomAgresivo.seen.length);
  const randomNumber = RandomAgresivo.seen[randomIndex];
  RandomAgresivo.seen.splice(randomIndex, 1);
  return randomNumber;
}

function getFileName(prefix, directory) {
  let index = 1;
  let fileName = `${prefix}`;
  const ext = path.extname(prefix);
  const name = path.basename(prefix, ext);
  while (fs.existsSync(path.join(directory, fileName))) {
    fileName = `${name}+${index}${ext}`;
    index++;
  }
  return fileName;
}

const getBuffer = async (url, options) => {
    options = options || {};
    const res = await axios({
        method: 'get',
        url,
        headers: {
            'DNT': 1,
            'Upgrade-Insecure-Request': 1,
        },
        ...options,
        responseType: 'arraybuffer'
    });
    return res.data;
};

const getBuffer2 = async (url, options) => {
  options = options || {};
  const res = await axios({
    method: 'get',
    url,
    headers: {
      'DNT': 1,
      'Upgrade-Insecure-Request': 1,
    },
    ...options,
    responseType: 'arraybuffer'
  });
  const buffer = Buffer.from(res.data, 'base64');
  const typeInfo = await fromBuffer(buffer);
  let bufferResult = '';
  let fileTypeResult = '';
  let fileSize = '';
  if (typeInfo) {
    fileTypeResult = typeInfo.mime;
  }
  if (buffer) {
    bufferResult = buffer;
    const fileSizeBytes = buffer.length;
    const fileSizeMB = fileSizeBytes / (1024 * 1024);
    if (fileSizeMB % 1 === 0) {
      fileSize = fileSizeMB.toFixed(0); 
    } else {
      fileSize = fileSizeMB.toFixed(2); 
    }
  }
  return {
    buffer: bufferResult,
    fileType: fileTypeResult,
    fileSize: fileSize
  };
};

function xnxxdl(URL) {
  return new Promise((resolve, reject) => {
    fetch(`${URL}`, {method: 'get'}).then((res) => res.text()).then((res) => {
      const $ = cheerio.load(res, {xmlMode: false});
      const title = $('meta[property="og:title"]').attr('content');
      const duration = $('meta[property="og:duration"]').attr('content');
      const image = $('meta[property="og:image"]').attr('content');
      const videoType = $('meta[property="og:video:type"]').attr('content');
      const videoWidth = $('meta[property="og:video:width"]').attr('content');
      const videoHeight = $('meta[property="og:video:height"]').attr('content');
      const info = $('span.metadata').text();
      const videoScript = $('#video-player-bg > script:nth-child(6)').html();
      const files = {
        low: (videoScript.match('html5player.setVideoUrlLow\\(\'(.*?)\'\\);') || [])[1],
        high: videoScript.match('html5player.setVideoUrlHigh\\(\'(.*?)\'\\);' || [])[1],
        HLS: videoScript.match('html5player.setVideoHLS\\(\'(.*?)\'\\);' || [])[1],
        thumb: videoScript.match('html5player.setThumbUrl\\(\'(.*?)\'\\);' || [])[1],
        thumb69: videoScript.match('html5player.setThumbUrl169\\(\'(.*?)\'\\);' || [])[1],
        thumbSlide: videoScript.match('html5player.setThumbSlide\\(\'(.*?)\'\\);' || [])[1],
        thumbSlideBig: videoScript.match('html5player.setThumbSlideBig\\(\'(.*?)\'\\);' || [])[1]};
      resolve({status: true, result: {title, URL, duration, image, videoType, videoWidth, videoHeight, info, files}});
    }).catch((err) => reject({status: false, result: err}));
  });
}

function xnxxsearch(query) {
  return new Promise((resolve, reject) => {
    const baseurl = 'https://www.xnxx.com';
    fetch(`${baseurl}/search/${query}/${Math.floor(Math.random() * 3) + 1}`, {method: 'get'}).then((res) => res.text()).then((res) => {
      const $ = cheerio.load(res, {xmlMode: false});
      const title = [];
      const url = [];
      const desc = [];
      const results = [];
      $('div.mozaique').each(function(a, b) {
        $(b).find('div.thumb').each(function(c, d) {
          url.push(baseurl + $(d).find('a').attr('href').replace('/THUMBNUM/', '/'));
        });
      });
      $('div.mozaique').each(function(a, b) {
        $(b).find('div.thumb-under').each(function(c, d) {
          desc.push($(d).find('p.metadata').text());
          $(d).find('a').each(function(e, f) {
            title.push($(f).attr('title'));
          });
        });
      });
      for (let i = 0; i < title.length; i++) {
        results.push({title: title[i], info: desc[i], link: url[i]});
      }
      resolve({status: true, result: results});
    }).catch((err) => reject({status: false, result: err}));
  });
}


module.exports = {
  getBuffer,
  getBuffer2,
  RandomAgresivo,
  getFileName,
  xnxxsearch,
  xnxxdl,
  lyrics,
  wallpaper,
  ssweb,
  googleImage,
  igStalk,
  tiktokStalk
};
