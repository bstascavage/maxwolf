//common-client.js

Roles = new Mongo.Collection("roles");
Teams = new Mongo.Collection("teams");
Players = new Mongo.Collection("players");
Gamestate = new Mongo.Collection("gamestate");
Votes = new Mongo.Collection("votes");
Events = new Mongo.Collection("events");

GLOBAL_DEBUG = false;
GLOBAL_GAME_DAY_LENGTH = 10; //in seconds
GLOBAL_GAME_NIGHT_LENGTH = 5; //in seconds

if (Meteor.isClient) {
    Meteor.subscribe("roles");
    Meteor.subscribe("votes");
    Meteor.subscribe("gamestate");
    Meteor.subscribe("allUsers");
}