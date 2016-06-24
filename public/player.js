var quintusPlayer = function(Quintus,PF) {
"use strict";
Quintus.Player=function(Q){
    //Add to the player to control things that he does with equipment
    Q.component("solidInteraction",{
        extend:{
            //Called to get anything that affects how much energy a task takes
            getEnMod:function(base){
                //Special effect that makes everything only cost 1 energy
                if(this.p.energized){
                    return -1;
                }
                var mod = base;
                var time = Q.state.get("time");
                //Lose an aditional stamina per hour midnight and beyond
                if(time[0]<=6){
                    mod-=time[0]+1;
                }
                switch(true){
                    case this.p.hunger===0:
                        mod-=5;
                        break;
                    case this.p.hunger<10:
                        mod-=3;
                        break;
                    case this.p.hunger<25:
                        mod-=2;
                        break;
                    case this.p.hunger<50:
                        mod-=1;
                        break;
                }
                return mod;
            },
            changeProp:function(prop,value){
                this.p[prop]=value;
                this.trigger("change_"+prop);
            },
            tillSoil:function(touchLoc){
                this.stage.groundLayer.setTile(touchLoc[0],touchLoc[1],Q.soilNum);
                this.changeProp("energy",this.p.energy+this.getEnMod(-1));
            },
            plantSeeds:function(touchLoc){
                //Get the seeds from the bag
                var seed = this.Bag.getItem(this.Bag.seeds);
                this.stage.collisionLayer.setTile(touchLoc[0],touchLoc[1],Q.seedNum);
                var item = this.Bag.removeItem(seed);
                this.Bag.trigger("use_item",item);
                //Check if there's no more of this seed
                if(item.amount===0){
                    var seeds = this.Bag.filterGroup(1);
                    if(seeds){
                        this.Bag.change_seeds(seeds[0]);
                    } else {
                        this.Bag.change_seeds({});
                    }
                    this.Bag.trigger("change_seeds");
                }
                this.changeProp("energy",this.p.energy+this.getEnMod(-1));
            },
            waterSoil:function(touchLoc){
                this.stage.groundLayer.setTile(touchLoc[0],touchLoc[1],Q.wateredSoilNum);
                this.changeProp("energy",this.p.energy+this.getEnMod(-1));
            },
            pickCrop:function(crop){
                var data = Q.assets[crop.p.fromServer+'/data/json/crops.json'][crop.p.sheet];
                Q.setJSONData(Q.assets[crop.p.fromServer+'/data/json/items.json'][crop.p.sheet],crop);
                if(this.pickUpItem(crop)){
                    //Set the crop back to the specified stage
                    if(data.reharvestable){
                        this.stage.insert(new Q.Crop({loc:crop.p.loc,sheet:crop.p.sheet,phase:data.reharvestable}));
                    } else {
                        var sceneMap = this.p.map;
                        var activeStages = Q.state.get("activeStages");
                        var active = activeStages.filter(function(st){
                            return st.map = sceneMap;
                        })[0];
                        Q.removeCrop(active.levelData,crop.p.loc);
                    }
                }
                this.changeProp("energy",this.p.energy+this.getEnMod(-1));
            },
            processSolidInteractable:function(pickup){
                var iKeys = Object.keys(Q.state.get("Jitems"));
                this.stage.insert(new Q.Pickup({groupId:pickup.item.groupId,itemId:pickup.item.itemId,loc:pickup.loc,sheet:iKeys[pickup.item.groupId],frame:pickup.item.itemId,level:this.Bag.equipment.level,uniqueId:this.stage.lists.Pickup.length}));
                this.changeProp("energy",this.p.energy+this.getEnMod(-1));
            }
        }
    });
    Q.component("animations", {
        added:function(){
            this.entity.on("playStand");
        },
        extend:{
            checkPlayDir:function(dir){
                if(!dir){return this.p.dir;}else{return dir||"down";}
            },
            playStand:function(dir){
                if(!this.play){return;}
                this.p.dir = this.checkPlayDir(dir);
                this.play("standing"+this.p.dir);
            },
            playWalk:function(dir){
                if(!this.play){return;}
                if(this.p.animation!=="walking"+dir){
                    this.p.dir = this.checkPlayDir(dir);
                    this.play("walking"+this.p.dir);
                }
            },
        }
    });
    Q.component("pathLogic",{
        added:function(){
            this.entity.on("startMove",this,"startMove");
            this.entity.on("stopMove",this,"stopMove");
            this.entity.on("atDest",this,"atDest");
            this.entity.p.stepNum = Q.tileH;
            this.entity.p.stepCounter = 0;
            this.entity.p.lastX = this.entity.p.x;
            this.entity.p.lastY = this.entity.p.y;
            this.entity.p.initialPointHit = 1;
        },
        getPath:function(loc,toLoc,near){
            //Set up a graph for this movement
            var grid = this.getWalkMatrix(new PF.Grid(Q.state.get("mapWidth"),Q.state.get("mapHeight")));
            //Allow walking on the target square (If we're going near it) (The player doesn't actually walk on it)
            if(near){
                grid.setWalkableAt(toLoc[0],toLoc[1],true);
            }
            var finder = new PF.AStarFinder({
                allowDiagonal:true,
                dontCrossCorners:true
            });
            var path = finder.findPath(loc[0],loc[1],toLoc[0],toLoc[1],grid);
            return path;//PF.Util.compressPath(path);
        },
        getWalkable:function(x,y){
            var p = this.entity.p;
            var stage = p.curLevel?p.curLevel.stage:Q.stage(1);
            //Check if there is solid ground
            if(stage.collisionLayer.p.tiles[y][x]){
                return true;
            }
            return false;
        },
        getSolidObjs:function(){
            var collidable = ["Building","SolidInteractable","Crop"];
            var stage = this.entity.stage;
            //Holds the collidable locations so the player can't walk on there.
            //Based off of the objects loc, w, and h.
            var locs = [];
            //For each of the list items
            collidable.forEach(function(col){
                var objs = stage.lists[col];
                if(objs){
                    //Loop through each item in the list
                    objs.forEach(function(obj){
                        var lo = obj.p.colLocs.filter(function(loc){
                            return stage.locate(loc[0]*Q.tileH,loc[1]*Q.tileH,Q.SPRITE_SOLID);
                        });
                        lo.forEach(function(l){
                            locs.push(l);
                        });
                    });
                }
            });
            return locs;
        },
        getWalkMatrix:function(grid){
            var p = this.entity.p;
            var uniqueId = p.uniqueId;
            var mapWidth = Q.state.get("mapWidth");
            var mapHeight = Q.state.get("mapHeight");
            for(var i_walk=0;i_walk<mapHeight;i_walk++){
                for(var j_walk=0;j_walk<mapWidth;j_walk++){
                    if(this.getWalkable(j_walk,i_walk)){
                        grid.setWalkableAt(j_walk,i_walk,false);
                    };
                }
            }
            //Get the solid objs locations
            var solidObjs = this.getSolidObjs();
            //Loop through the locs that are occupied by solid objects.
            for(var i=0;i<solidObjs.length;i++){
                //Set this spot to be not walkable
                grid.setWalkableAt(solidObjs[i][0],solidObjs[i][1],false);
            }
            return grid;
        },
        
        stopMove:function(){
            var p = this.entity.p;
            this.stopMovement();
            this.entity.off("hit",this,"stopMovement");
            this.entity.off("step",this,"step");
            //If there's no move path, stop the animation on the client
            if(!p.movePath[0]){
                Q.sendEvent("PlayerEvent",{funcs:["stopMove"],uniqueId:p.uniqueId,props:[]});
            }
        },
        stopMovement:function(){
            var p =this.entity.p;
            p.vx=0;
            p.vy=0;
        },
        atDest:function(){
            var p = this.entity.p;
            this.entity.trigger("atMoveDest");
            this.entity.trigger("stopMove");
        },
        startMove:function(){
            var p = this.entity.p;
            //At the first point as it is the initial spot
            this.atPoint();
            if(!p.movePath[0]){this.entity.trigger("stopMove");return;};
            this.entity.on("step",this,"step");
            this.getVelocity(p.movePath[0][0],p.movePath[0][1]);
        },
        //Run when the object gets to a point in the p.movePath
        atPoint:function(){
            var p = this.entity.p;
            p.initialPointHit = 1;
            p.movePath.splice(0,1);
            if(p.movePath.length===0){
                this.atDest();
            } 
            //doing remainder
            else if(p.movePath.length===1){
                this.entity.on("hit",this,"stopMovement");
            };
        },
        //Gets the velocity needed to reach the next point
        getVelocity:function(toX,toY){
            var p = this.entity.p;
            var vel = this.entity.getVelocity({x:toX,y:toY});
            Q.sendEvent("PlayerEvent",{funcs:["getVelocity"],uniqueId:p.uniqueId,props:[{x:toX,y:toY}]});
            return vel;
        },
        //Determines if this object is close enough to the next point
        close:function(){
            var p = this.entity.p;
            //If it's the last path, go to the click location
            if(p.movePath.length===0){
                return true;
            } else
            //If the object is within the acceptable range of the point
            if(Math.abs((p.x)-p.movePath[0][0])<2&&Math.abs((p.y)-p.movePath[0][1])<2){
                return true;
            }
            return false;
            
        },
        moveAlong:function(props){
            var to = props.path;
            var p = this.entity.p;
            p.x = props.x;
            p.y = props.y;
            Q.getLoc(this.entity);
            if(!to){this.entity.trigger("atDest");return;};
            p.movePath = [];
            //TO DO: Add some more smoothing between points that have no objects between them.
            for(var i=0;i<to.length;i++){
                //The xy locations of the next move
                p.movePath.push([to[i][0]*Q.tileH+p.w/2,to[i][1]*Q.tileH+p.h/4]);

            }
            this.entity.trigger("stopMove");
            this.entity.trigger("startMove");
        },
        step:function(dt){
            //The next position is (x) p.x+(vel[0]*dt)
            //This will be used in client prediction to look into the past to see where the player was at by keeping track of past delta times along with the real time
            var p = this.entity.p;
            if(this.close()){
                this.atPoint();
                return;
            }
            var vel = this.getVelocity(p.movePath[0][0],p.movePath[0][1]);
            if(p.initialPointHit>0){p.initialPointHit=0;} 
            //Don't run this the first time
            //This catches if the x or y value is not what it should be given the velocity.
            //This means that the player has hit a wall.
            else if((p.lastX+(vel[0]*dt)).toFixed(5)!==(p.x).toFixed(5)&&(p.lastY+(vel[1]*dt)).toFixed(5)!==(p.y).toFixed(5)){
                p.movePath=[];
                this.stopMove();
            }
            //Not perfectly accurate, but it will work.
            p.stepCounter+=Math.abs(vel[0])+Math.abs(vel[1]);
            if(p.stepCounter>p.stepNum){p.stepCounter=0;p.steps++;};
            //console.log(p.steps)
            //Need to be able to detect if the player is running against a wall and not moving
            p.lastX = p.x;
            p.lastY = p.y;
        }
    });
    Q.component("mover",{
        added: function() {
            this.entity.p.speed = 100;
        },
        stopMove:function(){
            var p = this.entity.p;
            this.stopMovement();
            this.entity.off("hit",this,"stopMovement");
            this.entity.off("step",this,"step");
        },
        stopMovement:function(){
            var p =this.entity.p;
            p.vx=0;
            p.vy=0;
            this.entity.trigger("playStand",p.dir);
        },
        changeVelocity:function(props){
            this.entity.p.vx = props.vx;
            this.entity.p.vy = props.vy;
        },
        
        extend:{
            getVelocity:function(props){
                var toX = props.x;
                var toY = props.y;
                var p = this.p;
                var tx = toX-p.x;
                var ty = toY-p.y;
                var dist = Math.sqrt(tx*tx+ty*ty);
                //var rad  = Math.atan2(ty,tx);
                //var angle = rad/Math.PI*180;
                var thrust = p.speed;
                var velX = (tx/dist)*thrust;
                var velY = (ty/dist)*thrust;
                if(p.vx!==velX||p.vy!==velY){
                    this.playWalk(this.checkVelDir(velX,velY));
                    this.mover.changeVelocity({vx:velX,vy:velY});
                }
                p.z = p.y;
                return [velX,velY];
            },
            //Returns the this.p.dir based off of movement
            checkVelDir:function(vx,vy){
                var s = this.p.speed;
                //figure out which direction the object is travelling
                //If I use diag anims, do another switch after this one and get rid of the equals signs in the switch
                /*   \ U /
                 *    \ / 
                 *  L  o  R
                 *    / \
                 *   / D \
                 */
                var m = 1.25;
                switch(true){
                    case vx>=-s/m&&vx<=s/m&&vy<=0:
                        return "up";
                    case vx>0&&vy>-s/m&&vy<s/m:
                        return "right";
                    case vx<=s/m&&vx>=-s/m&&vy>=0:
                        return "down";
                    case vx<0&&vy>-s/m&&vy<s/m:
                        return "left";
                }
                //If the vx,vy is not caught (eventually this should not happen) I will fix when I've decided whether to use diag anims or not
                //console.log(vx,vy)
            },
            moveAlong:function(to){
                this.pathLogic.moveAlong(to);
            },
            changeVelocity:function(props){
                this.mover.changeVelocity(props);
                this.p.z = this.p.y;
                this.playWalk(this.checkVelDir(this.p.vx,this.p.vy));
            },
            setXY:function(pos){
                this.p.x = pos.x;
                this.p.y = pos.y;
            },
            stopMove:function(){
                if(this.p.vx||this.p.vy){
                    this.playStand(this.checkVelDir(this.p.vx,this.p.vy));
                }
                this.mover.stopMove();
            }
        }
    });
    Q.component("Bag",{
        added:function(){
            //The player
            var p = this.entity.p;
            this.compressedItems = p.bag.items;
            this.decompressItems();
            this.maxWeight = p.bag.maxWeight;
            this.equipment = p.bag.equipment;
            this.seeds = p.bag.seeds;
            this.held = p.bag.held;
            this.weight = this.calculateWeight();
            this.setActive();
            this.kindOrder = ["treasures","seeds","crops","food","materials","fish","meat","ores","bugs","equipment","other"];
        },
        //Decompresses all of the items that are saved in the saveData
        decompressItems:function(){
            var newItems = [];
            var d = Q.state.get("Jitems");
            var k = Object.keys(d);
            var items = this.compressedItems;
            items.forEach(function(itm){
                var data = d[k[itm[0]]][itm[1]];
                var keys = Object.keys(data);
                var item = {};
                keys.forEach(function(key){
                    item[key]=data[key];
                });
                item.groupId = itm[0];
                item.itemId = itm[1];
                item.level = itm[2];
                item.amount = itm[3];
                item.sheet = k[item.groupId];
                if(item.sheet==="seeds"){item.sheet="crops";};
                item.frame = item.itemId;
                newItems.push(item);
            });
            this.items = newItems;
        },
        setActive:function(){
            var props = ["equipment","seeds","held"];
            var t = this;
            props.forEach(function(prop){
                var data = t[prop];
                t[prop] = t.items[data];
            });
        },
        //Gets an item that is in the bag based on its level, itemId, and groupId
        getItem:function(itm){
            if(!itm){return false;};
            return this.items.filter(function(i){
                return i.level===itm.level&&i.itemId===itm.itemId&&i.groupId===itm.groupId;
            })[0];
        },
        change_equipment:function(to){
            this.equipment = this.getItem(to);
            this.trigger("change_equipped");
        },
        change_seeds:function(to){
            this.seeds = this.getItem(to);
            this.trigger("change_seeds");
        },
        change_held:function(to){
            this.held = this.getItem(to);
            this.trigger("change_held");
        },
        calculateWeight:function(){
            var weight = 0;
            this.items.forEach(function(item){
                weight+=item.weight;
            });
            return weight;
        },
        changeWeight:function(by){
            this.weight+=by;
            this.trigger("change_bag_weight");
        },
        //Adds an item to the bag. Also checks if the item already exists (Just adds one to amount in that case)
        addItem:function(item){
            //Change the bag's weight
            this.changeWeight(item.weight);
            //The items that are currently in the bag
            var items = this.items;
            //Get the item if it already exists in the bag
            var curItem = items.filter(function(itm){
                return itm.itemId===item.itemId&&itm.groupId===item.groupId&&itm.level===item.level;
            })[0];
            //If there was already one of these items in the bag, increase the amount by one
            if(curItem){
                curItem.amount++;
            } 
            //Else, add a new entry for this item
            else {
                var data = Q.getItemsByGroupId(item.groupId)[item.itemId];
                var keys = Object.keys(data);
                keys.forEach(function(key){
                    item[key] = data[key];
                });
                item.amount = 1;
                item.sheet = Object.keys(Q.state.get("Jitems"))[item.groupId];
                item.frame = item.itemId;
                items.push(item);
                if(item.groupId===1||item.groupId===9){
                    this.trigger("change_"+item.sheet);
                }
                this.trigger("change_held");
            }
        },
        removeItem:function(data){
            var item = this.getItem(data);
            this.changeWeight(-item.weight);
            item.amount--;
            if(item.amount<=0){
                this.items.splice(this.items.indexOf(item),1);
            }
            return item;
        },
        changeItem:function(){
            
        },
        search:function(){
            
        },
        sort:function(){
            
        },
        filterGroup:function(group){
            var items = this.items;
            return items.filter(function(itm){
                return itm.groupId===group;
            });
            
        },
        //Incomplete
        filterBy:function(sortBy){
            var items = this.items;
            var sorted = [];      
            sortBy.forEach(function(srt){
                var by = srt.by;
                var dir = srt.dir;
                var prop = srt.prop;
            })
            items.filter(function(itm){
                return itm
            })
        }
    });
    Q.Sprite.extend("Player",{
        init:function(p){
            this._super(p,{
                sprite:"player",
                sheet:"player_1",
                type:Q.SPRITE_PLAYER|Q.SPRITE_INTERACTABLE,
                collisionMask:Q.SPRITE_INTERACTABLE|Q.SPRITE_DEFAULT,
                w:32,
                h:64,
                dir:"down"
            });
            this.add("2d, animation");
            this.add("mover, solidInteraction, pathLogic, animations");
            this.add("Bag");
            var cx = this.p.w/2;
            var cy = this.p.h/2+this.p.h/4+this.p.h/8;
            this.p.cx = cx;
            this.p.cy = cy;
            
            this.p.x = this.p.loc[0]*Q.tileH+this.p.w/2;
            this.p.y = this.p.loc[1]*Q.tileH+this.p.h/4;
            this.p.z = this.p.y;
            var boxW=32/3-1;
            var boxH=32/6-1;
            var origX = cx-this.p.w+1;
            var origY = cy-this.p.h+1;
            //Need to offset the points to be the bottom part of the sprite
            this.p.points = [
                [origX+boxW*1,origY+boxH*0],
                [origX+boxW*2,origY+boxH*0],
                [origX+boxW*3,origY+boxH*1],
                [origX+boxW*3,origY+boxH*2],
                [origX+boxW*2,origY+boxH*3],
                [origX+boxW*1,origY+boxH*3],
                [origX+boxW*0,origY+boxH*2],
                [origX+boxW*0,origY+boxH*1]
            ];
            
            this.getLoc();
            this.trigger("playStand",this.p.dir);
        },
        touched:function(){
            
        },
        //Not in use, but it has to do with stopping the player from moving at an object at the certain direction
        getEndOffset:function(path){
            //The second last path point
            var p1 = path[path.length-2];
            //The last path point
            var p2 = path[path.length-1];
            if(!p1){console.log("No P1");return [0,0];};
            var offset = [0,0];
            if(p1[0]-p2[0]>0){
                if(p1[1]-p2[1]<0){
                    offset=[this.p.w/2,-this.p.h/2];
                } else if(p1[1]-p2[1]===0){
                    offset=[this.p.w/2,0];
                } else if(p1[1]-p2[1]>0){
                    offset=[this.p.w/2,this.p.h/2];
                }
            } else if(p1[0]-p2[0]<0){
                if(p1[1]-p2[1]<0){
                    offset=[-this.p.w/2,-this.p.h/2];
                } else if(p1[1]-p2[1]===0){
                    offset=[-this.p.w/2,0];
                } else if(p1[1]-p2[1]>0){
                    offset=[-this.p.w/2,this.p.h/2];
                }
            } else if(p1[0]-p2[1]===0){
                if(p1[1]-p2[1]<0){
                    offset=[0,-this.p.h/2];
                } else if(p1[1]-p2[1]===0){
                    console.log("This should not happen as this means the player is on the end spot");
                    //offset=[Q.tileH/2,0];
                } else if(p1[1]-p2[1]>0){
                    offset=[0,this.p.h/2];
                }
            }
            return [offset[0],offset[1]];
        },
        getStartRemainder:function(){
            var x = this.p.x;
            var y = this.p.y;
            var remX = Math.floor((x/Q.tileH-Math.floor(x/Q.tileH))*Q.tileH)-Q.tileH;
            var remY = Math.floor((y/Q.tileH-Math.floor(y/Q.tileH))*Q.tileH)-Q.tileH;
            return [remX,remY];
        },
        getEndRemainder:function(path,touch){
            var x = path[path.length-1][0];
            var y = path[path.length-1][1];
            var remX = Math.floor((touch.x/Q.tileH-Math.floor(x))*Q.tileH)-Q.tileH;
            var remY = Math.floor((touch.y/Q.tileH-Math.floor(y))*Q.tileH)-Q.tileH;
            return [remX,remY];
        },
        //Moves the player to the target location
        moveTo:function(touch){
            var toLoc = Q.getTouchLoc(touch);
            var path = this.pathLogic.getPath(this.p.loc,toLoc);
            path = PF.Util.compressPath(path);
            if(path.length===1){
                //Get the remainder of the last movement
                var rem = this.getEndRemainder(path,touch);
                //Modify the final point in the path to be the touch location
                path[1]=[path[0][0]+((rem[0]+Q.tileH/2)/Q.tileH),path[0][1]+((rem[1]+Q.tileH/2)/Q.tileH)];
            } else {
                var rem = this.getStartRemainder(path);
                //Modify the first two points
                path[0]=[(this.p.x+rem[0])/Q.tileH,(this.p.y+rem[1])/Q.tileH];
                //Get the remainder of the last movement
                var rem = this.getEndRemainder(path,touch);
                //Modify the final point in the path to be the touch location
                path[path.length-1]=[path[path.length-1][0]+((rem[0]+Q.tileH/2)/Q.tileH),path[path.length-1][1]+((rem[1]+Q.tileH/2)/Q.tileH)];
                //console.log(rem)
            }
            path = PF.Util.compressPath(path);
            //console.log(path)
            this.pathLogic.moveAlong({path:path,x:this.p.x,y:this.p.y});
            //Q.sendEvent("PlayerEvent",{funcs:["moveAlong"],uniqueId:this.p.uniqueId,props:[{path:path,x:this.p.x,y:this.p.y}]});
        },
        //Moves the player one square away from the target location
        //Set near to true to allow moving near solid objects
        moveNear:function(to,item,near){
            this.getLoc();
            //Remainder
            var remX = Math.floor((to.x/Q.tileH-Math.floor(to.x/Q.tileH))*Q.tileH);
            var remY = Math.floor((to.y/Q.tileH-Math.floor(to.y/Q.tileH))*Q.tileH);
            var toLoc = [Math.floor((to.x-remX)/Q.tileH),Math.floor((to.y-remY)/Q.tileH)];
            
            //If the player is beside the object or on the object and there is an object
            if(Q._isObject(item)&&this.besideTargetLoc(this.p.loc,toLoc)){
                item.interact(this);
            }
            //If the player is not near the target, move near
            else if(!this.besideTargetLoc(this.p.loc,toLoc)){
                var path = this.pathLogic.getPath(this.p.loc,toLoc,near);
                var close = PF.Util.expandPath(path);
                close.pop();
                if(close.length<2){return;};
                this.moveTo({x:close[close.length-1][0]*Q.tileH+Q.tileH/2,y:close[close.length-1][1]*Q.tileH+Q.tileH/2});
                //PF.Util.compressPath(close);
                //this.pathLogic.moveAlong({path:close,x:this.p.x,y:this.p.y});
            }
        },
        besideTargetLoc:function(loc,toLoc){
            //Check if the target loc is within 1 sqare
            if(Math.abs(loc[0]-toLoc[0])<=1&&Math.abs(loc[1]-toLoc[1])<=1){
                //Make sure to not allow the square we're standing on
                //Basically, either x or y have to not be 0
                if(loc[0]!==toLoc[0]||loc[1]!==toLoc[1]){
                    return true;
                }
            }
            return false;
        },
        //Interaction functions
        pickUpItem:function(item){
            //The player's bag
            var bag = this.Bag;
            //If there's room in the bag
            if(item.p.weight+bag.weight<=bag.maxWeight){
                var itm = {
                    itemId:item.p.itemId,
                    groupId:item.p.groupId,
                    level:item.p.level,
                    weight:item.p.weight
                };
                bag.addItem(itm);
                Q.socketEmit(this.socket,"BagEvent",{funcs:["addItem"],props:[itm]});
                this.stage.remove(item);
                Q.sendEvent("QEvent",{funcs:["removeItem","showDynamicText"],uniqueId:this.p.uniqueId,props:[{loc:item.p.loc},{text:item.p.name+" +1",x:this.p.x-this.p.w/2,y:this.p.y-this.p.h/2}]});
                return true;
            } 
            //If there's no room in the bag
            else {
                Q.sendEvent("QEvent",{funcs:["showDynamicText"],uniqueId:this.p.uniqueId,props:[{text:"No more room in bag!",x:this.p.x-this.p.w/2,y:this.p.y-this.p.h/2}]});
                return false;
            }
        },
        getLoc:function(){
            this.p.loc = Q.getLoc(this);
        },
        //Checks if there is a certain tool equipped and that tool's level is enough
        checkEquipment:function(equipment,level){
            var eq = this.Bag.equipment;
            if(eq&&eq.name===equipment&&eq.level>=level){
                return true;
            }
            return false;
        },
        //Checks if seeds are equipped
        checkSeeds:function(){
            if(this.Bag.seeds&&this.Bag.seeds.itemId>=0){
                return true;
            }
            return false;
        },
        processTouch:function(touch){
            var stage = this.stage;
            //Make sure this player's loc is set properly
            this.getLoc();
            //If we're touching an object
            if(touch.loc&&touch.class){
                var objs = stage.lists[touch.class];
                var obj = objs.filter(function(ob){
                    if(ob.p.colLocs){
                        return ob.p.colLocs.filter(function(loc){
                            return loc[0]===touch.loc[0]&&loc[1]===touch.loc[1];
                        })[0];
                    } else {
                        return ob.p.loc[0]===touch.loc[0]&&ob.p.loc[1]===touch.loc[1];
                    }
                })[0];
                if(obj){
                    obj.touched(touch,this);
                }
            } 
            //If there's no object where the player touched
            else {
                //Get the square where the user touched.
                var touchLoc = Q.getTouchLoc(touch);
                //The layer that stores the walkable ground
                var gr = stage.groundLayer;
                //The layer that stores the non-walkable ground
                var tl = stage.collisionLayer;
                //If we're touching soil and we're beside the soil
                var ground = Q.checkGround(gr.p.tiles[touchLoc[1]][touchLoc[0]],tl.p.tiles[touchLoc[1]][touchLoc[0]]);
                //The level data
                var levelData = this.p.curLevel.levelData;
                //The current map
                var map = this.p.curLevel.map;
                if(ground.type){
                    //If the player does not have the proper tool to interact with the square, move onto it. Else, move near it
                    switch(ground.type){
                        case "soil":
                            if(ground.tilled){
                                //If we're watering
                                if(ground.seeded){
                                    //Only water if it's not already done
                                    if(!ground.watered){
                                        if(this.checkEquipment("Watering Can",1)){
                                            //Watering a tilledSoil that has a seed in it
                                            if(this.besideTargetLoc(this.p.loc,touchLoc)){
                                                this.waterSoil(touchLoc);
                                                Q.sendEvent("PlayerEvent",{funcs:["waterSoil"],uniqueId:this.p.uniqueId,props:[touchLoc]});
                                                //Set the soil to be watered in the levelData
                                                var soil = levelData.getItem(map,"tilledSoil",touchLoc);
                                                soil.watered = this.Bag.equipment.level*4;
                                                return;
                                            } else {
                                                //Move near the planted seed
                                                this.moveNear(touch,touchLoc,true);
                                                return;
                                            }
                                        } else {
                                            //Move near the planted seed
                                            this.moveNear(touch,touchLoc,true);
                                            return;
                                        }
                                    } else {
                                        //Move near the planted seed
                                        this.moveNear(touch,touchLoc,true);
                                        return;
                                    }
                                } 
                                else {
                                    //If we're watering tilled soil with no seed
                                    if(!ground.watered){
                                        if(this.checkEquipment("Watering Can",1)){
                                            if(this.besideTargetLoc(this.p.loc,touchLoc)){
                                                this.waterSoil(touchLoc);
                                                Q.sendEvent("PlayerEvent",{funcs:["waterSoil"],uniqueId:this.p.uniqueId,props:[touchLoc]});
                                                //Set the soil to be watered in the levelData
                                                var soil = levelData.getItem(map,"tilledSoil",touchLoc);
                                                soil.watered = this.Bag.equipment.level*4;
                                                return;
                                            }
                                        }
                                    } 
                                    //If we're planting seeds
                                    if(this.checkSeeds()){
                                        if(this.besideTargetLoc(this.p.loc,touchLoc)){
                                            var seedData = Q.state.get("Jitems").seeds[this.Bag.seeds.itemId].phases[0];
                                            //Add the crop to the level data
                                            levelData.addItem(map,"crops",{loc:touchLoc,phase:0,level:1,crop:this.Bag.seeds.itemId,water:seedData.water,sun:seedData.sun,days:seedData.days});
                                            this.plantSeeds(touchLoc);
                                            
                                            Q.sendEvent("PlayerEvent",{funcs:["plantSeeds"],uniqueId:this.p.uniqueId,props:[touchLoc]});
                                            this.pathLogic.stopMove(); 
                                            return;
                                        }
                                    } else {
                                        this.moveTo(touch);
                                        return;
                                    }
                                }
                            } 
                            //If the soil is not tilled, till it
                            else {
                                if(this.checkEquipment("Hoe",1)){
                                    if(this.besideTargetLoc(this.p.loc,touchLoc)){
                                        levelData.addItem(map,"tilledSoil",{loc:touchLoc,days:this.Bag.equipment.level,water:0});
                                        this.tillSoil(touchLoc);
                                        Q.sendEvent("PlayerEvent",{funcs:["tillSoil"],uniqueId:this.p.uniqueId,props:[touchLoc]});
                                        this.pathLogic.stopMove(); 
                                        return;
                                    } 
                                } else {
                                    this.moveTo(touch);
                                    return;
                                }
                            }
                            break;
                    }
                    this.moveNear(touch,touchLoc,true);
                    return;
                }
                //If we're touching a collision tile from a tile layer
                if(tl.p.tiles[touchLoc[1]][touchLoc[0]]){
                    //This only allows the player to move near a spot that can be moved near
                    this.moveNear(touch,touchLoc,true);
                    return;
                }
                //If we're just moving to a place
                else {
                    this.moveTo(touch);
                    return;
                }
            }
        }
    });

};
};
if(typeof Quintus === 'undefined') {
  module.exports = quintusPlayer;
} else {
  quintusPlayer(Quintus);
}