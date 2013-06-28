Ctl
========

slider + number UI Widget, CSS skinnable

Ctl is a UI Widget that may be used as a drop-in polyfill for `<input type="range" />` and `<input type="number" />`.  It displays a vertical or horizontal range slider, a label, and a number box.

It has no dependancies, and should work on any modern browser that supports CSS3 Transforms.  It also works on touch-enabled devices, though perhaps with degraded performance.

It's imminently customizable via CSS -- I've included a couple of different 'themes' as a separate CSS file.


### Demo ###

Check out a live demo [here](http://lukeselden.com/projects/ctl/index.html).

### Tests ###
Mocha tests included [here] (http://lselden.github.io/Ctl/test/index.html).

Usage
---------------------------------------		
		
		// create a new slider from an existing HTML element
		// <input id="ohai" type="range" min=-1 max=1 step=0.1 value=0.3 />

		var inputElement = document.getElementById('ohai');
		var slider = new Ctl(inputElement); // automatically picks up min/max/etc, and wraps with slider
		
		// create from container, jQuery style
		// <div id="placeholder" style="width: 500px;"></div>
		
		var containerElement = document.getElementById('placeholder');
		var slider = new Ctl(containerElement, { theme: 'minimal' }; // defaults to 0 - 1 range
		
		// create, add element later
		var slider = new Ctl({ min: 0, max: 360, step: 1, value: 90 });
		document.body.appendChild(slider.el);
		
If jQuery is included on the page then this class will add itself as a jQuery plugin:
		// all range inputs will become Ctls. controls = array of Ctl
		var controls = $('input[type=range]').ctl(options);
		
Options
---------------------------------------		
		var slider = new Ctl(el, options);
		
> *el* is any DOM Element.
>> If it's a HTMLInputElement it will be wrapped with the Ctl (it becomes `<input type="number" class="ctl-input" />`, and is the number display)/
>> Otherwise it will become the slider.

> *options* is an object with any of the following entries:
* value: Number - initial value
* min: Number - minimum value
* max: Number - maximum value
* step: Number - step increment
* warp: 'lin' or 'exp' - linear scale ('lin') or exponential scale ('exp').
* spec: String - a preset for the above values.  These are defined in Ctl.specs.
* direction: 'vertical' or 'horizontal' (default 'horizontal')
* theme: CSS className to be added to the slider.  Current options are 'electro', 'minimal', 'flat', 'dat'
* label: String - slider label
* numCharacters: maximum number of characters to show in number box.  Default is to calculate based on range/step
* maxPrecision: maximum precision of number display.  Note that this only affects the display, not the actual value (use 'step' to set the real precision)
* width: CSS value or Number: set width of slider
* height: CSS value or Number: set height of slider

These options may also be specified in the Element's attributes (the options object takes precedence), i.e.:
		// <input id="foo" type="number" min=-10 max=10 step=0.1 value=8 direction="vertical" />'
		new Ctl(document.getElementById('foo'), {
			label: 'foo',
			theme: 'flat',
			value: 0.3, // overwrites what was set in element attributes
		});
		
	
Changing values and event handling
---------------------------------------		
		
		var inputElement = document.querySelector('input'); // grab first element
		var slider = new Ctl(inputElement, {
			min: 0,
			max: 100,
			step: 1,
			value: 0
		});
		
		console.log(slider.value, slider.normal);
		
		slider.value = 50; // normal switches to 0.5, along with UI
		
		slider.normal = 1; // value switches to 100, along with UI
		
		// listen for change events
		var listenerFunction = function (value, normal) {
			console.log('slider changed', value, normal);
		}
		
		slider.bind(listenerFunction);
		
		// stop listening
		slider.unbind(listenerFunction);
		
		// or listen based on DOM change events:
		// slider.input is the input element
		slider.input.addEventListener('change', listenerFunction);

#### Experimental: ####
Added single javascript file (ctl.singlefile.experimental.min.js) that includes all javascript code as well as the necessary CSS.
CSS is stored as string and will be dynamically added to <head> on page load.

##### Credits:
This code is partly inspired by [SuperCollider3](https://github.com/supercollider/supercollider)'s EZSlider, and borrows it's name from Ron Kuivila's CV Quark.
Spec presets are lifted from SC3's (ControlSpec)[https://github.com/supercollider/supercollider/blob/cfef1d3598425d25badf197f96b41b4c664c9849/SCClassLibrary/Common/GUI/ControlModel.sc]
'flat' theme emulates (FlatUI)[http://designmodo.github.io/Flat-UI/]
'dat' theme emulates (datgui)[https://code.google.com/p/dat-gui/]

_2013 Luke Selden_
Released under the [WTFPL license](http://www.wtfpl.net/)
