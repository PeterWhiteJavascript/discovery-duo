var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
//var PF = require('pathfinding');

app.use(express.static(__dirname + '/public'));
app.get('/', function(req, res){
    res.render('/index.html');
});

var Quintus = require("./public/lib/quintus.js");

require("./public/lib/quintus_sprites.js")(Quintus);
require("./public/lib/quintus_scenes.js")(Quintus);
require("./server/q_server.js")(Quintus);
require("./server/objects.js")(Quintus);

//require("./server/player.js")(Quintus,io);

//Stores a list of all active instances of Q
var activeFiles = {};
//Stores a list of all user id's that are connected
var globalUserIds = [];
//The variable that gives a unique id to a player when they join
var id = 0;
io.on('connection', function (socket) {
    id++;
    //The current user's id
    var userId;
    //Checks every second to make sure the user gets connected properly
    var loginInterval;
    //This will contain this instance of Q. It will be shared between users in the same file
    var Q;
    //The current user's game state data
    var _user;
    //Initialize the connection process
    setTimeout(function () {
        socket.join('login');
        userId = id;
        var users = globalUserIds;
        //Make sure to give a unique id
        if(users.length>0&&users[users.length-1].playerId===id){id++;userId++;};
        users.push(userId);
        loginInterval = setInterval(function(){
            socket.emit('connected', { playerId: userId});
        },1000);
    }, 100);
    //This is recieved when the client confirms that it has connected
    //The latter half of this code will be used when the user logs in
    socket.on('confirmConnect',function(data){
        clearInterval(loginInterval);
        //Check if there is someone already connected in this file
        //If there is someone coonected, get the file data from the active file.
        if(activeFiles[data['file']]){
            Q = activeFiles[data['file']]; 
            var activeUsers = Q.state.get("activeUsers");
            _user = Q.getUser(Q.state.get("users"),data['uniqueId']);
            activeUsers.push(_user);
            Q.state.set("activeUsers",activeUsers);
            //Make sure to tell other clients in this file that this user has joined
            socket.broadcast.to(Q.fileName).emit("joinedGame",_user);
        }
        //If there is no one connected to this file, get the data from the database (or .json)
        else {
            //Get the saveData
            var file = require("./public/data/files/"+data['file']+".json");
            //Initialize an instance of Q
            Q = Quintus().include("Sprites, Scenes, qServer, Objects");
            _user = Q.getUser(file.users,data['uniqueId']);
            
            //Get the game loop running
            Q.gameLoop(Q.stageStepLoop);
            Q.state.set({
                activeUsers:[_user],
                users:file.users,
                levelData:file.levelData,
                encyclopedia:file.encyclopedia,
                date:file.date,
                time:file.time,
                weather:file.weather
            });
            Q.fileName = data['file'];
            activeFiles[data['file']] = Q;
            
            var level = Q.state.get("levelData")["main_farm"];
            level['map']="main_farm";
            //Start the scene
            Q.startScene(level);
        }
        socket.leave("lobby");
        socket.join(data['file']);
        socket.emit("startGame",Q.state.p);
    });
    //When a client disconnects, this is run.
    //TO DO: If there are no more users connected to this file, save it and remove it from the active files
    socket.on('disconnect', function () {
        if(!Q){ return; };
        for(var i=0;i<globalUserIds.length;i++){
            if(globalUserIds[i]===userId){
                globalUserIds.splice(i,1);
            }
        }
        var activeUsers = Q.state.get("activeUsers");
        //Remove the user from the active users array
        for(var i=0;i<activeUsers.length;i++){
            if(_user.uniqueId===activeUsers[i].uniqueId){
                //Save the user data the the users array
                var users = Q.state.get("users");
                for(var j=0;j<users.length;j++){
                    if(users[j].uniqueId===_user.uniqueId){
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
            //Remove the file from the activeFiles
            delete activeFiles[Q.fileName];
        }
        Q.state.set("activeUsers",activeUsers);
        io.emit('disconnected', {id:userId});
        
    });

});

server.listen(process.env.PORT || 5000);
console.log("Multiplayer app listening on port 5000");
