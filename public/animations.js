Quintus.Animations = function(Q){
Q.setUpAnimations=function(){
    //Misc sprites
    var toSheet = [
        ['player_1','player_1.png',32,64],
        
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
        walkingdown:{ frames: [1,2,3,4,5], rate:walkRate,loop:false,trigger:"playStand"},
        
        standingup:{ frames: [6,7], rate:standRate},
        walkingup:{ frames: [7,8,9,10,11], rate:walkRate,loop:false,trigger:"playStand"},
        
        standingleft:{ frames: [12,13], rate:standRate},
        walkingleft:{ frames: [13,14,15,16,17], rate:walkRate,loop:false,trigger:"playStand"},
        
        standingright:{ frames: [18,19], rate:standRate},
        walkingright:{ frames: [19,20,21,22,23], rate:walkRate,loop:false,trigger:"playStand"}
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