let posts = {};
let flennys = [];
let lastWallId = null;

const initWallPage = async() => {
  myNickname = await whoAmI();

  addGlobalStyle('wallStyles', `
    .pin-body {
      display: flex;
      width: 100%;
    }
    .entry-text {
      flex: 80%;
    }
    .flenny {
      text-indent: -1em;
      margin-left: 1em;
      padding-bottom: 0.25em;
    }
    .entry-image {
      margin-left: 1em;
      flex: 20%;
      min-height: 200px;
      background-repeat: no-repeat;
      background-size: auto 100%;
      background-position: center top;
    }
  `);

  window.ignores = (await loadIgnores()).map(el => el.name.toLowerCase());
  
  // replace the original handler
  cache.wallpage = 1;

  initFlennwand();
  initWallHandler();
  initWallMore();

  //didGetResponse(await loadWallPage(cache.wallpage));
}

/** replaces the original wall handler and renderer **/
const initWallHandler = () => {
  $('#wall-entries').html('');

  didGetResponse = function(wall) {
    // remove ignored persons
    let entries = wall.entries.filter(el => !ignores.includes(el.poster.toLowerCase()));

    // append posts
    for(let entry of entries) {
      // detect deleted messages and prepare dummys
      /*if(lastWallId && lastWallId-entry.id > 1) {
        for(var i=lastWallId-1; i>entry.id; i--) {
          let el = missingWallEntryElement({id: i});
          $('#wall-entries').append(el);
          addFlenny(i, el);
          posts[entry.id] = {data: {id: i}, element: el};
        }
      }/**/
      lastWallId = entry.id;

      let el = wallEntryElement(entry);
      $('#wall-entries').append(el);
      addFlenny(entry.id, el);
      posts[entry.id] = {data: entry, element: el};
    }

    // setup events
    $('a.ignore').on('click', async function(e) {
	    e.preventDefault();
      
      let resp = await fetch($(this).attr('href'));
      const modalcnt = await resp.text();

      $('#global-modal-body').html(modalcnt);
      $('#dialog-modal input[name="name"]').val($(this).data('poster'));
      $('#dialog-modal').modal();
	  });

    // setup comment
    $('a.comment').on('click', function(e) {
	    e.preventDefault();
      const source = $(e.target);
      const flennys = source.closest('.panel').find('.flennys');
      const id = $(this).data('id')

      $('#global-modal-body').html(commentModal());

      // handle submit
      $('#global-modal-body form').submit(async (e) => {
        e.preventDefault();
        const txt = $('#global-modal-body [name=text]');
        const content = txt.val();
        txt.val(`@${id} ` + content);

        // post item
        const data = new URLSearchParams(new FormData(e.target));
        const res = await fetch(`https://sealoffantasy.de/guestbook/ajax/entry/Flennwand?c=${c}`, {
            body: data,
            method: "post"
        });

        // append item
        flennys.prepend(flennyElement({from: myNickname, content:content}));
        
        $('#dialog-modal').modal('toggle');
      });
      $('#dialog-modal').modal();
	  });

    // load and append images
    $('[data-url]').each(async function() {
       let poster = $(this).data('url');
       let meta = await loadImageOf(poster);
       if(meta.imageUrl) {
         $(this).css('background-image', `url('${meta.imageUrl}')`);
       }
       else {
         $(this).hide();
       }
    });
  }
}

/** places a more-field on the end of the wall page that reloads more data */
const initWallMore = () => {
  initMoreStyles();
  $('#wall-entries').after(moreElement());

  const observer = new IntersectionObserver(async function(entries) {
    if (entries[0].isIntersecting) {
      didGetResponse(await loadWallPage(cache.wallpage));        
      let resp = await fetch($(this).attr('href'));
      cache.ignoreModal = await resp.text();
      cache.wallpage = cache.wallpage +1;
    }
  });

  observer.observe(document.querySelector('.more'));
}

const initFlennwand = async () => {
  flennys = [];
  for(var i=0; i<5; i++) {
    let res = await loadFlennwand(i);
    flennys = [...flennys, ...res];
  }
}

const loadFlennwand = async (page) => {
  let res = await loadGbPage('Flennwand', page);
  let items = parseGbContent(res);
  items = items.filter(el => el.content.trim().startsWith('@'));
  items.forEach((v) => v.ref = v.content.trim().split(' ')[0]);
  return items;
}

const addFlenny = async (id, el) => {
  if(flennys.length <= 1) await sleep(500);

  let items = flennys.filter(el => el.ref == `@${id}`);
  
  if(items.length == 0) {
    $(el).find('.flennys').hide();
  }
  else {
    const fh = $(el).find('.flennys');
    fh.html('');
    for(var item of items) {
      item.content = item.content.replace(`@${id}`, '').trim();
      fh.append(flennyElement(item));
    }
  }
}

const initMoreStyles = () => {
  addGlobalStyle('moreblock',`
    .more {
      text-align: center;
      pointer-events:none;
      position: relative;
    }

    .virtual {
      position: absolute;
      height: 220px;
      top: -200px;
      width: 100%;
      pointer-event:none;
      background-color: rgba(0,0,0,0.2);
    }
  `);
}

const wallEntryElement = (data) => {
    let el = $(`<div class="panel panel-default">
	  		<div class="panel-heading">
	  			<div>
	  				<span class="entry-date" style="float:right;">
              ${data.created}
              &nbsp; &nbsp;
              <a href="#" data-id="${data.id}" class="comment"><i class="fa fa-pencil"></i></a>
              <a href="#" data-id="${data.id}" data-type="wall-entry" title="Beschwerde einreichen" class="complain"><i class="fa fa-exclamation-triangle"></i></a>
              <a href="https://sealoffantasy.de/social/dialog/ignore-add?c=${c}" data-poster="${data.poster}" title="Ignore" class="ignore"><i class="fa fa-ban"></i></a>
            </span>
	  			</div>
	  			<div class="">Von: <a class="entry-creator" target="_blank" href="https://sealoffantasy.de/guestbook/view/${data.poster}?c=${c}" title="#${data.id}">${data.poster}</a></div>
	  		</div>
	  		<div class="panel-body pin-body">
				  <div class="entry-text">${data.entry}</div>
          <div class="entry-image" data-url="${data.poster}">&nbsp;</div>
			  </div>
        <div class="panel-footer flennys">Lade ...</div>
	  	</div>`);
    return el;
}

const missingWallEntryElement = (data) => {
  let el = $(`<div class="panel panel-default">
      <div class="panel-heading">
      </div>
      <div class="panel-body">
        <h1>#${data.id} - Gelöscht :(</h1>
      </div>
      <div class="panel-footer flennys">Lade ...</div>
    </div>`);
  return el;
}

const flennyElement = (data) => {
  let el = $(`<div class="flenny">
      <span><a href="https://sealoffantasy.de/guestbook/view/${data.from}?c=${c}" target="_blank">
        @${data.from}</a></span>: 
        ${data.content}
    </div>`);
  return el;
}

const moreElement = () => {
  return $(`<div class="more">
      <p class="virtual"></p>
      loading ...
    </div>`);
}

const commentModal = () => {
  return `<div style="margin: 1em">
    <form>
      <textarea name="text" class="form-control gb-entry-text" rows="2" placeholder="Kommentar (der sein musste) hier!"></textarea><br/>
      <input type="submit" class="btn btn-default btn-gb-entry" value="Kommentar senden">
    </form></div>`;
}
