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
        this.width = width;
        this.height = height;
        this.div = $('<div>')
                      .addClass('object')
                      .css({
                          'background-image': 'url(res.png)',
                          'background-position': '-' + x + 'px -' + y + 'px'
                      })
                      .width(width)
                      .height(height)
                      .appendTo('#screen');
        this.position(0, 0);
        this.rotation(0);

        game.addObject(this);
    },   

    setSprite: function(x, y) {
        $(this.div).css('background-position', '-' + x + 'px -' + y + 'px');
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

    collider: function() {
        var self = this;
        var result = null;
        _.each(game.objects, function(object) {
            if (object != self &&
                self.x >= object.x && self.x <= object.x+object.width &&
                self.y >= object.y && self.y <= object.y+object.height)
            {
                result = object;
            }
        });
        return result;
    },

    frame: function() {
    }

});

var Zombie = Object.extend({
    initialize: function() {
        Object.prototype.initialize.call(this, 48, 0, 48, 32);
        this.health = 100;
    },

    frame: function() {
        var p = game.player;
        var a = p.x - this.x;
        var b = p.y - this.y;
        var c = Math.sqrt(a*a+b*b);

        var alpha = Math.acos((a*a-b*b-c*c) / (-2*b*c)) * (a > 0 ? -1 : 1);

        this.rotation(alpha);
        if (c > 16)
            this.go(2);

        this.setSprite(48, 0);
    },

    damage: function(d) {
        this.health -= d;
        if (this.health < 0)
            game.removeObject(this);
        this.setSprite(48, 32);
    }
});

var Bullet = Object.extend({
    initialize: function() {
        Object.prototype.initialize.call(this, 0, 16, 5, 5);
    },

    frame: function() {
        this.go(10);
        if (this.x < 0 || this.y < 0 || this.x > 1024 || this.y > 768)
            game.removeObject(this);

        var collider = this.collider();
        if (collider && collider != game.player) {
            game.removeObject(this);
            if (collider.damage) {
                collider.damage(20);
            }
        }
    }
});

var Player = Object.extend({
    KEY_LEFT: 65,
    KEY_RIGHT: 68,
    KEY_UP: 87,
    KEY_DOWN: 83,
    KEY_FIRE: 32,
    lastBullet: 0,

    initialize: function() {
        Object.prototype.initialize.call(this, 0, 0, 48, 16);
        this.inputHandler = new InputHandler();
    },

    frame: function() {
        if (this.inputHandler.pressed(this.KEY_UP)) {
            this.go(10);
        }
        if (this.inputHandler.pressed(this.KEY_DOWN)) {
            this.go(-4);
        }
        if (this.inputHandler.pressed(this.KEY_LEFT)) {
            this.rotation(this.rad-0.1);
        }
        if (this.inputHandler.pressed(this.KEY_RIGHT)) {
            this.rotation(this.rad+0.1);
        }
        if (this.inputHandler.pressed(this.KEY_FIRE)) {
            var now = (new Date()).getTime();
            if (now-this.lastBullet > 200) {
                var bullet = new Bullet();
                bullet.position(this.x, this.y);
                bullet.rotation(this.rad);
                this.lastBullet = now;
            }
        }
    }
});

var Game = Backbone.Model.extend({

    objects: [],

    initialize: function() {
        var self = this;
        window.setInterval(function() { self.frame(); }, 30);
    },

    addObject: function(object) {
        this.objects.push(object);
    },

    removeObject: function(object) {
        var index = _.indexOf(this.objects, object);
        this.objects.splice(index, 1);
        $(object.div).remove();
    },

    frame: function() {
        _.each(this.objects, function(object) {
            object.frame();
        });
    }
});

$(function() { 
    game = new Game(); 
    game.player = new Player();
    game.player.position(500, 500);
    (new Zombie()).position(250, 150);
    window.setInterval(function() {
        (new Zombie()).position(Math.random()*1024, Math.random()*786);
    }, 3000);
});
