Quintus.Animations = function(Q){
Q.setUpAnimations=function(){
    //Building sprites
    Q.compileSheets("/images/buildings.png","/data/json/buildings.json");
    //Rocks/Trees/Switches/..etc
    Q.compileSheets("/images/solid_interactables.png","/data/json/solid_interactables.json");
    //UI Objects (not icons)
    Q.compileSheets("/images/ui_objects.png","/data/json/ui_objects.json");
    //Misc sprites
    var toSheet = [
        ['player_1','player_1.png',32,64],
        
        ['treasures','treasures.png',32,32],
        ['crops','crops.png',32,32],
        ['food','food.png',32,32],
        ['materials','materials.png',32,32],
        ['fish','fish.png',32,32],
        ['meat','meat.png',32,32],
        ['ores','ores.png',32,32],
        ['bugs','bugs.png',32,32],
        ['equipment','equipment.png',32,64],
        ['other','other.png',32,32],
        
        ["carrot","carrot.png",32,32]
    ];
    for(j=0;j<toSheet.length;j++){
        Q.sheet(toSheet[j][0],
        "/images/"+toSheet[j][1],
        {
           tilew:toSheet[j][2],
           tileh:toSheet[j][3]
        });
    };
    
    var standRate = 1/3;
    var walkRate = 1/6;
    Q.animations("player", {
        standingdown:{ frames: [0,1], rate:standRate},
        walkingdown:{ frames: [1,2,3,4,5], rate:walkRate},
        
        standingup:{ frames: [6,7], rate:standRate},
        walkingup:{ frames: [7,8,9,10,11], rate:walkRate},
        
        standingleft:{ frames: [12,13], rate:standRate},
        walkingleft:{ frames: [13,14,15,16,17], rate:walkRate},
        
        standingright:{ frames: [18,19], rate:standRate},
        walkingright:{ frames: [19,20,21,22,23], rate:walkRate}
    });
    Q.animations("crop",{
       phase1:{frames: [0,1], rate:standRate},
       phase2:{frames: [2,3], rate:standRate},
       phase3:{frames: [4,5], rate:standRate},
       phase4:{frames: [6,7], rate:standRate},
       phase5:{frames: [8,9], rate:standRate}
    });
};

};