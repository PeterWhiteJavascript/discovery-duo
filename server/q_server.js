var tmx = require("tmx-parser");
var qServer = function(Quintus) {
"use strict";
Quintus.qServer = function(Q) {
    Q.tileH = 32;


    Q.Sprite.extend("ServerTileLayer",{
        init:function(p){
            this._super(p,{});
            var d = this.p.data;
            
            //Need to format the tiles in the proper way
            var tiles = d.tiles;
            var width = this.p.width;
            var height = this.p.height;
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
        }
    });
    //Gets a user out of the specified users array
    Q.getUser=function(users,id){
        return users.filter(function(u){
            return u.uniqueId===id;
        })[0];
    };
    //Called when starting a scene if no one else is on that scene
    Q.startScene=function(data){
        var sceneMap = data['map'];
        //console.log(data)
        Q.scene(sceneMap,function(stage){
            tmx.parseFile("./public/data/"+sceneMap+".tmx", function(err, map) {
                if(err) throw err;
                map.layers.forEach(function(layer){
                    stage.insert(new Q.ServerTileLayer({data:layer}));
                });
                Q.state.set("mapWidth",map.width);
                Q.state.set("mapHeight",map.height);
                //Q.createObjects(data,stage);
            });
        });
        //TO DO use a unique stage num for the scene. This will help with determining if a stage exists already too!
        Q.stageScene(sceneMap);
    };
    //Adds the server objects to the stage
    Q.createObjects=function(data,stage){
        var buildings = data['buildings'];
        var pickups = data['pickups'];
        var tilledSoil = data['tilledSoil'];
        var crops = data['crops'];
        var solidInteractables = data['solidInteractables'];
        buildings.forEach(function(building){
            stage.insert(new Q.Building({loc:building.loc,sheet:building.sheet}));
        });
        pickups.forEach(function(pickup){
            stage.insert(new Q.Pickup({loc:pickup.loc,sheet:pickup.sheet,level:pickup.level}));
        });
        tilledSoil.forEach(function(soil){
            if(soil.watered>0){
                Q.ground.setTile(soil.loc[0],soil.loc[1],9);
            } else {
                Q.ground.setTile(soil.loc[0],soil.loc[1],8);
            }
        });
        crops.forEach(function(crop){
            //It's a crop that is not a seed
            if(crop.phase>=1){
                if(crop.watered>0){
                    Q.ground.setTile(crop.loc[0],crop.loc[1],Q.wateredSoilNum);
                } else {
                    Q.ground.setTile(crop.loc[0],crop.loc[1],Q.soilNum);
                }
                stage.insert(new Q.Crop({loc:crop.loc,sheet:crop.crop,phase:crop.phase,watered:crop.watered,level:crop.level}));
            } 
            //If it's a seed
            else if(crop.phase===0){
                if(crop.watered>0){
                    Q.ground.setTile(crop.loc[0],crop.loc[1],Q.wateredSeedNum);
                } else {
                    Q.ground.setTile(crop.loc[0],crop.loc[1],Q.seedNum);
                }
            }
        });
        solidInteractables.forEach(function(int){
            stage.insert(new Q.SolidInteractable({loc:int.loc,sheet:int.sheet}));
        });

        var player = stage.insert(new Q.Player({loc:[4,14],energy:100,hunger:100}));
    };
    
    return Q;
};
};
module.exports = qServer;