(function ( win, jQuery, module ) {
	'use strict';
	
	/* ========= polyfills ======== */
	var requestAnimFrame = (function(){
			return  (typeof requestAnimationFrame !== 'undefined' && win.requestAnimationFrame) ||
				win.webkitRequestAnimationFrame ||
				win.mozRequestAnimationFrame    ||
				function( callback ){
					win.setTimeout(callback, 1000 / 60);
				};
			})(),
		console = win.console || {log: function () {}, warn: function () {} };

	/**
	 * Ctl is a cross (recent) browser slider that can be easily customized using CSS
	 * usage: new Ctl(input or div element, options)
	 * if specified el is a container then it is filled with the slider content
	 * if specified el is an input element then it is wrapped with the slider
	 *
	 * @param {HTMLElement} el - container or <input> element
	 * @param {object} options - map of settings, see below for options
	 * 
	 * {
	 *		label: text to display for slider name
	 *		width: css width of container
	 *		height: css height of container
	 *		min, max, step, value: respective values to set slider range
	 *		warp: 'lin' or 'exp': change range mapping function
	 *		spec: preset for min,max,step,value,warp values.  See Ctl.warps below
	 *		maxPrecision: maximum number of digits after decimal point
	 *		numCharacters: width of number display (default is to calculate from min/max/step values)
	 *		theme: an extra css class to be added to slider
	 * }
	 * 
	 */
	var Ctl = function ( el, _options ) {
		
		if ( !(this instanceof Ctl) ) {
			// if called jQuery style (this is DOM element) re-call using expected format
			return (this && this.nodeType === 1) ? new Ctl(this, el) : new Ctl(el, _options);
		}
		var that = this,
			// parse input arguments, create container/input elements
			options = parseOptions(el, _options),
			min = options.min,
			max = options.max,
			warp = options.warp || 'lin',
			map = Ctl.warps[warp].map.bind(this),
			unmap = Ctl.warps[warp].unmap.bind(this),
			step = options.step,
			value = options.value,
			normal = unmap(value);
		
		// initialize / check values
		
		if ( options.maxPrecision == null ) {
			// gets the number of digits after the decimal of defined step
			if ( step ) {
				options.maxPrecision = (step.toString().match(/\..*/) || [''])[0].slice(1).length;
			} else {
				// if step = 0 then use default value (3)
				options.maxPrecision = options.defaultPrecision;
			}
		}
		
		// TODO add error for if max digits is greater than numCharacters
		// (i.e. numCharacters = 3, max = 1000)
		if ( !options.numCharacters ) {
			options.numCharacters = Math.min(options.max.toFixed().length, 2);
			// leave room for decimal and following digits
			if ( options.maxPrecision )
				options.numCharacters += 1 + options.maxPrecision;
			// leave room for negative sign
			if ( min < 0 )
				options.numCharacters += 1;
		}
		
		// input type="number" or "range" can't actually have zero step
		if ( !step ) step = 1 / Math.pow(10, options.maxPrecision);
		
		this.isVertical = (options.direction === 'vertical');
		
		// set up number display function (closure)
		this.formatNumber = formatNumberMemoize({
			numCharacters: options.numCharacters,
			maxPrecision: options.maxPrecision,
			showSign: (min < 0),
			fixedWidth: !this.isVertical
		});
		
		// set up DOM, adds references to dom elements to this
		createDOM.call(this, options);
		
		// ECMAScript5 define getters/setters that validate changes
		Object.defineProperties(this, {
			// warp is a string key that references available option in Ctl.warps, i.e. 'lin' or 'exp'
			warp: {
				enumerable: true, configurable: true,
				get: function () { return warp; },
				set: function (input) {
					if ( input in Ctl.warps ) {
						warp = input;
						// bind this to instance
						map = Ctl.warps[input].map.bind(that);
						unmap = Ctl.warps[input].unmap.bind(that);
					}
				}
			},
			// normal is value mapped to 0..1 range
			normal: {
				enumerable: true, configurable: true,
				get: function () { return normal; },
				set: function ( input ) {
					var old = normal;
					
					if ( input.toString() === input ) input = parseFloat(input, 10);
					if ( isNaN(input) ) throw new Error("invalid input");
					
					// new value is first mapped to value in order to round properly
					input = Math.min(Math.max(0, input), 1);
					value = map(input);
					if ( step ) value = Math.round(value / step) * step;
					normal = unmap(value);
					
					if (old !== normal) {
						that.update();
					}
				}
			},
			// actual value in given min/max range
			value: {
				enumerable: true, configurable: true,
				get: function () { return value; },
				set: function ( input ) {
					var old = value;
					
					if ( input.toString() === input ) input = parseFloat(input, 10);
					if ( isNaN(input) ) throw new Error("invalid input");
					
					if ( step ) input = Math.round(input / step) * step;
					value = Math.min(Math.max(this.min, input), this.max);
					normal = unmap(value);
					
					if ( old !== value ) {
						that.update();
					}
				}
			},
			min: {
				enumerable: true, configurable: true,
				get: function () { return min; },
				set: function ( input ) {
					if ( input.toString() === input ) input = parseFloat(input, 10);
					if ( isNaN(input) ) throw new Error("invalid minimum value");
					
					// make sure that min < max - swap if necessary
					// update DOM element as well
					if ( input > max ) {
						min = max;
						max = input;
						that.input.max = max;
						that.input.min = min;
					} else {
						min = input;
						that.input.min = min;	
					}
					
					// calls the setter for 'normal', which recalculates based on new min
					that.normal = unmap(that.value);
				}
			},
			max: {
				enumerable: true, configurable: true,
				get: function () { return max; },
				set: function ( input ) {
					if ( input.toString() === input ) input = parseFloat(input, 10);
					if ( isNaN(input) ) throw new Error("invalid maximum value");
					
					// make sure that min < max - swap if necessary
					// update DOM element as well
					if ( input < min ) {
						max = min;
						min = input;
						that.input.min = min;
						that.input.max = max;
					} else {
						max = input;
						that.input.max = max;
					}
					
					// calls the setter for 'normal', which recalculates based on new max
					that.normal = unmap(that.value);
				}
			},
			// step determines the precision/quantization of value
			step: {
				enumerable: true, configurable: true,
				get: function () { return step; },
				set: function ( input ) {
					if ( input.toString() === input ) input = parseFloat(input, 10);
					if ( isNaN(input) ) throw new Error("invalid step value");
					
					// step can't be more than total range
					step = Math.max(Math.min(0, input), max - min);
					// update DOM
					that.input.step = step;
					
					// calls the setter for 'value', which re-rounds value based on new step
					that.value = map(that.normal);
				}
			},
			// listeners hold subscribed callbacks to change events
			// enumerable is false becuase it doesn't need to be visible
			listeners: {
				enumerable: false, configurable: true,
				value: []
			}
		});
		
		this.value = value; // update normal
		this.update();
		
		return this;
	};

	/**
	 * on any change trigger UI update, DOM element value and notify any listeners
	 *
	 */
	Ctl.prototype.update = function () {
		var that = this,
			value = this.value,
			listeners = this.listeners;
		
		if ( this.input.value !== value ) this.input.value = value;
		// defer UI updates for optimal performance
		requestAnimFrame(function() {
			that.number.textContent = that.formatNumber(value);
			that.render();
		});
		
		// run any event listeners
		if ( listeners.length ) {
			for (var i = 0, n = listeners.length; i < n; i++) {
				listeners[i].call(this, value, this.normal);
			}
		}
		
		// fire off DOM event
		dispatchEvent('change', this.input);
		
		
	};
	
	/**
	 * add a listener to when the value changes.  fn(value, normalizedValue)
	 * 
	 * @param {function} fn - called on change event with arguments:
	 *		value: {number} actual value of Ctl
	 *		normalizedValue: {number} value mapped to 0..1 range
	 */
	Ctl.prototype.bind = function ( fn ) {
		this.listeners.push(fn);
	};

	/**
	 * remove listener
	 * @param {function} fn - previously bound callback function
	 */
	Ctl.prototype.unbind = function ( fn ) {
		var i = this.listeners.indexOf(fn);
		if (i > -1) this.listeners.splice(i, 1);
	};

	/* ======== Private Methods / Properties ========== */

	/**
	 * parse the input options, DOM attributes and include default options
	 *
	 * @param {HTMLElement} el - DOM input or container element (OPTIONAL)
	 * @param {options} _options - extra configuration object (OPTIONAL)
	 * @returns {object} options compiled options (w/ input+container elements)
	 */
	function parseOptions ( el, _options ) {
		var containerElement, inputElement, elementAttributes, options, spec;
		
		// bind to el if DOM element 
		if ( !!(el && el.nodeType === 1) ) {
		
			if ( /INPUT/i.test(el.tagName) ) {
				inputElement = el;
			} else {
				containerElement = el;
				
				if ( containerElement.children.length ) {
					// TODO: not legacy-IE safe
					console.warn('Ctl: container not empty, removing contents');
					el.innerHTML = '';
				}
			}
			
			// create object from input element's attributes, converting numbers to floats
			// this allows us to pull in min, max, step attributes
			elementAttributes = Array.prototype.slice.apply(el.attributes);
			
			// TODO type mutation Array -> Object
			elementAttributes = elementAttributes.reduce(function ( obj, attr ) {
				var val = attr.value;
				obj[attr.nodeName] = !isNaN(val) ? parseFloat(val, 10) : val.toString();
				return obj;
			}, {});
			
			// value isn't counted as an attribute for some reason
			if ( el.value && !isNaN(el.value) ) {
				elementAttributes.value = parseFloat(el.value);
			}
		
		} else if ( _options == null ) {
			_options = el;
		}
		
		// allow setting min/max/step using preset "spec"
		if ( !!elementAttributes && elementAttributes.spec ) spec = Ctl.specs[elementAttributes.spec];
		if ( !!_options && _options.spec ) spec = Ctl.specs[_options.spec];
		
		// extend options with defaults and element attributes
		options = [ Ctl.defaultOptions, spec, elementAttributes, _options]
			.reduce(function ( finalObj, obj ) {
				// skip null/empty
				if ( typeof obj === 'object' ) {	
					// copy each value into destination. overwrites defaults
					Object.keys(obj).forEach(function ( key ) {
						if ( obj[key] != null ) {
							finalObj[key] = obj[key];
						}
					});
				}
				
				return finalObj;
				
			}, {});
		
		// create main elements if not specified above
		options.input = inputElement || document.createElement('input');
		options.container = containerElement || document.createElement('div');
		
		// check for valid warp
		// TODO - should this just warn, then set to linear?
		if ( !(options.warp in Ctl.warps) ) {
			throw new Error('Ctl: ' + options.warp + ' is not a valid warp value');
		} else if ( options.warp == 'exp' && options.min <= 0 ) {
			throw new Error('Ctl: cannot use exponential warp with a minimum <= 0');
		}
		
		return options;
	}

	/**
	 * create dom elements, set attributes, add event handlers
	 * node: called by Ctl, so this references Ctl
	 *
	 * @param {object} options settings created from parseoptions above (REQUIRED)
	 */
	// TODO: should these constants (cssPrefix, etc) be set at top of file?
	function createDOM ( options ) {
		var that = this,
			container = options.container,
			input = options.input,
			theme = options.theme || '',
			cssPrefix = 'ctl-',
			outerClass = 'box',
			inputClass = 'input',
			innerClasses = ['meter','handle','label','range','number'],
			directionClass = (this.isVertical ? 'vertical' : 'horizontal'),
			numberWidth = (options.numCharacters + 3) + 'ex';
		
		// set up container element
		toggleClass(container, cssPrefix + outerClass, true);
		toggleClass(container, cssPrefix + directionClass, true);
		if (theme) toggleClass(container, theme, true);
		
		// set dimensions, and default to px if no units already specified
		// TODO use RegEx instead of isNaN ?
		if ( options.width ) {
			container.style.width = options.width + ((isNaN(options.width) ? '' : 'px'));
		}
		if ( options.height ) {
			container.style.height = options.height + ((isNaN(options.width) ? '' : 'px'));
		}
		
		this.el = container;
		
		// set up input
		input.step = options.step;
		input.min = options.min;
		input.max = options.max;
		input.value = options.value;
		// avoid rendering as type=range.
		input.type = 'number';
		toggleClass(input, cssPrefix + inputClass, true);
		input.style.width = numberWidth;
		
		this.input = input;
		
		// set up display elements and add to container
		innerClasses.forEach(function ( className ) {
			var div = document.createElement('div');
			toggleClass(div, cssPrefix + className, true);
			container.appendChild(div);
			that[className] = div;
		});
		
		this.number.textContent = this.formatNumber(options.value);
		
		this.label.textContent = options.label;
		this.label.setAttribute('unselectable', 'on');
		
		// add event listeners to elements.  see Ctl.eventHandlers
		Object.keys(Ctl.eventHandlers).forEach(function ( elementKey ) {
			var element = that[elementKey],
				elementEvents = Ctl.eventHandlers[elementKey];
			
			// bind handler context to this (that)
			Object.keys(elementEvents).forEach(function ( eventName ) {
				element.addEventListener(eventName, elementEvents[eventName].bind(that));
			});
		});
		
		// horizontal / vertical considerations
		
		// set horizontal slider's number size based on specified number of digits
		if ( !this.isVertical ) {
			this.number.style.width = numberWidth;
			this.range.style.right = numberWidth;
		}
		
		// function for updating display depends on direction
		this.render = (this.isVertical ? renderVertical : renderHorizontal).bind(this);
		
		// if input was passed in then wrap it with container
		if ( input.parentNode ) {
			input.parentNode.replaceChild(container, input);
		}
		
		container.appendChild(input);
		
		// bugfix to ensure proper text centering
		// TODO is this necessary anymore?
		if ( !this.isVertical && container.clientHeight ) {
			container.style.lineHeight = container.clientHeight + 'px';
		}
		
	}

	/**
	 * helper function to trigger a DOM event, even in IE
	 *
	 * rather than do IE check each time it's called, detect once
	 * and return appropriate function
	 *
	 * @param {string} name - event name
	 * @param {HTMLElement} target - DOM element that initiates event
	 */
	var dispatchEvent = (function () {
		if ( document.createEvent ) {
			return function ( name, target ) {
				var event = document.createEvent('HTMLEvents');
				
				event.initEvent(name, true, true);
				target.dispatchEvent(event);
			};
		} else {
			return function ( name, target ) {
				target.fireEvent('on' + name);
			};
		}
	})();
	
	/**
	 * helper function to toggle classes, since IE 9 doesn't support classList
	 *
	 * @param {HTMLElement} el - target element
	 * @param {string} className - class to add/remove
	 * @param {boolean} toggleOn - if true add class, otherwise remove
	 */
	function toggleClass ( el, className, toggleOn ) {
		var str = el.className,
			re = new RegExp('\\s+\\b' + className.toString() + '\\b');
		
		if ( toggleOn && !re.test(str) ) {
			el.className = str + ' ' + className;
		} else if ( !toggleOn ) {
			el.className = str.replace(re, '');
		}
	}
	
	/**
	 * create optimized formatting function to properly align numbers
	 * closure determines constant values for function
	 *
	 * @param {object} options:
	 * 		: {number} _numCharacters - number of characters available
	 * 		: {number} _maxPrecision - maximum number of digits after decimal point
	 * 		: {boolean} showSign - whether to leave room for sign
	 * 		: {boolean} isFixedWidth - whether to allow whitespace to collapse
	 * @returns {function} function(value) - converts number to string accordingly
	 */
	// TODO does options retain in memory for closure? does it need optimizing?
	function formatNumberMemoize (options) {	
	 	var MIN_CHARS = 3,
			DEFAULT_CHARS = 8, // if numchars isn't defined
			maxPrecision = options.maxPrecision,
			showSign = options.showSign,
			numCharacters = Math.max(options.numCharacters || DEFAULT_CHARS, MIN_CHARS),
			// regex pattern to split up input number
			pattern = /(-)?(\d+)(\.)?(\d+)?/,
			// en-space (fixed-width) or regular space
			sp = (options.isFixedWidth) ? '\u2002' : ' ',
			paddingString = '';
		
		// leave room for sign
		if ( showSign ) numCharacters -= 1;
		
		// create padding string of proper size
		while ( paddingString.length < numCharacters )
			paddingString += sp;
		
		// closure holds constant values for performance
		return function ( value ) {
				// split number into parts, i.e. -4039.832 becomes [ - , 4039 , . , 832 ]
			var parts = value.toFixed(maxPrecision).match(pattern),
				// add '-' or space if needed
				sign = showSign ? (parts[1] || sp) : '',
				// number of digits before decimal point
				places = parts[2].length,
				// number of digits to keep after decimal point
				// - 1 is because we'll always need a decimal point if maxPrecision > 0
				precision = Math.max(0, Math.min(numCharacters - places - 1, maxPrecision)),
				// if fractional part then make room for decimal
				decimal = (precision) ? 1 : 0;
			
			return  sign +
					paddingString.slice(places + precision + decimal) +
					Math.abs(value).toFixed(precision);
			
		};
	}

	/* ==== UI rendering / update ==== */
	
	
	// overwrite CSS transform property with vendor-specific name if necessary
	var vendorTransform = 'transform';
	// can only detect after page load.
	win.addEventListener('load', function () {
		var vendorTransformNames = ['transform',
									'WebkitTransform',
									'MozTransform',
									'msTransform',
									'OTransform'];
									
		vendorTransform = (vendorTransformNames.filter(function ( vendorName ) {
			return (vendorName in document.body.style);
		}) || ['transform'])[0];
	});

	/**
	 * calculate position of meter and handle, and set CSS styles
	 */
	function renderHorizontal () {
		var normal = this.normal,
			rangeWidth = this.range.clientWidth,
			handleMargin = this.handle.clientWidth,
			handlePosition = normal * (rangeWidth - handleMargin),
			centerOffset = (this.min < 0) ? 0.5 : 0,
			meterWidth = (normal - centerOffset) * rangeWidth,
			meterOffset;
			
		this.handle.style[vendorTransform] = 'translate(' + handlePosition.toFixed() + 'px, 0)';
		this.meter.style.width = Math.abs(meterWidth).toFixed() + 'px';
		
		// bipolar meters are anchored to center
		if ( centerOffset ) {
			// isPositive is used to change CSS class only when passing center
			if ( (normal > 0.5) != this.isPositive ) {
				this.isPositive = normal > 0.5;
				toggleClass(this.meter, 'negative', !this.isPositive);
				toggleClass(this.meter, 'positive', this.isPositive);
			}
			
			meterOffset = Math.min(meterWidth, 0) + rangeWidth*0.5;
			this.meter.style[vendorTransform] = 'translate(' + meterOffset.toFixed() + 'px, 0)';
		}
	}

	/**
	 * same as renderHorizontal, except vertical.  obviously.
	 */
	function renderVertical () {
		var normal = this.normal,
			rangeHeight = this.range.clientHeight,
			handleMargin = this.handle.clientHeight,
			handlePosition = (1.0 - normal) * (rangeHeight - handleMargin),
			centerOffset = (this.min < 0) ? 0.5 : 0,
			meterHeight = (normal - centerOffset) * rangeHeight,
			meterOffset;
		
		this.handle.style[vendorTransform] = 'translate(0, ' + handlePosition.toFixed() + 'px)';
		this.meter.style.height = Math.abs(meterHeight).toFixed() + 'px';
		
		// bipolar meters are anchored to center
		if ( centerOffset ) {
			// isPositive is used to change CSS class only when passing center
			if ( (normal > 0.5) !== this.isPositive ) {
				this.isPositive = normal > 0.5;
				toggleClass(this.meter, 'negative', !this.isPositive);
				toggleClass(this.meter, 'positive', this.isPositive);
			}
			
			meterOffset = rangeHeight*0.5 - Math.max(meterHeight, 0);
			this.meter.style[vendorTransform] = 'translate(0, ' + meterOffset.toFixed() + 'px)';
		} else {
			meterOffset = rangeHeight - meterHeight;
			this.meter.style[vendorTransform] = 'translate(0, ' + meterOffset.toFixed() + 'px)';
		}
	}
	
	/* ======== Protected Methods / Properties ========== */

	Ctl.defaultOptions = {
		theme: 'electro',
		min: 0,
		max: 1,
		step: 0,
		value: 0,
		warp: 'lin',
		direction: 'horizontal',
		numCharacters: 0,
		defaultPrecision: 3,
		label: '',
		alt_key_step: 1 / 20, // amount to jump when alt key is pressed in increment handling
		shift_key_step: 10 // jump 10X the step amount when shift pressed in increment handling
	};
	
	// protected - allows monkey-patching, but doesn't need to be used outside of instance creation
	Ctl.eventHandlers = {
		input: {
			// detect input change
			'change': function ( event ) {
				if ( event instanceof CustomEvent ) {
					// changed programattically by Ctl, ignore
				} else {
					// rounds / clamps value and runs update if necessary (magic of Object setter/getters)
					this.value = this.input.value;
				}
			},
			// select number on focus for easy entering of new value
			'focus': function ( ) {
				this.input.setSelectionRange(0, 256);
			},
			// change value based on mousewheel.  Alt and Shift keys modify step increment
			'mousewheel': function ( event ) {
				var delta = event.wheelDelta || -1*event.deltaY,
					direction = (delta >= 0) ? 1 : -1,
					step = this.step,
					SHIFT_SCALE = Ctl.defaultOptions.shift_key_step,
					ALT_STEP = Ctl.defaultOptions.alt_key_step;
					
				event.preventDefault();
				if ( event.shiftKey ) {
					this.value += direction*step*SHIFT_SCALE;
				} else if ( event.altKey ) {
					this.normal += direction*ALT_STEP;
				} else {
					this.value += direction*step;
				}
			},
			// allow stepping up/down using up,down,pageup and pagedown keys.
			// Alt and Shift keys modify increment
			'keydown': function ( event ) {
				var step = this.step,
					SHIFT_SCALE = Ctl.defaultOptions.shift_key_step,
					ALT_STEP = Ctl.defaultOptions.alt_key_step,
					increment;
					
				if ( event.shiftKey ) {
					increment = step*SHIFT_SCALE;
				} else if ( event.altKey ) {
					increment = (this.max - this.min)*ALT_STEP;
				} else {
					increment = step;
				}
				
				switch ( event.which ) {
					case 38: // up
						this.value += increment;
						event.preventDefault();
						break;
					case 40: // down
						this.value -= increment;
						event.preventDefault();
						break;
					case 33: // page up
						this.normal += ALT_STEP;
						event.preventDefault();
						break;
					case 34: // page down
						this.normal -= ALT_STEP;
						event.preventDefault();
						break;
				}
			}
		},
		range: {
			// update value with mouse.
			// mousedown listener only applys to range, but once click temporarily adds
			// move and up listeners to entire document, to avoid out-of-bounds issues
			'mousedown': function ( event ) {
				event.preventDefault();
				
				var that = this,
					body = document.body,
					range = this.range,
					handle = this.handle,
					bounds = range.getBoundingClientRect(),
					marginX = handle.offsetWidth * 0.5,
					marginY = handle.offsetHeight * 0.5;
				
				// calculate position based on mouse event
				function getPosition ( evt ) {
					if (evt.touches && evt.touches.length) {
						evt = evt.touches[evt.touches.length - 1];
					}
					
					var x = Math.min(Math.max(marginX, evt.clientX - bounds.left), bounds.width - marginX),
						y = Math.min(Math.max(marginY, evt.clientY - bounds.top), bounds.height - marginY);
					return [
						(x - marginX) / (bounds.width - marginX*2),
						(y - marginY) / (bounds.height - marginY*2)
					];
				}
				
				// mousemove handler
				function move ( evt ) {
					var position = getPosition(evt);
					evt.preventDefault();
					that.normal = (that.isVertical) ? (1.0 - position[1]) : position[0];
				}
				
				// remove event listeners on mouseup
				function end ( evt ) {
					evt.preventDefault();
					body.removeEventListener('mousemove', move);
					body.removeEventListener('mouseup', end);
					body.removeEventListener('touchmove', move);
					body.removeEventListener('touchend', end);
				}
				
				body.addEventListener('mousemove', move);
				body.addEventListener('mouseup', end);
				body.addEventListener('touchmove', move);
				body.addEventListener('touchend', end);
				
				// which clicked remove focus if number input is active
				// IE makes body activeElement when no input is focused
				if ( 'activeElement' in document && (document.activeElement != document.body) ) {
					document.activeElement.blur();
				}
				
			}
		}
	};

	// duplicate events for mobile and firefox support
	Ctl.eventHandlers.range.touchstart = Ctl.eventHandlers.range.mousedown;
	Ctl.eventHandlers.input.wheel = Ctl.eventHandlers.input.mousewheel;
	Ctl.eventHandlers.range.wheel = Ctl.eventHandlers.input.mousewheel;
	Ctl.eventHandlers.range.mousewheel = Ctl.eventHandlers.input.mousewheel;

	// these are easing functions to map/unmap values to the 0-1 range
	Ctl.warps = {
		// linear
		lin: {
			map: function ( x ) {
				var min = this.min,
					max = this.max;
				return (x <= 0) ? min 
					 : (x >= 1) ? max
					 : x * (max - min) + min;
			},
			unmap: function ( x ) {
				var min = this.min,
					max = this.max;
				return (x <= min) ? 0
					 : (x >= max) ? 1
					 : (x - min) / (max - min);
			}
		},
		// exponential warping
		exp: {
			map: function ( x ) {
				var min = this.min,
					max = this.max,
					logMin = Math.log(min),
					logMax = Math.log(max);
				return (x <= 0) ? min
					 : (x >= 1) ? max
					 : Math.exp(logMin + (logMax-logMin)*x);
			},
			unmap: function ( x ) {
				var min = this.min,
					max = this.max,
					logMin = Math.log(min),
					logMax = Math.log(max);
				return (x <= min) ? 0
					 : (x >= max) ? 1
					 : (Math.log(x) - logMin) / (logMax - logMin);
			}
		},
		// experimental
		// TODO -- should this be bipolar?
		quadIn: {
			map: function ( x ) {
				var min = this.min,
					max = this.max;
				return (x <= 0) ? min 
					 : (x >= 1) ? max
					 : (max-min) * x*x + min;
			},
			unmap: function ( x ) {
				var min = this.min,
					max = this.max;
				return (x <= min) ? 0
					 : (x >= max) ? 1
					 : Math.sqrt(Math.abs(x - min) / (max - min));
			}
		},
		// experimental
		// TODO -- should this be bipolar?
		quadOut: {
			map: function ( x ) {
				var min = this.min,
					max = this.max,
					onesubx = 1 - x;
				return (x <= 0) ? min 
					 : (x >= 1) ? max
					 : (max-min) * (1 - onesubx*onesubx) + min;
			},
			unmap: function ( x ) {
				var min = this.min,
					max = this.max;
					//sign = ((min < 0) && (x < 0.5)) ? -1 : 1;
				return (x <= min) ? 0
					 : (x >= max) ? 1
					 : 1 - Math.sqrt(Math.abs(max - x) / (max - min));
			}
		}
	};

	// audio-centric presets for min/max values.  specify in options as 'spec'
	// based off of SuperCollider3's ControlSpec
	Ctl.specs = {
		unipolar: { min: 0, max: 1, warp: 'lin', step: 0, value: 0 },
		bipolar: { min: -1, max: 1, value: 0},
		
		bool: { min: 0, max: 1, warp: 'lin', step: 1, value: 0},
		rotate: { min: -180, max: 180, warp: 'lin', step: 1, value: 0 },

		freq: {min: 20, max: 20000, warp: 'exp', step: 0, value: 440},
		lofreq: {min: 0.1, max: 100, warp: 'exp', step: 0, value: 6},
		midfreq: {min: 25, max: 4200, warp: 'exp', step: 0, value: 440},
		widefreq: {min: 0.1, max: 20000, warp: 'exp', step: 0, value: 440},
		phase: {min: 0, max: 360},
		rq: {min: 0.001, max: 2, warp: 'exp', step: 0, value: 0.707},
		
		midi: {min: 0, max: 127, step: 1, value: 64},
		midinote: {min: 0, max: 127, step: 1, value: 60},
		midivelocity: {min: 1, max: 127, value: 64},

		amp: {min: 0, max: 1, warp: 'quadIn', step: 0, value: 0},
		boostcut: {min: -20, max: 20, value: 0},

		pan: {min: -1, max: 1, value: 0},
		detune: {min: -20, max: 20, value: 0},
		rate: {min: 0.125, max: 8, warp: 'exp', step: 0, value: 1},
		beats: {min: 0, max: 20},
		delay: {min: 0.0001, max: 1, warp: 'exp', step: 0, value: 0.3 },
		
		// 8bit
		//'8bit': {min: -255, max: 255, warp: 'lin', step: 1, value 0 },
		// 16bit values
		integer: {min: -1024, max: 1024, warp: 'lin', step: 1, value: 0 },
		float: {min: -1024, max: 1024, warp: 'lin', step: 0, value: 0 }
	};
	
	/* ==== Export ==== */
	
	// add jQuery support
	if ( jQuery ) {
		jQuery.fn.ctl = function ( options ) {
			// skip anything that's (probably) already been created
			// TODO - should css prefix / names be a global constant?
			var results = this.not('.ctl-box, .ctl-input').map(function () {
				return new Ctl(this, options);
			});
			
			// return non-jQuery results
			// TODO - is this what developers would expect?
			//   I would think that since what's returned isn't DOM elements
			//   then vanilla content (null, single Ctl or array) is best
			//   I welcome any comments otherwise
			if ( !results.length ) {
				return null;
			} else if ( results.length === 1 ) {
				return results[0];
			} else {
				return results.toArray();
			}
		};
	}
	
	if ( module ) {
		module.exports = Ctl;
	} else {
		win.Ctl = Ctl;
	}
	
})(this,									// window
  (typeof jQuery !== 'undefined') && jQuery,	// jQuery
  (typeof module == 'object') && module		// CommonJS support
);