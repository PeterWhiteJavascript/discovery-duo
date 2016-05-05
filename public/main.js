window.addEventListener("load", function() {

var Q = window.Q = Quintus({audioSupported: ['mp3','ogg','wav']}) 
        .include("Sprites, Scenes, Input, 2D, Anim, Touch, UI, TMX, Audio, Animations, Player, QFunctions, Music, Objects, UI_Objects")
        .setup({
            development: true,
            width:window.innerWidth,
            height:window.innerHeight,
            maximize:"touch",
            upsampleWidth:  420,
            upsampleHeight: 320,
            downsampleWidth: 1024,
            downsampleHeight: 768,
            scaleToFit:true
        });
//Note, the dimensions are not optimal for Nexus 6P, but they're pretty good for everything else :)
Q.uiOpts = {
    
};
Q.touch(Q.SPRITE_ALL).controls(true)
        .enableSound();

Q.input.touchControls({
  controls:  [ ['left','<' ],
               ['right','>' ],
               [],
               ['action','b'],
               ['fire', 'a' ]]
});

Q.SPRITE_NONE = 0;
Q.SPRITE_DEFAULT = 1;
Q.SPRITE_PICKUP = 2;
Q.SPRITE_GROUND = 4;
Q.SPRITE_SOLID = 8;
Q.SPRITE_PLAYER = 16;
Q.SPRITE_UI=64;
Q.gravityY=0;
Q.tileH=32;

Q.soilNum = 8;
Q.wateredSoilNum = 9;
Q.seedNum = 22;
Q.wateredSeedNum = 23;
Q.getOrientation = function(){
    //If the width is greater than the height, orientation is true
    return Q.width>Q.height?true:false;
};
Q.orientation=Q.getOrientation();

require(['socket.io/socket.io.js']);

var socket = io.connect();

var uniqueId = 0;//Math.floor(Math.random()*2);
function setUp(){
    
    /**CONNECTION**/  
    //When the user connects to the game
    socket.on('connected', function (data) {
        //A global (in the Q object) that contains the current user info
        Q.con = {playerId:data['playerId'],socket:socket};
        console.log("I am "+data['playerId']);
        //Tell the server that this client has connected properly
        //This will be sent after login ince that is done. It will take the user to the lobby
        //The flow will be:
        //User enters username/password -> get filename and unique id for this user from database 
        //LOOK IN TO USING LevelUP DATABASE
        socket.emit('confirmConnect',{file:"2d3axd",uniqueId:uniqueId});
    });
    
    //When a user disconnects from the game
    socket.on("disconnected",function(data){
        //data contains the user that disconnected's id
        console.log(data);
    });
    
    socket.on("joinedGame",function(data){
        console.log(data)
    });
    /**END CONNECTION**/
    
    /**INITIAL MENUS**/
    socket.on("startGame",function(data){
        setInitialState(data);
    });
    /**END INITIAL MENUS**/
    
    /**DURING GAMEPLAY**/
    
    /**END DURING GAMEPLAY**/
}
function setInitialState(data){
    Q.state.set(data);
    Q.state.set("player",Q.state.get("activeUsers").filter(function(p){return p.uniqueId===uniqueId;})[0]);
    //This will get all of the info from items.json and put it in bag.items
    Q.setUpItems();
    var levelData = Q.state.get("levelData");
    var level = levelData["main_farm"];
    level['map']="main_farm";
    Q.startScene(level);
   
};

var imageFiles = [
    "player_1.png",
    "buildings.png",
    "ui_objects.png",
    "pickups.png",
    "solid_interactables.png",
    "menu_icons.png",
    
    "carrot.png"
];
for(i=0;i<imageFiles.length;i++){
    imageFiles[i]="/images/"+imageFiles[i];
}

var jsonFiles = [
    "buildings.json",
    "pickups.json",
    "items.json",
    "solid_interactables.json",
    "crops.json",
    "ui_objects.json",
    "menu_icons.json"
];
for(i=0;i<jsonFiles.length;i++){
    jsonFiles[i]="/data/json/"+jsonFiles[i];
}
Q.load(imageFiles.concat(jsonFiles).concat(["/lib/pathfinding-browser.min.js"]).join(','),function(){
    Q.compileSheets("/images/buildings.png","/data/json/buildings.json");
    Q.compileSheets("/images/pickups.png","/data/json/pickups.json");
    Q.compileSheets("/images/solid_interactables.png","/data/json/solid_interactables.json");
    Q.compileSheets("/images/ui_objects.png","/data/json/ui_objects.json");
    Q.compileSheets("/images/menu_icons.png","/data/json/menu_icons.json");
    Q.setUpAnimations();
    setUp();
    /*
    
    var currentObj = null;
    Q.el.addEventListener('mousemove',function(e) {
      var x = e.offsetX || e.layerX,
          y = e.offsetY || e.layerY,
          stage = Q.stage(1);

      // Use the helper methods from the Input Module on Q to
      // translate from canvas to stage
      var stageX = Q.canvasToStageX(x, stage),
          stageY = Q.canvasToStageY(y, stage);

      // Find the first object at that position on the stage
      var obj = stage.locate(stageX,stageY,Q.SPRITE_ALL);

      // Set a `hit` property so the step method for the 
      // sprite can handle scale appropriately
      if(currentObj) { currentObj.p.over = false; }
      if(obj) {
        currentObj = obj;
        obj.p.over = true;
      }
      Q.state.get("mouseBlock").setPos(Math.floor(stageX/Q.tileH),Math.floor(stageY/Q.tileH));
    });*/
});


//Q.debug=true;
});

