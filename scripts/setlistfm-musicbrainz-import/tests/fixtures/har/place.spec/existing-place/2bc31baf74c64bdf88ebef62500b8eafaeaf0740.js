



jQuery.cookie = function(name, value, options) {
if (typeof value != 'undefined') { 
 options = options || {};
if (value === null) {
value = '';
options.expires = -1;
}
var expires = '';
if (options.expires && (typeof options.expires == 'number' || options.expires.toUTCString)) {
var date;
if (typeof options.expires == 'number') {
date = new Date();
date.setTime(date.getTime() + (options.expires * 24 * 60 * 60 * 1000));
} else {
date = options.expires;
}
expires = '; expires=' + date.toUTCString(); 
 }

 
 
 var path = options.path ? '; path=' + (options.path) : '';
var domain = options.domain ? '; domain=' + (options.domain) : '';
var secure = options.secure ? '; secure' : '';
document.cookie = [name, '=', encodeURIComponent(value), expires, path, domain, secure].join('');
} else { 
 var cookieValue = null;
if (document.cookie && document.cookie != '') {
var cookies = document.cookie.split(';');
for (var i = 0; i < cookies.length; i++) {
var cookie = jQuery.trim(cookies[i]);

 if (cookie.substring(0, name.length + 1) == (name + '=')) {
cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
break;
}
}
}
return cookieValue;
}
};


(function($) {
$.expander = {
version: '1.4.13',
defaults: {

 slicePoint: 100,

 
 
 sliceOn: null,

 preserveWords: true,

 showWordCount: false,

 wordCountText: ' ({{count}} words)',

 
 
 widow: 4,

 
 expandText: 'read more',
expandPrefix: '&hellip; ',
expandAfterSummary: false,

 wordEnd: /(&(?:[^;]+;)?|[a-zA-Z\u00C0-\u0100]+|[^\u0000-\u007F]+)$/,

 summaryClass: 'summary',
detailClass: 'details',

 moreClass: 'read-more',
lessClass: 'read-less',

 moreLinkClass: 'more-link',
lessLinkClass: 'less-link',

 
 collapseTimer: 0,

 expandEffect: 'slideDown',
expandSpeed: 250,
collapseEffect: 'slideUp',
collapseSpeed: 200,

 userCollapse: true,

 userCollapseText: 'read less',
userCollapsePrefix: ' ',


onSlice: null, 
 beforeExpand: null, 
 afterExpand: null, 
 onCollapse: null, 
 afterCollapse: null 
 }
};
$.fn.expander = function(options) {
var meth = 'init';
if (typeof options === 'string') {
meth = options;
options = {};
}
var opts = $.extend({}, $.expander.defaults, options),
rSelfClose = /^<(?:area|br|col|embed|hr|img|input|link|meta|param).*>$/i,
rAmpWordEnd = opts.wordEnd,
rOpenCloseTag = /<\/?(\w+)[^>]*>/g,
rOpenTag = /<(\w+)[^>]*>/g,
rCloseTag = /<\/(\w+)>/g,
rLastCloseTag = /(<\/([^>]+)>)\s*$/,
rTagPlus = /^(<[^>]+>)+.?/,
rMultiSpace = /\s\s+/g,
delayedCollapse;
var removeSpaces = function(str) {
return $.trim( str || '' ).replace(rMultiSpace, ' ');
};
var methods = {
init: function() {
this.each(function() {
var i, l, tmp, newChar, summTagless, summOpens, summCloses,
lastCloseTag, detailText, detailTagless, html, expand,
$thisDetails, $readMore,
slicePointChanged,
openTagsForDetails = [],
closeTagsForsummaryText = [],
strayChars = '',
defined = {},
thisEl = this,
$this = $(this),
$summEl = $([]),
o = $.extend({}, opts, $this.data('expander') || $.meta && $this.data() || {}),
hasDetails = !!$this.find('.' + o.detailClass).length,
hasBlocks = !!$this.find('*').filter(function() {
var display = $(this).css('display');
return (/^block|table|list/).test(display);
}).length,
el = hasBlocks ? 'div' : 'span',
detailSelector = el + '.' + o.detailClass,
moreClass = o.moreClass + '',
lessClass = o.lessClass + '',
expandSpeed = o.expandSpeed || 0,
allHtml = removeSpaces( $this.html() ),
summaryText = allHtml.slice(0, o.slicePoint);

 o.moreSelector = 'span.' + moreClass.split(' ').join('.');
o.lessSelector = 'span.' + lessClass.split(' ').join('.');

 if ( $.data(this, 'expanderInit') ) {
return;
}
$.data(this, 'expanderInit', true);
$.data(this, 'expander', o);

 $.each(['onSlice','beforeExpand', 'afterExpand', 'onCollapse', 'afterCollapse'], function(index, val) {
defined[val] = $.isFunction(o[val]);
});

 summaryText = backup(summaryText);

 summTagless = summaryText.replace(rOpenCloseTag, '').length;

 while (summTagless < o.slicePoint) {
newChar = allHtml.charAt(summaryText.length);
if (newChar === '<') {
newChar = allHtml.slice(summaryText.length).match(rTagPlus)[0];
}
summaryText += newChar;
summTagless++;
}

 
 if (o.sliceOn) {
slicePointChanged = changeSlicePoint({
sliceOn: o.sliceOn,
slicePoint: o.slicePoint,
allHtml: allHtml,
summaryText: summaryText
});
summaryText = slicePointChanged.summaryText;
}
summaryText = backup(summaryText, o.preserveWords && allHtml.slice(summaryText.length).length);

 summOpens = summaryText.match(rOpenTag) || [];
summCloses = summaryText.match(rCloseTag) || [];

 tmp = [];
$.each(summOpens, function(index, val) {
if ( !rSelfClose.test(val) ) {
tmp.push(val);
}
});
summOpens = tmp;

 l = summCloses.length;
for (i = 0; i < l; i++) {
summCloses[i] = summCloses[i].replace(rCloseTag, '$1');
}

 
 
 $.each(summOpens, function(index, val) {
var thisTagName = val.replace(rOpenTag, '$1');
var closePosition = $.inArray(thisTagName, summCloses);
if (closePosition === -1) {
openTagsForDetails.push(val);
closeTagsForsummaryText.push('</' + thisTagName + '>');
} else {
summCloses.splice(closePosition, 1);
}
});

 closeTagsForsummaryText.reverse();

 if ( !hasDetails ) {

 detailText = allHtml.slice(summaryText.length);
detailTagless = $.trim( detailText.replace(rOpenCloseTag, '') );
if ( detailTagless === '' || detailTagless.split(/\s+/).length < o.widow ) {
return;
}

 lastCloseTag = closeTagsForsummaryText.pop() || '';
summaryText += closeTagsForsummaryText.join('');
detailText = openTagsForDetails.join('') + detailText;
} else {

 
 


 detailText = $this.find(detailSelector).remove().html();

 summaryText = $this.html();

 allHtml = summaryText + detailText;
lastCloseTag = '';
}
o.moreLabel = $this.find(o.moreSelector).length ? '' : buildMoreLabel(o, detailText);
if (hasBlocks) {
detailText = allHtml;

 } else if (summaryText.charAt(summaryText.length-1) === '&') {
strayChars = /^[#\w\d\\]+;/.exec(detailText);
if (strayChars) {
detailText = detailText.slice(strayChars[0].length);
summaryText += strayChars[0];
}
}
summaryText += lastCloseTag;

 o.summary = summaryText;
o.details = detailText;
o.lastCloseTag = lastCloseTag;
if (defined.onSlice) {

 
 
 tmp = o.onSlice.call(thisEl, o);

 o = tmp && tmp.details ? tmp : o;
}

 html = buildHTML(o, hasBlocks);
$this.html( html );

 $thisDetails = $this.find(detailSelector);
$readMore = $this.find(o.moreSelector);

 
 
 
 
 
 if (o.collapseEffect === 'slideUp' && o.expandEffect !== 'slideDown' || $this.is(':hidden')) {
$thisDetails.css({display: 'none'});
} else {
$thisDetails[o.collapseEffect](0);
}
$summEl = $this.find('div.' + o.summaryClass);
expand = function(event) {
event.preventDefault();
$readMore.hide();
$summEl.hide();
if (defined.beforeExpand) {
o.beforeExpand.call(thisEl);
}
$thisDetails.stop(false, true)[o.expandEffect](expandSpeed, function() {
$thisDetails.css({zoom: ''});
if (defined.afterExpand) {o.afterExpand.call(thisEl);}
delayCollapse(o, $thisDetails, thisEl);
});
};
$readMore.find('a').unbind('click.expander').bind('click.expander', expand);
if ( o.userCollapse && !$this.find(o.lessSelector).length ) {
$this
.find(detailSelector)
.append('<span class="' + o.lessClass + '">' + o.userCollapsePrefix + '<a href="#" class="'+ o.lessLinkClass +'">' + o.userCollapseText + '</a></span>');
}
$this
.find(o.lessSelector + ' a')
.unbind('click.expander')
.bind('click.expander', function(event) {
event.preventDefault();
clearTimeout(delayedCollapse);
var $detailsCollapsed = $(this).closest(detailSelector);
reCollapse(o, $detailsCollapsed);
if (defined.onCollapse) {
o.onCollapse.call(thisEl, true);
}
});
}); 
 },
destroy: function() {
this.each(function() {
var o, details,
$this = $(this);
if ( !$this.data('expanderInit') ) {
return;
}
o = $.extend({}, $this.data('expander') || {}, opts);
details = $this.find('.' + o.detailClass).contents();
$this.removeData('expanderInit');
$this.removeData('expander');
$this.find(o.moreSelector).remove();
$this.find('.' + o.summaryClass).remove();
$this.find('.' + o.detailClass).after(details).remove();
$this.find(o.lessSelector).remove();
});
}
};

 if ( methods[meth] ) {
methods[ meth ].call(this);
}

 function buildHTML(o, blocks) {
var el = 'span',
summary = o.summary,
closingTagParts = rLastCloseTag.exec(summary),
closingTag = closingTagParts ? closingTagParts[2].toLowerCase() : '';
if ( blocks ) {
el = 'div';

 if ( closingTagParts && closingTag !== 'a' && !o.expandAfterSummary ) {
summary = summary.replace(rLastCloseTag, o.moreLabel + '$1');
} else {

 
 summary += o.moreLabel;
}

 summary = '<div class="' + o.summaryClass + '">' + summary + '</div>';
} else {
summary += o.moreLabel;
}
return [
summary,
' <',
el + ' class="' + o.detailClass + '"',
'>',
o.details,
'</' + el + '>'
].join('');
}
function buildMoreLabel(o, detailText) {
var ret = '<span class="' + o.moreClass + '">' + o.expandPrefix;
if (o.showWordCount) {
o.wordCountText = o.wordCountText.replace(/\{\{count\}\}/, detailText.replace(rOpenCloseTag, '').replace(/\&(?:amp|nbsp);/g, '').replace(/(?:^\s+|\s+$)/, '').match(/\w+/g).length);
} else {
o.wordCountText = '';
}
ret += '<a href="#" class="' + o.moreLinkClass + '">' + o.expandText + o.wordCountText + '</a></span>';
return ret;
}
function backup(txt, preserveWords) {
if ( txt.lastIndexOf('<') > txt.lastIndexOf('>') ) {
txt = txt.slice( 0, txt.lastIndexOf('<') );
}
if (preserveWords) {
txt = txt.replace(rAmpWordEnd,'');
}
return $.trim(txt);
}
function reCollapse(o, el) {
el.stop(true, true)[o.collapseEffect](o.collapseSpeed, function() {
var prevMore = el.prev('span.' + o.moreClass).show();
if (!prevMore.length) {
el.parent().children('div.' + o.summaryClass).show()
.find('span.' + o.moreClass).show();
}
if (o.afterCollapse) {o.afterCollapse.call(el);}
});
}
function delayCollapse(option, $collapseEl, thisEl) {
if (option.collapseTimer) {
delayedCollapse = setTimeout(function() {
reCollapse(option, $collapseEl);
if ( $.isFunction(option.onCollapse) ) {
option.onCollapse.call(thisEl, false);
}
}, option.collapseTimer);
}
}
function changeSlicePoint(info) {

 var sliceOnTemp = 'ExpandMoreHere374216623';

 
 var summaryTextClean = info.summaryText.replace(info.sliceOn, sliceOnTemp);
summaryTextClean = $('<div>' + summaryTextClean + '</div>').text();

 var sliceOnIndexClean = summaryTextClean.indexOf(sliceOnTemp);

 var sliceOnIndexHtml = info.summaryText.indexOf(info.sliceOn);

 if (sliceOnIndexClean !== -1 && sliceOnIndexClean < info.slicePoint) {

 info.summaryText = info.allHtml.slice(0, sliceOnIndexHtml);
}
return info;
}
return this;
};

 $.fn.expander.defaults = $.expander.defaults;
})(jQuery);


(function (factory) {
if (typeof define === 'function' && define.amd) {

 define(['jquery'], factory);
} else {

 factory(jQuery);
}
}(function ($) {
$.timeago = function(timestamp) {
if (timestamp instanceof Date) {
return inWords(timestamp);
} else if (typeof timestamp === "string") {
return inWords($.timeago.parse(timestamp));
} else if (typeof timestamp === "number") {
return inWords(new Date(timestamp));
} else {
return inWords($.timeago.datetime(timestamp));
}
};
var $t = $.timeago;
$.extend($.timeago, {
settings: {
refreshMillis: 60000,
allowFuture: false,
localeTitle: false,
format: function(date) { return date.toLocaleString() },
formatTitle: function(date) { return this.format(date) },
cutoff: 0,
strings: {
prefixAgo: null,
prefixFromNow: null,
suffixAgo: "ago",
suffixFromNow: "from now",
seconds: "less than a minute",
minute: "about a minute",
minutes: "%d minutes",
hour: "about an hour",
hours: "about %d hours",
day: "a day",
days: "%d days",
month: "about a month",
months: "%d months",
year: "about a year",
years: "%d years",
wordSeparator: " ",
numbers: []
}
},
inWords: function(distanceMillis) {
var $l = this.settings.strings;
var prefix = $l.prefixAgo;
var suffix = $l.suffixAgo;
if (this.settings.allowFuture) {
if (distanceMillis < 0) {
prefix = $l.prefixFromNow;
suffix = $l.suffixFromNow;
}
}
var seconds = Math.abs(distanceMillis) / 1000;
var minutes = seconds / 60;
var hours = minutes / 60;
var days = hours / 24;
var years = days / 365;
function substitute(stringOrFunction, number) {
var string = $.isFunction(stringOrFunction) ? stringOrFunction(number, distanceMillis) : stringOrFunction;
var value = ($l.numbers && $l.numbers[number]) || number;
return string.replace(/%d/i, value);
}
var words = seconds < 45 && substitute($l.seconds, Math.round(seconds)) ||
seconds < 90 && substitute($l.minute, 1) ||
minutes < 45 && substitute($l.minutes, Math.round(minutes)) ||
minutes < 90 && substitute($l.hour, 1) ||
hours < 24 && substitute($l.hours, Math.round(hours)) ||
hours < 42 && substitute($l.day, 1) ||
days < 30 && substitute($l.days, Math.round(days)) ||
days < 45 && substitute($l.month, 1) ||
days < 365 && substitute($l.months, Math.round(days / 30)) ||
years < 1.5 && substitute($l.year, 1) ||
substitute($l.years, Math.round(years));
var separator = $l.wordSeparator || "";
if ($l.wordSeparator === undefined) { separator = " "; }
return $.trim([prefix, words, suffix].join(separator));
},
parse: function(iso8601) {
var s = $.trim(iso8601);
s = s.replace(/\.\d+/,""); 
 s = s.replace(/-/,"/").replace(/-/,"/");
s = s.replace(/T/," ").replace(/Z/," UTC");
s = s.replace(/([\+\-]\d\d)\:?(\d\d)/," $1$2"); 
 return new Date(s);
},
datetime: function(elem) {
var iso8601 = $t.isTime(elem) ? $(elem).attr("datetime") : $(elem).attr("data-isotime");
return $t.parse(iso8601);
},
isTime: function(elem) {

 return $(elem).get(0).tagName.toLowerCase() === "time"; 
 }
});

 
 
 var functions = {
init: function(){
var refresh_el = $.proxy(refresh, this);
refresh_el();
var $s = $t.settings;
if ($s.refreshMillis > 0) {
setInterval(refresh_el, $s.refreshMillis);
}
},
update: function(time){
$(this).data('timeago', { datetime: $t.parse(time) });
refresh.apply(this);
}
};
$.fn.timeago = function(action, options) {
var fn = action ? functions[action] : functions.init;
if(!fn){
throw new Error("Unknown function name '"+ action +"' for timeago");
}

 this.each(function(){
fn.call(this, options);
});
return this;
};
function refresh() {
var data = prepareData(this);
var $s = $t.settings;
if (!isNaN(data.datetime)) {
if ( $s.cutoff == 0 || distance(data.datetime) < $s.cutoff) {
$(this).text(inWords(data.datetime));
} else {
$(this).text($s.format(data.datetime));
}
}
return this;
}
function prepareData(element) {
element = $(element);
if (!element.data("timeago")) {
element.data("timeago", { datetime: $t.datetime(element) });
var text = $.trim(element.text());
if ($t.settings.localeTitle) {
element.attr("title", $t.settings.formatTitle(element.data('timeago').datetime));
} else if (text.length > 0 && !($t.isTime(element) && element.attr("title"))) {
element.attr("title", text);
}
}
return element.data("timeago");
}
function inWords(date) {
return $t.inWords(distance(date));
}
function distance(date) {
return (new Date().getTime() - date.getTime());
}

 document.createElement("abbr");
document.createElement("time");
}));


(function() {
var $, win;
$ = this.jQuery || window.jQuery;
win = $(window);
$.fn.stick_in_parent = function(opts) {
var doc, elm, enable_bottoming, inner_scrolling, manual_spacer, offset_top, outer_width, parent_selector, recalc_every, sticky_class, _fn, _i, _len;
if (opts == null) {
opts = {};
}
sticky_class = opts.sticky_class, inner_scrolling = opts.inner_scrolling, recalc_every = opts.recalc_every, parent_selector = opts.parent, offset_top = opts.offset_top, manual_spacer = opts.spacer, enable_bottoming = opts.bottoming;
if (offset_top == null) {
offset_top = 0;
}
if (parent_selector == null) {
parent_selector = void 0;
}
if (inner_scrolling == null) {
inner_scrolling = true;
}
if (sticky_class == null) {
sticky_class = "is_stuck";
}
doc = $(document);
if (enable_bottoming == null) {
enable_bottoming = true;
}
outer_width = function(el) {
var computed, w, _el;
if (window.getComputedStyle) {
_el = el[0];
computed = window.getComputedStyle(el[0]);
w = parseFloat(computed.getPropertyValue("width")) + parseFloat(computed.getPropertyValue("margin-left")) + parseFloat(computed.getPropertyValue("margin-right"));
if (computed.getPropertyValue("box-sizing") !== "border-box") {
w += parseFloat(computed.getPropertyValue("border-left-width")) + parseFloat(computed.getPropertyValue("border-right-width")) + parseFloat(computed.getPropertyValue("padding-left")) + parseFloat(computed.getPropertyValue("padding-right"));
}
return w;
} else {
return el.outerWidth(true);
}
};
_fn = function(elm, padding_bottom, parent_top, parent_height, top, height, el_float, detached) {
var bottomed, detach, fixed, last_pos, last_scroll_height, offset, parent, recalc, recalc_and_tick, recalc_counter, spacer, tick;
if (elm.data("sticky_kit")) {
return;
}
elm.data("sticky_kit", true);
last_scroll_height = doc.height();
parent = elm.parent();
if (parent_selector != null) {
parent = parent.closest(parent_selector);
}
if (!parent.length) {
throw "failed to find stick parent";
}
fixed = false;
bottomed = false;
spacer = manual_spacer != null ? manual_spacer && elm.closest(manual_spacer) : $("<div />");
if (spacer) {
spacer.css('position', elm.css('position'));
}
recalc = function() {
var border_top, padding_top, restore;
if (detached) {
return;
}
last_scroll_height = doc.height();
border_top = parseInt(parent.css("border-top-width"), 10);
padding_top = parseInt(parent.css("padding-top"), 10);
padding_bottom = parseInt(parent.css("padding-bottom"), 10);
parent_top = parent.offset().top + border_top + padding_top;
parent_height = parent.height();
if (fixed) {
fixed = false;
bottomed = false;
if (manual_spacer == null) {
elm.insertAfter(spacer);
spacer.detach();
}
elm.css({
position: "",
top: "",
width: "",
bottom: ""
}).removeClass(sticky_class);
restore = true;
}
top = elm.offset().top - (parseInt(elm.css("margin-top"), 10) || 0) - offset_top;
height = elm.outerHeight(true);
el_float = elm.css("float");
if (spacer) {
spacer.css({
width: outer_width(elm),
height: height,
display: elm.css("display"),
"vertical-align": elm.css("vertical-align"),
"float": el_float
});
}
if (restore) {
return tick();
}
};
recalc();
if (height === parent_height) {
return;
}
last_pos = void 0;
offset = offset_top;
recalc_counter = recalc_every;
tick = function() {
var css, delta, recalced, scroll, will_bottom, win_height;
var notAlreadyAtBottom = function() { return scroll + height + offset <= parent_height + parent_top; };
if (detached) {
return;
}
recalced = false;
if (recalc_counter != null) {
recalc_counter -= 1;
if (recalc_counter <= 0) {
recalc_counter = recalc_every;
recalc();
recalced = true;
}
}
if (!recalced && doc.height() !== last_scroll_height) {
recalc();
recalced = true;
}
scroll = win.scrollTop();
if (last_pos != null) {
delta = scroll - last_pos;
}
last_pos = scroll;
if (fixed) {
if (enable_bottoming) {
will_bottom = scroll + height + offset > parent_height + parent_top;
if (bottomed && !will_bottom) {
bottomed = false;
elm.css({
position: "fixed",
bottom: "",
top: offset
}).trigger("sticky_kit:unbottom");
}
}
if (scroll < top) {
fixed = false;
offset = offset_top;
if (manual_spacer == null) {
if (el_float === "left" || el_float === "right") {
elm.insertAfter(spacer);
}
spacer.detach();
}
css = {
position: "",
width: "",
top: ""
};
elm.css(css).removeClass(sticky_class).trigger("sticky_kit:unstick");
}
if (inner_scrolling) {
win_height = win.height();
if (height + offset_top > win_height) {
if (!bottomed) {
offset -= delta;
offset = Math.max(win_height - height, offset);
offset = Math.min(offset_top, offset);
if (fixed) {
elm.css({
top: offset + "px"
});
}
}
}
}
} else {
if (scroll > top && notAlreadyAtBottom()) {
fixed = true;
css = {
position: "fixed",
top: offset
};
css.width = elm.css("box-sizing") === "border-box" ? elm.outerWidth() + "px" : elm.width() + "px";
elm.css(css).addClass(sticky_class);
if (manual_spacer == null) {
elm.after(spacer);
if (el_float === "left" || el_float === "right") {
spacer.append(elm);
}
}
elm.trigger("sticky_kit:stick");
}
}
if (fixed && enable_bottoming) {
if (will_bottom == null) {
will_bottom = !notAlreadyAtBottom();
}
if (!bottomed && will_bottom) {
bottomed = true;
if (parent.css("position") === "static") {
parent.css({
position: "relative"
});
}
return elm.css({
position: "absolute",
bottom: padding_bottom,
top: "auto"
}).trigger("sticky_kit:bottom");
}
}
};
recalc_and_tick = function() {
recalc();
return tick();
};
detach = function() {
detached = true;
win.off("touchmove", tick);
win.off("scroll", tick);
win.off("resize", recalc_and_tick);
$(document.body).off("sticky_kit:recalc", recalc_and_tick);
elm.off("sticky_kit:detach", detach);
elm.removeData("sticky_kit");
elm.css({
position: "",
bottom: "",
top: "",
width: ""
});
parent.position("position", "");
if (fixed) {
if (manual_spacer == null) {
if (el_float === "left" || el_float === "right") {
elm.insertAfter(spacer);
}
spacer.remove();
}
return elm.removeClass(sticky_class);
}
};
win.on("touchmove", tick);
win.on("scroll", tick);
win.on("resize", recalc_and_tick);
$(document.body).on("sticky_kit:recalc", recalc_and_tick);
elm.on("sticky_kit:detach", detach);
return setTimeout(tick, 0);
};
for (_i = 0, _len = this.length; _i < _len; _i++) {
elm = this[_i];
_fn($(elm));
}
return this;
};
}).call(this);
(function($){

var $w = $(window);
$.fn.visible = function(partial,hidden,direction){
if (this.length < 1)
return;
var $t = this.length > 1 ? this.eq(0) : this,
t = $t.get(0),
vpWidth = $w.width(),
vpHeight = $w.height(),
direction = (direction) ? direction : 'both',
clientSize = hidden === true ? t.offsetWidth * t.offsetHeight : true;
if (typeof t.getBoundingClientRect === 'function'){

 var rec = t.getBoundingClientRect(),
tViz = rec.top >= 0 && rec.top < vpHeight,
bViz = rec.bottom > 0 && rec.bottom <= vpHeight,
lViz = rec.left >= 0 && rec.left < vpWidth,
rViz = rec.right > 0 && rec.right <= vpWidth,
vVisible = partial ? tViz || bViz : tViz && bViz,
hVisible = partial ? lViz || rViz : lViz && rViz;
if(direction === 'both')
return clientSize && vVisible && hVisible;
else if(direction === 'vertical')
return clientSize && vVisible;
else if(direction === 'horizontal')
return clientSize && hVisible;
} else {
var viewTop = $w.scrollTop(),
viewBottom = viewTop + vpHeight,
viewLeft = $w.scrollLeft(),
viewRight = viewLeft + vpWidth,
offset = $t.offset(),
_top = offset.top,
_bottom = _top + $t.height(),
_left = offset.left,
_right = _left + $t.width(),
compareTop = partial === true ? _bottom : _top,
compareBottom = partial === true ? _top : _bottom,
compareLeft = partial === true ? _right : _left,
compareRight = partial === true ? _left : _right;
if(direction === 'both')
return !!clientSize && ((compareBottom <= viewBottom) && (compareTop >= viewTop)) && ((compareRight <= viewRight) && (compareLeft >= viewLeft));
else if(direction === 'vertical')
return !!clientSize && ((compareBottom <= viewBottom) && (compareTop >= viewTop));
else if(direction === 'horizontal')
return !!clientSize && ((compareRight <= viewRight) && (compareLeft >= viewLeft));
}
};
})(jQuery);

(function (root, factory) {
'use strict';

 if (typeof module !== 'undefined' && module.exports) {
module.exports = factory(require('jquery'));
}

 else if (typeof define === 'function' && define.amd) {
define(['jquery'], function ($) {
return factory($);
});
} else {
factory(root.jQuery);
}
}(this, function ($) {
'use strict';


var idCounter = 100000;

function newId() {
return 'gen-id-' + idCounter++;
}

function getOrGenId(element) {
var id = element.getAttribute('id');
if (!id) {
id = newId();
element.setAttribute('id', id);
}
return id;
}
function plainText(htmlString) {
var $html = $('<div></div>').html(htmlString);

 
 $html.find('div,p,section,h1,h2,h3,h4,h5,h6').append(' ');
return $html.text();
}

var Typeahead = function (element, options) {
this.$element = $(element);
this.$parent = this.$element.parent();
this.options = $.extend({}, Typeahead.defaults, options);
this.matcher = this.options.matcher || this.matcher;
this.sorter = this.options.sorter || this.sorter;
this.select = this.options.select || this.select;
this.autoSelect = typeof this.options.autoSelect == 'boolean' ? this.options.autoSelect : true;
this.highlighter = this.options.highlighter || this.highlighter;
this.render = this.options.render || this.render;
this.updater = this.options.updater || this.updater;
this.displayText = this.options.displayText || this.displayText;
this.itemLink = this.options.itemLink || this.itemLink;
this.itemTitle = this.options.itemTitle || this.itemTitle;
this.followLinkOnSelect = this.options.followLinkOnSelect || this.followLinkOnSelect;
this.source = this.options.source;
this.delay = this.options.delay;
this.theme = this.options.theme && this.options.themes && this.options.themes[this.options.theme] || Typeahead.defaults.themes[Typeahead.defaults.theme];
this.$menu = $(this.options.menu || this.theme.menu);
this.$appendTo = this.options.appendTo ? $(this.options.appendTo) : null;
this.fitToElement = typeof this.options.fitToElement == 'boolean' ? this.options.fitToElement : false;
this.shown = false;
this.listen();
this.showHintOnFocus = typeof this.options.showHintOnFocus == 'boolean' || this.options.showHintOnFocus === 'all' ? this.options.showHintOnFocus : false;
this.afterSelect = this.options.afterSelect;
this.afterEmptySelect = this.options.afterEmptySelect;
this.addItem = false;
this.value = this.$element.val() || this.$element.text();
this.keyPressed = false;
this.focused = this.$element.is(':focus');
this.changeInputOnSelect = this.options.changeInputOnSelect || this.changeInputOnSelect;
this.changeInputOnMove = this.options.changeInputOnMove || this.changeInputOnMove;
this.openLinkInNewTab = this.options.openLinkInNewTab || this.openLinkInNewTab;
this.selectOnBlur = this.options.selectOnBlur || this.selectOnBlur;
this.selectOnTab = this.options.selectOnTab;
this.showCategoryHeader = this.options.showCategoryHeader || this.showCategoryHeader;
this.prevItems = [];
this.$statusRegion = $('<div></div>').addClass('sr-only').attr({
'role': 'status',
'aria-live': 'polite' 
 });
this.$element.after(this.$statusRegion);
this.$parent.attr({
'role': 'combobox',
'aria-haspopup': 'listbox'
});
this.$element.attr({
'aria-autocomplete': 'list'
})

 this.show();
this.hide();

 var that = this;
document.addEventListener('scroll', function () {
if (that.shown) that.hide();
}, true);
};
Typeahead.prototype = {
constructor: Typeahead,
setDefault: function (val) {

 this.$element.data('active', val);
if (this.autoSelect || val) {
var newVal = this.updater(val);

 
 if (!newVal) {
newVal = '';
}
this.$element
.val(this.displayText(newVal) || newVal)
.text(this.displayText(newVal) || newVal)
.change();
this.afterSelect(newVal);
}
return this.hide();
},
select: function () {
var $activeElement = this.$menu.find('.active');
var val = $activeElement.data('value');
this.$element.data('active', val);
if (this.autoSelect || val) {
var newVal = this.updater(val);

 
 if (!newVal) {
newVal = '';
}
if (this.changeInputOnSelect) {
this.$element
.val(this.displayText(newVal) || newVal)
.text(this.displayText(newVal) || newVal)
.change();
}
if (this.followLinkOnSelect && this.itemLink(val)) {
if (this.openLinkInNewTab) {
window.open(this.itemLink(val), '_blank');
} else {
document.location = this.itemLink(val);
}
this.afterSelect(newVal);
} else if (this.followLinkOnSelect && !this.itemLink(val)) {
this.afterEmptySelect(newVal);
} else {
this.afterSelect(newVal);
}
} else {
this.afterEmptySelect();
}
return this.hide();
},
updater: function (item) {
return item;
},
setSource: function (source) {
this.source = source;
},
show: function () {
var pos = $.extend({}, this.$element.position(), {
height: this.$element[0].offsetHeight
});
var scrollHeight = typeof this.options.scrollHeight == 'function' ?
this.options.scrollHeight.call() :
this.options.scrollHeight;
var element;
if (this.shown) {
element = this.$menu;
} else if (this.$appendTo) {
element = this.$menu.appendTo(this.$appendTo);
this.hasSameParent = this.$appendTo.is(this.$element.parent());
} else {
element = this.$menu.insertAfter(this.$element);
this.hasSameParent = true;
}
if (!this.hasSameParent) {

 element.css('position', 'fixed');
var offset = this.$element.offset();
pos.top = offset.top;
pos.left = offset.left;
}

 
 
 var dropup = $(element).parent().hasClass('dropup');
var newTop = dropup ? 'auto' : (pos.top + pos.height + scrollHeight);
var right = $(element).hasClass('dropdown-menu-right');
var newLeft = right ? 'auto' : pos.left;

 
 element.css({ top: newTop, left: newLeft }).show();
if (this.options.fitToElement === true) {
element.css('width', this.$element.outerWidth() + 'px');
}
this.shown = true;
this.$parent.attr('aria-expanded', 'true');
this.$parent.attr('aria-owns', getOrGenId(element[0]));
this.$element.attr('aria-controls', getOrGenId(element[0]));
return this;
},
hide: function () {
this.$menu.hide();
this.prevItems = [];
this.shown = false;
this.$parent.attr('aria-expanded', 'false');
this.$element.attr('aria-activedescendant', null);
return this;
},
lookup: function (query) {
if (typeof(query) != 'undefined' && query !== null) {
this.query = query;
} else {
this.query = this.$element.val();
}
if (this.query.length < this.options.minLength && !this.options.showHintOnFocus) {
return this.shown ? this.hide() : this;
}
var worker = $.proxy(function () {

 
 
 if ($.isFunction(this.source) && this.source.length === 3) {
this.source(this.query, $.proxy(this.process, this), $.proxy(this.process, this));
} else if ($.isFunction(this.source)) {
this.source(this.query, $.proxy(this.process, this));
} else if (this.source) {
this.process(this.source);
}
}, this);
clearTimeout(this.lookupWorker);
this.lookupWorker = setTimeout(worker, this.delay);
},
process: function (items) {
var that = this;
var oldItems = this.prevItems;
this.prevItems = items;
this.onItemsChanged(oldItems || [], items);
items = $.grep(items, function (item) {
return that.matcher(item);
});
items = this.sorter(items);
if (!items.length && !this.options.addItem) {
return this.shown ? this.hide() : this;
}
if (items.length > 0) {
this.$element.data('active', items[0]);
} else {
this.$element.data('active', null);
}
items = this._limitListSize(items);

 if (this.options.addItem) {
items.push(this.options.addItem);
}
return this.render(items).show();
},

_limitListSize: function(items) {
if (this.options.items === 'all') {
return items;
} else {
return items.slice(0, this.options.items);
}
},
matcher: function (item) {
var it = this.displayText(item);
return ~it.toLowerCase().indexOf(this.query.toLowerCase());
},
sorter: function (items) {
var beginswith = [];
var caseSensitive = [];
var caseInsensitive = [];
var item;
while ((item = items.shift())) {
var it = this.displayText(item);
if (!it.toLowerCase().indexOf(this.query.toLowerCase())) {
beginswith.push(item);
} else if (~it.indexOf(this.query)) {
caseSensitive.push(item);
} else {
caseInsensitive.push(item);
}
}
return beginswith.concat(caseSensitive, caseInsensitive);
},
highlighter: function (item) {
var text = this.query;
if (text === '') {
return item;
}
var matches = item.match(/(>)([^<]*)(<)/g);
var first = [];
var second = [];
var i;
if (matches && matches.length) {

 for (i = 0; i < matches.length; ++i) {
if (matches[i].length > 2) {
 first.push(matches[i]);
}
}
} else {

 first = [];
first.push(item);
}
text = text.replace((/[\(\)\/\.\*\+\?\[\]]/g), function (mat) {
return '\\' + mat;
});
var reg = new RegExp(text, 'g');
var m;
for (i = 0; i < first.length; ++i) {
m = first[i].match(reg);
if (m && m.length > 0) {
 second.push(first[i]);
}
}
for (i = 0; i < second.length; ++i) {
item = item.replace(second[i], second[i].replace(reg, '<strong>$&</strong>'));
}
return item;
},
onItemsChanged: function (oldItems, newItems) {

 var oldItemsShown = this._limitListSize(oldItems);
var newItemsShown = this._limitListSize(newItems);

 if (!oldItemsShown.length && newItemsShown.length) {
this._setLiveStatus(newItemsShown.length + ' results, use arrow keys');
} else if (oldItemsShown.length && !newItemsShown.length) {
this._setLiveStatus('No results, try another query');
}
},
render: function (items) {
var that = this;
var self = this;
var activeFound = false;
var data = [];
var _category = that.options.separator;
$.each(items, function (key, value) {

 if (key > 0 && value[_category] !== items[key - 1][_category]) {
data.push({
__type: 'divider'
});
}
if (that.showCategoryHeader) {

 if (value[_category] && (key === 0 || value[_category] !== items[key - 1][_category])) {
data.push({
__type: 'category',
name: value[_category]
});
}
}
data.push(value);
});
items = $(data).map(function (i, item) {
if ((item.__type || false) == 'category'){
return $(that.options.headerHtml || that.theme.headerHtml).text(item.name)[0];
}
if ((item.__type || false) == 'divider'){
return $(that.options.headerDivider || that.theme.headerDivider)[0];
}
var text = self.displayText(item);
var itemTitle = self.itemTitle(item);

 var ariaLabel = itemTitle || plainText(text);
i = $(that.options.item || that.theme.item).data('value', item);
i.find(that.options.itemContentSelector || that.theme.itemContentSelector)
.addBack(that.options.itemContentSelector || that.theme.itemContentSelector)
.attr('aria-label', ariaLabel) 
 .html(that.highlighter(text, item));
if(that.options.followLinkOnSelect) {
i.find('a').attr('href', self.itemLink(item));
}
i.find('a').attr('title', itemTitle);
if (text == self.$element.val()) {
self._markActive(i);
self.$element.data('active', item);
activeFound = true;
}
return i[0];
});
if (this.autoSelect && !activeFound) {
this._markActive(items.filter(':not(.dropdown-header)').first());
this.$element.data('active', items.first().data('value'));
}
this.$menu.html(items);
return this;
},

displayText: function (item) {
return typeof item !== 'undefined' && typeof item.name != 'undefined' ? item.name : item;
},
itemLink: function (item) {
return null;
},
itemTitle: function (item) {
return null;
},
_markActive: function($li) {
$li.addClass('active');
$li.attr('aria-selected', 'true')
this.$element.attr('aria-activedescendant', getOrGenId($li[0]));
},
next: function (event) {
var active = this.$menu.find('.active').removeClass('active').attr('aria-selected', 'false');

 var next = !active.length
? $(this.$menu.find($(this.options.item || this.theme.item).prop('tagName'))[0])
: active.next();
if (this.autoSelect && !next.length) {
next = $(this.$menu.find($(this.options.item || this.theme.item).prop('tagName'))[0]);
}
while (next.hasClass('divider') || next.hasClass('dropdown-header')) {
next = next.next();
}
this._markActive(next);

 var newVal = this.updater(next.data('value'));
if (this.changeInputOnMove) {
this.$element.val(this.displayText(newVal) || newVal);
}
},
prev: function (event) {
var active = this.$menu.find('.active').removeClass('active').attr('aria-selected', 'false');

 var prev = !active.length
? this.$menu.find($(this.options.item || this.theme.item).prop('tagName')).last()
: active.prev();
if (this.autoSelect && !prev.length) {
prev = this.$menu.find($(this.options.item || this.theme.item).prop('tagName')).last();
}
while (prev.hasClass('divider') || prev.hasClass('dropdown-header')) {
prev = prev.prev();
}
this._markActive(prev);

 var newVal = this.updater(prev.data('value'));
if (this.changeInputOnMove) {
this.$element.val(this.displayText(newVal) || newVal);
}
},
listen: function () {
this.$element
.on('focus.bootstrap3Typeahead', $.proxy(this.focus, this))
.on('blur.bootstrap3Typeahead', $.proxy(this.blur, this))
.on('keypress.bootstrap3Typeahead', $.proxy(this.keypress, this))
.on('propertychange.bootstrap3Typeahead input.bootstrap3Typeahead', $.proxy(this.input, this))
.on('keyup.bootstrap3Typeahead', $.proxy(this.keyup, this));
if (this.eventSupported('keydown')) {
this.$element.on('keydown.bootstrap3Typeahead', $.proxy(this.keydown, this));
}
var itemTagName = $(this.options.item || this.theme.item).prop('tagName');
var eventSelector = itemTagName + ':not(.divider):not(.dropdown-header)';
this.$menu
.on('click', eventSelector, $.proxy(this.click, this))
.on('mouseenter', eventSelector, $.proxy(this.mouseenter, this))
.on('mouseleave', eventSelector, $.proxy(this.mouseleave, this))
.on('mousedown', $.proxy(this.mousedown,this));
},
destroy: function () {
this.$element.data('typeahead', null);
this.$element.data('active', null);
this.$element
.unbind('focus.bootstrap3Typeahead')
.unbind('blur.bootstrap3Typeahead')
.unbind('keypress.bootstrap3Typeahead')
.unbind('propertychange.bootstrap3Typeahead input.bootstrap3Typeahead')
.unbind('keyup.bootstrap3Typeahead');
if (this.eventSupported('keydown')) {
this.$element.unbind('keydown.bootstrap3Typeahead');
}
this.$menu.remove();
this.destroyed = true;
},
eventSupported: function (eventName) {
var isSupported = eventName in this.$element;
if (!isSupported) {
this.$element.setAttribute(eventName, 'return;');
isSupported = typeof this.$element[eventName] === 'function';
}
return isSupported;
},

move: function (e) {
if (!this.shown) {
return;
}
switch (e.keyCode) {
case 9: 
 if (this.selectOnTab) {
e.preventDefault();
} else {
this.hide();
}
break;
case 13: 
 case 27: 
 e.preventDefault();
break;
case 38: 
 
 if (e.shiftKey) {
return;
}
e.preventDefault();
this.prev();
break;
case 40: 
 
 if (e.shiftKey) {
return;
}
e.preventDefault();
this.next();
break;
}
},

keydown: function (e) {

if (e.keyCode === 17) { 
 return;
}
this.keyPressed = true;
this.suppressKeyPressRepeat = ~$.inArray(e.keyCode, [40, 38, 9, 13, 27]);
if (!this.shown && e.keyCode === 40) {
this.lookup();
} else {
this.move(e);
}
},
keypress: function (e) {
if (this.suppressKeyPressRepeat) {
return;
}
this.move(e);
},
input: function (e) {

 
 var currentValue = this.$element.val() || this.$element.text();
if (this.value !== currentValue) {
this.value = currentValue;
this.lookup();
}
},
keyup: function (e) {
if (this.destroyed) {
return;
}
switch (e.keyCode) {
case 40: 
 case 38: 
 case 16: 
 case 17: 
 case 18: 
 break;
case 9: 
 if (!this.selectOnTab) {
e.preventDefault();
}
if (!this.selectOnTab || !this.shown || (this.showHintOnFocus && !this.keyPressed)) {
return;
}
this.select();
break;
case 13: 
 if (!this.shown) {
return;
}
this.select();
break;
case 27: 
 if (!this.shown) {
return;
}
this.hide();
break;
}
},
focus: function (e) {
if (!this.focused) {
this.focused = true;
this.keyPressed = false;
if (this.options.showHintOnFocus && this.skipShowHintOnFocus !== true) {
if (this.options.showHintOnFocus === 'all') {
this.lookup('');
} else {
this.lookup();
}
}
}
if (this.skipShowHintOnFocus) {
this.skipShowHintOnFocus = false;
}
},
blur: function (e) {
if (!this.mousedover && !this.mouseddown && this.shown) {
if (this.selectOnBlur) {
this.select();
}
this.hide();
this.focused = false;
this.keyPressed = false;
} else if (this.mouseddown) {

 
 this.skipShowHintOnFocus = true;
this.$element.focus();
this.mouseddown = false;
}
},
click: function (e) {
e.preventDefault();
this.skipShowHintOnFocus = true;
this.select();
this.$element.focus();
this.hide();
},
mouseenter: function (e) {
this.mousedover = true;
this.$menu.find('.active').removeClass('active').attr('aria-selected', 'false');
this._markActive($(e.currentTarget));
},
mouseleave: function (e) {
this.mousedover = false;
if (!this.focused && this.shown) {
this.hide();
}
},

mousedown: function (e) {
this.mouseddown = true;
this.$menu.one('mouseup', function (e) {

 this.mouseddown = false;
}.bind(this));
},

_setLiveStatus: function(text) {
this.$statusRegion.text(text);
}
};

var old = $.fn.typeahead;
$.fn.typeahead = function (option) {
var arg = arguments;
if (typeof option === 'string' && option === 'getActive') {
return this.data('active');
}
return this.each(function () {
var $this = $(this);
var data = $this.data('typeahead');
var options = typeof option === 'object' && option;
if (!data) {
$this.data('typeahead', (data = new Typeahead(this, options)));
}
if (typeof option === 'string' && data[option]) {
if (arg.length > 1) {
data[option].apply(data, Array.prototype.slice.call(arg, 1));
} else {
data[option]();
}
}
});
};
Typeahead.defaults = {
source: [],
items: 8,
minLength: 1,
scrollHeight: 0,
autoSelect: true,
afterSelect: $.noop,
afterEmptySelect: $.noop,
addItem: false,
followLinkOnSelect: false,
delay: 0,
separator: 'category',
changeInputOnSelect: true,
changeInputOnMove: true,
openLinkInNewTab: false,
selectOnBlur: true,
selectOnTab: true,
showCategoryHeader: true,
theme: "bootstrap3",
themes: {
bootstrap3: {
menu: '<ul class="typeahead dropdown-menu" role="listbox" aria-label="Search results"></ul>',
item: '<li role="option"><a class="dropdown-item" href="#"></a></li>',
itemContentSelector: "a",
headerHtml: '<li class="dropdown-header"></li>',
headerDivider: '<li class="divider" role="separator"></li>'
},
bootstrap4: {
menu: '<div class="typeahead dropdown-menu" role="listbox" aria-label="Search results"></div>',
item: '<button class="dropdown-item" role="option"></button>',
itemContentSelector: '.dropdown-item',
headerHtml: '<h6 class="dropdown-header"></h6>',
headerDivider: '<div class="dropdown-divider"></div>'
}
}
};
$.fn.typeahead.Constructor = Typeahead;

$.fn.typeahead.noConflict = function () {
$.fn.typeahead = old;
return this;
};

$(document).on('focus.typeahead.data-api', '[data-provide="typeahead"]', function (e) {
var $this = $(this);
if ($this.data('typeahead')) {
return;
}
$this.typeahead($this.data());
});
}));
