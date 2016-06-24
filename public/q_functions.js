var quintusFunctions = function(Quintus) {
"use strict";
//This is shared on server and client
Quintus.QFunctions=function(Q){
    
    Q.SPRITE_NONE = 0;
    Q.SPRITE_DEFAULT = 1;
    Q.SPRITE_PICKUP = 2;
    Q.SPRITE_GROUND = 4;
    Q.SPRITE_SOLID = 8;
    Q.SPRITE_PLAYER = 16;
    Q.SPRITE_INTERACTABLE = 32;
    Q.SPRITE_UI=64;
    Q.gravityY=0;
    Q.tileH=32;

    Q.soilNum = 8;
    Q.wateredSoilNum = 9;
    Q.seedNum = 23;
    
    //Get the path that this object should walk along to get to a location
    Q.getPath=function(obj,loc,toLoc,near){
        //Set up a graph for this movement
        //For now, all squares are walkable
        var grid = Q.setWalkMatrix(obj,new PF.Grid(Q.state.get("mapWidth"),Q.state.get("mapHeight")));
        //Allow walking on the target square (If we're going near it) (The player doesn't actually walk on it)
        if(near){
            grid.setWalkableAt(toLoc[0],toLoc[1],true);
        }
        var finder = new PF.AStarFinder({
            allowDiagonal:true,
            dontCrossCorners:true
        });
        var path = finder.findPath(loc[0],loc[1],toLoc[0],toLoc[1],grid);
        return PF.Util.compressPath(path);
    };
    //Accepts loc coords 
    Q.getWalkable=function(x,y){
        var tl = Q.TL;
        var stage=Q.stage(1);
        if(typeof Quintus === 'undefined'){
            tl = stage.lists.ServerTileLayer.filter(function(tl){
                return tl.p.data.properties.collision==="true";
            })[0];
            
        }
        //Check if there is solid ground, or a solid object on the ground
        if(tl.p.tiles[y][x]||Q.stage(1).locate(x*Q.tileH+Q.tileH/2,y*Q.tileH+Q.tileH/2,Q.SPRITE_SOLID)){
            return true;
        }
        return false;
    };
    //Creates an array of each tile from the ground tilelayer and any unwalkable objects in the stage.
    Q.setWalkMatrix=function(obj,grid){
        var playerId = obj.p.playerId;
        var mapWidth = Q.state.get("mapWidth");
        var mapHeight = Q.state.get("mapHeight");
        for(var i_walk=0;i_walk<mapHeight;i_walk++){
            for(var j_walk=0;j_walk<mapWidth;j_walk++){
                if(Q.getWalkable(j_walk,i_walk)){
                    grid.setWalkableAt(j_walk,i_walk,false);
                };
            }
        }
        return grid;
     };
     //Keeps a record of the changed ground in this area
    Q.changedLevel=function(type,num,data){
        var level = Q.state.get("currentLevel");
    };
    //This takes into account offcenter locations
    Q.getLoc=function(obj){
        return [Math.floor((obj.p.x-Math.floor((obj.p.x/Q.tileH-Math.floor(obj.p.x/Q.tileH))*Q.tileH))/Q.tileH),Math.floor((obj.p.y-Math.floor((obj.p.y/Q.tileH-Math.floor(obj.p.y/Q.tileH))*Q.tileH))/Q.tileH)];
    };
    Q.setColLocs=function(offsetLocs,loc){
        var locs = [];
        offsetLocs.forEach(function(off){
            locs.push([off[0]+loc[0],off[1]+loc[1]]);
        });
        return locs;
    };
    Q.setJSONData=function(data,obj){
        //Handle if we pass an Q.Sprite object in
        if(obj.p){obj=obj.p;};
        var keys = Object.keys(data);
        for(var i=0;i<keys.length;i++){
            obj[keys[i]]=data[keys[i]];
        }
        return obj;
    };
    Q.setXY=function(obj){
        obj.p.x = obj.p.loc[0]*Q.tileH+obj.p.w/2;
        obj.p.y = obj.p.loc[1]*Q.tileH+obj.p.h/2;
        obj.p.z = obj.p.y;
    };
    Q.setCenter=function(obj){
        obj.p.cx = obj.p.w/2;
        obj.p.cy = obj.p.h/2;
    };
    Q.getTouchLoc=function(touch){
        //Remainder
        var remX = Math.floor((touch.x/Q.tileH-Math.floor(touch.x/Q.tileH))*Q.tileH);
        var remY = Math.floor((touch.y/Q.tileH-Math.floor(touch.y/Q.tileH))*Q.tileH);
        return [Math.floor((touch.x-remX)/Q.tileH),Math.floor((touch.y-remY)/Q.tileH)];
    };
    //Checks if the ground is a type that can be interacted with
    Q.checkGround=function(ground,collision){
        var gr = ground?ground.id||ground:0;
        var co = collision?collision.id||collision:0;
        var data = {};
        switch(gr){
            case 2:
                data.type = "soil";
                break;
            case 4:
                data.type = "water";
                break;
            case 5:
                data.type = "rock";
                break;
            case 8:
                data.type = "soil";
                data.tilled = true;
                break;
            case 9:
                data.type = "soil";
                data.tilled = true;
                data.watered = true;
                break;
        }
        switch(co){
            case 23:
                data.seeded = true;
                break;
        }
        if(data.type){return data;};
        return false;
    };
    Q.addViewport=function(stage){
        Q.viewFollow(Q.state.get("playerObj"),stage);
    };
    //Follows the specified sprite on the specified stage
    Q.viewFollow=function(obj,stage){
        if(!stage){stage=Q.stage(1);};
        stage.viewport.scale=2;
        var minX=0;
        var maxX=Q.state.get("mapWidth")*Q.tileH*stage.viewport.scale;
        var minY=0;
        var maxY=Q.state.get("mapHeight")*Q.tileH*stage.viewport.scale;
        //If the w is greater than h
        if(Q.orientation){
            maxX+=Q.tileH*4;
        } else {
            minY-=Q.tileH*4;
        }
        //TO DO: Make it so that the player has the walk a bit closer in a certain direction before the viewport starts following him.
        stage.follow(obj,{x:true,y:true},{minX: minX, maxX: maxX, minY: minY,maxY:maxY});
    };
    Q.getItemsByGroupId = function(group){
        var items = Q.state.get("Jitems");
        var keys = Object.keys(items);
        return items[keys[group]];
    };
    Q.removeSolidInteractable=function(loc){
        var inters = Q.state.get("currentLevel").solidInteractables;
        var inter = Q.getObject(loc,"solidInteractables");
        inters.splice(inters.indexOf(inter),1); 
    };
    Q.getObject=function(level,loc,prop){
        var objects = level[prop];
        var object = objects.filter(function(ob){
            return loc[0]===ob.loc[0]&&loc[1]===ob.loc[1];
        })[0];
        return object;
    };
    Q.getDate=function(date){
        var year = date['year'];
        var months = ["January","February","March","April","May","June","July","August","September","October","November',December"];
        var month = months[date['month']-1];
        var day = date['day'];
        return [month,day,year];
    };
    Q.removeItem=function(props){
        var loc = props.loc;
        var stage = Q.stage(1);
        var itm = stage.items.filter(function(item){
            return item.p.loc&&item.p.loc[0]===loc[0]&&item.p.loc[1]===loc[1];
        })[0];
        stage.remove(itm);
    };
    Q.showDynamicText = function(props){
        Q.stage(1).insert(new Q.DynamicText({text:props.text,color:"#ffffff",x:props.x,y:props.y}));
    };
    
    Q.GameObject.extend("levelData",{});
    //For some reason adding functions directly to the GameObject was not working, but adding as a component did.
    Q.component("levelDataControls",{
        extend:{
            //Adds an item to the level data
            addItem:function(map,group,item){
                this.data[map][group].push(item);
            },
            //Removes an item from the level at a certain location
            removeItem:function(map,group,loc){
                this.data[map][group].splice(this.data[map][group].indexOf(this.getItem(map,group,loc)),1);
            },
            //Gets a certain item from the data by location
            getItem:function(map,group,loc){
                return this.data[map][group].filter(function(itm){
                    return itm.loc[0]===loc[0]&&itm.loc[1]===loc[1];
                })[0];
            }
        }
    });
    Q.component("levelData",{
        added:function(){
            //Automatcially decompress the file when the levelData is added
            this.on("decompress",this,"decompressFile");
            this.trigger("decompress");
        },
        decompressFile:function(){
            var data = this.entity.data;
            var t = this;
            //Get all of the level names
            var keys = Object.keys(data);
            var levelData = {};
            //For each of the levels
            keys.forEach(function(levelName){
                //Set the level
                levelData[levelName]=t.decompressLevel(data[levelName],levelName);
            });
            this.entity.data = levelData;
        },
        //Decompresses an entire level
        decompressLevel:function(data,map){
            return {
                map:map,
                music:data[0],
                pickups:data[1].map(function(itm){return {groupId:itm[0],itemId:itm[1],loc:[itm[2],itm[3]],level:itm[4]};}),
                tilledSoil:data[2].map(function(itm){return {loc:[itm[0],itm[1]],days:itm[2],watered:itm[3]};}),
                crops:data[3].map(function(itm){return {itemId:itm[0],loc:[itm[1],itm[2]],phase:itm[3],water:itm[4],sun:itm[5],days:itm[6],watered:itm[7],level:itm[8]};}),
                solidInteractables:data[4].map(function(itm){return {itemId:itm[0],loc:[itm[1],itm[2]]};}),
                buildings:data[5].map(function(itm){return {itemId:itm[0],loc:[itm[1],itm[2]]};})
            };
        },
        //Compresses the entire file into JSON data for saving
        compressFile:function(){
            var data = this.data;
            
            return file;
        },
        //Compresses and entire level
        compressLevel:function(level){
            return level;
        },
        //Compresses an individual item
        compressItem:function(item){
            return item;
        }
    });
    
};
};

if(typeof Quintus === 'undefined') {
  module.exports = quintusFunctions;
} else {
  quintusFunctions(Quintus);
}