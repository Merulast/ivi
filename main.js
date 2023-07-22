// ==UserScript==
// @name         Seals with Ivi
// @namespace    https://gist.github.com/Merulast
// @version      0.8
// @description  Seal of Fantasy Extension
// @author       Merula Fideley
// @match        https://sealoffantasy.de/*
// @icon         https://i.imgur.com/3OCGPeb.png
// @require      https://gist.githubusercontent.com/Merulast/4a76976d27776a395db0ab120b430ec6/raw/loaders.js?3
// @require      https://gist.githubusercontent.com/Merulast/4a76976d27776a395db0ab120b430ec6/raw/util.js?3
// @require      https://gist.githubusercontent.com/Merulast/4a76976d27776a395db0ab120b430ec6/raw/guestbook.js?3
// @require      https://gist.githubusercontent.com/Merulast/4a76976d27776a395db0ab120b430ec6/raw/wall.js?3
// @require      https://gist.githubusercontent.com/Merulast/4a76976d27776a395db0ab120b430ec6/raw/dialog.js?3
// @require      https://gist.githubusercontent.com/Merulast/4a76976d27776a395db0ab120b430ec6/raw/room.js?3
// @grant        none
// ==/UserScript==

const content = $('#content');
const chatSettings = $('.chat-settings div');
let myNickname = $('.navbar-right .navbar-text a').text();
const c = location.href.split('=').pop();

const hexColorExpr = /^[0-9a-f]{3,6}$/i;

// original list of websocket handlers
const originalWsHandlers = {}

// initial settings
const _settings = {
  colors: true,
  gbsound: true,
  preview: true,
  img_extensions: ['jpg','gif','png','mp4','jpeg','webm'],
}
let settings = {};
let cache = {};

let cssReferences = {};
let roomMembers = {};
let inputHistory = [];
let historyCursor = 0;
let friendInterval = null;
let autoCompleteState = { word: '', index: 0 };


// Main
(function() {
    const page = location.href.replace('https://sealoffantasy.de', '').split('?')[0];

    loadSettings();

    // switch mode
    if(page==='/chat/room') initRoomPage(page);
    else if(page==='/tools/wall') initWallPage(page); // done
    else if(page.startsWith('/guestbook/view/')) initGbPage(page); // done
    else if(page.startsWith('/guestbook/dialog/')) initDialogPage(page); // done
})();