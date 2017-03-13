var request = require("request");
const querystring = require("querystring");

//var WebSocket = require('ws');
var WebSocketClient = require('websocket').client;
var ws;
var message="";
var i = 0;
var latex = {};
var users = {};
var fs = require('fs');
fs.readFile('secret.txt','utf8',function (err, data) {
    global.token=data;
    global.token = global.token.replace(/[\n\r]/g,"");
    getWebSocket();
});

var start_t = Date.now()/1000
var connection = null;

//gets the websocket url 
function getWebSocket(){
    request('https://slack.com/api/rtm.start?token='+global.token+'&pretty=1', function (error, response, body) {
         if (!error && response.statusCode == 200) {
            url = JSON.parse(body).url;
            createWS(url);
         }
    });
}


//initiates websocket connection
function createWS(url) {
    var client = new WebSocketClient();

    client.on('connectFailed', function(error) {
        console.log('Connect Error: ' + error.toString());
    });

    client.on('connect', function(conn) {
	connection = conn;
        connection.on('error', function(error) {
            console.log("Connection Error: " + error.toString());
        });

        connection.on('close', function() {
            console.log('echo-protocol Connection Closed');
        });

        connection.on('message', function(message) {
            if (message.type === 'utf8') {
                handleMessage(JSON.parse(message.utf8Data),message);
            }

        });
    });
    client.connect(url);
    console.log("hey?");

}

function deleteMessage(timestamp,channel) {
    var dURL = "https://slack.com/api/chat.delete?token="+global.token+"&ts=" +timestamp+"&channel="+channel+"&pretty=1";

    request(dURL, function (error, response, body) {
         if (!error && response.statusCode == 200) {
         }
        });
}

function postLatex(mObj) {
    var channel = mObj.channel;
    var text = replaceAll(mObj.text.substring(1, mObj.text.length - 1),'&amp;','&');
    var urlBase= 'http://latex.codecogs.com/png.latex?%5Cdpi%7B300%7D%20'+encodeURIComponent(text);

    var userName = users[mObj.user];

    var msg = {
            "token": global.token,
            "channel": channel,
            "text": " ",
            "attachments": [
                    {
                            "fallback": "Equation: $" + text + "$",
                            "color": "#36a64f",
                            "text": "$" + text + "$",
                            "image_url": urlBase,
                            "footer": "Posted by " + userName
                    }
            ]
    }
    msg.attachments = JSON.stringify(msg.attachments);

    var dURL = "https://slack.com/api/chat.postMessage?" + querystring.stringify(msg);
    
    request(dURL, function (error, response, body) {
         if (!error && response.statusCode == 200) {
         }
        });
}


function handleMessage(mObj,message){

    if(mObj.type==='message'){
        if(mObj.text==='..ping'){
            pong(mObj.channel,"pong");
        }
        if(mObj.ts > start_t && typeof(mObj.text) != "undefined" && mObj.text.length > 1 && mObj.text[0]==='$' && mObj.text[mObj.text.length-1]==='$') {
            deleteMessage(mObj.ts,mObj.channel);
            getUserName(mObj);
        }
    }

}
function pong(channel,text){
    if (connection.connected) {
        var message2send={};
        message2send.text=text;
        message2send.channel=channel;
        message2send.id=i;
        message2send.type="message";
        connection.sendUTF( JSON.stringify(message2send));
        i+=1;
        return i;
    }
}

function escapeRegExp(str) {
	return str.replace(/([.*+?^=!:${}()|[]\/\])/g, "\$1");
}
function replaceAll(str, find, replace) {
	return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}
function getUserName(mObj) {
    var userId = mObj.user;
    if(userId in users)
    {
        postLatex(mObj);
        return;
    }
    var dURL = "https://slack.com/api/users.info?token="+global.token+"&user="+userId;
    request(dURL, function(error, response, body) {
            body = JSON.parse(body);
            if(!error && response.statusCode == 200 && body.ok)
            {
                users[userId] = body.user.name;
                postLatex(mObj);
            }
    });
}
