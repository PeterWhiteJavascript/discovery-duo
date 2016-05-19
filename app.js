var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var PF = require('pathfinding');

app.use(express.static(__dirname + '/public'));
app.get('/', function(req, res){
    res.render('/index.html');
});

var Quintus = require("./public/lib/quintus.js");

require("./public/lib/quintus_sprites.js")(Quintus);
require("./public/lib/quintus_scenes.js")(Quintus);
require("./public/lib/quintus_2d.js")(Quintus);
require("./server/q_server.js")(Quintus);
require("./public/objects.js")(Quintus);
require("./public/q_functions")(Quintus);
require("./public/player.js")(Quintus,PF);

//Stores a list of all active instances of Q
var activeFiles = {};
//Stores a list of all user id's that are connected
var globalUniqueIds = [];
//The variable that gives a unique id to a player when they join
var id = 0;
io.on('connection', function (socket) {
    id++;
    //The current user's id
    var uniqueId;
    //Checks every second to make sure the user gets connected properly
    var loginInterval;
    //This will contain this instance of Q. It will be shared between users in the same file
    var Q;
    //The current user's game state data
    var _user;
    //Initialize the connection process
    setTimeout(function () {
        socket.join('login');
        var users = globalUniqueIds;
        uniqueId = id;
        //Make sure to give a unique id
        if(users.length>0&&users[users.length-1].playerId===id){id++;uniqueId++;};
        users.push(uniqueId);
        loginInterval = setInterval(function(){
            socket.emit('connected', { uniqueId: uniqueId});
        },1000);
    }, 100);
    //This is recieved when the client confirms that it has connected
    //The latter half of this code will be used when the user logs in
    socket.on('confirmConnect',function(data){
        socket.leave("lobby");
        socket.join(data['file']);
        clearInterval(loginInterval);
        //Check if there is someone already connected in this file
        //If there is someone connected, get the file data from the active file.
        if(activeFiles[data['file']]){
            Q = activeFiles[data['file']];
            var activeUsers = Q.state.get("activeUsers");
            _user = new Q.Player(Q.getUser(Q.state.get("users"),data['userId']));
            _user.p['uniqueId']=data['uniqueId'];
            activeUsers.push(_user);
            Q.state.set("activeUsers",activeUsers);
            //Make sure to tell other clients in this file that this user has joined
            Q.broadcastEvent(socket,"joinedGame",Q.getUserData(_user));
        }
        //If there is no one connected to this file, get the data from the database (or .json)
        else {
            //Get the saveData
            var file = require("./public/data/files/"+data['file']+".json");
            //Initialize an instance of Q
            Q = Quintus().include("Sprites, Scenes, 2D, QServer, Objects, QFunctions, Player");
            //Get the game loop running
            Q.gameLoop(Q.stageStepLoop);
            activeFiles[data['file']] = Q;
            var jsons = [
                './public/data/json/buildings.json',
                './public/data/json/crops.json',
                './public/data/json/items.json',
                './public/data/json/solid_interactables.json'
            ];
            var names = [
                "Jbuildings",
                "Jcrops",
                "Jitems",
                "JsolidInteractables"
            ];
            jsons.forEach(function(json,i){
                var data = require(json);
                Q.assets[json]=data;
                Q.state.set(names[i],data); 
            });
            //Sends a socket event to all clients
            Q.sendEvent=function(name,data){
                io.sockets.in(Q.fileName).emit(name,data);
            };
            Q.broadcastEvent=function(s,name,data){
                s.broadcast.to(Q.fileName).emit(name,data);
            };
            Q.socketEmit=function(s,name,data){
                s.emit(name,data);
            };
            _user = new Q.Player(Q.getUser(file.users,data['userId']));
            var levelData = new Q.levelData();
            levelData.data = file.levelData;
            levelData.add("levelData, levelDataControls");
            Q.state.set({
                activeUsers:[_user],
                activeStages:[],
                users:file.users,
                levelData:levelData,
                encyclopedia:file.encyclopedia,//new Q.encyclopedia(),
                date:file.date,
                time:file.time,
                weather:file.weather
            });
            Q.startTime();
            Q.fileName = data['file'];
        }
        _user.p['uniqueId']=uniqueId;
        _user.socket = socket;
        //Start the scene for this user (Just adds them on server if the scene already exists)
        Q.startScene(levelData,_user);
        var level = Q.state.get("levelData").data[_user.p.map];
        socket.emit("startGame",Q.getStateData(level));
    });
    //When a client disconnects, this is run.
    socket.on('disconnect', function () {
        if(!Q||!Q.state.get("activeUsers")||!_user){ return; };
        for(var i=0;i<globalUniqueIds.length;i++){
            if(globalUniqueIds[i]===uniqueId){
                globalUniqueIds.splice(i,1);
            }
        }
        var activeUsers = Q.state.get("activeUsers");
        //Remove the user from the active users array
        for(var i=0;i<activeUsers.length;i++){
            if(_user.p.uniqueId===activeUsers[i].p.uniqueId){
                //Save the user data in the users array
                var users = Q.state.get("users");
                for(var j=0;j<users.length;j++){
                    if(users[j].uniqueId===_user.p.uniqueId){
                        users[j]=_user;
                    }
                }
                //Finally, remove the activeUser
                activeUsers.splice(i,1);
                break;
            }
        }
        //If there are no more active users on this file
        if(activeUsers.length===0){
            clearInterval(Q.timeInterval);
            //Remove the file from the activeFiles
            delete activeFiles[Q.fileName];
        }
        Q.state.set("activeUsers",activeUsers);
        io.emit('disconnected', {uniqueId:uniqueId});
    });
    
    socket.on("touch",function(data){
        var currentLevel = Q.state.get("activeStages").filter(function(st){
            return st.map===data['map'];
        })[0];
        var player = currentLevel.activePlayers.filter(function(p){
            return p.p.uniqueId===uniqueId;
        })[0];
        player.processTouch(data);
    });
    
    //Bag functions
    //This is used when the client tells the server what to do (As long as the user is not trying to add/remove item to bag, this will probably be used)
    //Sort, Change Active, 
    socket.on("bagFunc",function(data){
        _user.Bag[data['func']](data['props']);
    });

});

server.listen(process.env.PORT || 5000);
console.log("Multiplayer app listening on port 5000");
