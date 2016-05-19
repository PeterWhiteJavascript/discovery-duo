Quintus.UI_Objects = function(Q){
    //This will show a block where the player will move upon clicking
    /*Q.Sprite.extend("MouseBlock",{
        init:function(p){
           this._super(p,{
                type:Q.SPRITE_NONE,
                collisionMask:Q.SPRITE_NONE,
                sheet:"mouse_block"
           });
           this.add("2d");
           this.p.z = 3;
        },
        setPos:function(x,y){
            this.p.x = x*Q.tileH+Q.tileH/2;
            this.p.y = y*Q.tileH+Q.tileH/2;
        }
    });*/
    Q.Sprite.extend("DynamicText", {
        init:function(p){
            this._super(p, {
                color: "black",
                w: 14,
                h: 14,
                type:Q.SPRITE_NONE,
                collisionMask:Q.SPRITE_NONE,
                opacity:1,
                text:"",
                fill:"white"
            });
            this.p.x-=this.p.w/2;
            this.p.z = this.p.y*2;
            this.add("tween");
            this.animate({ y:this.p.y-74, opacity: 0 }, 3, Q.Easing.Quadratic.Out )
                .chain({ angle:   0 }, 5.2, { callback: function() { this.destroy(); } });
        },
        draw: function(ctx){
            ctx.fillStyle = this.p.color;
            ctx.font      = 'Bold 15px Arial';
            ctx.fillText(this.p.text, 0,-16);
        }
    });
    
    //HUD START
    Q.component("HUDElement",{
       added:function(){
           var p = this.entity.p;
           p.scale = 2;
           p.cx = 0;
           p.cy = 0;
           p.points = [[0,0],[p.w,0],[p.w,p.h],[0,p.h]];
           p.type = Q.SPRITE_UI;
       }
    });
    Q.UI.Container.extend("HUD",{
        init:function(p){
            this._super(p,{
                type:Q.SPRITE_UI,
                fill:'#9999ff',
                radius:0,
                elementScale:2,
                cx:0,cy:0
            });
        },
        setPos:function(pos){
            return Q.tileH*pos*this.p.elementScale; 
        },
        setUpHUD:function(){
            //If Q.width>Q.height
            if(Q.orientation){
                this.set({
                    x:Q.width-(Q.tileH*2*this.p.elementScale),
                    y:0,
                    w:Q.tileH*2*this.p.elementScale,
                    h:Q.width
                });
                
                var energy = this.insert(new Q.EnergyBar({x:this.setPos(0),y:this.setPos(0),w:Q.tileH*2,h:Q.tileH/2}));
                var energyText = this.insert(new Q.StatText({x:this.setPos(1),y:this.setPos(.05),stat:"energy"}));
                var hunger = this.insert(new Q.HungerBar({x:this.setPos(0),y:this.setPos(.5),w:Q.tileH*2,h:Q.tileH/2}));
                var hungerText = this.insert(new Q.StatText({x:this.setPos(1),y:this.setPos(.55),stat:"hunger"}));
                
                //Tool
                var blue = this.insert(new Q.UICircle({x:this.setPos(0),y:this.setPos(1),sheet:"ui_circle_blue",menuProp:"equipment"}));
                blue.getIcon();
                //Seeds
                var green = this.insert(new Q.UICircle({x:this.setPos(0),y:this.setPos(3),sheet:"ui_circle_green",menuProp:"seeds"}));
                green.getIcon();
                //Held
                var red = this.insert(new Q.UICircle({x:this.setPos(0),y:this.setPos(5),sheet:"ui_circle_red",menuProp:"held"}));
                red.getIcon();
                var bagBase = this.insert(new Q.UIBagEncyBase({x:this.setPos(0),y:this.setPos(7),w:this.p.w,menuProp:"bag"}));
                var bag = this.insert(new Q.UIBagEncy({x:this.setPos(0.25),y:this.setPos(7),sheet:"ui_bag_icon"}));
                var bagWeight = this.insert(new Q.UIBagWeight({x:this.setPos(1.5),y:this.setPos(7.5)}));
                
                var encyBase = this.insert(new Q.UIBagEncyBase({x:this.setPos(0),y:this.setPos(8),w:this.p.w,menuProp:"encyclopedia"}));
                var ency = this.insert(new Q.UIBagEncy({x:this.setPos(.5),y:this.setPos(8),sheet:"ui_ency_icon"}));
                
                var dateTimeBase = this.insert(new Q.UIDateTimeBase({x:this.setPos(0),y:this.setPos(9)}));
                var date = this.insert(new Q.UIDate({x:this.setPos(1),y:this.setPos(9.30)}));
                var time = this.insert(new Q.UITime({x:this.setPos(1),y:this.setPos(9.60)}));
                
                var curWeather = Q.state.get("weather");
                var weather1 = this.insert(new Q.UIWeather({x:this.setPos(0),y:this.setPos(10),sheet:"ui_"+curWeather[0][0]+"_icon"}));
                var weather2 = this.insert(new Q.UIWeather({x:this.setPos(1),y:this.setPos(10),sheet:"ui_"+curWeather[1][0]+"_icon"}));
                
                var musicBase = this.insert(new Q.UIAudioBase({x:this.setPos(0),y:this.setPos(11),audioProp:"musicEnabled"}));
                var music = this.insert(new Q.UIAudioEnabler({x:this.setPos(0),y:this.setPos(11),sheet:"ui_music_enabler",base:musicBase}));
                
                var soundBase = this.insert(new Q.UIAudioBase({x:this.setPos(1),y:this.setPos(11),audioProp:"soundEnabled"}));
                var sound = this.insert(new Q.UIAudioEnabler({x:this.setPos(1),y:this.setPos(11),sheet:"ui_sound_enabler",base:soundBase}));
                
            } else {
                this.set({
                    x:0,
                    y:0,
                    w:Q.width,
                    h:Q.tileH*2*this.p.elementScale
                });
                //Music
                var musicBase = this.insert(new Q.UIAudioBase({x:this.setPos(0),y:this.setPos(0),audioProp:"musicEnabled"}));
                this.insert(new Q.UIAudioEnabler({x:this.setPos(0),y:this.setPos(0),sheet:"ui_music_enabler",base:musicBase}));
                //Sound
                var soundBase = this.insert(new Q.UIAudioBase({x:this.setPos(0),y:this.setPos(1),audioProp:"soundEnabled"}));
                this.insert(new Q.UIAudioEnabler({x:this.setPos(0),y:this.setPos(1),sheet:"ui_sound_enabler",base:soundBase}));
                
                var blue = this.insert(new Q.UICircle({x:this.setPos(1),y:this.setPos(0),sheet:"ui_circle_blue"}));
                var green = this.insert(new Q.UICircle({x:this.setPos(3),y:this.setPos(0),sheet:"ui_circle_green"}));
                var red = this.insert(new Q.UICircle({x:this.setPos(5),y:this.setPos(0),sheet:"ui_circle_red"}));
            }
        }
    });
    //The music/sound enabler
    Q.Sprite.extend("UIAudioEnabler",{
        init:function(p){
           this._super(p,{
                w:Q.tileH,
                h:Q.tileH
           });
           this.add("HUDElement");
       }
    });
    Q.UI.Container.extend("UIAudioBase",{
        init:function(p){
            this._super(p,{
                w:Q.tileH,
                h:Q.tileH
            });
            this.add("HUDElement");
            this.on("touch",this,"setProp");
            this.setColor(Q.state.get("player").options[this.p.audioProp]);
        },
        setProp:function(){
            var enabled = Q.state.get("player").options[this.p.audioProp];
            if(enabled){
                enabled = false;
            } else {
                enabled = true;
            }
            Q.state.get("player").options[this.p.audioProp] = enabled;
            //Uncomment when audio is added
            /*if(this.p.audioProp==="musicEnabled"&&enabled){
                Q.playMusic(Q.state.get("dailySettings")['music']);
            }*/
            this.setColor(enabled);
        },
        setColor:function(enabled){
            //If music/sound is enabled
            if(enabled){
                this.p.fill = "#F2F";
            } else {
                this.p.fill = "#3C3";
            }
        }
    });
    //The circles that contain equipment, seeds, and held item
    Q.Sprite.extend("UICircle",{
        init:function(p){
            this._super(p,{
                w:Q.tileH*2,
                h:Q.tileH*2,
                open:false
            });
            this.add("HUDElement");
            this.on("touch");
            //Listen for all events
            if(this.p.menuProp==="held"){
                Q.state.get("playerObj").Bag.on("change_equipment",this,"changeItem");
                Q.state.get("playerObj").Bag.on("change_seeds",this,"changeItem");
                Q.state.get("playerObj").Bag.on("change_held",this,"changeItem");
            } else {
                Q.state.get("playerObj").Bag.on("change_"+this.p.menuProp,this,"changeItem");
            }
        },
        //Loads the sorted bag with possible items to be used in this circle
        touch:function(){
            if(this.p.open){
                this.changeIcon();
                this.p.open=false;
            } else {
                this.showIcon();
            }
        },
        changeIcon:function(){
            this.children.forEach(function(child){
                child.destroy();
            });
            this.getIcon();
            this.p.open=false;
        },
        changeItem:function(){
            this.children.forEach(function(child){
                child.destroy();
            });
            this.getIcon();
            if(this.p.open){
                this.p.open=false;
                this.touch();
            }
        },
        //This is for the small icons
        showIcon:function(){
            var items;
            switch(this.p.menuProp){
                case "equipment":
                    items = Q.state.get("playerObj").Bag.filterGroup(9);
                    break;
                case "seeds":
                    items = Q.state.get("playerObj").Bag.filterGroup(1);
                    break;
                case "held":
                    items = Q.state.get("playerObj").Bag.items;
                    break;
            }
             
            this.stage.insert(new Q.UISortedCircle({sheet:this.p.sheet,x:-Q.tileH,y:0,menuProp:this.p.menuProp}),this);
            var x = -Q.tileH;
            var y = Q.tileH;
            for(var i=0;i<items.length;i++){
                var item = items[i];
                var circle = this.stage.insert(new Q.UISortedCircle({sheet:this.p.sheet,x:x,y:y,menuProp:this.p.menuProp,item:items[i]}),this);
                if(item.groupId===1){
                    this.stage.insert(new Q.UIIcon({sheet:"equipment",frame:7,x:Q.tileH/2-1,y:Q.tileH/2-1}),circle);
                }
                this.stage.insert(new Q.UIIcon({sheet:item.sheet,frame:item.frame,x:Q.tileH/2-1,y:Q.tileH/2-1}),circle);
                this.stage.insert(new Q.UIItemText({labelString:"x",num:item.amount,x:Q.tileH-2,y:Q.tileH+Q.tileH/2,item:item}),circle);
                this.stage.insert(new Q.UIItemText({labelString:"lv. ",num:item.level,x:Q.tileH-2,y:Q.tileH/4}),circle);
                if(y===0){y=Q.tileH;}else{x-=Q.tileH;y=0;};
            }
            this.p.open=true;
        },
        //This is for the big icons
        getIcon:function(){
            var item = Q.state.get("playerObj").Bag[this.p.menuProp];
            if(item&&item.itemId>=0){
                if(item.amount<=0){return;};
                //If it's a seed, we need to add a seed base
                if(item.groupId===1){
                    this.stage.insert(new Q.UIIcon({sheet:"equipment",frame:7,x:Q.tileH/2-2,y:Q.tileH/2-2}),this);
                }
                this.stage.insert(new Q.UIIcon({sheet:item.sheet,frame:item.frame,x:Q.tileH/2-2,y:Q.tileH/2-2}),this);
                this.stage.insert(new Q.UIItemText({labelString:"x",num:item.amount,x:Q.tileH-2,y:Q.tileH+Q.tileH/2,item:item}),this);
                
                var text =this.stage.insert(new Q.UIItemText({labelString:"lv. ",num:item.level,x:Q.tileH-2,y:Q.tileH/4}),this);
            }
        }
    });
    Q.UI.Text.extend("UIItemText",{
        init:function(p){
            this._super(p,{
                 size:6,
                 type:Q.SPRITE_NONE
            });
            this.setLabel();
            if(this.p.labelString==="x"){
                Q.state.get("playerObj").Bag.on("use_item",this,function(item){
                    if(this.p.item.itemId===item.itemId&&this.p.item.level===item.level){
                        this.p.num = item.amount;
                        this.setLabel();
                    }
                });
            }
        },
        setLabel:function(){
            this.p.label = this.p.labelString+this.p.num;
        }
    });
    Q.Sprite.extend("UISortedCircle",{
        init:function(p){
           this._super(p,{
                w:Q.tileH*2,
                h:Q.tileH*2,
                cx:0,cy:0,
                type:Q.SPRITE_UI,
                scale:0.5
           });
           this.p.points = [[0,0],[this.p.w,0],[this.p.w,this.p.h],[0,this.p.h]];
           this.on("touch");
       },
       touch:function(){
            var func = "change_"+this.p.menuProp;
            var data = {func:func,props:{}};
           //If we're making the slot empty
            if(!this.p.item){
                Q.state.get("playerObj").Bag[func]({});
            } else {
                Q.state.get("playerObj").Bag[func](this.p.item);
                data.props.name = this.p.item.name;
                data.props.level = this.p.item.level;
                data.props.groupId = this.p.item.groupId;
                data.props.itemId = this.p.item.itemId;
            }
            //Send the data to the server so the active can be updated there.
            Q.sendData("bagFunc",data);
            //Change the UI visual
            this.container.changeItem();
       }
   });
    Q.Sprite.extend("UIIcon",{
        init:function(p){
           this._super(p,{
                w:Q.tileH,
                h:Q.tileH,
                cx:0,cy:0,
                type:Q.SPRITE_NONE
           });
           this.p.points = [[0,0],[this.p.w,0],[this.p.w,this.p.h],[0,this.p.h]];
       }
   });
    Q.Sprite.extend("UIBagEncy",{
        init:function(p){
           this._super(p,{
                w:Q.tileH,
                h:Q.tileH
           });
           this.add("HUDElement");
           this.on("touch");
        },
        touch:function(touch){
            console.log(touch);
        }
    });
    Q.UI.Container.extend("UIBagEncyBase",{
        init:function(p){
            this._super(p,{
                w:Q.tileH,
                h:Q.tileH,
                open:false
            });
            this.add("HUDElement");
            this.on("touch",this,"loadMenu");
            this.on("closeMenu");
            this.setColor(false);
        },
        //Open the menu
        loadMenu:function(){
            if(this.p.open){
                this.closeMenu();
            } else {
                this.openMenu();
            }
        },
        closeMenu:function(){
            this.setColor(false);
            this.p.open=false;
        },
        openMenu:function(){
            var menuData = Q.state.get(this.p.menuProp);
            this.setColor(true);
            this.p.open = true;
        },
        setColor:function(enabled){
            //If music/sound is enabled
            if(enabled){
                this.p.fill = "#F2F";
            } else {
                this.p.fill = "#3C3";
            }
        }
    });
    
    Q.UI.Text.extend("UIBagWeight",{
        init:function(p){
            this._super(p,{
                 size:16,
                 type:Q.SPRITE_NONE
            });
            this.setLabel();
            Q.state.get("playerObj").Bag.on("change_bag_weight",this,"setLabel");
        },
        setLabel:function(){
            this.p.label = Q.state.get("playerObj").Bag.weight+"/"+Q.state.get("playerObj").Bag.maxWeight;
        }
    });
    Q.Sprite.extend("UIDateTimeBase",{
        init:function(p){
            this._super(p,{
                w:Q.tileH*2,
                h:Q.tileH,
                sheet:"ui_date_time_base"
            });
            this.add("HUDElement");
        }
    });
    Q.UI.Text.extend("UIDate",{
        init:function(p){
            this._super(p,{
                 size:6
            });
            this.add("HUDElement");
            this.setLabel();
            Q.state.on("change.date",this,"setLabel");
        },
        setLabel:function(){
            var date = Q.getDate(Q.state.get("date"));
            this.p.label = date[0]+" "+date[1]+", Year "+date[2];
        }
    });
    Q.UI.Text.extend("UITime",{
        init:function(p){
            this._super(p,{
                 size:6
            });
            this.add("HUDElement");
            this.setLabel();
            Q.state.on("timeTick",this,"setLabel");
        },
        setLabel:function(){
            var time = Q.state.get("time");
            if(time[1]<10){
                time[1]="0"+time[1];
            }
            this.p.label = ""+time[0]+" : "+time[1];
        }
    });
    
    Q.Sprite.extend("UIWeather",{
        init:function(p){
            this._super(p,{
                w:Q.tileH,
                h:Q.tileH,
                fill:"#75c4ff"
            });
            this.add("HUDElement");
        }
    });
    Q.UI.Container.extend("EnergyBar",{
        init: function(p){
            this._super(p,{
                radius:0,
                fill:"#75c4ff"
            });
            this.add("HUDElement");
            Q.state.get("playerObj").on("change_energy",this,"updateBar");
            this.on("touch");
        },
        touch:function(){
            console.log("TO DO: load tooltip showing 'energy'");
        },

        updateBar: function(){
            var energy = Q.state.get("playerObj").p.energy;
            var maxEnergy = 100;
            var num = (energy/maxEnergy)*100;
            if(num<0){num=0;};
            this.p.w = num*(Q.tileH*this.p.scale/100);
        }
    });
    Q.UI.Container.extend("HungerBar",{
        init: function(p){
            this._super(p,{
                radius:0,
                fill:"#75c4ff"
            });
            this.add("HUDElement");
            Q.state.get("playerObj").on("change_hunger",this,"updateBar");
            this.on("touch");
        },
        touch:function(){
            console.log("TO DO: load tooltip showing 'hunger'");
        },
        updateBar: function(){
            var hunger = Q.state.get("playerObj").p.hunger;
            var maxHunger = 100;
            var num = (hunger/maxHunger)*100;
            if(num<0){num=0;};
            this.p.w = num*(Q.tileH*this.p.scale/100);
        }
    });
    Q.UI.Text.extend("StatText",{
        init: function(p){
            this._super(p,{
                label:"",
                color:"#75c4ff",
                outlineWidth:4,
                size:10
            });
            this.add("HUDElement");
            Q.state.get("playerObj").on("change_"+this.p.stat,this,"updateLabel");
            this.updateLabel();
        },
        updateLabel: function(){
            this.p.label=""+Q.state.get("playerObj").p[this.p.stat];
        }
    });
};
