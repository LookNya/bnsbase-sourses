var static = require('node-static');

//
// Create a node-static server instance to serve the './output' folder
//
var file = new static.Server('./output');

require('http').createServer(function (request, response) {
    request.addListener('end', function () {
        //
        // Serve files!
        //
        file.serve(request, response);
    }).resume();
}).listen(80);