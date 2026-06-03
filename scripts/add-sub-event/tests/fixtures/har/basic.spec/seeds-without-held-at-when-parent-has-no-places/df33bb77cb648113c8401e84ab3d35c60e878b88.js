;((meta, apiNames = []) => {
  const key = `__monkeyWindow-` + new URL(meta.url).origin;
  const monkeyWindow = document[key];
  if (!monkeyWindow) {
    console.log(`[vite-plugin-monkey] not found monkeyWindow`);
    return;
  }
  window.unsafeWindow = window;
  console.log(`[vite-plugin-monkey] mount unsafeWindow to unsafeWindow`);
  apiNames.push("GM");
  let mountedApiSize = 0;
  apiNames.forEach((apiName) => {
    const fn = monkeyWindow[apiName];
    if (fn) {
      window[apiName] = monkeyWindow[apiName];
      mountedApiSize++;
    }
  });
  console.log(
    `[vite-plugin-monkey] mount ${mountedApiSize}/${apiNames.length} GM api to unsafeWindow`
  );
})(import.meta, ["GM_addElement","GM_addStyle","GM_addValueChangeListener","GM_cookie","GM_deleteValue","GM_deleteValues","GM_download","GM_getResourceText","GM_getResourceURL","GM_getTab","GM_getTabs","GM_getValue","GM_getValues","GM_info","GM_listValues","GM_log","GM_notification","GM_openInTab","GM_registerMenuCommand","GM_removeValueChangeListener","GM_saveTab","GM_setClipboard","GM_setValue","GM_setValues","GM_unregisterMenuCommand","GM_webRequest","GM_xmlhttpRequest"]);