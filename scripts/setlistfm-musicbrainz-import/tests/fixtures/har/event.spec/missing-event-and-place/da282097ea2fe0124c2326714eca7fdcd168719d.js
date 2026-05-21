const util = (function() {
return {
popup: function({
url,
width = 800,
height = 600,
target = "_blank",
noopener = true,
noreferrer = true,
menubar = false,
status = false }) {

 const left = window.screenX + (window.outerWidth / 2 - width / 2);
if (left < 0) {
left = (screen.width / 2) - (width / 2);
}
const top = window.screenY + (window.outerHeight / 2 - height / 2);
if (top < 0) {
top = (screen.height / 2) - (height / 2);
}
const popup = window.open(url, target, "width=" + width
+ ",height=" + height
+ ",top=" + top
+ ",left=" + left

 + ",noopener=" + (noopener ? 'yes' : 'no')
+ ",noreferrer=" + (noreferrer ? 'yes' : 'no')
+ ",menubar=" + (menubar ? 'yes' : 'no')
+ ",status=" + (status ? 'yes' : 'no'));
if (popup) {
if (!noopener && popup.opener == null) {
popup.opener = window;
}
if (window.focus) {
popup.focus();
}
}
return popup;
}
};
}());
var responsive = {
screen : {
xs : {max: 767},
sm : {min: 768, max: 991},
md : {min: 992, max: 1199},
lg : {min: 1200}
}, 
width: function() {
return window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
},
height: function() {
return window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
},
match: function(mediaQuery, fallback) {
if (typeof window.matchMedia === 'function') {
return window.matchMedia(mediaQuery);
} else {

 var mql = {
matches: fallback(),
update: function() {
var was = this.matches;
this.matches = fallback()
if (was != this.matches) {
for (var i = 0; i < this.listeners.length; i++) {
this.listeners[i](this);
}
}
},
listeners: [],
addListener: function(listener) {
if (typeof listener === 'function') {
this.listeners.push(listener);
}
}
};
window.addEventListener('resize', mql.update);
return mql;
}
},
max: function(max) {
return this.match('(max-width: '+max+'px)', function() {
return responsive.width() <= max;
});
},
min: function(min) {
return this.match('(min-width: '+min+'px)', function() {
return responsive.width() >= min;
});
},
between: function(min, max) {
return this.match('(min-width: '+min+'px) and (max-width: '+max+'px)', function() {
return responsive.width() >= min && responsive.width() <= max;
});
}
}
responsive.sml = responsive.max(responsive.screen.sm.max);
responsive.mdg = responsive.min(responsive.screen.md.min);
responsive.smg = responsive.min(responsive.screen.sm.min);
responsive.xs = responsive.max(responsive.screen.xs.max);
responsive.sm = responsive.between(responsive.screen.sm.min, responsive.screen.sm.max);
responsive.md = responsive.between(responsive.screen.md.min, responsive.screen.md.max);
responsive.lg = responsive.min(responsive.screen.lg.min);
responsive.current = function() {
if (responsive.xs.matches) {
return 'xs';
} else if (responsive.sm.matches) {
return 'sm';
} else if (responsive.md.matches) {
return 'md';
} else {
return 'lg';
}
}();
responsive.resized = function(to) {
this.current = to;
}

responsive.xs.addListener(function(mql) {
if (mql.matches) {
responsive.resized('xs');
}
});
responsive.sm.addListener(function(mql) {
if (mql.matches) {
responsive.resized('sm');
}
});
responsive.md.addListener(function(mql) {
if (mql.matches) {
responsive.resized('md');
}
});
responsive.lg.addListener(function(mql) {
if (mql.matches) {
responsive.resized('lg');
}
});
(function(theme) {

theme.toggle = async function() {
const dark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
const theme = dark ? 'light' : 'dark';
this.change(theme);
};
theme.change = async function(totheme) {

 await $('a.theme')
.animate({
top: '40px',
opacity: 0
}, 300, 'swing')
.promise()
.then(function() {
document.documentElement.setAttribute('data-bs-theme', totheme);
if (typeof window.localStorage === 'object') {
window.localStorage.setItem('sfm-theme', totheme);
}
return $(this).animate({
top: '0px',
opacity: 1
}, 300, 'swing').promise();
});
};

theme.clear = function() {
document.documentElement.setAttribute('data-bs-theme', window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
if (typeof window.localStorage === 'object') {
window.localStorage.removeItem('sfm-theme');
}
};
theme.addEventListener = function(listener) {
document.documentElement.addEventListener("theme", listener, false);
};
theme.getCurrentlyActive = function() {
return document.documentElement.getAttribute('data-bs-theme');
};
theme.isSystem = function() {
if (typeof window.localStorage === 'object') {
return window.localStorage.getItem('sfm-theme') == null;
} else {

return true;
}
};
new MutationObserver(function(mutations) {
mutations.forEach(function(mutation) {
if (mutation.type === "attributes" && mutation.attributeName === "data-bs-theme") {
document.documentElement.dispatchEvent(new CustomEvent("theme", { detail: { theme: mutation.target.getAttribute('data-bs-theme') } }));
}
});
}).observe(document.documentElement, {
attributes: true
});
}(window.theme = window.theme || {}));
function initThemeLinkStates() {
window.theme.addEventListener(function(event) {
updateThemeLinkStates();
});
forEachFooterThemeLink(function(link) {
const activeAttr = link.getAttribute("data-theme-active");
link.addEventListener("click", function() {
if (activeAttr === 'system') {
window.theme.clear();
} else {
window.theme.change(activeAttr);
}
});
});
updateThemeLinkStates();
}
function updateThemeLinkStates() {
const active = window.theme.isSystem() ? "system" : window.theme.getCurrentlyActive();
forEachFooterThemeLink(function(link) {
const activeAttr = link.getAttribute("data-theme-active");
const classList = link.parentElement.classList;
if (!classList.contains("active") && activeAttr == active) {
classList.add("active");
} else {
classList.remove("active");
}
});
}
function forEachFooterThemeLink(callback) {
const links = document.getElementsByClassName("footerThemeLink");
for (let i = 0; i < links.length; i++) {
callback(links.item(i));
}
}

var baseRegion = null;

var resetHandler = null;

var currRegion = null;
function initStatelessRegion(region, reset) {
baseRegion = region;
resetHandler = reset;
drawStatelessChartRegion(region);
}

function drawStatelessChartRegion(reg, zoom) {
var geomap = new google.visualization.GeoChart(document.getElementById('map_canvas'));
drawGeoChart(geomap, function(chart, region) {
var data = new google.visualization.DataTable();
data.addRows(region.points.length);
for (i = 0; i < region.columns.length; i++) {
var col = region.columns[i];
data.addColumn(col.type, col.label);
}
for (i = 0; i < region.points.length; i++) {
var point = region.points[i];
for (j = 0; j < point.values.length; j++) {
var val = point.values[j];
data.setValue(i, j, val);
}
}
var options = {};
options['region'] = (undefined === zoom) ? region.region : zoom;
options['resolution'] = (undefined === region.resolution) ? 'countries' : region.resolution;
options['dataMode'] = 'regions';
options['width'] = '670px';
options['height'] = '420px';
options['showZoomOut'] = !(region.region == 'world' && undefined === zoom);
options['colorAxis'] = {colors: ['$(--bs-geomap-axis-start-color)', '$(--bs-geomap-axis-end-color)']};
options['backgroundColor'] = '$(--bs-geomap-bg-color)';
options['datalessRegionColor'] = '$(--bs-geomap-nodata-color)';
options['defaultColor'] = '$(--bs-geomap-nodata-color)';
var newCurrRegion = options['region'];
if (newCurrRegion.length == 2) {
document.getElementById('zoomSelect').selectedIndex = -1;
}
if (resetHandler != null && currRegion != null && currRegion.length == 2 && newCurrRegion.length > 2) {
resetHandler(null);
}
currRegion = newCurrRegion;
var formatter = new google.visualization.PatternFormat('{1}');
formatter.format(data, [0, 2]);
var view = new google.visualization.DataView(data);
view.setColumns([0, 1]);
chart.draw(view, resolveColorOptionsVis(options, window.getComputedStyle(document.body)));
}, reg);
google.visualization.events.addListener(geomap, 'regionClick', function(event) {

 if (resetHandler && (!event.region || event.region.length <= 2)) {
resetHandler(event.region);
}
});
}
function drawGeoChart(chart, draw, region) {
window.theme.addEventListener(function() {
chart.clearChart();
console.log("draw chart");
draw(chart, region);
});
draw(chart, region);
}

function resolveColorOptionsVis(v, style) {
if (typeof v === "object" && v !== null) {
if (Array.isArray(v)) {
return v.map(e => resolveColorOptions(e, style));
} else {
var opts = {};
for (var k in v) {
opts[k] = resolveColorOptions(v[k], style);
}
return opts;
}
} else if (typeof v === "string" && v.startsWith("$(") && v.endsWith(")")) {
var prop = style.getPropertyValue(v.substring(2, v.length - 1));
return prop ? rgb2hexVis(prop) : v;
} else {
return v;
}
}
function rgb2hexVis(rgb) {
var match = rgb.match(/^rgb\((\d+\.?\d*),\s*(\d+\.?\d*),\s*(\d+\.?\d*)\)$/);
function hex(x) {
return ("0" + Math.round(parseFloat(x)).toString(16)).slice(-2);
}
return match ? "#" + hex(match[1]) + hex(match[2]) + hex(match[3]) : rgb;
}
function drawPieChart(eleId, chartData, options, callbackURL, errorHandler) {
var data = new google.visualization.DataTable();
data.addColumn('string', chartData.nameLabel);
data.addColumn('number', chartData.numberLabel);
data.addRows(chartData.values.length);
for (i = 0; i < chartData.values.length; i++) {
var val = chartData.values[i];
data.setCell(i, 0, val.label);
data.setCell(i, 1, val.value);
}
drawChart(new google.visualization.PieChart(document.getElementById(eleId)), function(chart) {
applyChartData(chart, data, options, callbackURL, errorHandler);
});
}
function drawColumnChart(eleId, chartData, options, callbackURL, errorHandler) {
drawChart(new google.visualization.ColumnChart(document.getElementById(eleId)), function(chart) {
applyChartData(chart, convertChartData(chartData), options, callbackURL, errorHandler);
});
}
function drawLineChart(eleId, chartData, options, callbackURL, errorHandler) {
drawChart(new google.visualization.LineChart(document.getElementById(eleId)), function(chart) {
applyChartData(chart, convertChartData(chartData), options, callbackURL, errorHandler);
});
}
function drawTimelineChart(eleId, chartData, options, callbackURL, errorHandler) {
drawChart(new google.visualization.Timeline(document.getElementById(eleId)), function(chart) {
var dataTable = new google.visualization.DataTable();
dataTable.addColumn({ type: 'string', id: chartData.positionLabel });
dataTable.addColumn({ type: 'string', id: chartData.nameLabel });
dataTable.addColumn({ type: 'date', id: chartData.startLabel });
dataTable.addColumn({ type: 'date', id: chartData.endLabel });
for (i = 0; i < chartData.values.length; i++) {
var val = chartData.values[i];
var s = val.start;
var e = val.end;
dataTable.addRow([val.rowLabel, val.barLabel, new Date(s.year, s.month, s.day), new Date(e.year, e.month, e.day)]);
}
applyChartData(chart, dataTable, options, callbackURL, errorHandler);
});
}
function drawChart(chart, draw) {
window.theme.addEventListener(function() {
chart.clearChart();
console.log("draw chart");
draw(chart);
});
draw(chart);
}
function convertChartData(chartData) {
var data = new google.visualization.DataTable();
data.addColumn('string', chartData.vAxisColName);
for (i = 0; i < chartData.hAxisColNames.length; i++) {
var val = chartData.hAxisColNames[i];
data.addColumn('number', val);
}
data.addRows(chartData.values.length);
for (i = 0; i < chartData.values.length; i++) {
var val = chartData.values[i];
data.setCell(i, 0, val.label);
for (j = 1; j <= val.values.length; j++) {
var entry = val.values[j - 1];
data.setCell(i, j, entry);
}
}
return data;
}
function applyChartData(chart, data, options, callbackURL, errorHandler) {
if (errorHandler != null) {
google.visualization.events.addListener(chart, "error", errorHandler);
}
chart.draw(data, resolveColorOptions(options, window.getComputedStyle(document.body)));
if (callbackURL != null) {
google.visualization.events.addListener(chart, "select", function() {
var selection = chart.getSelection();
if (selection.length > 0) {
var row = selection[0].row;
var wcall = wicketAjaxGet(callbackURL + '&selected=' + row, function() { }, function() { });
}
});
}
}

function resolveColorOptions(v, style) {
if (typeof v === "object" && v !== null) {
if (Array.isArray(v)) {
return v.map(e => resolveColorOptions(e, style));
} else {
var opts = {};
for (var k in v) {
opts[k] = resolveColorOptions(v[k], style);
}
return opts;
}
} else if (typeof v === "string" && v.startsWith("$(") && v.endsWith(")")) {
var prop = style.getPropertyValue(v.substring(2, v.length - 1));
return prop ? rgb2hex(prop) : v;
} else {
return v;
}
}
function rgb2hex(rgb) {
var match = rgb.match(/^rgb\((\d+\.?\d*),\s*(\d+\.?\d*),\s*(\d+\.?\d*)\)$/);
function hex(x) {
return ("0" + Math.round(parseFloat(x)).toString(16)).slice(-2);
}
return match ? "#" + hex(match[1]) + hex(match[2]) + hex(match[3]) : rgb;
}
