/*** cross browser **/


// if the module has no dependencies, the above pattern can be simplified to
(function (root, factory) {
	if (typeof exports === 'object') {
			module.exports = factory();
	} else if (typeof define === 'function' && define.amd) {
			define(factory);
	} else {
			root.CVSlider = factory();
	}
}(this, function () {

	'use strict'

	/* ========= polyfills ======== */
	var requestAnimFrame = (function(){
		return  (typeof requestAnimationFrame !== 'undefined' && requestAnimationFrame) ||
						window.webkitRequestAnimationFrame ||
						window.mozRequestAnimationFrame    ||
						function( callback ){
							window.setTimeout(callback, 1000 / 60);
						};
	})();

	/**
	 * CVSlider is a cross (recent) browser slider that can be easily customized using CSS
	 * usage: new CVSlider(input or div element, options)
	 * if specified el is a container then it is filled with the slider content
	 * if specified el is an input element then it is wrapped with the slider
	 * options may be:
	 * 
	 * {
	 *		label: text to display for slider name
	 *		width: css width of container
	 *		height: css height of container
	 *		min, max, step, value: respective values to set slider range
	 *		warp: 'lin' or 'exp': change range mapping function
	 *		spec: preset for min,max,step,value,warp values.  See CVSlider.warps below
	 *		maxPrecision: maximum number of digits after decimal point
	 *		numCharacters: width of number display (default is to calculate from min/max/step values)
	 *		theme: an extra css class to be added to slider
	 * }
	 * 
	 */
	var CVSlider = function (el, _options) {
		
		if (!(this instanceof CVSlider)) {
			// assume that this is called without _options, called jQuery style, or just return new instance
			return (this instanceof HTMLElement) ? new CVSlider(this, el) : new CVSlider(el, _options);
		}
		
		var self = this
			, options = parseOptions(el, _options)
			, min = options.min
			, max = options.max
			, warp = options.warp || 'lin'
			, map = CVSlider.warps[warp].map.bind(this)
			, unmap = CVSlider.warps[warp].unmap.bind(this)
			, step = options.step
			, value = options.value
			, normal = unmap(value);
		
		if (options.maxPrecision == null) {
			// gets the number of digits after the decimal of defined step
			if (step) {
				options.maxPrecision = (step.toString().match(/\..*/) || [''])[0].slice(1).length;
			} else {
				// if step = 0 then use default value (3)
				options.maxPrecision = options.defaultPrecision;
			}
		}
		
		// input type="number" or "range" can't actually have zero step
		if (!step) step = 1 / Math.pow(10, options.maxPrecision);
		
		this.isVertical = (options.direction === 'vertical');
		
		if (!options.numCharacters) {
			options.numCharacters = Math.min(options.max.toFixed().length, 2);
			// leave room for decimal and following digits
			if (options.maxPrecision)
				options.numCharacters += 1 + options.maxPrecision;
			// leave room for negative sign
			if (min < 0)
				options.numCharacters += 1;
		}
		
		// set up number display
		this.formatNumber = formatNumberMemoize(options.numCharacters, options.maxPrecision, !this.isVertical);

		createDOM.call(this, options);
		
		Object.defineProperties(this, {
			warp: {
				enumerable: true, configurable: true,
				get: function () { return warp; },
				set: function (input) {
					if (input in CVSlider.warps) {
						warp = input;
						map = CVSlider.warps[input].map.bind(self);
						unmap = CVSlider.warps[input].unmap.bind(self);
					}
				}
			},
			normal: {
				enumerable: true, configurable: true,
				get: function () { return normal; },
				set: function (input) {
					var old = normal;
					
					if (input.toString() === input) input = parseFloat(input, 10);
					if (isNaN(input)) throw Error("invalid input");
					
					input = Math.min(Math.max(0, input), 1);
					value = map(input);
					if (step) value = Math.round(value / step) * step;
					normal = unmap(value);
					
					if (old !== normal) {
						self.update();
					}
				}
			},
			value: {
				enumerable: true, configurable: true,
				get: function () { return value; },
				set: function (input) {
					var old = value
						, step = this.step;
					
					if (input.toString() === input) input = parseFloat(input, 10);
					if (isNaN(input)) throw Error("invalid input");
					
					if (step) input = Math.round(input / step) * step;
					
					value = Math.min(Math.max(this.min, input), this.max);
					normal = unmap(value);
					
					if (old !== value) {
						self.update();
					}
				}
			},
			min: {
				enumerable: true, configurable: true,
				get: function () { return min; },
				set: function (input) {
					if (input.toString() === input) input = parseFloat(input, 10);
					if (isNaN(input)) throw Error("invalid minimum value");
					if (input > max) {
						min = max;
						max = input;
						self.input.max = max;
						self.input.min = min;
					} else {
						min = input;
						self.input.min = min;	
					}
					
					self.normal = unmap(self.value);
				}
			},
			max: {
				enumerable: true, configurable: true,
				get: function () { return max; },
				set: function (input) {
					if (input.toString() === input) input = parseFloat(input, 10);
					if (isNaN(input)) throw Error("invalid maximum value");
					if (input < min) {
						max = min;
						min = input;
						self.input.min = min;
						self.input.max = max;
					} else {
						max = input;
						self.input.max = max;
					}
					
					self.normal = unmap(self.value);
				}
			},
			step: {
				enumerable: true, configurable: true,
				get: function () { return step; },
				set: function (input) {
					if (input.toString() === input) input = parseFloat(input, 10);
					if (isNaN(input)) throw Error("invalid step value");
					step = Math.max(Math.min(0, input), self.max - self.min);
					self.input.step = step;
					self.value = map(self.normal);
				}
			},
			listeners: {
				enumerable: false, configurable: true,
				value: []
			}
		});
		
		this.value = value; // update normal
		this.update();
		
		return this;
	}

	CVSlider.prototype.update = function () {
		var self = this
			, value = this.value
			, listeners = this.listeners;

		if (this.input.value !== value) this.input.value = value;
		requestAnimFrame(function() {
			self.number.textContent = self.formatNumber(value);
			self.render();
		});
		
		// run any event listeners
		if (listeners.length) {
			for (var i = 0, n = listeners.length; i < n; i++) {
				listeners[i].call(this, value, this.normal);
			}
		}
		
		// fire off DOM event
		dispatchEvent('change', this.input);
		
		
	}
	
	// add a listener to when the value changes.  fn(value, normalizedValue)
	CVSlider.prototype.bind = function (fn) {
		this.listeners.push(fn);
	}

	// remove listener
	CVSlider.prototype.unbind = function (fn) {
		var i = this.listeners.indexOf(fn);
		if (i > -1) this.listeners.splice(i, 1);
	}



	/* ======== Protected Methods / Properties ========== */

	CVSlider.defaultOptions = {
		theme: 'cv-default',
		min: 0,
		max: 1,
		step: 0,
		value: 0,
		warp: 'lin',
		direction: 'horizontal',
		numCharacters: 0,
		defaultPrecision: 3,
		label: ''
	}


	// protected allows monkey-patching, but doesn't need to be used outside of instance creation
	CVSlider.eventHandlers = {
		input: {
			'change': function (event) {
				if (event instanceof CustomEvent) {
					// changed programattically, ignore
				} else {
					// rounds / clamps value and runs update if necessary
					this.value = this.input.value;
				}
			},
			'focus': function (event) {
				this.input.setSelectionRange(0, 256);
			},
			'mousewheel': function (event) {
				var delta = event.wheelDelta || -1*event.deltaY
					, direction = (delta >= 0) ? 1 : -1
					, step = this.step
					, SHIFT_SCALE = 10
					, ALT_STEP = 1 / 20;
					
				event.preventDefault();
				if (event.shiftKey) {
					this.value += direction*step*SHIFT_SCALE;
				} else if (event.altKey) {
					this.normal += direction*ALT_STEP;
				} else {
					this.value += direction*step;
				}
			},
			'keydown': function (event) {
				var step = this.step
					, SHIFT_SCALE = 10
					, ALT_STEP = 1 / 20
					, increment = (event.shiftKey) ? step*SHIFT_SCALE
											: (event.altKey) ? (this.max - this.min)*ALT_STEP
											: step
					, value = this.value;
				
				switch (event.which) {
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
			'mousedown': function (event) {
				event.preventDefault();
				
				var self = this
					, body = document.body
					, downEvent = event
					, range = this.range
					, handle = this.handle
					, bounds = range.getBoundingClientRect()
					, marginX = handle.offsetWidth * 0.5
					, marginY = handle.offsetHeight * 0.5;
				
				var getPosition = function (evt) {
					if (evt.touches && evt.touches.length) {
						evt = evt.touches[evt.touches.length - 1];
					}
					
					var x = Math.min(Math.max(marginX, evt.clientX - bounds.left), bounds.width - marginX)
						, y = Math.min(Math.max(marginY, evt.clientY - bounds.top), bounds.height - marginY);
					return [
						(x - marginX) / (bounds.width - marginX*2),
						(y - marginY) / (bounds.height - marginY*2)
					];
				}
				
				var move = function (evt) {
					var position = getPosition(evt);
					evt.preventDefault();
					self.normal = (self.isVertical) ? (1.0 - position[1]) : position[0];
				}
				
				var end = function (evt) {
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
				
				if ('activeElement' in document && document.activeElement != document.body) document.activeElement.blur();
				
			}
		}
	};

	CVSlider.eventHandlers.range['touchstart'] = CVSlider.eventHandlers.range['mousedown'];
	CVSlider.eventHandlers.input['wheel'] = CVSlider.eventHandlers.input['mousewheel'];
	CVSlider.eventHandlers.range['wheel'] = CVSlider.eventHandlers.input['mousewheel'];
	CVSlider.eventHandlers.range['mousewheel'] = CVSlider.eventHandlers.input['mousewheel'];


	// these are easing functions to map/unmap values to the 0-1 range
	CVSlider.warps = {
		lin: {
			map: function (x) {
				var min = this.min
					, max = this.max;
				return (x <= 0) ? min 
						 : (x >= 1) ? max
						 : x * (max - min) + min;
			},
			unmap: function (x) {
				var min = this.min
					, max = this.max;
				return (x <= min) ? 0
						 : (x >= max) ? 1
						 : (x - min) / (max - min);
			}
		},
		exp: {
			map: function (x) {
				var min = this.min
					, max = this.max
					, logMin = Math.log(min)
					, logMax = Math.log(max);
				return (x <= 0) ? min
						 : (x >= 1) ? max
						 : Math.exp(logMin + (logMax-logMin)*x);
			},
			unmap: function (x) {
				var min = this.min
					, max = this.max
					, logMin = Math.log(min)
					, logMax = Math.log(max);
				return (x <= min) ? 0
						 : (x >= max) ? 1
						 : (Math.log(x) - logMin)/(logMax - logMin);
			}
		},
		quadIn: {
			map: function (x) {
				var min = this.min
					, max = this.max;
				return (x <= 0) ? min 
						 : (x >= 1) ? max
						 : (max-min) * x*x + min;
			},
			unmap: function (x) {
				var min = this.min
					, max = this.max
					, sign = (x < 0) ? -1 : 1;
				return (x <= min) ? 0
						 : (x >= max) ? 1
						 : Math.sqrt(Math.abs(x - min) / (max - min));
			}
		},
		quadOut: {
			map: function (x) {
				var min = this.min
					, max = this.max
					, onesubx = 1 - x;
				return (x <= 0) ? min 
						 : (x >= 1) ? max
						 : (max-min) * (1 - onesubx*onesubx) + min;
			},
			unmap: function (x) {
				var min = this.min
					, max = this.max
					, sign = ((min < 0) && (x < 0.5)) ? -1 : 1;
				return (x <= min) ? 0
						 : (x >= max) ? 1
						 : 1 - Math.sqrt(Math.abs(max - x) / (max - min));
			}
		}
	};

	// audio-centric presets for min/max values.  specify in options as 'spec'
	CVSlider.specs = {
		unipolar: { min: 0, max: 1, warp: 'lin', step: 0, initial: 0 },
		bipolar: { min: -1, max: 1, initial: 0},
		
		bool: { min: 0, max: 1, warp: 'lin', step: 1, initial: 0},
		rotate: { min: -180, max: 180, warp: 'lin', step: 1, initial: 0 },

		freq: {min: 20, max: 20000, warp: 'exp', step: 0, initial: 440},
		lofreq: {min: 0.1, max: 100, warp: 'exp', step: 0, initial: 6},
		midfreq: {min: 25, max: 4200, warp: 'exp', step: 0, initial: 440},
		widefreq: {min: 0.1, max: 20000, warp: 'exp', step: 0, initial: 440},
		phase: {min: 0, max: 360},
		rq: {min: 0.001, max: 2, warp: 'exp', step: 0, initial: 0.707},
		
		midi: {min: 0, max: 127, step: 1, initial: 64},
		midinote: {min: 0, max: 127, step: 1, initial: 60},
		midivelocity: {min: 1, max: 127, initial: 64},

		amp: {min: 0, max: 1, warp: 'quadIn', step: 0, initial: 0},
		boostcut: {min: -20, max: 20, initial: 0},

		pan: {min: -1, max: 1, initial: 0},
		detune: {min: -20, max: 20, initial: 0},
		rate: {min: 0.125, max: 8, warp: 'exp', step: 0, initial: 1},
		beats: {min: 0, max: 20},
		delay: {min: 0.0001, max: 1, warp: 'exp', step: 0, initial: 0.3 },
		
		// 8bit
		//'8bit': {min: -255, max: 255, warp: 'lin', step: 1, initial 0 },
		// 16bit values
		integer: {min: -1024, max: 1024, warp: 'lin', step: 1, initial: 0 },
		float: {min: -1024, max: 1024, warp: 'lin', step: 0, initial: 0 }
	};


	/* ======== Private Methods / Properties ========== */

	// parse the input options, DOM attributes and include default options
	function parseOptions(el, _options) {
		var containerElement, inputElement, elementAttributes, options, spec;
		
		if (el instanceof HTMLElement) {
		
			if (el instanceof HTMLInputElement) {
				inputElement = el;
				inputElement.type = 'number';
			} else {
				containerElement = el;
			}
			
			// create object from input element's attributes, converting numbers to floats
			// this allows us to pull in min, max, step attributes
			// TODO type mutation
			elementAttributes = Array.prototype.slice.apply(el.attributes);
			elementAttributes = elementAttributes.reduce(function(obj, attr) {
				var val = attr.value;;
				obj[attr.nodeName] = !isNaN(val) ? parseFloat(val, 10) : val.toString();
				return obj; 
			}, {});
			
		} else if (_options == null) {
		
			_options = el;
			
		}
		
		
		containerElement || (containerElement = document.createElement('div'));
		inputElement || (inputElement = document.createElement('input'));
		
		// allow setting min/max/step using preset "spec"
		// TODO - a little messy - maybe run after aggregate?
		if (elementAttributes && elementAttributes.spec) spec = CVSlider.specs[elementAttributes.spec];
		if (_options instanceof Object && _options.spec) spec = CVSlider.specs[_options.spec];
		// extend options with defaults and element attributes
		options = [CVSlider.defaultOptions, spec, elementAttributes, _options].reduce(function(finalObj, obj) {
			if (!(obj instanceof Object)) return finalObj;
			Object.keys(obj).forEach(function(key) {
				if (obj[key] != null)
					finalObj[key] = obj[key];
			});
			return finalObj;
		}, {});
		
		options.input = inputElement;
		options.container = containerElement;
		
		if (!(options.warp in CVSlider.warps)) {
			throw new Error(options.warp + ' is not a valid warp value');
		} else if (options.warp == 'exp' && options.min <= 0) {
			throw new Error('cannot use exponential warp with a minimum <= 0');
		}
		
		return options;
	}

	// create dom elements, set attributes, add event handlers
	function createDOM(options) {
		var self = this
			, container = options.container
			, input = options.input
			, theme = options.theme || ''
			, cssPrefix = 'cv-'
			, outerClass = 'control'
			, inputClass = 'input'
			, innerClasses = ['meter','handle','label','range','number']
			, numberWidth = (options.numCharacters + 3) + 'ex';
			
		this.input = input;
		this.el = container;
		
		toggleClass(container, cssPrefix + outerClass, true);
		toggleClass(container, cssPrefix + (this.isVertical ? 'vertical' : 'horizontal'), true);
		if (theme) toggleClass(container, theme, true);
		
		if (options.width) container.style.width = options.width + ((isNaN(options.width) ? '' : 'px'));
		if (options.height) container.style.height = options.height + ((isNaN(options.width) ? '' : 'px'));
			
		input.step = options.step;
		input.min = options.min;
		input.max = options.max;
		input.value = options.value;
		
		toggleClass(input, cssPrefix + inputClass, true);
		
		innerClasses.forEach(function (className) {
			var div = document.createElement('div')
				, handlers;
			toggleClass(div, cssPrefix + className, true);
			container.appendChild(div);
			self[className] = div;
		});
		
		input.style.width = numberWidth;
		if (!this.isVertical) {
			this.number.style.width = numberWidth;
			this.range.style.right = numberWidth;
		}
		
		this.label.textContent = options.label;
		this.number.textContent = this.formatNumber(options.value);
		
		// add event listeners
		Object.keys(CVSlider.eventHandlers).forEach(function (elementKey) {
			var element = self[elementKey]
				, elementEvents = CVSlider.eventHandlers[elementKey];
			Object.keys(elementEvents).forEach(function (eventName) {
				element.addEventListener(eventName, elementEvents[eventName].bind(self));
			});
		});
		
		this.render = (this.isVertical ? renderVertical : renderHorizontal).bind(this);
		
		// if input was passed in then wrap it with container
		if (input.parentNode) {
			input.parentNode.insertBefore(container, input);
		}
		
		container.appendChild(input);
		
		// bugfix to ensure proper text centering
		if (!this.isVertical && container.clientHeight) {
			container.style.lineHeight = container.clientHeight + 'px';
		}
		
	}

	// helper function to trigger a DOM event, even in IE
	var dispatchEvent = (function() {
		if (document.createEvent) {
			return function (name, target) {
				var event = document.createEvent('HTMLEvents');
				event.initEvent(name, true, true);
				target.dispatchEvent(event);
			}
		} else {
			return function (name, target) {
				target.fireEvent('on' + name);
			}
		}
	})();
	
	
	// helper function to toggle classes, since IE 9 doesn't support classList
	var toggleClass = function (el, className, toggleOn) {
		var str = el.className
			, re = new RegExp('\\s+\\b' + className.toString() + '\\b');
		
		if (toggleOn && !re.test(str)) {
			el.className = str + ' ' + className;
		} else if (!toggleOn) {
			el.className = str.replace(re, '');
		}
	}

	// create optimized function to properly align numbers
	function formatNumberMemoize(_numCharacters, _maxPrecision, isFixedWidth) {	
		var sp = (isFixedWidth) ? '\u2002' : ' ' // en-space (fixed-width) or regular space
			, maxPrecision = (_maxPrecision != null) ? _maxPrecision : 3
			, numCharacters = Math.max(_numCharacters || 8, 2)
			, paddingString = '';
		
		// leave room for decimal point
		if (maxPrecision) numCharacters -= 1;
		// leave room for sign and (optionally) decimal point
		//numCharacters -= (maxPrecision) ? 2 : 1;
		
		while (paddingString.length < numCharacters)
			paddingString += sp;
		
		return function (value) {
			var sign = (value < 0) ? '-' : sp
				, absVal = Math.abs(value)
				, places = 0
				, precision
				, padding;
			if (absVal < 1) {
				places = 1;
			} else {
				while( absVal >= 1 ) {
					absVal /= 10;
					places += 1;
				}
			}
			
			precision = Math.min( Math.max(numCharacters - places, 0), maxPrecision );
			
			return sign + paddingString.slice(places + precision) + Math.abs(value).toFixed(precision);
		};
	};

	/* ==== UI rendering / update ==== */
	var vendorTransform = 'transform';

	// overwrite with vendor-specific style name if necessary
	window.addEventListener('load', function () {
		var vendorTransformNames = ['transform', 'WebkitTransform', 'MozTransform', 'msTransform', 'OTransform'];
		vendorTransform = (vendorTransformNames.filter(function (vendorName) {
			return (vendorName in document.body.style);
		}) || [])[0];
	});

	function renderHorizontal() {
		var normal = this.normal
			, rangeWidth = this.range.clientWidth
			, handleMargin = this.handle.clientWidth
			, handlePosition = normal * (rangeWidth - handleMargin)
			, centerOffset = (this.min < 0) ? 0.5 : 0
			, meterWidth = (normal - centerOffset) * rangeWidth
			, meterOffset;
			
		this.handle.style[vendorTransform] = 'translate(' + handlePosition.toFixed() + 'px, 0)';
		this.meter.style.width = Math.abs(meterWidth).toFixed() + 'px';
		
		if (centerOffset) {
			if ((normal > 0.5) != this.isPositive) {
				this.isPositive = normal > 0.5;
				toggleClass(this.meter, 'negative', !this.isPositive);
				toggleClass(this.meter, 'positive', this.isPositive);
			}
			
			meterOffset = Math.min(meterWidth, 0) + rangeWidth*0.5;
			this.meter.style[vendorTransform] = 'translate(' + meterOffset.toFixed() + 'px, 0)';
		}
	}

	function renderVertical() {
		var normal = this.normal
			, rangeHeight = this.range.clientHeight
			, handleMargin = this.handle.clientHeight
			, handlePosition = (1.0 - normal) * (rangeHeight - handleMargin)
			, centerOffset = (this.min < 0) ? 0.5 : 0
			, meterHeight = (normal - centerOffset) * rangeHeight
			, meterOffset;
		
		this.handle.style[vendorTransform] = 'translate(0, ' + handlePosition.toFixed() + 'px)';
		this.meter.style.height = Math.abs(meterHeight).toFixed() + 'px';
		
		if (centerOffset) {
			if ((normal > 0.5) !== this.isPositive) {
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

	return CVSlider;
}));
