const initWallPage = async() => {
  myNickname = await whoAmI();

  addGlobalStyle('wallStyles', `
    .panel-body {
      display: flex;
      width: 100%;
    }
    .entry-text {
      flex: 80%;
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
  initWallHandler();
  initWallMore();

  //didGetResponse(await loadWallPage(cache.wallpage));
}

/** replaces the original wall handler and renderer **/
const initWallHandler = () => {
  $('#wall-entries').html('');

  didGetResponse = async function(wall) {
    // remove ignored persons
    let entries = wall.entries.filter(el => !ignores.includes(el.poster.toLowerCase()));

    // append posts
    for(let entry of entries) {
      let el = wallEntryElement(entry);
      $('#wall-entries').append(el);
    }

    // setup events
    $('a.ignore').on('click', async function(e) {
	  e.preventDefault();
      if(!cache.ignoreModal) {
        let resp = await fetch($(this).attr('href'));
        cache.ignoreModal = await resp.text();
      }

      $('#global-modal-body').html(cache.ignoreModal);
      $('#dialog-modal input[name="name"]').val($(this).data('poster'));
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
      cache.wallpage = cache.wallpage +1;
    }
  });

  observer.observe(document.querySelector('.more'));
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
                       <a href="#" data-id="${data.id}" data-type="wall-entry" title="Beschwerde einreichen" class="complain"><i class="fa fa-exclamation-triangle"></i></a>
                       <a href="https://sealoffantasy.de/social/dialog/ignore-add?c=${c}" data-poster="${data.poster}" title="Ignore" class="ignore"><i class="fa fa-ban"></i></a>
                    </span>
	  			</div>
	  			<div class="">Von: <a class="entry-creator" target="_blank" href="https://sealoffantasy.de/guestbook/view/${data.poster}?c=${c}">${data.poster}</a></div>
	  		</div>
	  		<div class="panel-body">
				<div class="entry-text">${data.entry}</div>
                <div class="entry-image" data-url="${data.poster}">&nbsp;</div>
			</div>
	  	</div>`);
    return el;
}

const moreElement = () => {
  return $(`<div class="more">
      <p class="virtual"></p>
      loading ...
    </div>`);
}
