const initRoomListPage = (page) => {
  $.support.transition = false;
  
  addRoomListStyle();

  // new data handler
  didGetRoomResponse = roomHandler;
  refresh();

  // rework 'order' links
  $('.room-order-link').unbind();
  $('.room-order-link').on('click', function(e) {
      e.preventDefault();
      cache.roomOrder = $(this).data('order');
      refresh();
  });

  $('.roomlist-header').removeClass('col-xs-12'); // handle broken css
  $('#tags').collapse('show'); // open tags panel
  
  replaceNewRoomField();
  $('#default-rooms').parent().hide(); // hide default rooms
  $('#personal-rooms').parent().hide(); // hide personal rooms

  addLoader();
}

function addRoomListStyle() {
  addGlobalStyle('roomlist', `
  .chara-link ~ .chara-link::before {
    content: ', ';
    text-decoration: none;
  }

  .panel-body {

  }

  .room-label {
    padding-bottom: 0;
    margin-bottom: 0;
  }

  .room-clients {
    font-size: small;
    margin: 0;
    padding: 0;
    padding-bottom: 1em;
  }

  .server-name {
    margin: 0;
    padding: 0;
    filter: brightness(50%);
    font-size:medium;
  }

  .room-clients::before {
    content: '\\2BA1 ';
    padding-right: 5px;
  }

  .tagged { 
    color: inherit;
    text-decoration: underline;
  }
  `);

  addGlobalStyle('loader', `#loader {
    position: fixed;
    bottom: 0em;
    right: 1em;
  }
  
  #loader progress {
    width: 50px;
  }`)
}

/** adds a progress bad that indicates all loading states */
function addLoader() {
  const el = progressElement(0,100);
  const bar = $(el).find('progress');
  $('body').append(el);

  let i = 0;
  let reloads = 0;
  bar.attr('title', reloads + " Reloads");
  setInterval(function() {
    i++;
    if(i>=100) {
      i=0;
      reloads++;
      bar.attr('title', reloads + " Reloads");
      refresh();
    }
    bar.attr('value', i);
  }, 500);
}

/** replaces the textfield for new rooms by an more interactive version */
function replaceNewRoomField() {
  let defRooms = $('#default-rooms a').toArray().map(el => $(el).data('name'));
  let myRooms = $('#personal-rooms').parent().find('a').toArray().map(el => $(el).data('name'));

  defRooms = defRooms.map(el => `<option data-value="${el}">📌 ${el}</option>`);
  myRooms = myRooms.map(el => `<option data-value="${el}">📗 ${el}</option>`);

  const rooms = [...myRooms, ...defRooms];

  $('.room-name-input')
    .attr('type', null)
    .attr('list', 'default_channels')
    .change(function() {
      let v = $(this).val();
      let option = $('#default_channels option').toArray().filter(el => $(el).val() == v).pop();

      if(option) {
        $(this).val($(option).data('value'));
      }
    })
  .after($(`
    <datalist id="default_channels">
      ${rooms.join("\n")}
    </datalist>`));
}

/**
* Reload the roomlist
*/
async function refresh() {
  let resp = await loadRoomList();
  roomHandler(resp);
}

function loadRoomList() {
  return new Promise((resolve, reject) => {
    performGetRequest(`https://sealoffantasy.de/chat/ajax/roomlist?c=${c}&order=${cache.roomOrder}`, resolve);
  })
}

function loadStats() {
  let def = {Info:{cmd:{onlineCount:{},caraktersCount:{},accountsCount:{},festplaysCount:{}}}};
  return new Promise((resolve, reject) => {
    doApiCall('https://sealoffantasy.de/api?', def, resolve)
  });
}

/**
* replace roomlist handler and refresh data
*/
function roomHandler(resp) {
  const currName = resp.currentServer.name;
  let i = 0;
  resp.currentServer.rooms.forEach(room => room.position = i++);
  resp.currentServer.rooms.forEach(room => room.users = room.clients.length);

  // 1. add current server
  resp.servers = [resp.currentServer, ...Object.entries(resp.servers).map(([k, srv]) => srv2srv(k,srv))];

  // 3. backlink servers on rooms
  for(var srv of resp.servers) {
    for(var room of srv.rooms) {
      room.server = srv.name;
    }
  }

  // 2. mark alien server rooms as not joinable
  resp.servers.forEach(srv => srv.rooms.forEach(room => room.canJoin = (room.server==currName) ? room.canJoin : false));

  // collect ALL charas
  let c = 1;
  let charas = resp.servers.map(
    srv => srv.rooms.map(
      room => room.clients.map(cl => Object.assign(cl, {
        room: room.name, server: srv.name, isLocal: srv.name == resp.currentServer.name,
        listed: c++
      }))
    )).flat(2);

  // collect tabs
  let rawTags = charas.map(el => el.tags).filter(el => el).flat(1);
  let tagList = {};

  for(var tag of rawTags) {
    const k = tag.toLowerCase();
    if(!tagList[k]) {
      tagList[k] = {name: tag, count: 0, key: k};
    }
    tagList[k].count = tagList[k].count +1;
  }

  // build
  buildTagList(tagList);
  //buildCharaList(charas);
  buildRoomList(resp);

  // refresh filters and stuff
  updateTags();
}

/** refresh the tag list **/
function buildTagList(tags) {
  const el = $('#tags .panel-body .row .col-md-12');
  el.html('');

  // sort tags (TODO: sort criterias)
  const list = Object.entries(tags)
    .sort(([,a],[,b]) => tagFullCompare(a,b))
    .map(([,el]) => el)

  // update title
  const label = `Aktive Tags (${Object.entries(tags).length})`;
  $('#panel-tags .h5').html(label);

  // append
  for(var k in list) {
    el.append(tagElement(list[k]));
  }

  // restore cache?
  if(cache.tagFilters) {
    setTagStyles(cache.tagFilters);
  }
}

/** bulk set styles for all matching tags {cssclass:[tag1, tag2, ..]} */
function setTagStyles(descr) {
  for(var k in descr) {
    for(var name of descr[k]) {
      $(`#tags *[data-tag="${name}"]`).addClass(k);
    }
  }
}

/** refresh the room list **/
function buildRoomList(data) {
  const roomsEl = $('#rooms').html('');
  let [mykey, mySrvPanel] = buildServerPanel(data.currentServer, true);

  let others = data.servers.filter(el => el!=data.currentServer);
  let [okey, otherSrvPanel] = buildOtherServerPanel(others);

  roomsEl.append(mySrvPanel);
  roomsEl.append(otherSrvPanel);

  addJoinLinks();
  $(`#${mykey}`).collapse('show');
}

function addJoinLinks() {
  $('.join-room-link').on('click',function(e) {
    e.preventDefault();
    $.ajax({
            method: "POST",
            url: 'https://sealoffantasy.de/chat/ajax/join?c='+c,
            data: {"roomname":$(this).data('name')},
            success: didGetJoinResponse
          });
  });
}

function buildServerPanel(srv, root) {
  const key = roomHash(srv.name);

  // create panel
  let panel = panelElement(key, srv.name);

  // headline
  const label = `${srv.name} (${srv.rooms.length} Räume)`;
  panel.find(`.h5`).html(label);

  // Sort rooms as we want them
  let rooms = [];
  if(cache.roomOrder == 'CREATION') {
    rooms = srv.rooms.sort((a,b) => attrCompare(a,b,'position')).reverse();
  }
  else if(cache.roomOrder == 'USERCOUNT') {
    rooms = srv.rooms.sort((a,b) => attrCompare(b,a,'users'));
  }
  else {
    rooms = srv.rooms.sort((a,b) => attrLowerCompare(a,b,'name'));
  }

  // rooms
  const body = panel.find(`.panel-body`);
  const eli = $('<div class="row"></div>');
  body.append(eli);

  rooms.forEach(room => eli.append(roomElement(room)));

  return [key, panel];
}


function buildOtherServerPanel(srvs) {
  const key = 'servers'

  // create panel
  let panel = panelElement(key, '');

  // headline
  const roomc = srvs.map(el => el.rooms.length).reduce((a,b) => a+b);
  const label = `${srvs.length} andere Server (${roomc} Räume)`;
  panel.find(`.h5`).html(label);

  // get rooms
  let rooms = srvs.map(el => el.rooms).flat(1);

  // create
  const body = panel.find(`.panel-body`);
  const eli = $('<div class="row"></div>');
  body.append(eli);
  for(var room of rooms) {
    eli.append(roomElement(room, room.server));
  }

  return [key, panel];
}






// utils
function roomHash(src) {
return btoa(src).replace(/[^a-z0-9]/gi, '');
}

function srv2srv(key, rooms) {
return {
  rooms: rooms,
  name: key,
}
}

function attrCompare(a, b, attr) {
if (a[attr] === b[attr]) return 0;
return a[attr] > b[attr] ? 1 : -1;
}

function attrLowerCompare(a, b, attr) {
if (a[attr] === b[attr]) return 0;
return a[attr].toLowerCase() >= b[attr].toLowerCase() ? 1 : -1;
}

function tagFullCompare(a,b) {
let res = b.count - a.count;
if(res!==0) return res;

if (a.key === b.key) return 0;
return a.key > b.key ? 1 : -1;
}

/** font awesome helper */
function fa(id) {
return `<i class="fa fa-${id}" aria-hidden="true"></i>`;
}

function faf(id) {
return `<i class="${id}" aria-hidden="true"></i>`;
}


// elements
function tagElement(tag) {
  let res = $('<a href="#" class="tag-link btn" style="margin:4px"></a>')
    .html(`${tag.name} <sub> x${tag.count}</sub>`)
    .attr('data-tag', tag.key)
    .addClass('btn-default')

    .on('click', function(e) {
      e.preventDefault();
      if($(this).hasClass('btn-primary')) {
        $(this).removeClass('btn-primary').addClass('btn-danger');
      }
      else if($(this).hasClass('btn-danger')) {
        $(this).removeClass('btn-danger');
      }      
      else {
        $(this).addClass('btn-primary');
      }

      updateTags();
    });
  return res;
}

/** update the room lists and apply the given tag filters */
function updateTags() {
  const whiteTags = $('#tags .btn-primary').toArray().map(el => $(el).data('tag'));
  const blackTags = $('#tags .btn-danger').toArray().map(el => $(el).data('tag'));

  cache.tagFilters = {
    'btn-primary': whiteTags,
    'btn-danger': blackTags,
  };

  const tags = [...whiteTags, ...blackTags];

  if(tags.length == 0) {
    $('.chara-link').parent().parent().show();
    $('.chara-link').removeClass('tagged');
    $('#tags *[data-tag]').removeClass('disabled');
    return;
  }

  let owners = $('.chara-link').toArray()
    .filter(el => $(el).data('tags'))
    .filter(el => aInB(whiteTags, $(el).data('tags')))
    .filter(el => noAinB(blackTags, $(el).data('tags')));
  
  // collect owner tags
  let possible = owners.map(el => $(el).data('tags')).join(',')
                  .split(',')
                  //.filter(el => [...whiteTags, ...blackTags].indexOf(el)<0);

  possible = [...possible, ...whiteTags, ...blackTags].filter(el=>el);

  // reset styles 
  $('.chara-link').parent().parent().hide();
  $('.chara-link').removeClass('tagged');
  $('#tags *[data-tag]').removeClass('disabled');

  // set tagged
  $(owners).parent().parent().show();
  $(owners).addClass('tagged');

  $(`#tags *[data-tag]`).each(function(k,v) {
    if(possible.includes($(v).data('tag'))) return;
    $(v).addClass('disabled');
  });
}

/** is each a present in b? */
function aInB(a, b) {
  return a.every(el => b.includes(el));
}
function noAinB(a, b) {
  return !a.some(el => b.includes(el));
}

function roomElement(room, prefix) {
  if(!prefix) prefix = '';
  prefix = `<div class="server-name">${prefix}</div>`;

  let label = `${room.name}`;
  let clist = $('<div class="room-clients"></div>')
    .append(room.clients.map(el => charLinkElement(el)));

  if(room.locked == true) {
    if(room.canJoin == true) label = fa('unlock') + ' ' + label;
    else label = fa('lock') + ' ' + label;
  }

  if(room.canJoin == true) {
    label = `<a class="join-room-link" href="#" data-name="${room.name}">${label}</a>`;
  }

  return $(`
  <div class="col-md-12 room-box">
    <div class="h4 room-label">${label}</div>
    ${prefix}
  </div>`)
  .append(clist);
}

function panelElement(name, title) {
return $(`
<div id="panel-${name}" class="panel panel-default ivi-panel">
<div class="panel-heading" data-toggle="collapse" data-target="#${name}" style="cursor: pointer;">
  <span class="h5">${title}</span>
</div>
<div id="${name}" class="panel-collapse collapse">
  <div class="panel-body">
  </div>
</div>
</div>`);
}

function switchElement(name, title, state) {
return $(`<div id="switch-${name}" class="col-md-12 grid-row vcenter right">
<label class="switch">
  <input type="checkbox" ${state}>
  <span class="slider round"></span>
</label>
  <span class="">${title}</span>
</div>`);
}

function charLinkElement(chara) {
  const title = `${chara.name} \n ${chara.room} - ${chara.server}`;
  const res = $(`<a href="/guestbook/view/${chara.name}?c=${c}" class="chara-link" 
    target="_new">${chara.name}</a>`);
  
  if(chara.tags) {
    res.attr('data-tags', chara.tags.join(',').toLowerCase());
  }

  if(chara.image) {
    var options = {
      html: true,
      content: `<img src="/charakter/image/${chara.image}" style="max-width: 100%;"/>`,
      delay: { 'show': 200, 'hide': 10 },
      trigger: 'hover',
      placement: 'auto bottom'
    };
    $(res).popover(options);
  }

  return res;
}


function progressElement(value, max) {
  const res = $(`<div id="loader">
      <progress max="${max}" value="${value}" title=""></progress>
    </div>`)
  return res;
}
