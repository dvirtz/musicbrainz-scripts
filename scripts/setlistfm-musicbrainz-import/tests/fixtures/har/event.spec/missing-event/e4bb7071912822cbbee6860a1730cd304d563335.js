
+function ($) {
'use strict';

 

var backdrop = '.dropdown-backdrop'
var toggle = '[data-toggle="dropdown"]'
var Dropdown = function (element) {
$(element).on('click.bs.dropdown', this.toggle)
}
Dropdown.VERSION = '3.4.1'
function getParent($this) {
var selector = $this.attr('data-target')
if (!selector) {
selector = $this.attr('href')
selector = selector && /#[A-Za-z]/.test(selector) && selector.replace(/.*(?=#[^\s]*$)/, '') 
 }
var $parent = selector !== '#' ? $(document).find(selector) : null
return $parent && $parent.length ? $parent : $this.parent()
}
function clearMenus(e) {
if (e && e.which === 3) return
$(backdrop).remove()
$(toggle).each(function () {
var $this = $(this)
var $parent = getParent($this)
var relatedTarget = { relatedTarget: this }
if (!$parent.hasClass('open')) return
if (e && e.type == 'click' && /input|textarea/i.test(e.target.tagName) && $.contains($parent[0], e.target)) return
$parent.trigger(e = $.Event('hide.bs.dropdown', relatedTarget))
if (e.isDefaultPrevented()) return
$this.attr('aria-expanded', 'false')
$parent.removeClass('open').trigger($.Event('hidden.bs.dropdown', relatedTarget))
})
}
Dropdown.prototype.toggle = function (e) {
var $this = $(this)
if ($this.is('.disabled, :disabled')) return
var $parent = getParent($this)
var isActive = $parent.hasClass('open')
clearMenus()
if (!isActive) {
if ('ontouchstart' in document.documentElement && !$parent.closest('.navbar-nav').length) {

 $(document.createElement('div'))
.addClass('dropdown-backdrop')
.insertAfter($(this))
.on('click', clearMenus)
}
var relatedTarget = { relatedTarget: this }
$parent.trigger(e = $.Event('show.bs.dropdown', relatedTarget))
if (e.isDefaultPrevented()) return
$this
.trigger('focus')
.attr('aria-expanded', 'true')
$parent
.toggleClass('open')
.trigger($.Event('shown.bs.dropdown', relatedTarget))
}
return false
}
Dropdown.prototype.keydown = function (e) {
if (!/(38|40|27|32)/.test(e.which) || /input|textarea/i.test(e.target.tagName)) return
var $this = $(this)
e.preventDefault()
e.stopPropagation()
if ($this.is('.disabled, :disabled')) return
var $parent = getParent($this)
var isActive = $parent.hasClass('open')
if (!isActive && e.which != 27 || isActive && e.which == 27) {
if (e.which == 27) $parent.find(toggle).trigger('focus')
return $this.trigger('click')
}
var desc = ' li:not(.disabled):visible a'
var $items = $parent.find('.dropdown-menu' + desc)
if (!$items.length) return
var index = $items.index(e.target)
if (e.which == 38 && index > 0) index-- 
 if (e.which == 40 && index < $items.length - 1) index++ 
 if (!~index) index = 0
$items.eq(index).trigger('focus')
}

 

function Plugin(option) {
return this.each(function () {
var $this = $(this)
var data = $this.data('bs.dropdown')
if (!data) $this.data('bs.dropdown', (data = new Dropdown(this)))
if (typeof option == 'string') data[option].call($this)
})
}
var old = $.fn.dropdown
$.fn.dropdown = Plugin
$.fn.dropdown.Constructor = Dropdown

 

$.fn.dropdown.noConflict = function () {
$.fn.dropdown = old
return this
}

 

$(document)
.on('click.bs.dropdown.data-api', clearMenus)
.on('click.bs.dropdown.data-api', '.dropdown form', function (e) { e.stopPropagation() })
.on('click.bs.dropdown.data-api', toggle, Dropdown.prototype.toggle)
.on('keydown.bs.dropdown.data-api', toggle, Dropdown.prototype.keydown)
.on('keydown.bs.dropdown.data-api', '.dropdown-menu', Dropdown.prototype.keydown)
}(jQuery);

+function ($) {
'use strict';

 

var Modal = function (element, options) {
this.options = options
this.$body = $(document.body)
this.$element = $(element)
this.$dialog = this.$element.find('.modal-dialog')
this.$backdrop = null
this.isShown = null
this.originalBodyPad = null
this.scrollbarWidth = 0
this.ignoreBackdropClick = false
this.fixedContent = '.navbar-fixed-top, .navbar-fixed-bottom'
if (this.options.remote) {
this.$element
.find('.modal-content')
.load(this.options.remote, $.proxy(function () {
this.$element.trigger('loaded.bs.modal')
}, this))
}
}
Modal.VERSION = '3.4.1'
Modal.TRANSITION_DURATION = 300
Modal.BACKDROP_TRANSITION_DURATION = 150
Modal.DEFAULTS = {
backdrop: true,
keyboard: true,
show: true
}
Modal.prototype.toggle = function (_relatedTarget) {
return this.isShown ? this.hide() : this.show(_relatedTarget)
}
Modal.prototype.show = function (_relatedTarget) {
var that = this
var e = $.Event('show.bs.modal', { relatedTarget: _relatedTarget })
this.$element.trigger(e)
if (this.isShown || e.isDefaultPrevented()) return
this.isShown = true
this.checkScrollbar()
this.setScrollbar()
this.$body.addClass('modal-open')
this.escape()
this.resize()
this.$element.on('click.dismiss.bs.modal', '[data-dismiss="modal"]', $.proxy(this.hide, this))
this.$dialog.on('mousedown.dismiss.bs.modal', function () {
that.$element.one('mouseup.dismiss.bs.modal', function (e) {
if ($(e.target).is(that.$element)) that.ignoreBackdropClick = true
})
})
this.backdrop(function () {
var transition = $.support.transition && that.$element.hasClass('fade')
if (!that.$element.parent().length) {
that.$element.appendTo(that.$body) 
 }
that.$element
.show()
.scrollTop(0)
that.adjustDialog()
if (transition) {
that.$element[0].offsetWidth 
 }
that.$element.addClass('in')
that.enforceFocus()
var e = $.Event('shown.bs.modal', { relatedTarget: _relatedTarget })
transition ?
that.$dialog 
 .one('bsTransitionEnd', function () {
that.$element.trigger('focus').trigger(e)
})
.emulateTransitionEnd(Modal.TRANSITION_DURATION) :
that.$element.trigger('focus').trigger(e)
})
}
Modal.prototype.hide = function (e) {
if (e) e.preventDefault()
e = $.Event('hide.bs.modal')
this.$element.trigger(e)
if (!this.isShown || e.isDefaultPrevented()) return
this.isShown = false
this.escape()
this.resize()
$(document).off('focusin.bs.modal')
this.$element
.removeClass('in')
.off('click.dismiss.bs.modal')
.off('mouseup.dismiss.bs.modal')
this.$dialog.off('mousedown.dismiss.bs.modal')
$.support.transition && this.$element.hasClass('fade') ?
this.$element
.one('bsTransitionEnd', $.proxy(this.hideModal, this))
.emulateTransitionEnd(Modal.TRANSITION_DURATION) :
this.hideModal()
}
Modal.prototype.enforceFocus = function () {
$(document)
.off('focusin.bs.modal') 
 .on('focusin.bs.modal', $.proxy(function (e) {
if (document !== e.target &&
this.$element[0] !== e.target &&
!this.$element.has(e.target).length) {
this.$element.trigger('focus')
}
}, this))
}
Modal.prototype.escape = function () {
if (this.isShown && this.options.keyboard) {
this.$element.on('keydown.dismiss.bs.modal', $.proxy(function (e) {
e.which == 27 && this.hide()
}, this))
} else if (!this.isShown) {
this.$element.off('keydown.dismiss.bs.modal')
}
}
Modal.prototype.resize = function () {
if (this.isShown) {
$(window).on('resize.bs.modal', $.proxy(this.handleUpdate, this))
} else {
$(window).off('resize.bs.modal')
}
}
Modal.prototype.hideModal = function () {
var that = this
this.$element.hide()
this.backdrop(function () {
that.$body.removeClass('modal-open')
that.resetAdjustments()
that.resetScrollbar()
that.$element.trigger('hidden.bs.modal')
})
}
Modal.prototype.removeBackdrop = function () {
this.$backdrop && this.$backdrop.remove()
this.$backdrop = null
}
Modal.prototype.backdrop = function (callback) {
var that = this
var animate = this.$element.hasClass('fade') ? 'fade' : ''
if (this.isShown && this.options.backdrop) {
var doAnimate = $.support.transition && animate
this.$backdrop = $(document.createElement('div'))
.addClass('modal-backdrop ' + animate)
.appendTo(this.$body)
this.$element.on('click.dismiss.bs.modal', $.proxy(function (e) {
if (this.ignoreBackdropClick) {
this.ignoreBackdropClick = false
return
}
if (e.target !== e.currentTarget) return
this.options.backdrop == 'static'
? this.$element[0].focus()
: this.hide()
}, this))
if (doAnimate) this.$backdrop[0].offsetWidth 

this.$backdrop.addClass('in')
if (!callback) return
doAnimate ?
this.$backdrop
.one('bsTransitionEnd', callback)
.emulateTransitionEnd(Modal.BACKDROP_TRANSITION_DURATION) :
callback()
} else if (!this.isShown && this.$backdrop) {
this.$backdrop.removeClass('in')
var callbackRemove = function () {
that.removeBackdrop()
callback && callback()
}
$.support.transition && this.$element.hasClass('fade') ?
this.$backdrop
.one('bsTransitionEnd', callbackRemove)
.emulateTransitionEnd(Modal.BACKDROP_TRANSITION_DURATION) :
callbackRemove()
} else if (callback) {
callback()
}
}


Modal.prototype.handleUpdate = function () {
this.adjustDialog()
}
Modal.prototype.adjustDialog = function () {
var modalIsOverflowing = this.$element[0].scrollHeight > document.documentElement.clientHeight
this.$element.css({
paddingLeft: !this.bodyIsOverflowing && modalIsOverflowing ? this.scrollbarWidth : '',
paddingRight: this.bodyIsOverflowing && !modalIsOverflowing ? this.scrollbarWidth : ''
})
}
Modal.prototype.resetAdjustments = function () {
this.$element.css({
paddingLeft: '',
paddingRight: ''
})
}
Modal.prototype.checkScrollbar = function () {
var fullWindowWidth = window.innerWidth
if (!fullWindowWidth) { 
 var documentElementRect = document.documentElement.getBoundingClientRect()
fullWindowWidth = documentElementRect.right - Math.abs(documentElementRect.left)
}
this.bodyIsOverflowing = document.body.clientWidth < fullWindowWidth
this.scrollbarWidth = this.measureScrollbar()
}
Modal.prototype.setScrollbar = function () {
var bodyPad = parseInt((this.$body.css('padding-right') || 0), 10)
this.originalBodyPad = document.body.style.paddingRight || ''
var scrollbarWidth = this.scrollbarWidth
if (this.bodyIsOverflowing) {
this.$body.css('padding-right', bodyPad + scrollbarWidth)
$(this.fixedContent).each(function (index, element) {
var actualPadding = element.style.paddingRight
var calculatedPadding = $(element).css('padding-right')
$(element)
.data('padding-right', actualPadding)
.css('padding-right', parseFloat(calculatedPadding) + scrollbarWidth + 'px')
})
}
}
Modal.prototype.resetScrollbar = function () {
this.$body.css('padding-right', this.originalBodyPad)
$(this.fixedContent).each(function (index, element) {
var padding = $(element).data('padding-right')
$(element).removeData('padding-right')
element.style.paddingRight = padding ? padding : ''
})
}
Modal.prototype.measureScrollbar = function () { 
 var scrollDiv = document.createElement('div')
scrollDiv.className = 'modal-scrollbar-measure'
this.$body.append(scrollDiv)
var scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth
this.$body[0].removeChild(scrollDiv)
return scrollbarWidth
}

 

function Plugin(option, _relatedTarget) {
return this.each(function () {
var $this = $(this)
var data = $this.data('bs.modal')
var options = $.extend({}, Modal.DEFAULTS, $this.data(), typeof option == 'object' && option)
if (!data) $this.data('bs.modal', (data = new Modal(this, options)))
if (typeof option == 'string') data[option](_relatedTarget)
else if (options.show) data.show(_relatedTarget)
})
}
var old = $.fn.modal
$.fn.modal = Plugin
$.fn.modal.Constructor = Modal

 

$.fn.modal.noConflict = function () {
$.fn.modal = old
return this
}

 

$(document).on('click.bs.modal.data-api', '[data-toggle="modal"]', function (e) {
var $this = $(this)
var href = $this.attr('href')
var target = $this.attr('data-target') ||
(href && href.replace(/.*(?=#[^\s]+$)/, '')) 

var $target = $(document).find(target)
var option = $target.data('bs.modal') ? 'toggle' : $.extend({ remote: !/#/.test(href) && href }, $target.data(), $this.data())
if ($this.is('a')) e.preventDefault()
$target.one('show.bs.modal', function (showEvent) {
if (showEvent.isDefaultPrevented()) return 
 $target.one('hidden.bs.modal', function () {
$this.is(':visible') && $this.trigger('focus')
})
})
Plugin.call($target, option, this)
})
}(jQuery);

+function ($) {
'use strict';
var DISALLOWED_ATTRIBUTES = ['sanitize', 'whiteList', 'sanitizeFn']
var uriAttrs = [
'background',
'cite',
'href',
'itemtype',
'longdesc',
'poster',
'src',
'xlink:href'
]
var ARIA_ATTRIBUTE_PATTERN = /^aria-[\w-]*$/i
var DefaultWhitelist = {

 '*': ['class', 'dir', 'id', 'lang', 'role', ARIA_ATTRIBUTE_PATTERN],
a: ['target', 'href', 'title', 'rel'],
area: [],
b: [],
br: [],
col: [],
code: [],
div: [],
em: [],
hr: [],
h1: [],
h2: [],
h3: [],
h4: [],
h5: [],
h6: [],
i: [],
img: ['src', 'alt', 'title', 'width', 'height'],
li: [],
ol: [],
p: [],
pre: [],
s: [],
small: [],
span: [],
sub: [],
sup: [],
strong: [],
u: [],
ul: []
}

var SAFE_URL_PATTERN = /^(?:(?:https?|mailto|ftp|tel|file):|[^&:/?#]*(?:[/?#]|$))/gi

var DATA_URL_PATTERN = /^data:(?:image\/(?:bmp|gif|jpeg|jpg|png|tiff|webp)|video\/(?:mpeg|mp4|ogg|webm)|audio\/(?:mp3|oga|ogg|opus));base64,[a-z0-9+/]+=*$/i
function allowedAttribute(attr, allowedAttributeList) {
var attrName = attr.nodeName.toLowerCase()
if ($.inArray(attrName, allowedAttributeList) !== -1) {
if ($.inArray(attrName, uriAttrs) !== -1) {
return Boolean(attr.nodeValue.match(SAFE_URL_PATTERN) || attr.nodeValue.match(DATA_URL_PATTERN))
}
return true
}
var regExp = $(allowedAttributeList).filter(function (index, value) {
return value instanceof RegExp
})

 for (var i = 0, l = regExp.length; i < l; i++) {
if (attrName.match(regExp[i])) {
return true
}
}
return false
}
function sanitizeHtml(unsafeHtml, whiteList, sanitizeFn) {
if (unsafeHtml.length === 0) {
return unsafeHtml
}
if (sanitizeFn && typeof sanitizeFn === 'function') {
return sanitizeFn(unsafeHtml)
}

 if (!document.implementation || !document.implementation.createHTMLDocument) {
return unsafeHtml
}
var createdDocument = document.implementation.createHTMLDocument('sanitization')
createdDocument.body.innerHTML = unsafeHtml
var whitelistKeys = $.map(whiteList, function (el, i) { return i })
var elements = $(createdDocument.body).find('*')
for (var i = 0, len = elements.length; i < len; i++) {
var el = elements[i]
var elName = el.nodeName.toLowerCase()
if ($.inArray(elName, whitelistKeys) === -1) {
el.parentNode.removeChild(el)
continue
}
var attributeList = $.map(el.attributes, function (el) { return el })
var whitelistedAttributes = [].concat(whiteList['*'] || [], whiteList[elName] || [])
for (var j = 0, len2 = attributeList.length; j < len2; j++) {
if (!allowedAttribute(attributeList[j], whitelistedAttributes)) {
el.removeAttribute(attributeList[j].nodeName)
}
}
}
return createdDocument.body.innerHTML
}

 

var Tooltip = function (element, options) {
this.type = null
this.options = null
this.enabled = null
this.timeout = null
this.hoverState = null
this.$element = null
this.inState = null
this.init('tooltip', element, options)
}
Tooltip.VERSION = '3.4.1'
Tooltip.TRANSITION_DURATION = 150
Tooltip.DEFAULTS = {
animation: true,
placement: 'top',
selector: false,
template: '<div class="tooltip" role="tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>',
trigger: 'hover focus',
title: '',
delay: 0,
html: false,
container: false,
viewport: {
selector: 'body',
padding: 0
},
sanitize : true,
sanitizeFn : null,
whiteList : DefaultWhitelist
}
Tooltip.prototype.init = function (type, element, options) {
this.enabled = true
this.type = type
this.$element = $(element)
this.options = this.getOptions(options)
this.$viewport = this.options.viewport && $(document).find($.isFunction(this.options.viewport) ? this.options.viewport.call(this, this.$element) : (this.options.viewport.selector || this.options.viewport))
this.inState = { click: false, hover: false, focus: false }
if (this.$element[0] instanceof document.constructor && !this.options.selector) {
throw new Error('`selector` option must be specified when initializing ' + this.type + ' on the window.document object!')
}
var triggers = this.options.trigger.split(' ')
for (var i = triggers.length; i--;) {
var trigger = triggers[i]
if (trigger == 'click') {
this.$element.on('click.' + this.type, this.options.selector, $.proxy(this.toggle, this))
} else if (trigger != 'manual') {
var eventIn = trigger == 'hover' ? 'mouseenter' : 'focusin'
var eventOut = trigger == 'hover' ? 'mouseleave' : 'focusout'
this.$element.on(eventIn + '.' + this.type, this.options.selector, $.proxy(this.enter, this))
this.$element.on(eventOut + '.' + this.type, this.options.selector, $.proxy(this.leave, this))
}
}
this.options.selector ?
(this._options = $.extend({}, this.options, { trigger: 'manual', selector: '' })) :
this.fixTitle()
}
Tooltip.prototype.getDefaults = function () {
return Tooltip.DEFAULTS
}
Tooltip.prototype.getOptions = function (options) {
var dataAttributes = this.$element.data()
for (var dataAttr in dataAttributes) {
if (dataAttributes.hasOwnProperty(dataAttr) && $.inArray(dataAttr, DISALLOWED_ATTRIBUTES) !== -1) {
delete dataAttributes[dataAttr]
}
}
options = $.extend({}, this.getDefaults(), dataAttributes, options)
if (options.delay && typeof options.delay == 'number') {
options.delay = {
show: options.delay,
hide: options.delay
}
}
if (options.sanitize) {
options.template = sanitizeHtml(options.template, options.whiteList, options.sanitizeFn)
}
return options
}
Tooltip.prototype.getDelegateOptions = function () {
var options = {}
var defaults = this.getDefaults()
this._options && $.each(this._options, function (key, value) {
if (defaults[key] != value) options[key] = value
})
return options
}
Tooltip.prototype.enter = function (obj) {
var self = obj instanceof this.constructor ?
obj : $(obj.currentTarget).data('bs.' + this.type)
if (!self) {
self = new this.constructor(obj.currentTarget, this.getDelegateOptions())
$(obj.currentTarget).data('bs.' + this.type, self)
}
if (obj instanceof $.Event) {
self.inState[obj.type == 'focusin' ? 'focus' : 'hover'] = true
}
if (self.tip().hasClass('in') || self.hoverState == 'in') {
self.hoverState = 'in'
return
}
clearTimeout(self.timeout)
self.hoverState = 'in'
if (!self.options.delay || !self.options.delay.show) return self.show()
self.timeout = setTimeout(function () {
if (self.hoverState == 'in') self.show()
}, self.options.delay.show)
}
Tooltip.prototype.isInStateTrue = function () {
for (var key in this.inState) {
if (this.inState[key]) return true
}
return false
}
Tooltip.prototype.leave = function (obj) {
var self = obj instanceof this.constructor ?
obj : $(obj.currentTarget).data('bs.' + this.type)
if (!self) {
self = new this.constructor(obj.currentTarget, this.getDelegateOptions())
$(obj.currentTarget).data('bs.' + this.type, self)
}
if (obj instanceof $.Event) {
self.inState[obj.type == 'focusout' ? 'focus' : 'hover'] = false
}
if (self.isInStateTrue()) return
clearTimeout(self.timeout)
self.hoverState = 'out'
if (!self.options.delay || !self.options.delay.hide) return self.hide()
self.timeout = setTimeout(function () {
if (self.hoverState == 'out') self.hide()
}, self.options.delay.hide)
}
Tooltip.prototype.show = function () {
var e = $.Event('show.bs.' + this.type)
if (this.hasContent() && this.enabled) {
this.$element.trigger(e)
var inDom = $.contains(this.$element[0].ownerDocument.documentElement, this.$element[0])
if (e.isDefaultPrevented() || !inDom) return
var that = this
var $tip = this.tip()
var tipId = this.getUID(this.type)
this.setContent()
$tip.attr('id', tipId)
this.$element.attr('aria-describedby', tipId)
if (this.options.animation) $tip.addClass('fade')
var placement = typeof this.options.placement == 'function' ?
this.options.placement.call(this, $tip[0], this.$element[0]) :
this.options.placement
var autoToken = /\s?auto?\s?/i
var autoPlace = autoToken.test(placement)
if (autoPlace) placement = placement.replace(autoToken, '') || 'top'
$tip
.detach()
.css({ top: 0, left: 0, display: 'block' })
.addClass(placement)
.data('bs.' + this.type, this)
this.options.container ? $tip.appendTo($(document).find(this.options.container)) : $tip.insertAfter(this.$element)
this.$element.trigger('inserted.bs.' + this.type)
var pos = this.getPosition()
var actualWidth = $tip[0].offsetWidth
var actualHeight = $tip[0].offsetHeight
if (autoPlace) {
var orgPlacement = placement
var viewportDim = this.getPosition(this.$viewport)
placement = placement == 'bottom' && pos.bottom + actualHeight > viewportDim.bottom ? 'top' :
placement == 'top' && pos.top - actualHeight < viewportDim.top ? 'bottom' :
placement == 'right' && pos.right + actualWidth > viewportDim.width ? 'left' :
placement == 'left' && pos.left - actualWidth < viewportDim.left ? 'right' :
placement
$tip
.removeClass(orgPlacement)
.addClass(placement)
}
var calculatedOffset = this.getCalculatedOffset(placement, pos, actualWidth, actualHeight)
this.applyPlacement(calculatedOffset, placement)
var complete = function () {
var prevHoverState = that.hoverState
that.$element.trigger('shown.bs.' + that.type)
that.hoverState = null
if (prevHoverState == 'out') that.leave(that)
}
$.support.transition && this.$tip.hasClass('fade') ?
$tip
.one('bsTransitionEnd', complete)
.emulateTransitionEnd(Tooltip.TRANSITION_DURATION) :
complete()
}
}
Tooltip.prototype.applyPlacement = function (offset, placement) {
var $tip = this.tip()
var width = $tip[0].offsetWidth
var height = $tip[0].offsetHeight

 var marginTop = parseInt($tip.css('margin-top'), 10)
var marginLeft = parseInt($tip.css('margin-left'), 10)

 if (isNaN(marginTop)) marginTop = 0
if (isNaN(marginLeft)) marginLeft = 0
offset.top += marginTop
offset.left += marginLeft

 
 $.offset.setOffset($tip[0], $.extend({
using: function (props) {
$tip.css({
top: Math.round(props.top),
left: Math.round(props.left)
})
}
}, offset), 0)
$tip.addClass('in')

 var actualWidth = $tip[0].offsetWidth
var actualHeight = $tip[0].offsetHeight
if (placement == 'top' && actualHeight != height) {
offset.top = offset.top + height - actualHeight
}
var delta = this.getViewportAdjustedDelta(placement, offset, actualWidth, actualHeight)
if (delta.left) offset.left += delta.left
else offset.top += delta.top
var isVertical = /top|bottom/.test(placement)
var arrowDelta = isVertical ? delta.left * 2 - width + actualWidth : delta.top * 2 - height + actualHeight
var arrowOffsetPosition = isVertical ? 'offsetWidth' : 'offsetHeight'
$tip.offset(offset)
this.replaceArrow(arrowDelta, $tip[0][arrowOffsetPosition], isVertical)
}
Tooltip.prototype.replaceArrow = function (delta, dimension, isVertical) {
this.arrow()
.css(isVertical ? 'left' : 'top', 50 * (1 - delta / dimension) + '%')
.css(isVertical ? 'top' : 'left', '')
}
Tooltip.prototype.setContent = function () {
var $tip = this.tip()
var title = this.getTitle()
if (this.options.html) {
if (this.options.sanitize) {
title = sanitizeHtml(title, this.options.whiteList, this.options.sanitizeFn)
}
$tip.find('.tooltip-inner').html(title)
} else {
$tip.find('.tooltip-inner').text(title)
}
$tip.removeClass('fade in top bottom left right')
}
Tooltip.prototype.hide = function (callback) {
var that = this
var $tip = $(this.$tip)
var e = $.Event('hide.bs.' + this.type)
function complete() {
if (that.hoverState != 'in') $tip.detach()
if (that.$element) { 
 that.$element
.removeAttr('aria-describedby')
.trigger('hidden.bs.' + that.type)
}
callback && callback()
}
this.$element.trigger(e)
if (e.isDefaultPrevented()) return
$tip.removeClass('in')
$.support.transition && $tip.hasClass('fade') ?
$tip
.one('bsTransitionEnd', complete)
.emulateTransitionEnd(Tooltip.TRANSITION_DURATION) :
complete()
this.hoverState = null
return this
}
Tooltip.prototype.fixTitle = function () {
var $e = this.$element
if ($e.attr('title') || typeof $e.attr('data-original-title') != 'string') {
$e.attr('data-original-title', $e.attr('title') || '').attr('title', '')
}
}
Tooltip.prototype.hasContent = function () {
return this.getTitle()
}
Tooltip.prototype.getPosition = function ($element) {
$element = $element || this.$element
var el = $element[0]
var isBody = el.tagName == 'BODY'
var elRect = el.getBoundingClientRect()
if (elRect.width == null) {

 elRect = $.extend({}, elRect, { width: elRect.right - elRect.left, height: elRect.bottom - elRect.top })
}
var isSvg = window.SVGElement && el instanceof window.SVGElement

 
 var elOffset = isBody ? { top: 0, left: 0 } : (isSvg ? null : $element.offset())
var scroll = { scroll: isBody ? document.documentElement.scrollTop || document.body.scrollTop : $element.scrollTop() }
var outerDims = isBody ? { width: $(window).width(), height: $(window).height() } : null
return $.extend({}, elRect, scroll, outerDims, elOffset)
}
Tooltip.prototype.getCalculatedOffset = function (placement, pos, actualWidth, actualHeight) {
return placement == 'bottom' ? { top: pos.top + pos.height, left: pos.left + pos.width / 2 - actualWidth / 2 } :
placement == 'top' ? { top: pos.top - actualHeight, left: pos.left + pos.width / 2 - actualWidth / 2 } :
placement == 'left' ? { top: pos.top + pos.height / 2 - actualHeight / 2, left: pos.left - actualWidth } :
 { top: pos.top + pos.height / 2 - actualHeight / 2, left: pos.left + pos.width }
}
Tooltip.prototype.getViewportAdjustedDelta = function (placement, pos, actualWidth, actualHeight) {
var delta = { top: 0, left: 0 }
if (!this.$viewport) return delta
var viewportPadding = this.options.viewport && this.options.viewport.padding || 0
var viewportDimensions = this.getPosition(this.$viewport)
if (/right|left/.test(placement)) {
var topEdgeOffset = pos.top - viewportPadding - viewportDimensions.scroll
var bottomEdgeOffset = pos.top + viewportPadding - viewportDimensions.scroll + actualHeight
if (topEdgeOffset < viewportDimensions.top) { 
 delta.top = viewportDimensions.top - topEdgeOffset
} else if (bottomEdgeOffset > viewportDimensions.top + viewportDimensions.height) { 
 delta.top = viewportDimensions.top + viewportDimensions.height - bottomEdgeOffset
}
} else {
var leftEdgeOffset = pos.left - viewportPadding
var rightEdgeOffset = pos.left + viewportPadding + actualWidth
if (leftEdgeOffset < viewportDimensions.left) { 
 delta.left = viewportDimensions.left - leftEdgeOffset
} else if (rightEdgeOffset > viewportDimensions.right) { 
 delta.left = viewportDimensions.left + viewportDimensions.width - rightEdgeOffset
}
}
return delta
}
Tooltip.prototype.getTitle = function () {
var title
var $e = this.$element
var o = this.options
title = $e.attr('data-original-title')
|| (typeof o.title == 'function' ? o.title.call($e[0]) : o.title)
return title
}
Tooltip.prototype.getUID = function (prefix) {
do prefix += ~~(Math.random() * 1000000)
while (document.getElementById(prefix))
return prefix
}
Tooltip.prototype.tip = function () {
if (!this.$tip) {
this.$tip = $(this.options.template)
if (this.$tip.length != 1) {
throw new Error(this.type + ' `template` option must consist of exactly 1 top-level element!')
}
}
return this.$tip
}
Tooltip.prototype.arrow = function () {
return (this.$arrow = this.$arrow || this.tip().find('.tooltip-arrow'))
}
Tooltip.prototype.enable = function () {
this.enabled = true
}
Tooltip.prototype.disable = function () {
this.enabled = false
}
Tooltip.prototype.toggleEnabled = function () {
this.enabled = !this.enabled
}
Tooltip.prototype.toggle = function (e) {
var self = this
if (e) {
self = $(e.currentTarget).data('bs.' + this.type)
if (!self) {
self = new this.constructor(e.currentTarget, this.getDelegateOptions())
$(e.currentTarget).data('bs.' + this.type, self)
}
}
if (e) {
self.inState.click = !self.inState.click
if (self.isInStateTrue()) self.enter(self)
else self.leave(self)
} else {
self.tip().hasClass('in') ? self.leave(self) : self.enter(self)
}
}
Tooltip.prototype.destroy = function () {
var that = this
clearTimeout(this.timeout)
this.hide(function () {
that.$element.off('.' + that.type).removeData('bs.' + that.type)
if (that.$tip) {
that.$tip.detach()
}
that.$tip = null
that.$arrow = null
that.$viewport = null
that.$element = null
})
}
Tooltip.prototype.sanitizeHtml = function (unsafeHtml) {
return sanitizeHtml(unsafeHtml, this.options.whiteList, this.options.sanitizeFn)
}

 

function Plugin(option) {
return this.each(function () {
var $this = $(this)
var data = $this.data('bs.tooltip')
var options = typeof option == 'object' && option
if (!data && /destroy|hide/.test(option)) return
if (!data) $this.data('bs.tooltip', (data = new Tooltip(this, options)))
if (typeof option == 'string') data[option]()
})
}
var old = $.fn.tooltip
$.fn.tooltip = Plugin
$.fn.tooltip.Constructor = Tooltip

 

$.fn.tooltip.noConflict = function () {
$.fn.tooltip = old
return this
}
}(jQuery);

+function ($) {
'use strict';

 

function transitionEnd() {
var el = document.createElement('bootstrap')
var transEndEventNames = {
WebkitTransition : 'webkitTransitionEnd',
MozTransition : 'transitionend',
OTransition : 'oTransitionEnd otransitionend',
transition : 'transitionend'
}
for (var name in transEndEventNames) {
if (el.style[name] !== undefined) {
return { end: transEndEventNames[name] }
}
}
return false 
 }

 $.fn.emulateTransitionEnd = function (duration) {
var called = false
var $el = this
$(this).one('bsTransitionEnd', function () { called = true })
var callback = function () { if (!called) $($el).trigger($.support.transition.end) }
setTimeout(callback, duration)
return this
}
$(function () {
$.support.transition = transitionEnd()
if (!$.support.transition) return
$.event.special.bsTransitionEnd = {
bindType: $.support.transition.end,
delegateType: $.support.transition.end,
handle: function (e) {
if ($(e.target).is(this)) return e.handleObj.handler.apply(this, arguments)
}
}
})
}(jQuery);
function sharePopup(target, callback, width = 800, height = 600) {
var popup=util.popup({url: target, width: width, height: height});
if (typeof callback === 'function') {

 var timer = setInterval(function() {
if (popup.closed) {
callback();
clearInterval(timer);
}
}, 500);
}
}
$(document).ready(function() {
$('.shareLink').click(function(e) {
e.preventDefault();
sharePopup($(this).attr('href'));
});
});

function showMobileNavigation() {
$('.body').addClass('mobile-navigation');
}
function hideMobileNavigation() {
$('.body').removeClass('mobile-navigation');
}
$(document).ready(function() {
$(".showMenu").click(function(e) {
showMobileNavigation();
e.preventDefault();
e.target.blur();
});
$(".hideMenu").click(function(e) {
hideMobileNavigation();
e.preventDefault();
e.target.blur();
});
}).keyup(function(e){

	if(e.keyCode === 27) {
hideMobileNavigation();
}
});

(function($) {
var locationCallbackUrl = null;
var _position = null;
function success(position, ajax) {
_position = position;
if (ajax) {
doAjaxCall(position);
}
}
function doAjaxCall(position) {
var wcall = wicketAjaxGet(locationCallbackUrl + '&long=' + position.coords.longitude + "&lat=" + position.coords.latitude, function() { }, function() { });
}
function error(msg) {
var wcall = wicketAjaxGet(locationCallbackUrl, function() { }, function() { });
}
$.userLocation = {};
$.userLocation.setLocationCallback = function(callb, options) {
locationCallbackUrl = callb;
getLocation(options);
}
$.userLocation.getPosition = function() {
return _position;
}
function getLocation(options) {
if (navigator.geolocation) {
var cookieOptions = options['cookieOptions'];
var cookieVal = null;
if (cookieOptions != null && cookieOptions.name != null) {
cookieVal = $.cookie(cookieOptions.name);
if (cookieVal == 'denied') {

 return false;
}
}
var ajax = options['ajaxCallEnabled'];
var conf = true;

 if (cookieVal != 'accepted' && options != null && options['customMessage'] != null) {
conf = confirm(options['customMessage']);
}
if (conf) {
navigator.geolocation.getCurrentPosition(function(position) {
setCookie(cookieOptions, 'accepted');
success(position, ajax);
}, error, { timeout: 10000 });
} else {
setCookie(cookieOptions, 'denied');
}
} else {
error('not supported');
}
}
function setCookie(cookieOptions, val) {
if (cookieOptions) {
if (cookieOptions.expires == null) {
$.cookie(cookieOptions.name, val);
} else {
$.cookie(cookieOptions.name, val, { expires: cookieOptions.expires });
}
}
}
})(jQuery);
$.VideoPlayerOutOfViewport = function() {}
$.VideoPlayerOutOfViewport.toggle = function() { 
var embed = $('.videoContainer').filter(':visible');
if (embed) {

 var cont = embed.closest('.videoPlayer');
return function() {
if (cont.visible(true)) {
cont.removeClass("playerOutOfViewport");
cont.css("height", "");
} else {
if (!cont.hasClass("playerOutOfViewport")) {

 
 cont.css("height", (cont.outerHeight() + 20));
cont.addClass("playerOutOfViewport");
}
}
};
} else {
return null;
}
};

var toggleViewportClass = null;

$.VideoPlayerOutOfViewport.on = function() {
toggleViewportClass = $.VideoPlayerOutOfViewport.toggle();
if (toggleViewportClass != null) {

 toggleViewportClass();
$(window).on('scroll', toggleViewportClass).on('touchmove', toggleViewportClass).resize(toggleViewportClass);
}
}

$.VideoPlayerOutOfViewport.off = function() {
if (toggleViewportClass != null) {
var cont = $('.videoPlayer').filter(':visible');
if (cont) {
cont.removeClass("playerOutOfViewport");
var video = cont.find('video');
if (video != null) {
video.prop('muted', true);
}
$(window).off('scroll', toggleViewportClass).off('touchmove', toggleViewportClass).off('resize', toggleViewportClass);
}
}
}

$(function() {
$('.closeVideo').on('click', function() {$.VideoPlayerOutOfViewport.off();return false;})
});
function initAnchors(selector, cssClass) {
selector.click(function() {
highlightAnchor($(this).attr('href'), cssClass);
});
var hsh = window.location.hash;
if (hsh != "") {
highlightAnchor(hsh, cssClass);
}
}
function highlightAnchor(anchor, cssClass) {
$(anchor).addClass(cssClass, 600, null, setTimeout(function() {
$(anchor).removeClass(cssClass, 2000);
}, 3000));
}
$(document).ready(function (e) {
$('li.setlistParts').click(function(e){
var part = $(this).closest(".main").position().left;
if((e.pageX - part) < 50) {
var tooltip = $(this).children(".songTooltip");
if (tooltip != null) {
tooltip.toggle();
}
}
});
});

function writeDayOfWeek(choiceId, markupId, dayArr) {
var dayText = $('#' + choiceId + ' select.day option:selected').text();

	var monthText = $('#' + choiceId + ' select.month option:selected').val();
var yearText = $('#' + choiceId + ' select.year option:selected').text();

	if (yearText === '') {
yearText = $('#' + choiceId + ' input.dateYear').val();
}
if (dayText != '' && monthText != '' && yearText != '') {
var day = parseInt(dayText);
var month = parseInt(monthText);
var year = parseInt(yearText);
if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {

 var backThen = new Date(year, month, day);

 $('#' + choiceId).siblings('span.shortCuts').hide();
document.getElementById(markupId).innerHTML = dayArr[backThen.getDay()];
return false;
}
}
document.getElementById(markupId).innerHTML = '';
return false;
}

function selectDay(dateObj, offsetDays, choiceId, useLocal) {
dateObj.setDate(dateObj.getDate() + offsetDays);
var day, month, year;
if (useLocal) {
day = dateObj.getDate();
month = dateObj.getMonth();
year = dateObj.getFullYear();
} else {
day = dateObj.getUTCDate();
month = dateObj.getUTCMonth();
year = dateObj.getUTCFullYear();
}
var dayEle = $('#' + choiceId).find('select.day').first();
var monthEle = $('#' + choiceId).find('select.month').first();
var yearEle = $('#' + choiceId).find('select.year').first();
if (dayEle != null && monthEle != null && yearEle != null) {
dayEle.val(day - 1);
monthEle.val(month);
yearEle.val(year);
}
return false;
}

function initObjectAutocomplete(mountpoint, comp, hiddenField, addDataCallback, indicatorId) {
$(comp).typeahead({
delay: 300,
minLength: 2,
items: 'all',
fitToElement: true,
source: function(query, process) {
var d = {
query: query
};
if (addDataCallback != null) {
var v = addDataCallback();
if (v != null) {
d = $.extend({}, d, v);
}
}
$.ajax({
url: mountpoint,
dataType: 'json',
data: d,
success: function(data) {
process(data.items);
$('#' + indicatorId).hide();
},
error: function(_xhr, _error) {
process(null);
$('#' + indicatorId).hide();
},
beforeSend: function(_xhr) {
$('#' + indicatorId).show();
}
});
},
matcher: function(_item) {

 return true;
},
sorter: function(items) {

 return items;
},
displayText: function(item) {
return typeof item !== 'undefined' && typeof item.item !== 'undefined' && typeof item.item.displayString != 'undefined' ? item.item.displayString : item;
},
highlighter: function(_text, item) {
var re = new RegExp('^' + this.term, 'i');
var content = item['item'];
var highlights = item['highlights'];
var t = content['displayString'].replace(re, '<strong>' + '$&' + '</strong>');
var span = $('<span class="name">' + t + '</span>');
if ($.isEmptyObject(highlights) === false && content['showHighlights'] === true) {
var mainHighlight = highlights[0];
span.addClass('detail');
var hlcontent = $('<span class="highlight"></span>');
hlcontent.append('<span class="highlightLabel">' + mainHighlight.label + '</span>');
$.each(mainHighlight.data, function(index, hl) {
hlcontent.append('<span>' + hl + '</span>');
if (index + 1 < mainHighlight.data.length) {
hlcontent.append(', ')
}
});
span.append(hlcontent);
} else if ($.isEmptyObject(content['description']) === false) {
span.append('<span class="description">' + content['description'] + '</span>');
}
return span;
},
afterEmptySelect: function(_item) {
hiddenField.val('');
},
afterSelect: function(item) {
hiddenField.val(item['item']['encodedId']);
}
});
}

if (typeof(YouTubeSearch) == "undefined")
YouTubeSearch = { };
YouTubeSearch.init = function() {
this.init = function(){}
youTubePlayer = document.createElement("div");
document.getElementsByTagName('body')[0].appendChild(youTubePlayer)
html = []
html.push('<div id="youTubePlayer" style="display: none">')
html.push('<div class="youTubePlayerHeader"><a class="youTubePlayerClose" href="javascript:YouTubeSearch.close()" title=""><i class="fa fa-times fa-lg"></i> <span class="sr-only"><wicket:message key="closeVideo">Close</wicket:message></span></a></div>');
if (YouTubeSearch.childHtml) {
html.push(YouTubeSearch.childHtml);
}
html.push('<div class="youTubePlayerObject" id="youTubePlayerContainer"></div>')
html.push('</div>')
youTubePlayer.innerHTML=html.join('');
}
YouTubeSearch.search = function(artist, title, results, startPlaying) {
this.init();
document.getElementById('youTubePlayer').style.display="none";
if (this.indicator) {
document.getElementById(this.indicator).style.display = "block"; 
}
var query = (title) ? encodeURIComponent(artist) + " " + encodeURIComponent(title) : encodeURIComponent(artist);
var callback = (startPlaying == true) ? this._displayPlay : this._displayWait;
var url = "https://www.googleapis.com/youtube/v3/search?part=snippet&q="+query+"&type=video&topicId=/m/04rlf&key=AIzaSyBw1XDOsa3t2gMD-WohR_EjVHSe7FaqovI";
$.ajax({
url : url,
context: this,
type: 'GET',
success : callback
})
this.currentQuery = query;
}
YouTubeSearch.play = function(videoId, startPlaying) {

 var videos = document.getElementsByTagName("video");
for(i = 0;i < videos.length; i++) {
videos[i].muted = true;
}
var id = "youTubePlayerObject";
if (!document.getElementById(id)) {
var c = document.createElement("div");
c.setAttribute("id", id);
document.getElementById("youTubePlayerContainer").appendChild(c);
}
document.getElementById('youTubePlayer').style.display="block";
this.playVideo(videoId, startPlaying);
}
YouTubeSearch.player = null;
YouTubeSearch.playVideo = function(theVideoId, startPlaying) {


 if (this.player != null) {
this.player.destroy();
}
this.player = new YT.Player( "youTubePlayerContainer", {
height: "100%",
width: "100%",
videoId: theVideoId,
host: 'https://www.youtube-nocookie.com',
playerVars: { 'autoplay' : (startPlaying ? 1 : 0), 'border':0, 'fs':1, 'showsearch':0, 'enablejsapi':1},
events: { "onStateChange": onytplayerStateChange }
});



}

function onytplayerStateChange(event) {
var newState = event.data;
switch(newState) {
case 0: if (YouTubeSearch.onVideoEnded) YouTubeSearch.onVideoEnded(); break;
case 1: if (YouTubeSearch.onVideoPlaying) YouTubeSearch.onVideoPlaying(); break;
case 2: if (YouTubeSearch.onVideoPause) YouTubeSearch.onVideoPause(); break;
case 3: if (YouTubeSearch.onVideoBuffering) YouTubeSearch.onVideoBuffering(); break;
case 5: if (YouTubeSearch.onVideoCued) YouTubeSearch.onVideoCued(); break;
}
}
YouTubeSearch._displayPlay=function(data) {
this._display(data, true);
}
YouTubeSearch._displayWait=function(data) {
this._display(data, false);
}
YouTubeSearch._display=function(data, startPlaying) {
this.entries = data.items || [];
var html = ['<ul class="videos">'];
for (var i = 0; i < this.entries.length; i++) {
var entry = this.entries[i];
var title = entry.snippet.title;
var thumbnailUrl = entry.snippet.thumbnails['default'].url;
html.push('<li><a href="javascript:YouTubeSearch.play(\'', entry.id.videoId, '\', true)" title="', title,
'"><img src="',
thumbnailUrl, '" width="130" height="97"/><span class="title"><strong>', title, '</strong></span></a></li>');
}
html.push('</ul><div class="youTubeBranding"><a href="http://www.youtube.com/" target="_blank" rel="noopener"><img src="https://code.google.com/apis/youtube/images/badge3.gif" /></a></div>')
document.getElementById('youTubeResults').innerHTML = html.join('');
if (this.entries.length > 0 && startPlaying) {
this.play(this.entries[0].id.videoId, startPlaying);
}
if (this.onLoad) {
this.onLoad();
}
if (this.indicator) {
document.getElementById(this.indicator).style.display = "none"; 
}
}
YouTubeSearch.close = function() {
document.getElementById('youTubePlayer').style.display="none";
if (this.player != null) {
this.player.destroy();
this.player = null;
}
}
YouTubeSearch.setPlaylist = function(playList, startPlaying) {
this._playList = playList
if (startPlaying) this.playIndex(0)
}
YouTubeSearch.playIndex = function(index, lang) {
if (this._playList && this._playList['length'] && this._playList.length > index) {
this.defaultSearch(this._playList[index]['artist'], this._playList[index]['song'], 1, true, lang)
YouTubeSearch.onVideoEnded = function(){YouTubeSearch.playIndex(index + 1, lang)};
}
}
YouTubeSearch.defaultSearch = YouTubeSearch.search
function getUserCoordsIfAvailable() {
if ($.userLocation && $.userLocation.getPosition())	{
var position = $.userLocation.getPosition();
if (position.coords) {
return { 'lon' : position.coords.longitude, 'lat' : position.coords.latitude };
}
}
return null;
}
function applyClientDate(markupId, date, locale) {
$('#' + markupId).text(date.toLocaleDateString(locale,{ year: 'numeric', month: 'short', day: 'numeric' }));
}
function lityReact(source, target, reactPath, callback) {
var show = function() {
lity(target, {}, source);
if (typeof callback === 'function') {
callback();
}
}
if (!target.data('lity-react-init')) {
target.data('lity-react-init', true);
var head = $('head');
var body = $('body');
var script = function(url) {
return jQuery.ajax({ url: url, dataType: 'script', cache: true })
}
$.when().then(function() {
if (typeof lity !== 'function') {
return script('//w1.cdn.setlistfm.com/script/lity.min-2.3.1.js')
.done(show);
} else {
show();
}
}).then(function() {

 return $.when().then(function() {
if (typeof React !== 'object') {
return script('//w1.cdn.setlistfm.com/react/js/react.production.min-16.14.0.js');
}
}).then(function() {
if (typeof ReactDOM !== 'object') {
return script('//w1.cdn.setlistfm.com/react/js/react-dom.production.min-16.14.0.js');
}
})
}).then(function() {

 return $.getJSON(reactPath);
}).done(function(data) {

 head.append(data.header);
target.html(data.body);
body.append(data.footer);
})
} else {
show();
}
}
var loadReactComponent = (function() {
var headers = [];
var pushHeader = function(h) {
var head = $('head');
if (!headers.includes(h)) {

 head.append(h);
headers.push(h);
}
}
return function (source, target, reactPath, indicator, toggle, callback) {
if (indicator != null) {
indicator.show();
}
if (!target.data('load-react-active')) {
target.data('load-react-active', true);
var body = $('body');
var script = function(url) {
return jQuery.ajax({ url: url, dataType: 'script', cache: true })
}
$.when().then(function() {

 return $.when().then(function() {
if (typeof React !== 'object') {
return script('//w1.cdn.setlistfm.com/react/js/react.production.min-16.14.0.js');
}
}).then(function() {
if (typeof ReactDOM !== 'object') {
return script('//w1.cdn.setlistfm.com/react/js/react-dom.production.min-16.14.0.js');
}
})
}).then(function() {

 return $.getJSON(reactPath);
}).done(function(data) {

 pushHeader(data.header);
target.html(data.body);
body.append(data.footer);
if (callback != null) {
callback(true);
}
if (indicator != null) {
indicator.hide();
}
if (!toggle) {
target.data('load-react-active', false);
}
})
} else if (toggle) {
target.data('load-react-active', false);
target.html('');
if (indicator != null) {
indicator.hide();
}
if (callback != null) {
callback(false);
}
}
};
})();

$(document).ready(function() {
$('table.statsTable').each(function() {
var table = $(this);
table.find("th > a").click(function() {

 var header = $(this).parents('th');
var columnIndex = header.index();
this.asc = this.asc === undefined ? !header.data('stats-sort-asc') : !this.asc;

 var comp = comparer(columnIndex, this.asc);
var fallback = header.data('stats-sort-fallback') || [];
for (var d of fallback) {
comp = compose(comp, comparer(d.column, direction(this.asc, d.sort)));
}
var rows = table.find('tbody').toArray().sort(comp);

 for (var i = 0; i < rows.length; i++) {
table.append(rows[i]);
}
});
});
function comparer(columnIndex, asc) {
var valReverse = asc ? 1 : -1;
return function(rowA, rowB) {
var valA = getCellValue(rowA, columnIndex);
var valB = getCellValue(rowB, columnIndex);
var val;
if ($.isNumeric(valA) && $.isNumeric(valB)) {

 val = valA - valB;
} else {

 val = valA.toString().localeCompare(valB);
}
return val * valReverse;
};
}
function compose(c1, c2) {
return function(rowA, rowB) {
var val = c1(rowA, rowB);
return val != 0 ? val : c2(rowA, rowB);
};
}
function direction(asc, sort) {
switch (sort) {
case 'asc':
return true;
case 'desc':
return false;
case 'match':
return asc;
case 'inverse':
return !asc;
}
}
function getCellValue(row, columnIndex) {
return $(row)
.find('tr:first > td')
.eq(columnIndex)
.data('stats-sort');
}
});
function initClearQueryLink(query, clearQuery) {
hideClearQuery(clearQuery);
clearQuery.on("mousedown", function(event) {
clearQueryBox(event, query, clearQuery);
});
query.on("keyup focus", function(event) {
if (query.val().length > 0) {
showClearQuery(clearQuery);
} else {
hideClearQuery(clearQuery);
}
});
}
function hideClearQuery(clearQuery) {

	clearQuery.attr("style", "display: none !important;");
$(".searchForm button.searchButton").show();
}
function showClearQuery(clearQuery) {
clearQuery.show();
$(".searchForm button.searchButton").hide();
}
function clearQueryBox(event, query, clearQuery) {
query.val("");
hideClearQuery(clearQuery);
query.focus();
if (event) event.preventDefault()
}
function initAutocomplete(comp, formCont) {
comp.typeahead({
delay: 300,
minLength: 2,
items: 'all',
fitToElement: true,
appendTo: formCont,
autoSelect: false,
selectOnBlur: false,
selectOnTab: false,
followLinkOnSelect: true,
changeInputOnMove: true,
source: function(query, process) {
$.ajax({
url: '/opensearch',
dataType: 'json',
data: {
query: query
},
success: function(data) {
process(data[1]);
},
error: function(_xhr, _error) {
process(null);
}
});
},
matcher: function(_item) {

 return true;
},
sorter: function(items) {

 return items;
},
itemLink: function(item) {

 return '/search?query=' + encodeURIComponent(item).replace(/%20/g,'+');
},
scrollHeight: function() {

 return -document.documentElement.scrollTop;
},
afterEmptySelect: function() {

 formCont.submit();
}
});
}