namespace galactic.spacefarer;

using { cuid, managed } from '@sap/cds/common'; 
using { sap.common.CodeList } from '@sap/cds/common';

type StardustCollectionStatus : String(20) enum {
    low   = 'LOW';
    ready = 'READY';
    elite = 'ELITE';
}

type NavigationRank : String(20) enum {
    novice  = 'NOVICE';
    skilled = 'SKILLED';
    expert  = 'EXPERT';
    master  = 'MASTER';
}

entity Planets : CodeList {
    key code : String(20);
}

entity Departments : CodeList {
    key code : String(30);
}

entity Positions : CodeList {
    key code   : String(40);
    department : Association to Departments not null @assert.target;
}

entity SpacesuitColors : CodeList {
    key code : String(20);
}

@assert.unique: {
  email: [ email ]
}
entity SpaceFarers : cuid, managed {
    firstName : String(100) not null;
    lastName : String(100) not null;
    email : String(255) not null;
 
    originPlanet : Association to Planets not null @assert.target;
    position : Association to Positions not null @assert.target;
    
    stardustCollection : Integer not null;
    stardustCollectionStatus : StardustCollectionStatus not null;

    wormholeNavigationSkill : Integer not null;
    navigationRank : NavigationRank not null;

    spacesuitColor : Association to SpacesuitColors not null @assert.target;
}

