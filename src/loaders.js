/** trys to get the current charactername and returns it **/
const whoAmI = async() => {
  if(!c) return null;
  let _c = parseInt(c);
  if(!Number.isInteger(_c) || c != _c) return c;
  let resp = await fetch('https://sealoffantasy.de/guestbook/view/?c='+c);
  let dom = new DOMParser().parseFromString(await resp.text(), "text/html");
  let el = dom.documentElement.querySelector('.navbar-header a');
  return el.innerText;
}

/** will load the compact history page and return json */
const loadHistory = async() => {
  let resp = await fetch('https://sealoffantasy.de/account/dialog/history');
  let dom = new DOMParser().parseFromString(await resp.text(), "text/html");
  let lines = [...dom.documentElement.querySelectorAll('.col-xs-9')].slice(1);

  lines = lines.map(el => Object.assign({
      id: el.querySelector('a').href.split('/').pop(),
      url: el.querySelector('a').href,
      name: el.querySelector('a').textContent,
      date: el.querySelector('div').textContent
  }));

  return lines;
}

/** will load all wall entrys for page x and the given user **/
const loadWallPage = async(page) => {
    return new Promise((resolve, reject) => {
	  $.ajax({
          method: "POST",
	      url: 'https://sealoffantasy.de/tools/ajax/get-wall?c='+c,
	      data: {'page': `${page}`},
          success: resolve,
          error: reject
	  });
    });
}

/** loads a gb page from the given gb name using the current c **/
const loadGbPage = async(from, page) => {
    return new Promise((resolve, reject) => {
      performGetRequest(`https://sealoffantasy.de/guestbook/dialog/entries/${from}/${page}?c=${c}`, resolve);
    });
}

/** will load the genorelist **/
const loadIgnores = async() => {
  let resp = await fetch('https://sealoffantasy.de/social/dialog/ignores?c='+c);
  let dom = new DOMParser().parseFromString(await resp.text(), "text/html");
  let items = [...dom.documentElement.querySelectorAll('li')]
              .map(el => Object.assign({
                id: el.dataset.number,
                name: el.textContent.trim(),
  }));
  return items;
}

/** will load our friendlist **/
const loadFriends = async() => {
  let resp = await fetch('https://sealoffantasy.de/social/dialog/friends?c='+c);
  let dom = new DOMParser().parseFromString(await resp.text(), "text/html");

  let tmp = null;
  let lines = [...dom.documentElement.querySelectorAll('li')]
              .map(el => Object.assign({
                id: el.dataset.number,
                name: el.textContent.trim(),
                online: el.querySelector('i')?.outerHTML.includes('#99e699'),
                color: el.querySelector('i')?.style.color,
              }));

  lines.forEach(el => {
    if(el.online===undefined) {
      el.items = [];
      tmp = el;
    }
    else {
      tmp.items.push(el);
    }
  });

  lines = lines.filter(el => el.online===undefined);
  return lines;
}

/** loads the gb of the given name and returns the first image found in it's content **/
const loadImageOf = async(name) => {
  let resp = await fetch(`https://sealoffantasy.de/guestbook/view/${name}?c=${c}`);
  let dom = new DOMParser().parseFromString(await resp.text(), "text/html");
  let images = dom.documentElement.querySelectorAll('.gb img');

  var url = null;
  if(images.length>0) url = images[0].src;

  return {avatar: name, imageUrl: url};
}

/** loads a list with all owned avatars / characters from the account main page **/
const loadAvatarList = async() => {
  try {
    //TODO: how to trigger local-storage reload?!
    let raw = localStorage.getItem('account-char-storage');
    let values = JSON.parse(raw);

    let res = [];
    for(var k in values) res = res.concat(values[k]);
    return res;
  } catch(e) {
    return [];
  }
}
