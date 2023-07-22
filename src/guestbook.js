const initGbPage = async() => {
  const owner = $('.navbar-brand').text();
  myNickname = await whoAmI();
  const avatars = await loadAvatarList();

  if(!avatars.includes(owner)) return;

    didLoadEntries = function(data) {
      $('#gb-entries').html(data);

      $('#gb-entries .entry').each(function() {
        const h = $(this).find('a').text();
        if(!h) return; // deleted

        const rel = replyELement(h, owner);
        $(this).append(rel);
      });
    }

    loadEntries(true);
}

const replyELement = (to, from) => {
  let res = $(`<div class=".gb-reply"><hr>
         <form action="https://sealoffantasy.de/guestbook/ajax/entry/${to}?c=${from}" class="form" method="post" onsubmit="return performSubmit(this);">
			<textarea name="text" class="form-control gb-entry-text" rows="2" placeholder="Hi ${to} ..."></textarea><br>
			<div style="display: flex;">
			  <label style="flex: 50%">
			    <input type="checkbox" id="private" name="private" value="true" checked> Privater Eintrag?
			  </label>
              <span style="flex: 50%; text-align: right">
                <input type="submit" class="btn btn-default btn-gb-entry" value="Antworten">
              </span>
			</div>
		</form></div>`);
  return res;
}