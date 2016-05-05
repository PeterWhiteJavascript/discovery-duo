var quintusObjects = function(Quintus) {
"use strict";
Quintus.Objects = function(Q){
    Q.Sprite.extend("Building",{
        init:function(p){
           this._super(p,{
                type:Q.SPRITE_SOLID
           });
           this.p.itemId=this.p.sheet;
           Q.setXY(this);
           Q.setJSONData(Q.assets['/data/json/buildings.json'][this.p.sheet],this);
           Q.setCenter(this);
           this.add("2d");
           this.p.z = this.p.y;
           this.on("touch");
        },
        touch:function(touch){
            var touchLoc = Q.getTouchLoc(touch);
            var doors = this.p.doors;
            var player = Q.state.get("player");
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
                        player.moveTo([door[2]+this.p.loc[0],door[3]+this.p.loc[1]]);
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
           this._super(p,{
                type:Q.SPRITE_PICKUP,
                level:1
           });
           this.p.itemId=this.p.sheet;
           Q.setXY(this);
           //Set the data for the visuals (and name)
           Q.setJSONData(Q.assets['/data/json/pickups.json'][this.p.sheet],this);
           //Set the item stats
           Q.setJSONData(Q.assets['/data/json/items.json'][this.p.itemId],this);
           Q.setCenter(this);
           this.add("2d");
           this.p.z = this.p.y||2;
           this.on("touch");
        },
        touch:function(touch){
            Q.state.get("player").moveNear(touch,this);
        },
        //Called from the player's moveNear function
        interact:function(obj){
            obj.pickUpItem(this);
        }
    });
    
    Q.Sprite.extend("SolidInteractable",{
        init:function(p){
           this._super(p,{
                type:Q.SPRITE_SOLID
           });
           this.p.itemId=this.p.sheet;
           Q.setXY(this);
           //Set the data for the visuals (and name)
           Q.setJSONData(Q.assets['/data/json/solid_interactables.json'][this.p.sheet],this);
           //Set the item stats
           //Q.setJSONData(Q.assets['/data/json/items.json'][this.p.name],this);
           Q.setCenter(this);
           this.add("2d");
           this.p.z = this.p.y||2;
           this.on("touch");
        },
        touch:function(touch){
            Q.state.get("player").moveNear(touch,this,true);
        },
        //Called from the player's moveNear function
        interact:function(obj){
            var player = Q.state.get("player");
            switch(this.p.itemId){
                case "tree":
                    if(player.checkEquipment("axe",this.p.level)){
                        //Destroy this tree and exchange it with a chopped lumber
                        player.chopWood(this);
                    } else {
                        this.stage.insert(new Q.DynamicText({text:"Axe lv "+this.p.level+" needed!",color:"#ffffff", x:this.p.x-this.p.w/2,y:this.p.y-this.p.h/2}));
                    }
                    //player
                    break;
                case "rock":
                    if(player.checkEquipment("hammer",this.p.level)){
                        player.breakRock(this);
                    } else {
                        this.stage.insert(new Q.DynamicText({text:"Hammer lv "+this.p.level+" needed!",color:"#ffffff", x:this.p.x-this.p.w/2,y:this.p.y-this.p.h/2}));
                    }
                    break;
            }
        }
    });
    Q.Sprite.extend("Crop",{
        init:function(p){
           this._super(p,{
                type:Q.SPRITE_SOLID,
                sprite:"crop"
           });
           this.p.itemId=this.p.sheet;
           Q.setXY(this);
           Q.setCenter(this);
           
           Q.setJSONData(Q.assets['/data/json/items.json'][this.p.sheet],this);
           this.add("2d,animation");
           this.p.z = this.p.y||2;
           this.on("touch");
           this.play("phase"+this.p.phase);
           if(this.p.phase===Q.assets['/data/json/crops.json'][this.p.sheet].phases.length){
               this.p.pickable="hand";
           }
        },
        touch:function(touch){
            Q.state.get("player").moveNear(touch,this,true);
        },
        //Called from the player's moveNear function
        interact:function(obj){
            var player = Q.state.get("player");
            if(this.p.pickable){
                switch(this.p.pickable){
                    case "hand":
                        player.pickCrop(this);
                        break;
                }
            } else if(this.p.watered<=0&&player.checkEquipment("watering_can",1)){
                player.waterPlant(this.p.loc,Q.wateredSoilNum);
                this.p.watered = Q.state.get("equipment").level*200;
            }
        }
    });
};

};
if(typeof Quintus === 'undefined') {
  module.exports = quintusObjects;
} else {
  quintusScenes(Quintus);
}