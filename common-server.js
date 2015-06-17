//common-server.js

if (Meteor.isServer) {
    Meteor.publish("roles", function () {
        return Roles.find({});  
    });
    Meteor.publish("votes", function () {
        return Votes.find({});  
    });
    Meteor.publish("gamestate", function () {
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
                    'profile.death_location': 1
                }
            });
        }
    });
}