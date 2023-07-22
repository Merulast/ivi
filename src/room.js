const initRoomPage = () => {
  const injectp = ws._settings.events;

  saveWsHandlers();
  moreSettings();
  updateColorSettings();
  initCharlist();
  initHistory();
  initTabkey();
  offerHistory();
  addChatColorSetting();
  addGbSoundSetting();
  addPreviewSetting();

  injectp.message = function(e) {
    const res = parseMessageContent(e);
    if(res.type == 'friendonline') {
      updateFriendlist();
    }
    else {
      const el = messageElement(res);
      content.append(el);
      scroll();
      notify();
    }
  }

  injectp.whisper = function(e) {
    const res = parseMessageContent(e);
    const el = messageElement(res);
    content.append(el);
    scroll();
    notify();
  }

  injectp.room = function(e) {
    roomMembers = e.data;

    characters = Object.entries(roomMembers).map(([k,v]) => v.name);


    $('.charlist div').html('');
    for(let user of e.data) {
      $('.charlist').append(roomlistEntryElement(user));
    }
    $('.charlist summary').html(`Im Raum (${e.data.length})`);
  }

  injectp.notification = function(e) {
    const type = e.data.type;

    // play sound for new gb entries
    if(type == 'GBENTRY') {
      const mc = Object.entries(e.data)
                       .map(([k,v]) => v)
                       .filter(el => Number.isInteger(el))
                       .reduce((sum, a) => sum + a, 0);
      if(mc>0) sndMessage.play();
    }
    originalWsHandlers.notification(e);
  }
};





/** saves all the ws handlers in case we would like to call them later **/
const saveWsHandlers = () => {
  for(var k in ws._settings.events) {
    originalWsHandlers[k] = ws._settings.events[k];
  }
}

/** updates the css block generated from the global settings obj */
const updateColorSettings = () => {
  let msgCol = (settings.colors==true) ? `var(--color, 'black')` : 'black';

  addGlobalStyle('chatcolors', `
    .row-system { color: var(--syscolor, 'black'); }
    .row-sender { color: var(--color, 'black'); }
    .row-message { color: ${msgCol}; }
    .gradient {
      background: linear-gradient(to left, var(--gradient, 'black'));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    #old_content { filter: grayscale(60%); }`);
}

/** offers an 'load history' selection for this character **/
const offerHistory = async () => {
  let lines = await loadHistory();
  let lastLog = lines.find(el => el.name === myNickname);

  if(lastLog) {
    $('#old_content').prepend(loadLogElement(lastLog));
  }
}






/** replace the old charlist with a full grown userlist **/
const initCharlist = () => {
  addGlobalStyle('charlist', `
     details {
       margin-bottom: 0.5em;
       margin-left: 1em;
     }
     summary {
       margin-left: -0.75em;
     }
     summary {list-style: none}
     summary::-webkit-details-marker {display: none; }
     details summary::before {
       content:"▸ ";
     }
     details[open] summary::before {
       content:"▴ ";
     }
     .charlist div {
       font-size: inherit;
       color: var(--color, 'black');
     }
     .charlink {
       cursor:pointer;
       color: var(--color, 'black');
       text-decoration: none;
     }
     .charlink:hover {
       color: var(--color, 'black');
     }
     .bubble {
       margin-right: 0.5em;
       text-shadow:
         -1px -1px 1px #000,
         1px -1px 1px #000,
         -1px 1px 1px #000,
          1px 1px 1px #000;
     }
  `);

  // p
  $('.charlist').each(function() {
    // clean
    $(this).get(0).classList.remove('charlist');

    // generate room list
    let ulist = $(`<details class="charlist"><summary>Im Raum</summary></details>`);
    ulist.get(0).open = true;
    $(this).append(ulist);

    // friendlist
    let flist = $(`<details class="friendlist"><summary>Freunde</summary></details>`);
    $(this).append(flist);
    updateFriendlist();
    friendInterval = setInterval(updateFriendlist, 30*1000);
  });
}

/** init proper auto-complete **/
const initTabkey = () => {
  $('#message').unbind("tabKey");
  $('#message').bind('tabKey', function(e) {
      var val = $(this).val();
      var ss = this.selectionStart;
      var se = this.selectionEnd;

      var lastWord = val.substring(0, ss).split(' ').pop().toLowerCase();
      if(lastWord=='"') lastWord = '';

      // find word in characters
      var charas = characters.filter(el => el.toLowerCase().startsWith(lastWord));

      if(charas.length>0) {
        // entry?
        if(autoCompleteState.word == lastWord) {
            var ci = autoCompleteState.index;
            var index = (ci+1 < charas.length) ? ci+1 : 0;
            autoCompleteState.index = index;
        }
        else {
            autoCompleteState = {word: lastWord, index: 0};
        }
        var chara = charas[autoCompleteState.index];

        // kill selection
        var parts = [val.substring(0, ss), val.substring(ss, se), val.substring(se)];

        // insert new word
        parts[1] = chara.substring(lastWord.length);
        $(this).val(parts.join(''));

        // as selection part
        this.setSelectionRange(ss, ss+parts[1].length);
      }
  });
}

/** implements a proper input-history surfing **/
const initHistory = () => {
  // remove the old handlers
  $('#message').unbind("arrowUp");
  $('#message').unbind("enterKey");

  let tmp = '';
  document.querySelector('#message').addEventListener('keyup', (e) => {
    let mod = 0;
    if(e.key == 'ArrowDown') mod = -1;
    else if(e.key == 'ArrowUp') mod = 1;
    else return;

    if(historyCursor==0) {
      tmp = $('#message').val();
    }

    historyCursor = historyCursor + mod;

    let i = inputHistory.length - historyCursor;
    if(i<0 || i> inputHistory.length) {
      historyCursor = historyCursor - mod;
      return;
    }

    if(historyCursor==0) {
      $('#message').val(tmp);
    }
    else {
        $('#message').val(inputHistory[i]);
    }
  });

  $('#message').bind("enterKey",() => {
    inputHistory.push( $('#message').val() );
    historyCursor = 0;
    sendText();
  });
}

const updateFriendlist = () => {
  let flist = $('.friendlist');

  loadFriends().then(function (f) {
      let my = f[0];
      let total = my.items.length;
      let online = my.items.filter(el => el.online===true).length;

      flist.find('summary').html(`Freunde (${online}/${total})`);
      flist.find('div').remove();

      for(var item of my.items) {
        flist.append( roomlistEntryElement(item) );
      }
    });
}

/** allows to add more setting fields in the chat 'gear' field */
const moreSettings = () => {
  /** style hacks that allows an variable number of setting rows **/
  addGlobalStyle('moresettings', `
    .chat-settings DIV {
      margin-left: 1em;
      margin-bottom: 0.5em;
      width: auto;
      height: height: auto;
      display: inline-block;
      position: relative;
      text-align: left;
    }
    .chat-settings {  text-align: right; }
    .chat-settings:HOVER { height: auto !important; }
    .chat-settings-group { min-width: 150px; }
  `);
}

const addChatColorSetting = () => {
  const colorEl = chatSettingElement('colors', 'Farben', settings.colors, function(e) {
    settings.colors = $(this)?.get(0)?.checked || false;
    updateColorSettings();
  });
  chatSettings.append(colorEl);
}

const addGbSoundSetting = () => {
  const el = chatSettingElement('bsound', 'GB-Hinweiston', settings.gbsound, function(e) {
     settings.gbsound = $(this)?.get(0)?.checked || false;
  });
  chatSettings.append(el);
}

const addPreviewSetting = () => {
  const el = chatSettingElement('preview', 'Link-Vorschau', settings.preview, function(e) {
     settings.preview = $(this)?.get(0)?.checked || false;
  });
  chatSettings.append(el);
}

const applyLog = async(row, data) => {
  let resp = await fetch(data.url);
  let dom = new DOMParser().parseFromString(await resp.text(), "text/html");
  let lines = [...dom.documentElement.querySelectorAll('#content span')];

  // parse each // elementify each // add to 'row'
  let els = lines.map(el => parseMessageContent({data: el.outerHTML, type:'message'}))
                 .map(res => Object.assign(res, {date: `${res.date} (${data.date})`}))
                 .map(res => messageElement(res))
                 .forEach(el => row.append(el));

  row.append($('<hr>'));
};


const messageElement = (data) => {
  if(!data) return;

  const prefix = (['whisper', 'cavemen-whisper'].includes(data.type)) ? ((data.mode=='to') ? '• Zu' : '• Von' ) : '';
  const sysColor = 'black';

  const sendRow = (data.sender) ? `<span class="row-sender" style="font-weight: bold;">${data.sender}</span>:` : '';

  let msgCls = 'row-message';
  let gradient = '';

  if(data.gradient) {
    gradient = '--gradient: '+data.gradient.reverse().join(', ')+';';
    msgCls += ' gradient';
  }

  var res = $(`<div class="chat-row" style="--color: ${data.color}; --syscolor: ${sysColor}; ${gradient}" title="${data.date}">
    <span class="row-system" style="font-weight: bold;">${prefix}</span>
    ${sendRow}
    <span class="${msgCls}" style="">${data.content}</span>
  </div>`);

  if(settings.preview==true) {
      res.find('a').each(function() {
          const url = $(this).attr('href');
          const cleanUrl = url.split('?')[0];

          let relevant = settings.img_extensions.filter(el => cleanUrl.endsWith(el));
          if(relevant.length<=0) return;

          var options = {
              html: true,
              content: function() {
                  if(settings.preview==true) return `<img src="${url}" style="max-width: 100%"/>`;
                  else return null;
              },
              delay: { 'show': 200, 'hide': 100*10 },
              trigger: 'hover',
              placement: 'auto bottom'
          };
          $(this).popover(options);
          console.log('a', this);
      });
  }
  return res;
}

const chatSettingElement = (name, label, checked, cb) => {
  if(!checked) checked = '';
  else checked = "checked"

  const el = $(`<span class="chat-settings-group">
    <input id="chat-settings-${name}" type="checkbox" ${checked}/>
    <label for="chat-settings-${name}"><span></span> ${label}</label>
  </span>`);
  if(cb) {
    el.find('input').on('change', cb);
  }
  return el;
}

const loadLogElement = (data) => {
  const row = $(`<div ></div>`);
  const btn = $(`<button>Lade Log ${data.date}</button>`);

  btn.on('click', function(e) {
    applyLog(row, data);
    $(this).hide();
  });

  row.append(btn);
  return row;
}

const roomlistEntryElement = (data) => {
  let hash = data.classname;
  let color = (data.color) ? '#'+data.color : 'black';

  var row = $(`<div style="--color: ${color};"></div>`);
  var lnk = $(`<a tabindex="0" role="button" class="charlink">${data.name}</a>`);
  row.append(lnk);

  if(data.online===true || data.online===false) row.prepend(`<i class="fa fa-user bubble" style="color: ${data.color}"></i>`);
  if(data.roomlead) {
      row.css('font-style','italic');
      row.append(' 👑');
  }
  if(data.title) row.prepend(data.title + ' ');
  if(data.afk) row.prepend('<i class="fa fa-clock-o"></i>').attr('title',$(data.afk).text())

  createContextMenu($(lnk), data.name);

  return row;
}