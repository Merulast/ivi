let cssReferences = {};
let settings = {};
let cache = {};

function loadCache() {
    const key = 'cache';

    try {
      let raw = localStorage.getItem('ivi:'+key);
      let values = JSON.parse(raw) || {};
      cache = storageProxy(key, values);
    } catch(e) {
      console.log(e);
      cache = storageProxy(key, {});
    }
}

const parseGbContent = (data) => {
  var dom = new DOMParser().parseFromString(data, "text/html");
  let nodes = [...dom.documentElement.querySelectorAll('.entry')];

  let parted = nodes.map(el => Object.assign({
      dateNode: el.querySelector('.pull-right'),
      bodyNode: el.querySelectorAll('div')[1],
  }));

  // parse date
  let raw = parted.map(el => Object.assign({
      date: parseGbDate( el.dateNode.textContent.trim() ),
      rawDate: el.dateNode.textContent.trim(),
      private: el.dateNode.previousSibling.textContent.trim() == 'Eintrag ist Privat',
      from: el.bodyNode.querySelector('a').textContent.trim(),
      content: el.bodyNode.innerHTML.split('<br><br>').slice(1).join('<br><br>'),
  }));

  return raw;
}

/** from "11.07.2023 / 09:40" over "2019-01-01T00:00:00.000Z" to date obj */
const parseGbDate = (str) => {
  var pattern = /(\d{2})\.(\d{2})\.(\d{4}) \/ (\d{2})\:(\d{2})/;
  var date = str.replace(pattern,'$3-$2-$1T$4:$5:00.000Z');
  return new Date(date);
}

const parseMessageContent = ({data, type}) => {
  var dom = new DOMParser().parseFromString(data, "text/html");

  let bNode = dom.documentElement.querySelector('b');
  let spanNode = dom.documentElement.querySelector('span');

  // 'extrawurst' for friends comming online.
  if(data.includes('ist jetzt online.</i>')) {
    return { type: 'friendonline', sender: spanNode?.innerHTML};
  }

  let sender = bNode?.textContent;
  let mode = 'from'
  let date = new Date().toLocaleString('de-DE');

  if(type=='message') sender = sender?.slice(0, -1);
  else if(type=='whisper') {
    // extrawurst die 2.: cavemen whisper!
    if(!spanNode) {
      spanNode = dom.documentElement.lastChild;
      //console.log(spanNode?.innerHTML);
      type = 'cavemen-whisper';
    }
    if(sender.includes('Geflüstert zu')) {
      sender = sender.replace('• Geflüstert zu ', '');
      mode = 'to';
    }
    else {
      sender = sender.replace('• Geflüstert von ', '');
    }
  }
  bNode?.remove();

  let res = {
    sender: sender,
    realSender: sender,
    mode: mode,
    content: spanNode?.innerHTML,
    color: spanNode?.style.color,
    sofGradient: spanNode?.classList.contains('gradient'),
    type: type,
    date: date,
  };

  // filtered here because lastChild.innerHTML is not giving determenistic results o.O wtf
  if(type=='cavemen-whisper') {
    res.content = res.content.replace(': ', '');
  }
  if(!res.content) res.content = data;

  return {...res, ...parseCustomMsgArgs(spanNode)};
}

/** parses for custom message parameters hidden in the broken fa feature **/
function parseCustomMsgArgs(msgDom) {
  let res = {};

  let fa = msgDom?.querySelector('.fa');
  if(!fa) return res;

  for(let cls of [...fa.classList]) {
    let args = cls.split('-');
    if(args[1]=='color') {
      let gradients = [];
      for(var i=2; i<args.length; i++) {
        let col = args[i];
        if(col.match(hexColorExpr)) col = '#'+col;
        gradients.push(col);
      }
      if(gradients.length==1) gradients.push(gradients[0]);
      res.gradient = gradients;
    }
  }

  fa.remove();
  return res;
}


function addGlobalStyle(id, css) {
    if(cssReferences[id]) cssReferences[id].remove();

    var head, style;
    head = document.getElementsByTagName('head')[0];
    if (!head) { return; }
    style = document.createElement('style');
    style.type = 'text/css';
    style.innerHTML = css;
    head.appendChild(style);
    cssReferences[id] = style;
}

function myCleanNickname(nick) {
    return nick.toLowerCase().replaceAll(' ', '_');
}

function removeGlobalStyle(id) {
  cssReferences[id]?.remove();
}

function storageProxy(name, values) {
  return new Proxy(values, {
      set: function (target, key, value) {
          target[key] = value;
          localStorage.setItem('ivi:'+name, JSON.stringify(target));
          return true;
      }
  });
}

/**
  trys to restore settings from localStorage as proxy object, that
  writes to localstorage on each change.
  Uses _settings as default value whenever needed
**/
const loadSettings = () => {
    const key = 'settings:'+myCleanNickname(myNickname);

    try {
      let raw = localStorage.getItem('ivi:'+key);
      let values = {..._settings, ...JSON.parse(raw)};
      settings = storageProxy(key, values);
    } catch(e) {
      console.log(e);
      settings = storageProxy(key, _settings);
    }
}

/**
  the image cache is an avatarname -> image lookup table, that
  is hold in localstorage
**/
const loadImageCache = () => {

}

const rgb2hex = (rgb) => `#${rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/).slice(1).map(n => parseInt(n, 10).toString(16).padStart(2, '0')).join('')}`

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
