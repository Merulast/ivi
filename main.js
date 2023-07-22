// ==UserScript==
// @name         Seals with Ivi
// @namespace    https://github.com/Merulast/ivi
// @updateURL    https://raw.githubusercontent.com/Merulast/ivi/main/main.js
// @version      0.10
// @description  Seal of Fantasy Extension
// @author       Merula Fideley
// @match        https://sealoffantasy.de/*
// @icon         https://i.imgur.com/3OCGPeb.png
// @require      https://raw.githubusercontent.com/Merulast/ivi/main/src/loaders.js?1
// @require      https://raw.githubusercontent.com/Merulast/ivi/main/src/util.js?1
// @require      https://raw.githubusercontent.com/Merulast/ivi/main/src/guestbook.js?1
// @require      https://raw.githubusercontent.com/Merulast/ivi/main/src/wall.js?1
// @require      https://raw.githubusercontent.com/Merulast/ivi/main/src/dialog.js?1
// @require      https://raw.githubusercontent.com/Merulast/ivi/main/src/room.js?1
// @require      https://raw.githubusercontent.com/Merulast/ivi/main/src/roomlist.js?1
// @grant        none
// ==/UserScript==

const c = location.href.split('=').pop().split('#')[0];
let myNickname;

// initial settings
const _settings = {
  colors: true,
  gbsound: true,
  preview: true,
  img_extensions: ['jpg','gif','png','mp4','jpeg','webm'],
};

// Main
(function() {
    console.log('Ivi!');
    const page = location.href.replace('https://sealoffantasy.de', '').split('?')[0];

    loadCache();

    // switch mode
    if(page==='/chat/room') initRoomPage(page);
    else if(page==='/tools/wall') initWallPage(page);
    else if(page.startsWith('/guestbook/view/')) initGbPage(page);
    else if(page.startsWith('/guestbook/dialog/')) initDialogPage(page);
    else if(page.startsWith('/chat/rooms')) initRoomListPage(page);
})();