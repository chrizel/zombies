var Player = Backbone.Model.extend({
    initialize: function() {
        this.div = $('<div>')
                      .css('background-image', 'url(res.png)')
                      .width(48)
                      .height(16)
                      .appendTo('body');
        this.position(0, 0);
        this.rotation(0);
    },   

    position: function(x, y) {
        this.x = x;
        this.y = y;
        $(this.div).css({
            left: x + 'px',
            top: y + 'px'
        });
    },

    rotation: function(rad) {
        this.rad = rad;
        $(this.div).css({
            '-webkit-transform': 'rotate('+rad+'rad)',
            '-moz-transform': 'rotate('+rad+'rad)'
        });
    }
});

var InputHandler = Backbone.Model.extend({
    pressedKeys: [],

    initialize: function() {
        var self = this;

        $(window).keydown(function(e) {
            self.pressedKeys[e.keyCode] = true;
        });

        $(window).keyup(function(e) {
            self.pressedKeys[e.keyCode] = false;
        });
    },

    pressed: function(keyCode) {
        return this.pressedKeys[keyCode];
    }
});

var Game = Backbone.Model.extend({

    KEY_LEFT: 65,
    KEY_RIGHT: 68,
    KEY_UP: 87,
    KEY_DOWN: 83,

    initialize: function() {
        var self = this;
        this.player = new Player();
        this.inputHandler = new InputHandler();
        window.setInterval(function() { self.frame(); }, 30);
    },

    frame: function() {
        var self = this;
        var player = this.player;
        if (self.inputHandler.pressed(self.KEY_UP)) {
            var xOffset = Math.sin(player.rad) * 10;
            var yOffset = Math.cos(player.rad) * 10;
            player.position(player.x-xOffset, player.y+yOffset);
        }
        if (self.inputHandler.pressed(self.KEY_DOWN)) {
            var xOffset = Math.sin(player.rad) * 10;
            var yOffset = Math.cos(player.rad) * 10;
            player.position(player.x+xOffset, player.y-yOffset);
        }
        if (self.inputHandler.pressed(self.KEY_LEFT)) {
            player.rotation(player.rad-0.2);
        }
        if (self.inputHandler.pressed(self.KEY_RIGHT)) {
            player.rotation(player.rad+0.2);
        }
    }
});

$(function() {
    var game = new Game();
    game.player.position(300, 300);
});
