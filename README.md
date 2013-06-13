CVSlider
========

slider + number UI Widget, CSS skinnable

Check out a [live demo](http://lukeselden.com/projects/cvslider/index.html).

CVSlider is a UI Widget that may be used as a drop-in polyfill for `<input type="range" />` and `<input type="number" />`.  It displays a vertical or horizontal range slider, a label, and a number box.

It has no dependancies, and should work on any modern browser that supports CSS3 Transforms.  It also works on touch-enabled devices, though perhaps with degraded performance.

It's imminently customizable via CSS -- I've included a couple of different 'themes' as a separate CSS file.

Usage
---------------------------------------		
		
		// create a new slider from an existing HTML element
		// <input id="ohai" type="range" min=-1 max=1 step=0.1 value=0.3 />

		var inputElement = document.getElementById('ohai');
		var slider = new CVSlider(inputElement); // automatically picks up min/max/etc, and wraps with slider
		
		// create from container, jQuery style
		// <div id="placeholder" style="width: 500px;"></div>
		
		var containerElement = document.getElementById('placeholder');
		var slider = new CVSlider(containerElement, { theme: 'minimal' }; // defaults to 0 - 1 range
		
		// create, add element later
		var slider = new CVSlider({ min: 0, max: 360, step: 1, value: 90 });
		document.body.appendChild(slider.el);
		
Options
---------------------------------------		
		var slider = new CVSlider(el, options);
		
> *el* is any DOM Element.
>> If it's a HTMLInputElement it will be wrapped with the Slider (it becomes `<input type="number" class="cv-input" />`, and is the number display)/
>> Otherwise it will become the slider.

> *options* is an object with any of the following entries:
* value: Number - initial value
* min: Number - minimum value
* max: Number - maximum value
* step: Number - step increment
* warp: 'lin' or 'exp' - linear scale ('lin') or exponential scale ('exp').
* spec: String - a preset for the above values.  These are defined in CVScale.specs.
* direction: 'vertical' or 'horizontal' (default 'horizontal')
* theme: CSS className to be added to the slider.  Current options are 'cv-default', 'minimal', 'flatui', 'datgui'
* label: String - Slider label
* numCharacters: maximum number of characters to show in number box.  Default is to calculate based on range/step
* maxPrecision: maximum precision of number display.  Note that this only affects the display, not the actual value (use 'step' to set the real precision)
* width: CSS value or Number: set width of slider
* height: CSS value or Number: set height of slider

These options may also be specified in the Element's attributes (the options object takes precedence), i.e.:
		// <input id="foo" type="number" min=-10 max=10 step=0.1 value=8 direction="vertical" />'
		new CVSlider(document.getElementById('foo'), {
			label: 'foo',
			theme: 'flatui',
			value: 0.3, // overwrites what was set in element attributes
		});
		
	
Changing values and event handling
---------------------------------------		
		
		var inputElement = document.querySelector('input'); // grab first element
		var slider = new CVSlider(inputElement, {
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