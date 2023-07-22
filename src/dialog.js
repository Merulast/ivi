/** clears an error page to adds custom content to sof **/
const initDialogPage = async(page) => {
  const root = $('.container');
  root.html('');

  myNickname = await whoAmI();
  let other = decodeURI(page.split('/').pop());
  if(!myNickname || !c || !other) {
    //location.href = '/error';
    root.html('Ivi Error: Fehlerhafte URL :(');
    return;
  }
  document.title = `[${myNickname}] Dialog mit ${other}`;
  console.log(document.title);

  // load layout
  // load entries
  let entries = [];
  for(let i=0; i<2; i++) {
    let res = await loadGbPage(myNickname, i);
    entries = entries.concat(parseGbContent(res));

    let res2 = await loadGbPage(other, i);
    let tmp = parseGbContent(res2);
    entries = entries.concat(tmp.filter(el => el.from === myNickname));
  }

  // sort
  entries.sort((a, b) => (a.date < b.date) ? 1 : -1);

  // filter out other people and stuff?
  //entries = entries.filter(el => [myNickname, other].includes(el.from));

  for(var entry of entries) {
    entry.innerStyle = '';
    entry.style = '';

    if(entry.from === myNickname) {
      entry.style = 'me';
    }
    else if(entry.from === other) {
      entry.style = 'you';
    }
    else {
      entry.style = 'other';
      entry.innerStyle = 'well-sm';
    }
    root.append(gbEntryElement(entry));
  }

  addGlobalStyle('gbentry', `
    .me .media-right { display: none; }
    .you .media-left { display: none; }
    .other .media-right,
    .other .media-left {
      display: none;
    }
    .gb-entry .media-right img,
    .gb-entry .media-left img {
      max-width: 200px;
    }
  `);

  // https://sealoffantasy.de/guestbook/dialog/Viktoria%20Orlowa?c=2
  console.log(entries);

}

const gbEntryElement = (data) => {
  let el = $(`
<div class="media gb-entry ${data.style}">
  <div class="media-left">
    <a href="#">
      <img class="media-object" src="https://i.imgur.com/cj3bECH.png" alt="${data.from}">
    </a>
  </div>
  <div class="media-body">
    <h4 class="media-heading">${data.from}</h4>
    ${data.content}
  </div>
  <div class="media-right">
    <a href="#">
      <img class="media-object" src="https://i.imgur.com/cj3bECH.png" alt="${data.from}">
    </a>
  </div>
</div>
  `);
  //let el = $(`<div class="${data.style}"><div class="well ${data.innerStyle}">${data.content}</div></div>`);
  return el;
}
