//common-server.js

if (Meteor.isServer) {
    Meteor.publish("roles", function () {
        return Roles.find({});  
    });
    Meteor.publish("votes", function () {
        return Votes.find({}, {fields: {_id: 1, votefor: 1, voteType: 1, roomId: 1}});  
    });
    Meteor.publish("gamestate", function () {
        user = Meteor.users.findOne({'_id': this.userId})
        return Gamestate.find({'_id': user.profile.roomId});  
    });
    Meteor.publish("gamestateAll", function () {
        user = Meteor.users.findOne({'_id': this.userId})
        return Gamestate.find({});  
    });
    Meteor.publish('allUsers', function() {
        user = Meteor.users.findOne({'_id': this.userId})
        if (user.profile.team == 'Werewolves') {
            return Meteor.users.find({$and: [{'profile.roomId': user.profile.roomId}, {'profile.online': true}]}, {
                fields: {
                    _id: 1, 
                    username: 1, 
                    'profile.alive': 1,
                    'profile.online': 1,
                    'profile.roomId': 1,
                    'profile.idle': 1,
                    'profile.death': 1,
                    'profile.team': 1,
                    'profile.reveal_role': 1,
                    'profile.death_location': 1
                }
            });
            } else {
                return Meteor.users.find({$and: [{'profile.roomId': user.profile.roomId}, {'profile.online': true}]}, {
                fields: {
                    _id: 1, 
                    username: 1, 
                    'profile.alive': 1,
                    'profile.online': 1,
                    'profile.roomId': 1,
                    'profile.idle': 1,
                    'profile.death': 1,
                    'profile.reveal_role': 1,
                    'profile.death_location': 1
                }
            });
        }
    });
}