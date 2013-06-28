var sandbox;

function quantize (val, step) {
    step || (step = 0.001);
    // round then get rid of floating point errors
    val = Math.round(val / step) * step;

    return parseFloat(val.toString().replace(/(\.[\d]+[1-9])0{8,}[1-9]{0,4}/, '$1'), 10);
}

chai.Assertion.addMethod('equalToPrecision', function (num, step) {
    
    this.assert(
    quantize(this._obj, step) === quantize(num, step)
    , 'expected #{this} to be equal to ' + num + ' +/- ' + step
    , 'expected #{this} to not be equal to ' + num + ' +/- ' + step
    );
});


function random (ctl) {
    var rnd = Math.random(),
        val = rnd*(ctl.max - ctl.min) + ctl.min,
        norm;
    val = quantize(val, ctl.step);
    norm = val*(ctl.max - ctl.min) + ctl.min;
    
    return {
        value: val,
        normal: norm
    };
}

function getHandlePosition (ctl) {
    var positionRegex = /translate\((\d+)px/;
    return (ctl.handle.style.cssText.match(positionRegex) || [,0])[1];
}
before(function () {
    sandbox = document.querySelector('#content');
});

describe('constructor', function () {
    describe('empty', function () {
        it('Ctl()', function () {
            (Ctl()).should.be.an.instanceof(Ctl);
        });
        it('new Ctl()', function () {
            (new Ctl()).should.be.an.instanceof(Ctl);
        });
    });
    describe('Ctl(<div>)', function () {
        var el, c;
        
        it('setup', function () {
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
    describe('Ctl(<input>)', function () {
        var el, c;
        
        it('setup', function () {
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
    describe('Ctl({options object})', function () {
        var opts, c, expectedValue;
        
        it('setup', function () {
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
            c.value.should.equal(opts.value);
        });
    });
    
    describe('Ctl(<div>, {options object})', function () {
        var el, opts, c, expectedValue;
        
        it('setup', function () {
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
            c.value.should.equal(opts.value);
        });
        
    });
});    
describe('jQuery Plugin', function () {

    it('$({invalid selector}).ctl() === null', function () {
        expect( $('#invalid_empty').ctl() ).to.be.null;
    });
    
    describe('single: $(#id).ctl(options) === new Ctl(el, options)', function () {
        var $el, c,
            selector,
            options;
        
        it('setup', function () {
            selector = '#test-id-selector';
            options = {
                theme: 'minimal',
                label: 'ohai jQuery'
            };
            $el = $('<div>', {
                id: selector.slice(1)
            });
            $el.appendTo(sandbox);
            c = $el.ctl(options);
        });
        it('instance of Ctl', function () {
            c.should.be.instanceOf(Ctl);
        });
        it('should find el and keep id', function () {
            c.el.should.equal($el[0]);
            $(selector)[0].should.equal(c.el);
        });
        it('should set options (theme and label)', function () {
            $el.hasClass(options.theme).should.be.true;
            $el.find('.ctl-label').text().should.equal(options.label);
        });
        after(function () {
            //c.el.parentNode.removeChild(c.el);
            $el.remove();
            $el = null;
            c = null;
        });
    });
    describe('multiple: $(input.class).ctl(options) === [Ctl,Ctl...Ctl]', function () {
        var items,
            $elements,
            n = 4,
            selector,
            options;
        it('setup', function () {
            selector = '.test-class-selector',
            options = {
                theme: 'dat',
                label: 'test'
            };
            for (var i=0; i < n; i++) {
                $('<input>', {
                    min: 0,
                    max: n,
                    value: i,
                    'class': selector.slice(1)
                }).appendTo(sandbox);
            }
            $elements = $(selector);
            items = $(selector).ctl(options);
        });
        it('instance of Array<Ctl>', function () {
            items.should.be.instanceOf(Array);
            items.should.not.be.empty;
            items[0].should.be.instanceOf(Ctl);
        });
        it('should set options (theme and label)', function () {
            $elements.parent().hasClass(options.theme).should.be.true;
            $elements.siblings().filter('.ctl-label').each(function () {
                $(this).text().should.equal(options.label);
            });
        });
        it('should use each element\'s attributes (<input value={unique}>)', function () {
            items.forEach(function (ctl, i) {
                ctl.value.should.equalToPrecision(i);
            });
        });
        after(function () {
            $elements.remove();
            items.forEach(function (item) {
                item.el.remove();
                item = null;
            });
            $elements = null;
            items = null;
        });
    });    
});

describe('Options', function () {
    var opts,
        defaults;
    it('setup', function () {
        opts = {
            min: -10,
            max: 10,
            step: 0.1,
            value: 5,
            warp: 'lin',
            direction: 'vertical',
            theme: 'minimal',
            label: 'test_label',
            numCharacters: 4
        };
        defaults = Ctl.defaultOptions;
        
    });
    describe('defaults only', function () {
        var c;
        
        it('setup', function () {
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
        it('setup', function () {
            
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
        it('.step/.input.step equal to <input step={step} > (within precision)', function () {
            c.input.step.should.be.equalToPrecision(opts.step, 0.0001);
            c.step.should.be.equalToPrecision(opts.step, 0.0001);
        });
        it('value = <input value={value} >', function () {
            c.input.value.should.be.equalToPrecision(opts.value, 0.0001);
            c.value.should.equalToPrecision(opts.value, 0.0001);
        });
    });
    describe('options', function () {
        var c;
        it('setup', function () {            
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
        it('setup', function () {
            specName = 'freq';
            spec = Ctl.specs[specName];
            c = new Ctl({spec: specName});
        });
        it('.min/max === spec.min/max', function () {
            c.min.should.equal(spec.min);
            c.max.should.equal(spec.max);
        });
        it('.step close to opts.step (precision)', function () {
            if (spec.step === 0) {
                c.step.should.be.equalToPrecision( Math.pow(10, -1 * Ctl.defaultOptions.defaultPrecision) );
            } else {
                c.step.should.be.within(spec.step, 0.00001);
            }
        });
        it('value === opts.value (rounded/clamped by min/max/step)', function () {
            c.value.should.equal(spec.value);
        });
    });
    describe('attributes, spec and options', function () {
        var el, c, specName, spec, attrs, options;
            
        it('setup', function () {
            specName = 'rate';
            spec = Ctl.specs[specName];
            attrs = {
                value: spec.value + 1,
                min: spec.min + 0.5
            };
            options = {
                spec: specName,
                min: spec.min + 1
            };
            
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
    var c, min, max, step, value, normal, previousNormal, previousValue, previousPosition;
    it('setup', function () {
        min = -10;
        max = 10;
        step = 2;
        value = 5;
        normal = 0.75;
        previousNormal;
        previousValue;
        previousPosition;
        
        c = new Ctl({
            min: 0,
            max: 1,
            value: 0,
            step: 0,
            warp: 'lin'
        });
        sandbox.appendChild(c.el);
        previousNormal = c.normal;
        previousValue = c.value;
        previousPosition = getHandlePosition(c);
    });
    describe('.value = new value', function () {
        it('.value > max === max', function () {
            c.value = c.max + 1;
            c.value.should.be.equal(c.max);
        });
        
        it('.value < min === min', function () {
            c.value = c.min - 1;
            c.value.should.be.equal(c.min);
        });
            
        it('.value in range === value', function () {
            var newvalue = random(c).value;
            c.value = newvalue;
            c.value.should.be.equalToPrecision(newvalue, c.step);
        });
        it('ui is updated', function (done) {
            var rnd = random(c),
                newvalue = rnd.value,
                previousPosition = getHandlePosition(c);
            
            while (Math.abs(rnd.normal - c.normal) < 0.15) {
                rnd = random(c);
                newvalue = rnd.value;
            }
            
            c.value = newvalue;
            requestAnimationFrame(function () {
                getHandlePosition(c).should.not.equalToPrecision(previousPosition);
                done();
            });
        });
    });
    describe('.normal = new normal', function () {
        it('.normal > 1 === 1', function () {
            c.normal = 2;
            c.normal.should.be.equal(1);
        });
        
        it('.normal < 0 === 0', function () {
            c.normal = -100
            c.normal.should.be.equal(0);
        });
            
        it('.normal in range === new normal', function () {
            var newnormal = 0.5;
            c.normal = newnormal;
            c.normal.should.be.equal(newnormal);
        });
        it('ui is updated', function (done) {
            var newnormal = random(c).normal,
                previousPosition = quantize(getHandlePosition(c));
            
            // ensure newnormal is far enough away to avoid pixel rounding
            while (Math.abs(newnormal - c.normal) < 0.15) newnormal = random(c).normal;
            
            c.normal = newnormal;
            requestAnimationFrame(function () {
                quantize(getHandlePosition(c)).should.not.equal(previousPosition);
                done();
            });
        });
    });
    describe('.min = new min', function () {
        it('setup', function () {
            previousNormal = c.normal;
            previousValue = c.value;
            c.min = min;
        });
        it('.min === new min', function () {
            c.min.should.be.equal(min);
        });
        it('.normal !== previous normal', function () {
            c.normal.should.not.be.equal(previousNormal);
        });
        it('.value === previous value', function () {
            c.value.should.be.equal(previousValue);
        });
    });
    describe('.max = new min', function () {
        it('setup', function () {
            previousNormal = c.normal;
            previousValue = c.value;
            c.max = max;
        });
        it('.max === new max', function () {
            c.max.should.be.equal(max);
        });
        it('.normal !== previous normal', function () {
            c.normal.should.not.be.equal(previousNormal);
        });
        it('.value === previous value', function () {
            c.value.should.be.equal(previousValue);
        });
    });
    describe.skip('.step', function () {
        it('todo', function(){});
    });
    describe.skip('.warp', function () {
        it('todo', function(){});
    });
    after(function () {
        sandbox.removeChild(c.el);
        c = null;        
    });
});

describe('UI', function () {
    //isvertical
    describe('direction: vertical', function () {
        var vert, horiz;
        it('setup', function () {
            vert = new Ctl({direction: 'vertical'});
            horiz = new Ctl({direction: 'horizontal'});
                
            sandbox.appendChild(vert.el);
            sandbox.appendChild(horiz.el);
        });
        it('vertical is taller than it is wide', function () {
            vert.isVertical.should.be.true;
            vert.el.clientHeight.should.be.greaterThan(vert.el.clientWidth);
        });
        it('horizontal is wider than it is tall', function () {
            horiz.isVertical.should.be.false;
            horiz.el.clientWidth.should.be.greaterThan(horiz.el.clientHeight);
        });
        after(function () {
            sandbox.removeChild(vert.el);
            sandbox.removeChild(horiz.el);
            vert = null;
            horiz = null;
        });
    });
    describe('format number', function () {
        var minCharacters = 3,
            maxCharacters = 9;
        it('setup', function () {
            minCharacters = 3;
            maxCharacters = 9;
        });
        it('signed', function () {
            var ctl, x, scale, opts;
            
            // test every possible number of characters
            for (var num = minCharacters; num <= maxCharacters; num++) {
                // test various maximum levels
                for (var max = num-minCharacters; max < Math.min(num-1, 5); max++) {
                    // test various precisions (0.001, 0.01, 0.1, 1, 10)
                    for (var stepScale = -3; stepScale <= 1; stepScale++) {
                    
                        ctl = new Ctl({
                            min: -1 * Math.pow(10, max),
                            max: Math.pow(10, max),
                            warp: 'lin',
                            step: Math.pow(10, stepScale),
                            numCharacters: num
                        });
                        
                        // test entire scale and make sure it's valid
                        for (var j = 0; j <= 10; j++) {
                            ctl.normal = j/(10);
                            ctl.formatNumber(ctl.value).length.should.be.equal(num);
                        }
                    }
                }
            }
        });
        it('unsigned', function () {
            var ctl, x, scale, opts;
            
            // test every possible number of characters
            for (var num = minCharacters; num <= maxCharacters; num++) {
                // test various maximum levels
                for (var max = num-minCharacters; max < Math.min(num, 5); max++) {
                    // test various precisions (0.001, 0.01, 0.1, 1, 10)
                    for (var stepScale = -3; stepScale <= 1; stepScale++) {
                        ctl = new Ctl({
                            min: 0.01,
                            max: Math.pow(10, max),
                            warp: 'exp',
                            step: Math.pow(10, stepScale),
                            numCharacters: num
                        });
                        
                        // test entire scale and make sure it's valid
                        for (var j = 0; j <= 10; j++) {
                            ctl.normal = j/(10);
                            ctl.formatNumber(ctl.value).length.should.be.equal(num);
                        }
                    }
                }
            }
        });
    });
});

describe('Events', function () {
    var ctl, seed, callback, listener;
    it('setup', function () {
        ctl = new Ctl();
        sandbox.appendChild(ctl.el);
        seed = random(ctl);
    });
    
    it('should be bindable', function () {
        listener = function ( value, normal ) {
            callback(value, normal);
        }
        
        ctl.bind(listener);
        ctl.listeners.should.include(listener);
    });
    it('should notify listeners on change', function (done) {
        callback = function ( value, normal ) {
            value.should.be.equalToPrecision(seed.value, ctl.step);
            normal.should.be.equalToPrecision(seed.normal, ctl.step);
            done(); // will be set to done
        }
        
        // trigger change event
        ctl.value = seed.value;
    });
    it('should allow unbinding of listeners', function () {
        ctl.unbind(listener);
        ctl.listeners.should.not.include(listener);
    });
    
    describe('input change', function () {
    });
    describe('mousewheel', function () {
    });
    describe('mouse', function () {
    });
    describe('keyboard', function () {
    });
    after(function () {
        sandbox.removeChild(ctl.el);
        ctl = null;
    });
    
});