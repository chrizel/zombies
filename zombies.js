var game = null;

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

var Object = Backbone.Model.extend({

    initialize: function(x, y, width, height) {
        this.div = $('<div>')
                      .css({
                          'background-image': 'url(res.png)',
                          'background-position': '-' + x + 'px -' + y + 'px'
                      })
                      .width(width)
                      .height(height)
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
    },

    go: function(speed) {
        var xOffset = Math.sin(this.rad) * speed;
        var yOffset = Math.cos(this.rad) * speed;
        this.position(this.x-xOffset, this.y+yOffset);
    },

    frame: function() {
    }

});

var Zombie = Object.extend({
    initialize: function() {
        Object.prototype.initialize.call(this, 48, 0, 48, 32);
    },

    frame: function() {
        var p = game.player;
        var a = p.x - this.x;
        var b = p.y - this.y;
        var c = Math.sqrt(a*a+b*b);

        var alpha = Math.acos((a*a-b*b-c*c) / (-2*b*c)) * (a > 0 ? -1 : 1);

        this.rotation(alpha);
        this.go(1);
    }
});

var Player = Object.extend({
    KEY_LEFT: 65,
    KEY_RIGHT: 68,
    KEY_UP: 87,
    KEY_DOWN: 83,

    initialize: function() {
        Object.prototype.initialize.call(this, 0, 0, 48, 16);
        this.inputHandler = new InputHandler();
    },

    frame: function() {
        if (this.inputHandler.pressed(this.KEY_UP)) {
            this.go(10);
        }
        if (this.inputHandler.pressed(this.KEY_DOWN)) {
            this.go(-5);
        }
        if (this.inputHandler.pressed(this.KEY_LEFT)) {
            this.rotation(this.rad-0.2);
        }
        if (this.inputHandler.pressed(this.KEY_RIGHT)) {
            this.rotation(this.rad+0.2);
        }
    }
});

var Game = Backbone.Model.extend({

    objects: [],

    initialize: function() {
        this.player = new Player();
        this.zombie1 = new Zombie();
        this.zombie1.position(200, 200);

        this.zombie2 = new Zombie();
        this.zombie2.position(600, 600);

        this.objects.push(this.player);
        this.objects.push(this.zombie1);
        this.objects.push(this.zombie2);

        var self = this;
        window.setInterval(function() { self.frame(); }, 30);
    },

    frame: function() {
        _.each(this.objects, function(object) {
            object.frame();
        });
    }
});

$(function() {
    game = new Game();
    game.player.position(300, 300);
});
