var tmx = require("tmx-parser");
var qServer = function(Quintus) {
"use strict";
Quintus.QServer = function(Q) {
    Q.Sprite.extend("ServerTileLayer",{
        init:function(p){
            this._super(p,{});
            var d = this.p.data;
            
            //Need to format the tiles in the proper way
            var tiles = d.tiles;
            var width = Q.state.get("mapWidth");
            var height = Q.state.get("mapHeight");
            var data = [], idx=0;
            //All that is pushed in is the sprite type.
            //This should be the only thing that needs to be known server side as it is not rendered here.
            for(var y=0;y<height;y++){
                data[y] = [];
                for(var x=0;x<width;x++){
                    data[y].push(tiles[idx]);
                    idx++;
                }
            }
            this.p.tiles = data;
        },
        setTile: function(x,y,tile) {
            this.p.tiles[y][x] = tile;
        }
    });
    //Gets a user out of the specified users array
    Q.getUser=function(users,id){
        return users.filter(function(u){
            return u.userId===id;
        })[0]; 
    };
    Q.addPlayer=function(stage,player){
        return stage.insert(player);
    };
    //Called when starting a scene. Does different logic if a user is already on this stage
    Q.startScene=function(levelData,user){
        var sceneMap = user.p.map;
        var data = levelData.data;
        var level = data[sceneMap];
        var activeStages = Q.state.get("activeStages");
        var active = activeStages.filter(function(st){
            return st.map===data[sceneMap];
        })[0];
        if(!active){
            Q.scene(sceneMap,function(stage){
                tmx.parseFile("./public/data/"+sceneMap+".tmx", function(err, map) {
                    if(err) throw err;
                    Q.state.set("mapWidth",map.width);
                    Q.state.set("mapHeight",map.height);
                    map.layers.forEach(function(layer){
                        stage.insert(new Q.ServerTileLayer({data:layer}));
                    });
                    stage.collisionLayer = stage.lists.ServerTileLayer.filter(function(tl){
                        return tl.p.data.properties.collision==="true";
                    })[0];
                    stage.groundLayer = stage.lists.ServerTileLayer.filter(function(tl){
                        return tl.p.data.properties.ground==="true";
                    })[0];
                    //Use the decompressed level to create the objects
                    Q.createObjects(level,stage);
                    var player = Q.addPlayer(stage,user);
                    var curLevel = {
                        map:level['map'],
                        stage:stage,
                        levelData:levelData,
                        activePlayers:[player]
                    };
                    activeStages.push(curLevel);
                    player.p.curLevel = curLevel;
                });
            });
            //Stage it on top of any stages that exist.
            Q.stageScene(sceneMap,activeStages.length);
        } else {
            var player = Q.addPlayer(active.stage,user);
            active.activePlayers.push(player);
            player.p.curLevel = active;
        }
    };
    //Adds the server objects to the stage
    //All prototype JSON data will be taken in the Sprite's init function
    Q.createObjects=function(data,stage){
        var ground = stage.groundLayer;
        var collision = stage.collisionLayer;
        var buildings = data['buildings'];
        var bKeys = Object.keys(Q.state.get("Jbuildings"));
        var pickups = data['pickups'];
        var iKeys = Object.keys(Q.state.get("Jitems"));
        var tilledSoil = data['tilledSoil'];
        var crops = data['crops'];
        var cKeys = Object.keys(Q.state.get("Jcrops"));
        var solidInteractables = data['solidInteractables'];
        var sKeys = Object.keys(Q.state.get("JsolidInteractables"));
        buildings.forEach(function(building,i){
            stage.insert(new Q.Building({itemId:building.itemId,loc:building.loc,sheet:bKeys[building.itemId],uniqueId:i}));
        });
        pickups.forEach(function(pickup,i){
            stage.insert(new Q.Pickup({groupId:pickup.groupId,itemId:pickup.itemId,loc:pickup.loc,sheet:iKeys[pickup.groupId],frame:pickup.itemId,level:pickup.level,uniqueId:i}));
        });
        tilledSoil.forEach(function(soil){
            //In the crops loop, the ground may be changed again for the seed
            if(soil.watered>0){
                ground.setTile(soil.loc[0],soil.loc[1],Q.wateredSoilNum);
            } else {
                ground.setTile(soil.loc[0],soil.loc[1],Q.soilNum);
            }
        });
        crops.forEach(function(crop,i){
            //It's a crop that is not a seed
            //Any tilled soil will be added in the tilled soil loop
            if(crop.phase>=1){
                stage.insert(new Q.Crop({itemId:crop.itemId,loc:crop.loc,sheet:cKeys[crop.itemId],phase:crop.phase,level:crop.level,uniqueId:i}));
            } 
            //If it's a seed
            else if(crop.phase===0){
                collision.setTile(crop.loc[0],crop.loc[1],Q.seedNum);
            }
        });
        solidInteractables.forEach(function(int,i){
            stage.insert(new Q.SolidInteractable({itemId:int.itemId,loc:int.loc,sheet:sKeys[int.itemId],uniqueId:i}));
        });
    };
    Q.getUserData = function(user){
        return {
            uniqueId:user.p.uniqueId,
            username:user.p.username,
            map:user.p.map,
            dir:user.p.dir,
            x:user.p.x,
            y:user.p.y,
            loc:user.p.loc,
            sheet:user.p.sheet,
            bag:user.p.bag,
            equipment:user.p.equipment,
            seeds:user.p.seeds,
            held:user.p.held,
            steps:user.p.steps,
            energy:user.p.energy,
            hunger:user.p.hunger,
            options:user.p.options
        };
    };
    //Gets the full Q.state.p that should be sent to a new joining client
    Q.getStateData=function(level){
        var s = Q.state.p;
        var state = {
            activeUsers:s.activeUsers.map(function(user){
                return Q.getUserData(user);
            }),
            currentLevel:level,
            encyclopedia:s.encyclopedia,
            date:s.date,
            time:s.time,
            weather:s.weather
        };
        return state;
    };
    Q.startTime=function(){
        if(Q.timeInterval){return;};
        var time = Q.state.get("time");
        //Change this to a more accurate timer later
        Q.timeInterval = setInterval(function(){
            time[1]++;
            if(time[1]>=60){
                time[0]++;
                time[1]=0;
                Q.state.get("activeUsers").forEach(function(user){
                    user.changeProp("hunger",user.p.hunger-4);
                });
            };
            if(time[0]>=24){
                time[0]=0;
                var date = Q.state.get("date");
                Q.state.set("date",{year:date.year,month:date.month,day:date.day+1});
                //TO DO: change year/month;
            }
            Q.state.set("time",time);
            Q.sendEvent("timeTick",time);
        },1000);
    };
    
    
    
    
    return Q;
};
};
module.exports = qServer;