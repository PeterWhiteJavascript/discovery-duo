Quintus.QFunctions=function(Q){
    Q.startScene=function(data){
        Q.state.set("currentLevel",data);
        console.log(data)
        var sceneMap = data.map;
        var music = data.music;
        //Load the tmx map
        Q.loadTMX(sceneMap+".tmx",function(){
            //Load the music
            Q.playMusic(music+".mp3",function(){ 
                //Add the objects to the map
                Q.makeScene(sceneMap,function(stage){
                    var level = Q.state.get("currentLevel");
                    level.buildings.forEach(function(building){
                        stage.insert(new Q.Building({loc:building.loc,sheet:building.sheet}));
                    });
                    level.pickups.forEach(function(pickup){
                        stage.insert(new Q.Pickup({loc:pickup.loc,sheet:pickup.sheet,level:pickup.level}));
                    });
                    level.tilledSoil.forEach(function(soil){
                        if(soil.watered>0){
                            Q.ground.setTile(soil.loc[0],soil.loc[1],9);
                        } else {
                            Q.ground.setTile(soil.loc[0],soil.loc[1],8);
                        }
                    });
                    level.crops.forEach(function(crop){
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
                    level.solidInteractables.forEach(function(int){
                        stage.insert(new Q.SolidInteractable({loc:int.loc,sheet:int.sheet}));
                    });
                    
                    var player = stage.insert(new Q.Player({loc:[4,14],energy:Q.state.get("player").energy,hunger:Q.state.get("player").hunger}));
                    Q.state.set("playerObj",player);
                    /*if(!Q.touchDevice){
                        var mouseBlock = stage.insert(new Q.MouseBlock());
                        Q.state.set("mouseBlock",mouseBlock);
                    }*/
                    stage.add("viewport");
                    Q.addViewport(stage);
                    Q.stageScene("hud",2);
                    
                });
                //Stage the TMX tilemap
                Q.stageScene(sceneMap,1,{sort:true});
            });  
        });
    };
    Q.makeScene = function(sceneName,callback){
        Q.scene(sceneName,function(stage){
            Q.stageTMX(sceneName+".tmx",stage);
            Q.TL = stage.lists.TileLayer.filter(function(tl){
                return tl.p.collision==="true";
            })[0];
            Q.ground = stage.lists.TileLayer.filter(function(tl){
                return tl.p.ground==="true";
            })[0];
            Q.state.set("mapWidth",Q.TL.p.cols);
            Q.state.set("mapHeight",Q.TL.p.rows);
            callback(stage);
        },{sort:true});
    };
    //The upper heads up display. The contains the UICircles, side menu, time/date, health bar
    Q.scene("hud",function(stage){
        //This inserts the HUD and all icons
        var cont = stage.insert(new Q.HUD());
        //Have to call this seperately since cont.stage doesn't exist in init.
        cont.setUpHUD();
        
        var time = Q.state.get("time");
        //Change this to a more accurate timer later
        setInterval(function(){
            time[1]++;
            if(time[1]>=60){
                time[0]++;
                time[1]=0;
                Q.state.get("playerObj").changeHunger(-4);
            };
            if(time[0]>=24){
                time[0]=0;
                var date = Q.state.get("date");
                Q.state.set("date",{year:date.year,month:date.month,day:date.day+1});
                //TO DO: change year/month;
            }
            Q.state.set("time",time);
            Q.state.trigger("timeTick");
        },1000);
    });
    
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
        //Check if there is solid ground, or a solid object on the ground
        if(Q.TL.p.tiles[y][x]||Q.stage(1).locate(x*Q.tileH+Q.tileH/2,y*Q.tileH+Q.tileH/2,Q.SPRITE_SOLID)){
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
    
    Q.getLoc=function(obj){
        return [Math.floor((obj.p.x-Math.floor((obj.p.x/Q.tileH-Math.floor(obj.p.x/Q.tileH))*Q.tileH))/Q.tileH),Math.floor((obj.p.y-Math.floor((obj.p.y/Q.tileH-Math.floor(obj.p.y/Q.tileH))*Q.tileH))/Q.tileH)];
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
    Q.checkGround=function(ground){
        switch(ground){
            case 2:
                return {type:"soil"};
            case 4:
                return {type:"water"};
            case 5:
                return {type:"rock"};
            case 8:
                return {type:"soil",tilled:true};
            case 9:
                return {type:"soil",tilled:true,watered:true};
            case 22:
                return {type:"soil",tilled:true,seeded:true};
            case 23:
                return {type:"soil",tilled:true,watered:true,seeded:true};
        }
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
    Q.getItemData=function(id){
        return Q.assets['/data/json/items.json'][id];
    };
    Q.addSoil=function(loc){
        Q.state.get("currentLevel").tilledSoil.push({loc:loc,days:Q.state.get("player").equipment.level,water:0});
    };
    Q.removeSoil=function(loc){
        var soils = Q.state.get("currentLevel").tilledSoil;
        var soil = Q.getObject(loc,"tilledSoil");
        soils.splice(soils.indexOf(soil),1);
    };
    //Adds the crop to the level data
    Q.addCrop=function(seed,loc){
        var crop = Q.assets['/data/json/items.json'][seed].crop;
        var data = Q.assets['/data/json/crops.json'][crop];
        var seedData = data['phases'][0];
        Q.state.get("currentLevel").crops.push({loc:loc,phase:0,level:1,crop:seed,water:seedData.water,sun:seedData.sun,days:seedData.days,watered:0});
    };
    //Removes the crop from the level data
    Q.removeCrop=function(loc){
        var crops = Q.state.get("currentLevel").crops;
        var crop = Q.getObject(loc,"crops");
        crops.splice(crops.indexOf(crop),1);
    };
    Q.removeSolidInteractable=function(loc){
        var inters = Q.state.get("currentLevel").solidInteractables;
        var inter = Q.getObject(loc,"solidInteractables");
        inters.splice(inters.indexOf(inter),1); 
    };
    Q.getObject=function(loc,prop){
        var objects = Q.state.get("currentLevel")[prop];
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
    Q.setEquipped=function(){
        var props = ["equipment","seeds","held"];
        props.forEach(function(prop){
            var p = Q.state.get("player")[prop];
            if(p&&p.itemId){
                var data = Q.setJSONData(Q.getItemData(p.itemId),{});
                data.itemId = p.itemId;
                data.level = p.level;
                data.amount = p.amount;
                Q.state.set(prop,data);
            }
        });
        
    };
    Q.calculateBagWeight = function(){
        var bag = Q.state.get("player").bag;
        var weight = 0;
        bag.items.forEach(function(item){
            weight+=item.weight;
        });
        bag.weight=weight;
        console.log(bag);
    };
    Q.setUpItems=function(){
        var bag = Q.state.get("player").bag;
        var items = [];
        bag.items.forEach(function(item){
            var data = Q.setJSONData(Q.getItemData(item.itemId),{});
            data.itemId = item.itemId;
            data.amount = item.amount;
            data.level = item.level;
            items.push(data);
        });
        bag.items = items;
        Q.setEquipped();
        Q.calculateBagWeight();
    };
    Q.sortItems=function(kind){
        var items = Q.state.get("player").bag.items;
        if(kind==="held"){
            return items;
        } 
        return items.filter(function(item){
            return item.kind===kind;
        });
    };
};