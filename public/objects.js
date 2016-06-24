var quintusObjects = function(Quintus) {
"use strict";
Quintus.Objects = function(Q){
    Q.Sprite.extend("Actor",{
        init:function(p){
            this._super(p,{
                type:Q.SPRITE_PLAYER|Q.SPRITE_INTERACTABLE,
                collisionMask:Q.SPRITE_INTERACTABLE|Q.SPRITE_DEFAULT,
                dir:"down",
                sprite:"player"
            });
            
            this.add("2d, animation, animations, mover, solidInteraction");
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
            Q.getLoc(this);
        },
        touched:function(){
            
        },
    });
    Q.Sprite.extend("Building",{
        init:function(p){
            this._super(p,{});
            this._super(p,Q.state.get("Jbuildings")[this.p.sheet]);
            this.p.type = Q.SPRITE_SOLID|Q.SPRITE_INTERACTABLE;
            Q.setXY(this);
            Q.setCenter(this);
            Q.getLoc(this);
            this.add("2d");
            this.p.colLocs = Q.setColLocs(this.p.colLocs,this.p.loc);
        },
        touched:function(touch,player){
            var touchLoc = Q.getTouchLoc(touch);
            var doors = this.p.doors;
            player.getLoc();
            for(var i=0;i<doors.length;i++){
                var door = doors[i];
                
                //If the user touched the door
                if(touchLoc[0]===door[0]+this.p.loc[0]&&touchLoc[1]===door[1]+this.p.loc[1]){
                    //If the player is standing in front of the door and touches the door
                    if(door[2]+this.p.loc[0]===player.p.loc[0]&&door[3]+this.p.loc[1]===player.p.loc[1]){
                        console.log("Open door!");
                        //player.openDoor(this);
                    } 
                    //If the player is not near the door, move him to the entrance
                    else {
                        player.moveTo({x:(door[2]+this.p.loc[0])*Q.tileH+Q.tileH/2,y:(door[3]+this.p.loc[1])*Q.tileH+Q.tileH/2});
                    }
                    return;
                }
            }
            //If the user just clicked the building somewhere
            player.moveNear(touch,this,true);
            
        },
        //Dummy function (Unless there is something the player could do when tapping a house :P)
        interact:function(){
            
        }
    });
    
    Q.Sprite.extend("Pickup",{
        init:function(p){
            this._super(p,{});
            this.p.sheet = p.sprite;
            //Set the item stats
            var items = Q.state.get("Jitems");
            var keys = Object.keys(items);
            this._super(p,items[keys[this.p.groupId]][this.p.itemId]);
            this.p.type = Q.SPRITE_PICKUP|Q.SPRITE_NONE;
            this.p.w = Q.tileH;
            this.p.h = Q.tileH;
            Q.setXY(this);
            Q.setCenter(this);
            Q.getLoc(this);
            this.add("2d");
        },
        touched:function(touch,player){
            player.moveNear(touch,this);
        },
        //Called from the player's moveNear function
        interact:function(player){
            player.pickUpItem(this);
        }
    });
    
    Q.Sprite.extend("SolidInteractable",{
        init:function(p){
            this._super(p,{});
            //Set the data for the visuals (and name)
            this._super(p,Q.state.get("JsolidInteractables")[this.p.sheet]);
            this.p.type = Q.SPRITE_SOLID|Q.SPRITE_INTERACTABLE;
            Q.setXY(this);
            Q.setCenter(this);
            if(this.p.zMod){
                this.p.z+=this.p.zMod;
            }
            this.add("2d");
            this.p.colLocs = Q.setColLocs(this.p.colLocs,this.p.loc);
        },
        touched:function(touch,player){
            player.moveNear(touch,this,true);
        },
        //Called from the player's moveNear function
        interact:function(player){
            if(this.p.equipment){
                if(player.checkEquipment(this.p.equipment,this.p.item.level)){
                    var loc = [this.p.loc[0],this.p.loc[1]];
                    var xMod = (this.p.w/Q.tileH)/2-0.5;
                    var yMod = (this.p.h/Q.tileH)-1;
                    loc[0]+=xMod;
                    loc[1]+=yMod;
                    var data = {loc:loc,item:this.p.item};
                    //Removes the solidinteractable and adds a pickup
                    player.processSolidInteractable(data);
                    //Remove the solid interactable
                    player.p.curLevel.levelData.removeItem(player.p.curLevel.map,"solidInteractables",this.p.loc);
                    //Add the pickup (The pickup's level is based on the tool's level)
                    player.p.curLevel.levelData.addItem(player.p.curLevel.map,"pickups",{loc:loc,level:player.Bag.equipment.level,itemId:this.p.item.itemId,groupId:this.p.item.groupId});
                    this.stage.remove(this);
                    Q.sendEvent("PlayerEvent",{funcs:["processSolidInteractable"],uniqueId:player.p.uniqueId,props:[data]});
                    Q.sendEvent("QEvent",{funcs:["removeItem"],uniqueId:player.p.uniqueId,props:[{loc:this.p.loc}]});
                } else {
                    Q.sendEvent("QEvent",{funcs:["showDynamicText"],uniqueId:player.p.uniqueId,props:[{text:this.p.equipment+" lv. "+this.p.item.level+" needed!",x:this.p.x-this.p.w/2,y:this.p.y-this.p.h/2}]});
                }
            }
        }
    });
    Q.Sprite.extend("Crop",{
        init:function(p){
            this._super(p,{});
            this._super(p,Q.state.get("Jitems")["crops"][this.p.itemId]);
            this.p.sprite = "crop";
            this.p.type = Q.SPRITE_SOLID|Q.SPRITE_INTERACTABLE;
            this.p.w = Q.tileH;
            this.p.h = Q.tileH;
            /*if(this.p.phase===Q.assets[this.p.fromServer+'/data/json/crops.json'][this.p.sheet].phases.length){
                this.p.pickable="hand";
            }*/
            Q.setXY(this);
            Q.setCenter(this);
            Q.getLoc(this);
            this.add("2d");
            this.p.colLocs = [[0,0]];//Q.getColLocs(this.p.w,this.p.h,this.p.loc);
        },
        touched:function(touch,player){
            player.moveNear(touch,this,true);
        },
        //Called from the player's moveNear function
        interact:function(player){
            //Water the crop if it's not already watered
            var soil = player.p.curLevel.levelData.getItem(player.p.curLevel.map,"tilledSoil",this.p.loc);
            if(soil.watered===0){
                if(player.checkEquipment("Watering Can",1)){
                    if(player.besideTargetLoc(player.p.loc,this.p.loc)){
                        player.waterSoil(this.p.loc);
                        Q.sendEvent("PlayerEvent",{funcs:["waterSoil"],uniqueId:player.p.uniqueId,props:[this.p.loc]});
                        soil.watered = player.Bag.equipment.level*4;
                        return;
                    }
                }
            }
        }
    });
};

};
if(typeof Quintus === 'undefined') {
  module.exports = quintusObjects;
} else {
  quintusObjects(Quintus);
}