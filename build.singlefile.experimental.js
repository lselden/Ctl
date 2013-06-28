
var ugly = require('uglify-js');
var util = require('util');
var fs = require('fs');


var toplevel = null;

// add javascript
var code = fs.readFileSync('ctl.js').toString();
toplevel = ugly.parse(code, {
	filename: 'ctl.js',
	toplevel: toplevel
});

// add css
var rawcss = fs.readFileSync('ctl.css').toString();

rawcss += '\n' + fs.readFileSync('ctlthemes.css').toString();

wrappedcss = "["
	+ rawcss
		.replace(/\/\*.*\*\//g, '')
		.replace(/\t/g, '')
		.replace(/'/g,"\\'")
		.replace(/(.*)/g, "'$1',")
		.replace(/('',\n?)/g, '')
		.slice(0,-1) // remove trailing
	+ "].join('\\n');";


var cssAsJavascript = ["(function () {",
"	var csstext = ",
wrappedcss,
"	var style = document.createElement('style'), csstext;",
"	style.type = 'text/css';",
"	if ( style.styleSheet ) {",
"		style.styleSheet.cssText = csstext;",
"	} else {",
"		style.appendChild(document.createTextNode(csstext));",
"	}",
"	document.head.appendChild(style);",
"})();"].join('\n');

toplevel = ugly.parse(cssAsJavascript, {
	filename: 'ctl.css.js',
	toplevel: toplevel
});


toplevel.figure_out_scope();

var compressor = ugly.Compressor(compressOptions);
var compressed = toplevel.transform(compressor);

compressed.figure_out_scope();
compressed.compute_char_frequency();

var options = {
	indent_start  : 0,
	indent_level  : 2,
	quote_keys    : false,
	space_colon   : true,
	ascii_only    : false,
	inline_script : false,
	width         : 80,
	max_line_len  : 32000,
	ie_proof      : true,
	beautify      : false,
	source_map    : null,
	bracketize    : true,
	semicolons    : true,
	comments      : false,
	preserve_line : false
};

var output = ugly.OutputStream(options);
compressed.print(output);
var code = output.toString();

fs.writeFileSync('ctl.singlefile.experimental.min.js', output.toString());
