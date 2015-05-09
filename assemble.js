var fs = require('fs.extra');
var doT = require('dot');


var SRC_FOLDER = "input";
var DEST_FOLDER = "output";
doT.templateSettings.varname = "it, def";
doT.templateSettings.define = /\{\{##\s*(\S+)\s*(\:|=)\s*([\s\S]+?)\s*#\}\}/g;
doT.templateSettings.strip = false;


var p = console.log.bind(console);

function copy(fname, from, to) {
	fs.createReadStream(from+"/"+fname).pipe(fs.createWriteStream(to+"/"+fname));
}

function makeDef(mdef) {
	var attrs = {plus:{js:[], css:[], head:[]}};
	if (mdef) for (var i in attrs.plus) attrs.plus[i] = mdef.plus[i].slice();
	
	var def = Proxy.create({
		get: function(proxy, name){ return attrs[name] },
		has: function(name){ return name in attrs },
		set: function(proxy, name, val) {
			if (name[0] == "+") {
				var a = attrs.plus[name.substr(1)];
				if (a) { a.push(val); return; }
				console.warn("Don't know how to add <"+name+">");
			}
			attrs[name] = val;
		}
	});
	
	return def;
}


p("Building source files tree...");
var node_id = 0;
function searchDir(cur_fname, fullpath, level) {
	var treeNode = {
		id: node_id++,
		level: level,
		fname: cur_fname,
		children: [],
		with_index: fs.existsSync(fullpath+"/index.html")
	};
	fs.readdirSync(fullpath).forEach(function(fname) {
		var newpath = fullpath+"/"+fname;
		var stats = fs.statSync(newpath);
		if (stats.isDirectory()) {
			treeNode.children.push(searchDir(fname, newpath, level+1));
		}
	});
	return treeNode;
};
var fullTree = searchDir("", SRC_FOLDER, 0);


p("Parsing main templates...");
var mdef = makeDef();
var tMain = doT.template(fs.readFileSync(SRC_FOLDER+"/main.html"), null, mdef);
var tTree = doT.template(fs.readFileSync(SRC_FOLDER+"/tree.html"), null, mdef);


p("Cleaning "+DEST_FOLDER+" ...");
fs.rmrfSync(DEST_FOLDER);
fs.mkdirpSync(DEST_FOLDER);


console.log("Searching tree...");
function handleTreeLevel(treeNode, fullpath) {
	
	var src_dir = SRC_FOLDER + fullpath;
	var dest_dir = DEST_FOLDER + fullpath;
	var def = makeDef(mdef);
	
	
	p("  "+src_dir+"  -->  "+dest_dir);
	fs.mkdirpSync(dest_dir);
	
	
	fs.readdirSync(src_dir).forEach(function(fname) {
		var m = fname.match(/^(.*)\.([^.]+)$/);
		if (!m || fname=="index.html") return;
		p("    "+fname);
		copy(fname, src_dir, dest_dir);
		if (m[2]=="css" || m[2]=="js") def["+"+m[2]] = fullpath+"/"+fname;
	});
	
	
	if (treeNode.with_index) {
		p("    *index.html");
		
		var tIndex = doT.template(fs.readFileSync(src_dir+"/index.html"), null, def);
		
		fs.writeFileSync(
			dest_dir+"/index.html",
			tMain({
				tree: tTree({
					tree: fullTree,
					currentNode: treeNode,
					url: fullpath
				}, def),
				content: tIndex({
					url: fullpath
				}, def),
				url: fullpath
			}, def)
		);
	} else {
		p("    NO index.html");
	}
	
	
	treeNode.children.forEach(function(child) {
		handleTreeLevel(child, fullpath+"/"+child.fname);
	});
}
handleTreeLevel(fullTree, "");
