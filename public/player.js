Quintus.Player=function(Q){
    Q.component("serverCommunication",{
        
    });
    //Add to the player to control things that he does with equipment
    Q.component("solidInteraction",{
        extend:{
            
            tillSoil:function(touchLoc){
                Q.ground.setTile(touchLoc[0],touchLoc[1],Q.soilNum);
                Q.addSoil(touchLoc);
                this.changeEnergy(this.getEnMod(-1));
            },
            plantSeeds:function(touchLoc,groundNum){
                var seedId = Q.state.get("player").seeds.itemId;
                //Get the seeds from the bag
                var seed = Q.state.get("player").bag.items.filter(function(item){
                    return item.itemId===seedId;
                })[0];
                Q.ground.setTile(touchLoc[0],touchLoc[1],groundNum);
                var item = this.useItem(seed);
                //Check if there's no more of this seed
                if(item.amount===0){
                    var seeds = Q.sortItems("seeds");
                    if(seeds){
                        Q.state.get("player").seeds = seeds[0];
                    } else {
                        Q.state.get("player").seeds = {};
                    }
                    this.trigger("change_seeds");
                }
                //Add the crop to the level data
                Q.addCrop(seed.itemId,touchLoc);
                this.changeEnergy(this.getEnMod(-1));
            },
            waterSoil:function(touchLoc,prop,groundNum){
                var grounds = Q.state.get("currentLevel")[prop];
                var ground = grounds.filter(function(gr){
                    return gr.loc[0]===touchLoc[0]&&gr.loc[1]===touchLoc[1];
                })[0];
                ground.watered=Q.state.get("player").equipment.level*200;
                if(prop==="crops"){
                    ground.water-=1;
                }
                Q.ground.setTile(touchLoc[0],touchLoc[1],groundNum);
                this.changeEnergy(this.getEnMod(-1));
            },
            pickCrop:function(crop){
                var data = Q.assets['/data/json/crops.json'][crop.p.sheet];
                Q.setJSONData(Q.assets['/data/json/items.json'][crop.p.sheet],crop);
                if(this.pickUpItem(crop)){
                    //Set the crop back to the specified stage
                    if(data.reharvestable){
                        this.stage.insert(new Q.Crop({loc:crop.p.loc,sheet:crop.p.sheet,phase:data.reharvestable}));
                    } else {
                        Q.removeCrop(crop.p.loc);
                    }
                }
                this.changeEnergy(this.getEnMod(-1));
            },
            chopWood:function(wood){
                var loc = [wood.p.loc[0]+((wood.p.w/Q.tileH/2)/2),wood.p.loc[1]+((wood.p.h/Q.tileH/2)/2)];
                this.stage.insert(new Q.Pickup({loc:loc,sheet:"lumber"}));
                wood.destroy();
                Q.removeSolidInteractable(wood.p.loc);
                this.changeEnergy(this.getEnMod(-1));
            },
            breakRock:function(rock){
                var loc = [rock.p.loc[0]+((rock.p.w/Q.tileH/2)/2),rock.p.loc[1]+((rock.p.h/Q.tileH/2)/2)];
                this.stage.insert(new Q.Pickup({loc:loc,sheet:"refined_stone"}));
                rock.destroy();
                Q.removeSolidInteractable(rock.p.loc);
                this.changeEnergy(this.getEnMod(-1));
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
                this.p.dir = this.checkPlayDir(dir);
                this.play("standing"+this.p.dir);
            },
            playWalk:function(dir){
                this.p.dir = this.checkPlayDir(dir);
                this.play("walking"+this.p.dir);
            }
        }
    });
    Q.component("mover",{
        added: function() {
            this.entity.on("startMove",this,"startMove");
            this.entity.on("stopMove",this,"stopMove");
            this.entity.on("atDest",this,"atDest");
            this.entity.p.speed = 2;
            this.entity.p.stepNum = Q.tileH;
            this.entity.p.stepCounter = 0;
        },
        atDest:function(){
            var p = this.entity.p;
            this.entity.trigger("atMoveDest");
            this.entity.trigger("playStand");
            this.stopMove();
            this.entity.playStand(p.dir);
        },
        startMove:function(){
            var p = this.entity.p;
            //At the first point as it is the initial spot
            this.atPoint();
            if(!p.movePath[0]){this.stopMove;return;};
            this.entity.on("step",this,"step");
            var vel = this.getVelocity(p.movePath[0][0],p.movePath[0][1]);
            this.entity.playWalk(this.checkVelDir(vel));
            
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
        },
        //Returns the this.p.dir based off of movement
        checkVelDir:function(vel){
            //The max velocity in a certain direction is the thrust (p.speed)
            var vx = Math.round(vel[0]);
            var vy = Math.round(vel[1]);
            var s = this.entity.p.speed;
            //figure out which direction the object is travelling
            //If I use diag anims, do another switch after this one and get rid of the equals signs in the switch
            switch(true){
                case vx<s/2&&vy<=s/2&&vy>-s/2:
                    return "left";
                case vx<s/2&&vx>=-s/2&&vy<s/2:
                    return "up";
                case vx>=s/2&&vy<s/2&&vy>=-s/2:
                    return "right";
                case vx<=s/2&&vx>-s/2&&vy>=s/2:
                    return "down";
            }
            //If the vx,vy is not caught (eventually this should not happen) I will fix when I've decided whether to use diag anims or not
            //console.log(vx,vy)
        },
        //Run when the object gets to a point in the p.movePath
        atPoint:function(){
            var p = this.entity.p;
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
            var tx = toX-p.x;
            var ty = toY-p.y;
            var dist = Math.sqrt(tx*tx+ty*ty);
            //var rad  = Math.atan2(ty,tx);
            //var angle = rad/Math.PI*180;
            var thrust = p.speed;
            var velX = (tx/dist)*thrust;
            var velY = (ty/dist)*thrust;
            return [velX,velY];
        },
        //Determines if this object is close enough to the next point
        close:function(){
            var p = this.entity.p;
            //If it's the last path, go to the click location
            if(p.movePath.length===0){
                return true;
            } else
            //If the object is within the acceptable range of the point
            if(Math.abs((p.x)-p.movePath[0][0])<1&&Math.abs((p.y)-p.movePath[0][1])<1){
                return true;
            }
            return false;
            
        },
        step:function(dt){
            var p = this.entity.p;
            var vel = this.getVelocity(p.movePath[0][0],p.movePath[0][1]);
            p.x+=vel[0];
            p.y+=vel[1];
            //Not perfectly accurate, but it will work.
            p.stepCounter+=Math.abs(vel[0])+Math.abs(vel[1]);
            if(p.stepCounter>p.stepNum){p.stepCounter=0;Q.state.get("player")['steps']=Q.state.get("player")['steps']+1;};
            p.z = p.y;
            this.entity.playWalk(this.checkVelDir(vel));
            if(this.close()){
                this.atPoint();
            }
        },
        extend:{
            moveAlong:function(to){
                if(!to){this.trigger("atDest");return;};
                this.p.movePath = [];
                //TO DO: Add some more smoothing between points that have no objects between them.
                for(var i=0;i<to.length;i++){
                    //The xy locations of the next move
                    this.p.movePath.push([to[i][0]*Q.tileH+this.p.w/2,to[i][1]*Q.tileH+this.p.h/4]);
                    
                }
                this.trigger("stopMove");
                this.trigger("startMove");
            }
        }
    });
    Q.Sprite.extend("Player",{
        init:function(p){
            this._super(p,{
                sprite:"player",
                sheet:"player_1",
                type:Q.SPRITE_PLAYER,
                collisionMask:Q.SPRITE_SOLID,
                w:32,
                h:64,
                dir:"down"
            });
            this.add("2d, animation");
            this.add("serverCommunication, mover, animations, solidInteraction");
            var cx = this.p.w/2;
            var cy = this.p.h/2+this.p.h/4+this.p.h/8;
            this.p.cx = cx;
            this.p.cy = cy;
            
            this.p.x = this.p.loc[0]*Q.tileH+this.p.w/2;
            this.p.y = this.p.loc[1]*Q.tileH+this.p.h/4;
            
            this.p.z = this.p.y;
            var boxW=32/3;
            var boxH=32/6;
            var origX = cx-this.p.w;
            var origY = cy-this.p.h;
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
            this.playStand(this.p.dir);
            this.getLoc();
        },
        //Moves the player to the target location
        moveTo:function(toLoc){
            this.moveAlong(Q.getPath(this,this.p.loc,toLoc));
        },
        //Moves the player one square away from the target location
        //Set near to true to allow moving near solid objects
        moveNear:function(to,item,near){
            //Remainder
            var remX = Math.floor((to.x/Q.tileH-Math.floor(to.x/Q.tileH))*Q.tileH);
            var remY = Math.floor((to.y/Q.tileH-Math.floor(to.y/Q.tileH))*Q.tileH);
            var toLoc = [Math.floor((to.x-remX)/Q.tileH),Math.floor((to.y-remY)/Q.tileH)];
            this.getLoc();
            var path = Q.getPath(this,this.p.loc,toLoc,near);
            var close = PF.Util.expandPath(path);
            close.pop();
            //If the player is beside the object or on the object and there is an object
            if(Q._isObject(item)&&this.besideTargetLoc(this.p.loc,toLoc)){
                item.interact(this);
            } 
            //If the player is not near the target
            else if(!this.besideTargetLoc(this.p.loc,toLoc)){
                this.moveAlong(PF.Util.compressPath(close),to);
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
            var bag = Q.state.get("player").bag;
            //The max weight
            var max = bag.maxWeight;
            //The current weight
            var weight = bag.weight;
            //The item's weight
            var itemWeight = item.p.weight;
            //If there's room in the bag
            if(itemWeight+weight<=max){
                bag.weight+=itemWeight;
                //The items that are currently in the bag
                var items = bag.items;
                var curItem = items.filter(function(itm){
                    return itm.itemId===item.p.itemId&&itm.level===item.p.level;
                })[0];
                //If there was already one of these items in the bag, increase the amount by one
                if(curItem){
                    curItem.amount++;
                } 
                //Else, add a new entry for this item
                else {
                    var data = Q.getItemData(item.p.itemId);
                    data.itemId = item.p.itemId;
                    data.level = item.p.level;
                    data.amount = 1;
                    items.push(data);
                    if(data.kind==="equipment"||data.kind==="seeds"){
                        this.trigger("change_"+data.kind);
                    } else {
                        this.trigger("change_held");
                    }
                }
                this.stage.remove(item);
                this.stage.insert(new Q.DynamicText({text:item.p.name+" +1",color:"#ffffff", x:this.p.x-this.p.w/2,y:this.p.y-this.p.h/2}));
                return true;
            } 
            //If there's no room in the bag
            else {
                this.stage.insert(new Q.DynamicText({text:"No room in bag!",color:"#ffffff", x:this.p.x-this.p.w/2,y:this.p.y-this.p.h/2}));
                return false;
            }
        },
        getLoc:function(){
            this.p.loc = Q.getLoc(this);
        },
        //Checks if there is a certain tool equipped and that tool's level is enough
        checkEquipment:function(equipment,level){
            var eq = Q.state.get("player").equipment;
            if(eq.itemId===equipment&&eq.level>=level){
                return true;
            }
            return false;
        },
        //Checks if seeds are equipped
        checkSeeds:function(){
            if(Q.state.get("player").seeds&&Q.state.get("player").seeds.itemId){
                return true;
            }
            return false;
        },
        processTouch:function(touch){
            var touchLoc = Q.getTouchLoc(touch);
            this.getLoc();
            //If we're touching soil and we're beside the soil
            var ground = Q.checkGround(Q.ground.p.tiles[touchLoc[1]][touchLoc[0]]);
            if(ground.type){
                //If the player does not have the proper tool to interact with the square, move onto it. Else, move near it
                switch(ground.type){
                    case "soil":
                        if(ground.tilled){
                            //If we're watering
                            if(ground.seeded){
                                //Only water if it's not already done
                                if(!ground.watered){
                                    if(this.checkEquipment("watering_can",1)){
                                        if(this.besideTargetLoc(this.p.loc,touchLoc)){
                                            this.waterSoil(touchLoc,"crops",Q.wateredSeedNum);
                                            return;
                                        }
                                    } else {
                                        this.moveTo(touchLoc);
                                        return;
                                    }
                                } else {
                                    this.moveTo(touchLoc);
                                    return;
                                }
                            } 
                            else {
                                //If we're watering tilled soil
                                if(!ground.watered){
                                    if(this.checkEquipment("watering_can",1)){
                                        if(this.besideTargetLoc(this.p.loc,touchLoc)){
                                            this.waterSoil(touchLoc,"tilledSoil",Q.wateredSoilNum);
                                            return;
                                        }
                                    }
                                } 
                                //If we're planting seeds
                                if(this.checkSeeds()){
                                    if(this.besideTargetLoc(this.p.loc,touchLoc)){
                                        var groundNum = ground.watered?Q.wateredSeedNum:Q.seedNum;
                                        this.plantSeeds(touchLoc,groundNum);
                                        this.mover.stopMove(); 
                                        return;
                                    }
                                } else {
                                    this.moveTo(touchLoc);
                                    return;
                                }
                            }
                        } 
                        //If the soil is not tilled, till it
                        else {
                            if(this.checkEquipment("hoe",1)){
                                if(this.besideTargetLoc(this.p.loc,touchLoc)){
                                    this.tillSoil(touchLoc);
                                    this.mover.stopMove(); 
                                    return;
                                } 
                            } else {
                                this.moveTo(touchLoc);
                                return;
                            }
                        }
                        break;
                }
                this.moveNear(touch,touchLoc,true);
                return;
            }
            //If we're touching a collision tile from a tile layer
            if(Q.TL.p.tiles[touchLoc[1]][touchLoc[0]]){
                //This only allow the player to move near a spot that can be moved near
                this.moveNear(touch,touchLoc,true);
                return;
            }
            //If we're just moving to a place
            else {
                this.moveTo(touchLoc);
                return;
            }
        },
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
        changeEnergy:function(amount){
            this.p.energy+=amount;
            this.trigger("change_energy");
            //TO DO: if we run out of energy
        },
        changeHunger:function(amount){
            this.p.hunger+=amount;
            this.trigger("change_hunger");
        },
        //Use one of this item
        useItem:function(item){
            var bag = Q.state.get("player").bag;
            var items = bag.items;
            var it = items.filter(function(itm){
                return item.itemId===itm.itemId&&item.level===itm.level;
            })[0];
            it.amount-=1;
            bag.weight-=it.weight;
            if(it.amount<=0){
                items.splice(items.indexOf(it),1);
            }
            return it;
        }
    });

};