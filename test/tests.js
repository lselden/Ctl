var sandbox;

before(function () {
	sandbox = document.querySelector('#content');
});

describe('constructor', function () {
	describe('empty', function () {
		var c;
		
		before(function () {
			c = Ctl();
		});
		it('Ctl()', function () {
			c.should.be.an.instanceof(Ctl);
		});
		it('new Ctl()', function () {
			c.should.be.an.instanceof(Ctl);
		});
	});
	describe('Ctl(div)', function () {
		var el, c;
		
		before(function () {
			el = document.createElement('div');
			sandbox.appendChild(el);
			c = new Ctl(el);
		});
		it('should use div as container', function () {
			c.el.should.equal(el);
		});
		it('should fill div with content', function () {
			c.input.parentNode.should.equal(c.el);
		});
		it('should keep same parent', function () {
			c.el.parentNode.should.equal(sandbox);
		});
		it('should be removed from parent', function () {
			sandbox.removeChild(el);
			c.el.should.have.property('parentNode', null);
		});
	});
	describe('Ctl(input range)', function () {
		var el, c;
		
		before(function () {
			el = document.createElement('input');
			sandbox.appendChild(el);
			c = new Ctl(el);
		});
		it('should use el as input element', function () {
			c.input.should.equal(el);
		});
		it('should wrap el with container', function () {
			c.input.parentNode.should.equal(c.el);
		});
		it('should keep same parent', function () {
			c.el.parentNode.should.equal(sandbox);
		});
		it('should be removed from parent', function () {
			sandbox.removeChild(c.el);
			c.el.should.have.property('parentNode', null);
		});
	});
	
	describe('options', function () {
		var opts, c, expectedValue;
		
		before(function () {
			expectedValue = 0.87;
			opts = {
				value: expectedValue
			};
			c = new Ctl(opts);
		});
		it('should have DOM content', function () {
			c.el.should.exist;
		});
		it('should have value set', function () {
			c.value.should.equal(expectedValue);
		});
	});
	
	describe('both', function () {
		var el, opts, c, expectedValue;
		
		before(function () {
			el = document.createElement('div');
			expectedValue = 0.87;
			opts = {
				value: expectedValue
			};
			c = new Ctl(el, opts);
		});
		it('should use el as container', function () {
			c.el.should.equal(el);
		});
		it('should have value set', function () {
			c.value.should.equal(expectedValue);
		});
		
	});
	
	describe('jQuery style', function () {
		var expectedValue, opts;
		
		describe('Ctl(), this is el', function () {
			var el;
			
			before(function () {
				el = document.createElement('div');
				c = Ctl.call(el);
			});
			
			it('should use el as container', function () {
				c.el.should.equal(el);
			});
		});
		
		describe('Ctl(options), this is el', function () {
			before(function () {
				expectedValue = parseFloat(Math.random().toFixed(3), 10);
				el = document.createElement('div');
				opts = {
					value: expectedValue
				};
				c = Ctl.call(el, opts);
			});
			it('should use el as container', function () {
				c.el.should.equal(el);
			});
			it('should have value set', function () {
				c.value.should.equal(expectedValue);
			});
		});
	});
});

describe('Options', function () {
	var opts = {
			min: -10,
			max: 10,
			step: 0.1,
			value: 5,
			warp: 'lin',
			direction: 'vertical',
			theme: 'minimal',
			label: 'test_label',
			numCharacters: 4
		},
		defaults = Ctl.defaultOptions;
	
	describe('defaults only', function () {
		var c;
		before(function () {
			c = Ctl();
		});
		it('should use default options', function () {
			expect(c.min).to.equal(defaults.min);
			expect(c.max).to.equal(defaults.max);
			expect(c.value).to.equal(defaults.value);
			expect(c.warp).to.equal(defaults.warp);
		});
	});
	describe('set from <input> attributes', function () {
		var el, c;
		before(function () {
			
			el = document.createElement('input');
			el.type = 'range';
			Object.keys(opts).forEach(function ( key ) {
				el[key] = opts[key];
			});
			c = new Ctl(el);
		});
		it('.input type="number"', function () {
			c.input.type.should.equal('number');
		});
		it('.min/max === <input min={min} max={max} />', function () {
			c.min.should.equal(opts.min);
			c.max.should.equal(opts.max);
		});
		it('Ctl.input min & Ctl.input.max == <input min={min} max={max} /> (after type conversion)', function () {
			parseFloat(c.input.min, 10).should.equal(opts.min);
			parseFloat(c.input.max, 10).should.equal(opts.max);
		});
		it('.step/.input.step close to <input step={step} > (not exact because of precision when step=0)', function () {
			parseFloat(c.input.step, 10).should.be.within(opts.step - 0.01, opts.step + 0.1);
			c.step.should.be.within(opts.step - 0.01, opts.step + 0.1);
		});
		it('value = <input value={value} >', function () {
			c.value.should.equal(opts.value);
		});
	});
	describe('options', function () {
		var c;
		before(function () {			
			c = new Ctl(opts);
		});
		it('.min/max === opts.min/max', function () {
			c.min.should.equal(opts.min);
			c.max.should.equal(opts.max);
		});
		it('.step close to opts.step (precision)', function () {
			c.step.should.be.within(opts.step - 0.01, opts.step + 0.1);
		});
		it('value = opts.value', function () {
			c.value.should.equal(opts.value);
		});
	});
	describe('spec', function () {
		var c, spec, specName;
		before(function () {
			specName = 'freq';
			spec = Ctl.specs[specName];
			c = new Ctl({spec: specName});
		});
		it('.min/max === spec.min/max', function () {
			c.min.should.equal(spec.min);
			c.max.should.equal(spec.max);
		});
		it('.step close to opts.step (precision)', function () {
			c.step.should.be.within(spec.step - 0.01, spec.step + 0.1);
		});
		it('value = opts.value', function () {
			c.value.should.equal(spec.value);
		});
	});
	describe('attributes, spec and options', function () {
		var el, c, 
			specName = 'rate',
			spec = Ctl.specs[specName],
			attrs = {
				value: spec.value + 1,
				min: spec.min + 0.5
			},
			options = {
				spec: specName,
				min: spec.min + 1
			};
			
		before(function () {
			
			el = document.createElement('input');
			el.value = attrs.value;
			el.min = attrs.min;
			
			c = new Ctl(el, options);
		});
		it('options have highest priority', function () {
			c.min.should.equal(options.min);
			c.min.should.not.equal(attrs.min);
			c.min.should.not.equal(spec.min);
			c.min.should.not.equal(defaults.min);
		});
		it('attributes have next highest priority', function () {
			// options.value is null
			c.value.should.not.equal(options.value);
			c.value.should.equal(attrs.value);
			c.value.should.not.equal(spec.value);
			c.value.should.not.equal(defaults.value);
		});
		it('spec has next priority', function () {
			c.max.should.not.equal(options.max);
			c.max.should.not.equal(attrs.max);
			c.max.should.equal(spec.max);
			c.max.should.not.equal(defaults.max);
		});
	});
});

describe('Object Setters', function () {
	describe('#min', function () {
	});
	describe('#max', function () {
	});
	describe('#step', function () {
	});
	describe('#value', function () {
	});
	describe('#normal', function () {
	});
	describe('#warp', function () {
	});
});